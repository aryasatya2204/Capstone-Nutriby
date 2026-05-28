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

// ambil resep lolos filter gizi dan alergi dari model ml
const getScoredRecipesFromML = async (childId, mlDailyBudget) => {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      preferences: { include: { ingredient: true } },
      allergies: { include: { allergy_category: true } },
      growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
    },
  });

  if (!child || child.growth_logs.length === 0)
    throw new Error("Data anak atau log pertumbuhan tidak ditemukan.");

  const latestLog = child.growth_logs[0];
  const ageInMonths = getAgeInMonths(child.dob);
  const allergyIds = child.allergies.map((a) => a.allergy_category_id);
  const { candidates } = await getSafeCandidateRecipes(ageInMonths, allergyIds);

  if (candidates.length === 0)
    throw new Error(
      "Tidak ada kandidat resep yang aman untuk umur dan alergi anak ini.",
    );

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

  const mlResponse = await axios.post(
    "http://127.0.0.1:8000/recommend",
    mlPayload,
  );
  const passedRecommendations = mlResponse.data.recommendations.filter(
    (r) => r.score >= 0.6,
  );

  if (passedRecommendations.length === 0)
    throw new Error("Model gagal menemukan resep dengan kecocokan memadai.");

  const approvedRecipes = passedRecommendations.map((rec) => {
    const detail = candidates.find((c) => c.id === rec.recipe_id);
    return { ...detail, match_score: rec.score };
  });

  approvedRecipes.sort((a, b) => b.match_score - a.match_score);
  return { child, approvedRecipes };
};

// bikin rekomendasi menu tunggal acak pas budget
const generateSingleMenu = async (req, res) => {
  try {
    const { childId } = req.params;
    const { custom_budget } = req.body;
    const childBase = await prisma.child.findUnique({ where: { id: childId } });
    if (!childBase)
      return res.status(404).json({ message: "Data anak tidak ditemukan." });

    let budgetPerMenu, mlDailyBudget;
    if (custom_budget !== undefined && custom_budget !== null) {
      budgetPerMenu = parseFloat(custom_budget);
      mlDailyBudget = budgetPerMenu * 3;
    } else {
      mlDailyBudget = parseFloat(childBase.optimal_budget_cache) / 30;
      budgetPerMenu = mlDailyBudget / 3;
    }

    const { approvedRecipes } = await getScoredRecipesFromML(
      childId,
      mlDailyBudget,
    );
    const filteredRecipes = approvedRecipes.filter(
      (r) => parseFloat(r.est_price) <= budgetPerMenu,
    );

    if (filteredRecipes.length === 0)
      return res.status(404).json({
        message: `Maaf, tidak ada resep standar AI yang masuk budget maksimal Rp ${Math.round(budgetPerMenu)}/porsi.`,
      });

    res.status(200).json({
      message: `Berhasil mendapatkan ${filteredRecipes.length} rekomendasi menu!`,
      budget_per_menu_applied: budgetPerMenu,
      data: filteredRecipes,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal men-generate menu MPASI", error: error.message });
  }
};

// susun rencana jadwal makan mingguan (21 porsi)
const generateWeeklyPlan = async (req, res) => {
  try {
    const { childId } = req.params;
    const { allergy_ids, preference_ids, custom_budget } = req.body;

    if (allergy_ids !== undefined || preference_ids !== undefined) {
      await prisma.$transaction(async (tx) => {
        if (allergy_ids !== undefined) {
          await tx.childAllergy.deleteMany({ where: { child_id: childId } });
          if (Array.isArray(allergy_ids) && allergy_ids.length > 0) {
            await tx.childAllergy.createMany({
              data: allergy_ids.map((id) => ({
                child_id: childId,
                allergy_category_id: id,
              })),
            });
          }
        }
        if (preference_ids !== undefined) {
          await tx.childPreference.deleteMany({ where: { child_id: childId } });
          if (Array.isArray(preference_ids) && preference_ids.length > 0) {
            await tx.childPreference.createMany({
              data: preference_ids.map((id) => ({
                child_id: childId,
                ingredient_id: id,
              })),
            });
          }
        }
      });
    }

    const childBase = await prisma.child.findUnique({ where: { id: childId } });
    let weeklyBudgetLimit, mlDailyBudget;

    if (custom_budget !== undefined && custom_budget !== null) {
      weeklyBudgetLimit = parseFloat(custom_budget);
      mlDailyBudget = weeklyBudgetLimit / 7;
    } else {
      mlDailyBudget = parseFloat(childBase.optimal_budget_cache) / 30;
      weeklyBudgetLimit = mlDailyBudget * 7;
    }

    const { child, approvedRecipes } = await getScoredRecipesFromML(
      childId,
      mlDailyBudget,
    );
    const cheapestRecipe = [...approvedRecipes].sort(
      (a, b) => parseFloat(a.est_price) - parseFloat(b.est_price),
    )[0];
    const minPossibleCost = parseFloat(cheapestRecipe.est_price) * 21;

    if (weeklyBudgetLimit < minPossibleCost)
      return res.status(400).json({
        message: `Maaf, budget terlalu rendah. Minimal budget untuk 21 porsi resep termurah adalah Rp ${minPossibleCost}.`,
      });

    let actualTotalCost = 0;
    const mealPlanItems = [];
    const mealTimes = ["pagi", "siang", "malam"];

    for (let i = 0; i < 21; i++) {
      const remainingMeals = 20 - i;
      const minCostForRemaining =
        remainingMeals * parseFloat(cheapestRecipe.est_price);
      const maxAllowablePriceForThisMeal =
        weeklyBudgetLimit - actualTotalCost - minCostForRemaining;

      const affordableRecipes = approvedRecipes.filter(
        (r) => parseFloat(r.est_price) <= maxAllowablePriceForThisMeal,
      );
      let selectedRecipe =
        affordableRecipes.length > 0
          ? affordableRecipes[i % affordableRecipes.length]
          : cheapestRecipe;

      actualTotalCost += parseFloat(selectedRecipe.est_price);
      mealPlanItems.push({
        recipe_id: selectedRecipe.id,
        day_number: Math.floor(i / 3) + 1,
        meal_time: mealTimes[i % 3],
        match_score: selectedRecipe.match_score,
        estimated_cost: selectedRecipe.est_price,
      });
    }

    await prisma.mealPlan.deleteMany({
      where: { child_id: child.id, plan_type: "mingguan" },
    });

    const savedPlan = await prisma.mealPlan.create({
      data: {
        child_id: child.id,
        plan_type: "mingguan",
        max_budget_limit: weeklyBudgetLimit,
        actual_total_cost: actualTotalCost,
        items: { create: mealPlanItems },
      },
      include: {
        items: {
          orderBy: [{ day_number: "asc" }, { meal_time: "asc" }],
          include: { recipe: true },
        },
      },
    });

    res.status(201).json({
      message: "Jadwal MPASI Mingguan berhasil disusun!",
      data: savedPlan,
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal men-generate jadwal mingguan",
      error: error.message,
    });
  }
};

// cari menu berdasarkan kecocokan bahan masakan (logika or)
const searchMenuByIngredient = async (req, res) => {
  try {
    const { childId } = req.params;
    const { custom_budget, ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0)
      return res
        .status(400)
        .json({ message: "Minimal satu bahan pencarian harus dipilih." });

    const childBase = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        allergies: { include: { allergy_category: true } },
      },
    });

    if (!childBase)
      return res.status(404).json({ message: "Data anak tidak ditemukan." });

    let budgetPerMenu;
    if (
      custom_budget !== undefined &&
      custom_budget !== null &&
      parseFloat(custom_budget) > 0
    ) {
      budgetPerMenu = parseFloat(custom_budget);
    } else {
      budgetPerMenu = parseFloat(childBase.optimal_budget_cache) / 30 / 3;
    }

    const ageInMonths = getAgeInMonths(childBase.dob);
    const allergyCategoryIds = childBase.allergies.map(
      (a) => a.allergy_category_id,
    );

    // langsung query DB, ga lewat ML
    // krn candidates ML ga ada field bahan_masakan & bisa buang resep valid (score < 0.6)
    const matchingRecipes = await prisma.recipe.findMany({
      where: {
        min_age_months: { lte: ageInMonths },
        max_age_months: { gte: ageInMonths },
        est_price: { lte: budgetPerMenu },
        ...(allergyCategoryIds.length > 0 && {
          NOT: {
            allergies: {
              some: { allergy_category_id: { in: allergyCategoryIds } },
            },
          },
        }),
        // OR logic: muncul kalau ada SALAH SATU bahan yang cocok (partial match)
        ingredients: {
          some: {
            ingredient: {
              OR: ingredients.map((i) => ({
                name: { contains: i, mode: "insensitive" },
              })),
            },
          },
        },
      },
      include: {
        ingredients: { include: { ingredient: true } },
        allergies: { include: { allergy_category: true } },
      },
      orderBy: { est_price: "asc" },
    });

    const keywords = ingredients.map((i) => i.toLowerCase());
    const formattedResults = matchingRecipes.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      bahan_masakan: r.bahan_masakan,
      instructions: r.instructions,
      min_age_months: r.min_age_months,
      max_age_months: r.max_age_months,
      texture: r.texture,
      est_price: parseFloat(r.est_price),
      calories: parseFloat(r.calories),
      protein: parseFloat(r.protein),
      fat: parseFloat(r.fat),
      iron: parseFloat(r.iron),
      zinc: parseFloat(r.zinc),
      tags: r.tags,
      image_url: r.image_url,
      matched_ingredients: r.ingredients
        .filter((i) =>
          keywords.some((kw) => i.ingredient.name.toLowerCase().includes(kw)),
        )
        .map((i) => i.ingredient.name),
    }));

    res.status(200).json({
      message: `Berhasil menemukan ${formattedResults.length} menu.`,
      budget_per_menu_applied: budgetPerMenu,
      age_months: ageInMonths,
      data: formattedResults,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mencari menu", error: error.message });
  }
};

// hapus seluruh perencanaan mingguan aktif
const deleteWeeklyPlan = async (req, res) => {
  try {
    const { childId } = req.params;
    await prisma.mealPlan.deleteMany({
      where: { child_id: childId, plan_type: "mingguan" },
    });
    res.status(200).json({ message: "Perencanaan mingguan berhasil dihapus." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal menghapus jadwal", error: error.message });
  }
};

// cari 5 alternatif menu pengganti yang muat di sisa budget
const getAlternativeRecipes = async (req, res) => {
  try {
    const { childId, mealPlanItemId } = req.params;
    const currentItem = await prisma.mealPlanItem.findUnique({
      where: { id: mealPlanItemId },
      include: { meal_plan: { include: { items: true } } },
    });
    if (!currentItem)
      return res
        .status(404)
        .json({ message: "Menu tidak ditemukan di jadwal." });

    const plan = currentItem.meal_plan;
    const childBase = await prisma.child.findUnique({ where: { id: childId } });
    const availableBudgetForThisMeal =
      parseFloat(plan.max_budget_limit) -
      parseFloat(plan.actual_total_cost) +
      parseFloat(currentItem.estimated_cost);

    const mlDailyBudget = parseFloat(childBase.optimal_budget_cache) / 30;
    const { approvedRecipes } = await getScoredRecipesFromML(
      childId,
      mlDailyBudget,
    );
    const existingRecipeIds = plan.items.map((item) => item.recipe_id);

    const alternativeCandidates = approvedRecipes.filter(
      (r) =>
        parseFloat(r.est_price) <= availableBudgetForThisMeal &&
        !existingRecipeIds.includes(r.id),
    );
    res.status(200).json({
      message: "Berhasil mendapatkan alternatif menu",
      available_budget: availableBudgetForThisMeal,
      data: alternativeCandidates.slice(0, 5),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mencari alternatif", error: error.message });
  }
};

// tukar menu aktif dengan resep alternatif pilihan user
const swapMealPlanItem = async (req, res) => {
  try {
    const { mealPlanItemId } = req.params;
    const { new_recipe_id, new_estimated_cost, new_match_score } = req.body;
    const currentItem = await prisma.mealPlanItem.findUnique({
      where: { id: mealPlanItemId },
      include: { meal_plan: true },
    });
    if (!currentItem)
      return res.status(404).json({ message: "Menu tidak ditemukan." });

    const plan = currentItem.meal_plan;
    const newTotalCost =
      parseFloat(plan.actual_total_cost) +
      (parseFloat(new_estimated_cost) - parseFloat(currentItem.estimated_cost));
    if (newTotalCost > parseFloat(plan.max_budget_limit))
      return res
        .status(400)
        .json({ message: "Gagal mengganti. Budget melebihi batas." });

    await prisma.$transaction([
      prisma.mealPlanItem.update({
        where: { id: mealPlanItemId },
        data: {
          recipe_id: new_recipe_id,
          estimated_cost: parseFloat(new_estimated_cost),
          match_score: parseFloat(new_match_score),
        },
      }),
      prisma.mealPlan.update({
        where: { id: plan.id },
        data: { actual_total_cost: newTotalCost },
      }),
    ]);

    const updatedPlan = await prisma.mealPlan.findUnique({
      where: { id: plan.id },
      include: {
        items: {
          orderBy: [{ day_number: "asc" }, { meal_time: "asc" }],
          include: { recipe: true },
        },
      },
    });
    const formattedWeeklyPlan = [];
    for (let day = 1; day <= 7; day++) {
      const dayItems = updatedPlan.items.filter(
        (item) => item.day_number === day,
      );
      const getRecipeByTime = (time) => {
        const found = dayItems.find((i) => i.meal_time === time);
        return found ? { ...found.recipe, mealPlanItemId: found.id } : null;
      };
      formattedWeeklyPlan.push({
        pagi: getRecipeByTime("pagi"),
        siang: getRecipeByTime("siang"),
        malam: getRecipeByTime("malam"),
      });
    }
    res
      .status(200)
      .json({ message: "Menu berhasil diganti!", data: formattedWeeklyPlan });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mengganti menu", error: error.message });
  }
};

module.exports = {
  generateSingleMenu,
  generateWeeklyPlan,
  searchMenuByIngredient,
  deleteWeeklyPlan,
  getAlternativeRecipes,
  swapMealPlanItem,
};
