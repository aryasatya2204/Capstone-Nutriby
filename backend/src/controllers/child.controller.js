const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { executeMealPlanAI } = require("../services/mealplan.service.js");

const {
  getAgeInMonths,
  calculateLMS,
  calculateDynamicBudget,
  calculateWaterlowCalories,
  getStatusWFA,
  getStatusHFA,
  getStatusWFH,
  getGlobalStatus,
} = require("../utils/growth.helper");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// tambah data anak baru beserta validasi silang alergi vs kesukaan
const createChild = async (req, res) => {
  try {
    const {
      name,
      dob,
      gender,
      parent_salary,
      tinggi,
      berat,
      allergy_ids,
      preference_ids,
    } = req.body;
    const userId = req.user.id;
    const beratAktual = parseFloat(berat);
    const tinggiAktual = parseFloat(tinggi);

    if (
      allergy_ids &&
      allergy_ids.length > 0 &&
      preference_ids &&
      preference_ids.length > 0
    ) {
      const allergies = await prisma.allergyCategory.findMany({
        where: { id: { in: allergy_ids } },
      });
      const preferences = await prisma.ingredient.findMany({
        where: { id: { in: preference_ids } },
      });
      for (const pref of preferences) {
        const prefNameLower = pref.name.toLowerCase();
        const clash = allergies.find((al) =>
          prefNameLower.includes(al.name.toLowerCase()),
        );
        if (clash) {
          return res.status(400).json({
            message: "Validasi Gagal: Data kontradiktif!",
            details: `Anak alergi terhadap kategori '${clash.name}', sehingga bahan '${pref.name}' dilarang menjadi makanan kesukaan.`,
          });
        }
      }
    }

    const ageInMonths = getAgeInMonths(dob);
    const tinggiRounded = Math.round(tinggiAktual * 2) / 2;

    const [whoWFA, whoHFA, whoWFH, akgData] = await Promise.all([
      prisma.whoStandard.findFirst({
        where: { indicator: "WFA", gender, month_or_length: ageInMonths },
      }),
      prisma.whoStandard.findFirst({
        where: { indicator: "HFA", gender, month_or_length: ageInMonths },
      }),
      prisma.whoStandard.findFirst({
        where: { indicator: "WFH", gender, month_or_length: tinggiRounded },
      }),
      prisma.akgStandard.findFirst({
        where: {
          gender,
          min_age_months: { lte: ageInMonths },
          max_age_months: { gte: ageInMonths },
        },
      }),
    ]);

    if (!whoWFA || !whoHFA || !whoWFH || !akgData)
      return res
        .status(404)
        .json({ message: "Gagal mengkalkulasi. Data Standar belum tersedia." });

    const idealWeight = parseFloat(whoWFH.m);
    const zscoreWFA = calculateLMS(beratAktual, whoWFA.l, whoWFA.m, whoWFA.s);
    const zscoreHFA = calculateLMS(tinggiAktual, whoHFA.l, whoHFA.m, whoHFA.s);
    const zscoreWFH = calculateLMS(beratAktual, whoWFH.l, whoWFH.m, whoWFH.s);

    const statusWFA = getStatusWFA(zscoreWFA);
    const statusHFA = getStatusHFA(zscoreHFA);
    const statusWFH = getStatusWFH(zscoreWFH);
    const globalStatus = getGlobalStatus(statusWFH, statusHFA);

    const budgetInfo = calculateDynamicBudget(zscoreWFH, parent_salary);
    const akgBaseWeight = parseFloat(akgData.base_weight_kg);
    const kkalPerKg = parseFloat(akgData.calories) / akgBaseWeight;

    const targetKalori = calculateWaterlowCalories(
      zscoreWFH,
      beratAktual,
      idealWeight,
      kkalPerKg,
    );
    const targetProtein =
      (parseFloat(akgData.protein) / akgBaseWeight) * idealWeight;
    const targetLemak = (parseFloat(akgData.fat) / akgBaseWeight) * idealWeight;

    const result = await prisma.$transaction(async (tx) => {
      return await tx.child.create({
        data: {
          user_id: userId,
          name,
          dob: new Date(dob),
          gender,
          parent_salary: parseFloat(parent_salary),
          optimal_budget_cache: budgetInfo.optimal_budget,
          preferences: {
            create: preference_ids
              ? preference_ids.map((id) => ({ ingredient_id: id }))
              : [],
          },
          allergies: {
            create: allergy_ids
              ? allergy_ids.map((id) => ({ allergy_category_id: id }))
              : [],
          },
          growth_logs: {
            create: {
              record_date: new Date(),
              tinggi: tinggiAktual,
              berat: beratAktual,
              bbi_kg: idealWeight,
              zscore_wfa: zscoreWFA,
              status_wfa: statusWFA,
              zscore_hfa: zscoreHFA,
              status_hfa: statusHFA,
              zscore_wfh: zscoreWFH,
              status_wfh: statusWFH,
              global_status: globalStatus,
              target_kalori: targetKalori,
              target_protein: targetProtein,
              target_lemak: targetLemak,
              target_zinc: parseFloat(akgData.zinc),
              target_besi: parseFloat(akgData.iron),
            },
          },
        },
        include: {
          allergies: { include: { allergy_category: true } },
          preferences: { include: { ingredient: true } },
          growth_logs: true,
        },
      });
    });

    res.status(201).json({
      message: "Data anak beserta status pertumbuhan disimpan!",
      calculations: {
        persentase_gaji: `${budgetInfo.persentase_gaji}%`,
        budget_bulanan_rekomendasi: Math.round(budgetInfo.optimal_budget),
      },
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal menambah data anak", error: error.message });
  }
};

// ambil list anak milik user beserta pembersihan otomatis meal plan usang (7 hari)
const getChildren = async (req, res) => {
  try {
    const children = await prisma.child.findMany({
      where: { user_id: req.user.id },
      orderBy: { id: "desc" },
      include: {
        growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
        allergies: { include: { allergy_category: true } },
        preferences: { include: { ingredient: true } },
        meal_plans: {
          orderBy: { id: "desc" },
          include: { items: { include: { recipe: true } } },
        },
      },
    });

    const now = new Date();
    for (let child of children) {
      const activePlans = [];
      for (let plan of child.meal_plans) {
        if (plan.plan_type === "mingguan") {
          const start = new Date(plan.created_at);
          start.setHours(0, 0, 0, 0);
          const current = new Date(now);
          current.setHours(0, 0, 0, 0);
          const diffDays = Math.floor(
            (current - start) / (1000 * 60 * 60 * 24),
          );

          if (diffDays >= 7) {
            await prisma.mealPlan.delete({ where: { id: plan.id } });
            continue;
          }
        }
        activePlans.push(plan);
      }
      child.meal_plans = activePlans;
    }

    res.status(200).json(children);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mengambil data anak", error: error.message });
  }
};

// edit profil, alergi, preferensi, dan hitung ulang alokasi budget belanja
const updateChild = async (req, res) => {
  try {
    const { id } = req.params;
    const { allergy_ids, preference_ids, parent_salary } = req.body;

    if (
      allergy_ids &&
      allergy_ids.length > 0 &&
      preference_ids &&
      preference_ids.length > 0
    ) {
      const allergies = await prisma.allergyCategory.findMany({
        where: { id: { in: allergy_ids } },
      });
      const preferences = await prisma.ingredient.findMany({
        where: { id: { in: preference_ids } },
      });
      for (const pref of preferences) {
        const prefNameLower = pref.name.toLowerCase();
        const clash = allergies.find((al) =>
          prefNameLower.includes(al.name.toLowerCase()),
        );
        if (clash)
          return res.status(400).json({
            message: "Validasi Gagal: Data kontradiktif!",
            details: `Anak alergi terhadap '${clash.name}', '${pref.name}' dilarang.`,
          });
      }
    }

    const existingChild = await prisma.child.findUnique({
      where: { id },
      include: { growth_logs: { orderBy: { record_date: "desc" }, take: 1 } },
    });
    if (!existingChild)
      return res.status(404).json({ message: "Data anak tidak ditemukan" });

    let finalSalary = existingChild.parent_salary;
    let finalBudget = existingChild.optimal_budget_cache;

    if (parent_salary !== undefined) {
      finalSalary = parseFloat(parent_salary);
      const latestLog = existingChild.growth_logs[0];
      const newBudgetInfo = calculateDynamicBudget(
        latestLog ? parseFloat(latestLog.zscore_wfh) : 0,
        finalSalary,
      );
      finalBudget = newBudgetInfo.optimal_budget;
    }

    let updatedChild = await prisma.$transaction(async (tx) => {
      await tx.childAllergy.deleteMany({ where: { child_id: id } });
      await tx.childPreference.deleteMany({ where: { child_id: id } });
      return await tx.child.update({
        where: { id },
        data: {
          parent_salary: finalSalary,
          optimal_budget_cache: finalBudget,
          allergies: {
            create: allergy_ids
              ? allergy_ids.map((aId) => ({ allergy_category_id: aId }))
              : [],
          },
          preferences: {
            create: preference_ids
              ? preference_ids.map((pId) => ({ ingredient_id: pId }))
              : [],
          },
        },
        include: {
          allergies: { include: { allergy_category: true } },
          preferences: { include: { ingredient: true } },
          growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
          meal_plans: { orderBy: { id: "desc" } },
        },
      });
    });

    if (parent_salary !== undefined) {
      try {
        await executeMealPlanAI(id, true);
        updatedChild = await prisma.child.findUnique({
          where: { id },
          include: {
            allergies: { include: { allergy_category: true } },
            preferences: { include: { ingredient: true } },
            growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
            meal_plans: { orderBy: { id: "desc" } },
          },
        });
      } catch (aiError) {
        console.error("Gagal update AI Mealplan:", aiError.message);
      }
    }

    res
      .status(200)
      .json({ message: "Data berhasil diperbarui!", data: updatedChild });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal memperbarui data", error: error.message });
  }
};

module.exports = { createChild, getChildren, updateChild };
