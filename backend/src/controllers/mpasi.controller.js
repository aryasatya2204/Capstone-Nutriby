const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const axios = require("axios");
const { getSafeCandidateRecipes } = require("../utils/recipe.helper");
const { getAgeInMonths } = require("../utils/growth.helper");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * ============================================================================
 * INTERNAL HELPER: ML PIPELINE ENGINE
 * ============================================================================
 * Hanya bertugas mengambil data dan menembak API Machine Learning.
 * Menerima `mlDailyBudget` yang sudah dikalkulasi dengan benar oleh controller.
 */
const getScoredRecipesFromML = async (childId, mlDailyBudget) => {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      preferences: { include: { ingredient: true } },
      allergies: { include: { allergy_category: true } },
      growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
    },
  });

  if (!child || child.growth_logs.length === 0) {
    throw new Error("Data anak atau log pertumbuhan tidak ditemukan.");
  }

  const latestLog = child.growth_logs[0];
  const ageInMonths = getAgeInMonths(child.dob);
  const allergyIds = child.allergies.map((a) => a.allergy_category_id);

  const { candidates } = await getSafeCandidateRecipes(ageInMonths, allergyIds);

  if (candidates.length === 0) {
    throw new Error("Tidak ada kandidat resep yang aman untuk umur dan alergi anak ini.");
  }

  const mlPayload = {
    user: {
      id: child.id,
      age_months: ageInMonths,
      zscore_wfh: parseFloat(latestLog.zscore_wfh),
      zscore_wfa: parseFloat(latestLog.zscore_wfa),
      zscore_hfa: parseFloat(latestLog.zscore_hfa),
      daily_budget: mlDailyBudget, 
      target_calories: parseFloat(latestLog.target_kalori),
      target_protein: parseFloat(latestLog.target_protein),
      target_fat: parseFloat(latestLog.target_lemak),
      target_iron: parseFloat(latestLog.target_besi),
      target_zinc: parseFloat(latestLog.target_zinc),
      favorite_foods: child.preferences.map((p) => p.ingredient.name),
      allergies: child.allergies.map((a) => a.allergy_category.name),
    },
    recipes: candidates,
  };

  const mlResponse = await axios.post("http://127.0.0.1:8000/recommend", mlPayload);

  const passedRecommendations = mlResponse.data.recommendations.filter((r) => r.score >= 0.6);

  if (passedRecommendations.length === 0) {
    throw new Error("Model gagal menemukan resep dengan kecocokan di atas 0.6.");
  }

  const approvedRecipes = passedRecommendations.map(rec => {
    const detail = candidates.find(c => c.id === rec.recipe_id);
    return { ...detail, match_score: rec.score };
  });

  // Urutkan berdasarkan skor tertinggi
  approvedRecipes.sort((a, b) => b.match_score - a.match_score);

  return { child, approvedRecipes };
};

/**
 * ============================================================================
 * 1. GENERATE DAFTAR MENU (Hard Constraint Per Porsi)
 * ============================================================================
 */
const generateSingleMenu = async (req, res) => {
  try {
    const { childId } = req.params;
    const { custom_budget } = req.body; 

    // Cari data dasar anak untuk fallback budget
    const childBase = await prisma.child.findUnique({ where: { id: childId } });
    if (!childBase) {
      return res.status(404).json({ message: "Data anak tidak ditemukan." });
    }

    let budgetPerMenu;
    let mlDailyBudget;

    // Kalkulasi Budget
    if (custom_budget !== undefined && custom_budget !== null) {
      budgetPerMenu = parseFloat(custom_budget);
      mlDailyBudget = budgetPerMenu * 3; // Konversi ke harian untuk ML
    } else {
      mlDailyBudget = parseFloat(childBase.optimal_budget_cache) / 30;
      budgetPerMenu = mlDailyBudget / 3;
    }

    const { approvedRecipes } = await getScoredRecipesFromML(childId, mlDailyBudget);

    // Hard Constraint Mutlak: Sapu bersih menu yang harganya di atas budgetPerMenu
    const filteredRecipes = approvedRecipes.filter(r => parseFloat(r.est_price) <= budgetPerMenu);

    if (filteredRecipes.length === 0) {
      return res.status(404).json({ 
        message: `Maaf, kami tidak menemukan resep yang memenuhi standar gizi dengan budget maksimal Rp ${Math.round(budgetPerMenu)} per porsi.` 
      });
    }

    res.status(200).json({
      message: `Berhasil mendapatkan ${filteredRecipes.length} rekomendasi menu MPASI!`,
      budget_per_menu_applied: budgetPerMenu,
      data: filteredRecipes
    });

  } catch (error) {
    res.status(500).json({ message: "Gagal men-generate menu MPASI", error: error.message });
  }
};

/**
 * ============================================================================
 * 2. GENERATE MPASI MINGGUAN (Algoritma Kombinasi Greedy)
 * ============================================================================
 */
const generateWeeklyPlan = async (req, res) => {
  try {
    const { childId } = req.params;
    const { allergy_ids, preference_ids, custom_budget } = req.body;

    // Update Alergi & Preferensi jika ada
    if (allergy_ids !== undefined || preference_ids !== undefined) {
      await prisma.$transaction(async (tx) => {
        if (allergy_ids !== undefined) {
          await tx.childAllergy.deleteMany({ where: { child_id: childId } });
          if (Array.isArray(allergy_ids) && allergy_ids.length > 0) {
            await tx.childAllergy.createMany({
              data: allergy_ids.map(id => ({ child_id: childId, allergy_category_id: id }))
            });
          }
        }
        if (preference_ids !== undefined) {
          await tx.childPreference.deleteMany({ where: { child_id: childId } });
          if (Array.isArray(preference_ids) && preference_ids.length > 0) {
            await tx.childPreference.createMany({
              data: preference_ids.map(id => ({ child_id: childId, ingredient_id: id }))
            });
          }
        }
      });
    }

    const childBase = await prisma.child.findUnique({ where: { id: childId } });

    let weeklyBudgetLimit;
    let mlDailyBudget;

    // Kalkulasi Budget
    if (custom_budget !== undefined && custom_budget !== null) {
      weeklyBudgetLimit = parseFloat(custom_budget);
      mlDailyBudget = weeklyBudgetLimit / 7; // Konversi ke harian untuk ML
    } else {
      mlDailyBudget = parseFloat(childBase.optimal_budget_cache) / 30;
      weeklyBudgetLimit = mlDailyBudget * 7;
    }

    const { child, approvedRecipes } = await getScoredRecipesFromML(childId, mlDailyBudget);

    // ALGORITMA KOMBINASI MENU
    // 1. Cek Kelayakan Budget Minimum
    const cheapestRecipe = [...approvedRecipes].sort((a, b) => parseFloat(a.est_price) - parseFloat(b.est_price))[0];
    const minPossibleCost = parseFloat(cheapestRecipe.est_price) * 21;

    if (weeklyBudgetLimit < minPossibleCost) {
      return res.status(400).json({ 
        message: `Maaf, budget Rp ${weeklyBudgetLimit} terlalu rendah. Minimal budget yang dibutuhkan untuk 21 porsi dengan resep termurah kami adalah Rp ${minPossibleCost}.` 
      });
    }

   // 2. Penyusunan Kombinasi Greedy + Rotasi Variasi Menu
    let actualTotalCost = 0;
    const mealPlanItems = [];
    const mealTimes = ["pagi", "siang", "malam"];
    const TOTAL_MEALS = 21;

    for (let i = 0; i < TOTAL_MEALS; i++) {
      const remainingMeals = TOTAL_MEALS - 1 - i;
      const minCostForRemaining = remainingMeals * parseFloat(cheapestRecipe.est_price);
      
      // Berapa sisa uang yang boleh dipakai untuk 1 porsi ini?
      const maxAllowablePriceForThisMeal = weeklyBudgetLimit - actualTotalCost - minCostForRemaining;

      // Saring SEMUA resep yang harganya masih masuk dengan sisa uang saat ini
      const affordableRecipes = approvedRecipes.filter(r => parseFloat(r.est_price) <= maxAllowablePriceForThisMeal);

      let selectedRecipe = cheapestRecipe; // Fallback

      if (affordableRecipes.length > 0) {
        // FITUR ROTASI: Kita gunakan modulo (i % panjang_array) agar resep berganti-ganti.
        // Karena array sudah urut dari skor tertinggi, ia akan merotasi misalnya 10 menu 
        // terbaik teratas secara bergantian, tidak hanya memanggil index ke-0 terus menerus.
        selectedRecipe = affordableRecipes[i % affordableRecipes.length];
      }

      actualTotalCost += parseFloat(selectedRecipe.est_price);

      mealPlanItems.push({
        recipe_id: selectedRecipe.id,
        day_number: Math.floor(i / 3) + 1,
        meal_time: mealTimes[i % 3],
        match_score: selectedRecipe.match_score,
        estimated_cost: selectedRecipe.est_price
      });
    }

    // Hapus jadwal lama & Simpan jadwal baru
    await prisma.mealPlan.deleteMany({
      where: { child_id: child.id, plan_type: "mingguan" }
    });

    const savedPlan = await prisma.mealPlan.create({
      data: {
        child_id: child.id,
        plan_type: "mingguan",
        max_budget_limit: weeklyBudgetLimit,
        actual_total_cost: actualTotalCost,
        items: { create: mealPlanItems }
      },
      include: { 
        items: { 
          orderBy: [{ day_number: 'asc' }, { meal_time: 'asc' }],
          include: { recipe: true } 
        } 
      }
    });

    res.status(201).json({
      message: "Jadwal MPASI Mingguan berhasil disusun sesuai kombinasi budget!",
      data: savedPlan
    });

  } catch (error) {
    res.status(500).json({ message: "Gagal men-generate jadwal mingguan", error: error.message });
  }
};

module.exports = {
  generateSingleMenu,
  generateWeeklyPlan
};