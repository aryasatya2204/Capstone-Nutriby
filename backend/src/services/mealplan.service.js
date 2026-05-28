const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getSafeCandidateRecipes } = require("../utils/recipe.helper");
const { getAgeInMonths } = require("../utils/growth.helper");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const executeMealPlanAI = async (childId, isUpdate = false) => {
  try {
    // ambil data anak dan log pertumbuhan terbaru
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

    const budgetLimit = Math.round(parseFloat(child.optimal_budget_cache));
    const mlDailyBudget = Math.round(budgetLimit / 30);

    // saring kandidat resep yang aman
    const { candidates } = await getSafeCandidateRecipes(
      ageInMonths,
      allergyIds,
    );
    if (candidates.length === 0)
      throw new Error("Tidak ada kandidat resep yang aman.");

    // oper data ke model ml untuk rekomendasi resep
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
      "https://aryasatya2204-recomendasi-menu.hf.space/recommend",
      mlPayload,
    );
    const passedRecommendations = mlResponse.data.recommendations.filter(
      (r) => r.score >= 0.6,
    );

    if (passedRecommendations.length === 0)
      throw new Error("Model gagal menemukan resep.");

    // urutkan skor resep tertinggi
    passedRecommendations.sort((a, b) => b.score - a.score);

    const approvedRecipesDetails = passedRecommendations.map((rec) => {
      const detail = candidates.find((c) => c.id === rec.recipe_id);
      return { ...detail, match_score: rec.score };
    });

    // susun menu 30 hari dengan batas budget otomatis
    const cheapestPrice = Math.min(
      ...approvedRecipesDetails.map((r) => parseFloat(r.est_price)),
    );
    const TOTAL_MEALS_PER_MONTH = 90;

    if (budgetLimit < cheapestPrice * TOTAL_MEALS_PER_MONTH) {
      throw new Error("Budget estimasi terlalu rendah untuk jadwal bulanan.");
    }

    let actualTotalCost = 0;
    let currentMealIndex = 0;

    for (let day = 1; day <= 30; day++) {
      let dailyMenuIds = new Set();

      for (let mealIndex = 0; mealIndex < 3; mealIndex++) {
        const remainingMeals = TOTAL_MEALS_PER_MONTH - currentMealIndex - 1;
        const maxAllowablePrice =
          budgetLimit - actualTotalCost - remainingMeals * cheapestPrice;

        let selectedRecipe = null;
        let offset = 0;

        while (!selectedRecipe && offset < approvedRecipesDetails.length) {
          let poolIndex =
            (currentMealIndex + offset) % approvedRecipesDetails.length;
          let candidate = approvedRecipesDetails[poolIndex];

          if (
            !dailyMenuIds.has(candidate.id) &&
            parseFloat(candidate.est_price) <= maxAllowablePrice
          ) {
            selectedRecipe = candidate;
            dailyMenuIds.add(candidate.id);
          }
          offset++;
        }

        if (!selectedRecipe)
          throw new Error(
            "Gagal menyusun jadwal bulanan karena batasan budget AI.",
          );

        actualTotalCost += parseFloat(selectedRecipe.est_price);
        currentMealIndex++;
      }
    }

    const penghematan = budgetLimit - actualTotalCost;
    const targetGiziText = `Target Harian: Kalori ${latestLog.target_kalori} kkal, Protein ${latestLog.target_protein}g, Lemak ${latestLog.target_lemak}g, Zat Besi ${latestLog.target_besi}mg, Zinc ${latestLog.target_zinc}mg.`;

    // buat teks edukasi gizi pakai gemini ai
    let promptStatus = `
Bertindaklah sebagai Ahli Gizi Anak yang empatik. 
Data anak: Nama ${child.name}, Status Gizi: ${latestLog.global_status}. 
AI telah merancang jadwal MPASI sebulan penuh (90 porsi) dengan total biaya aktual Rp ${Math.round(actualTotalCost).toLocaleString("id-ID")}.
${targetGiziText}

Tugas: Buat tepat 2 paragraf singkat.
Paragraf 1: Berikan edukasi gizi ringan tentang kondisi anak saat ini dan sebutkan secara halus pentingnya memenuhi salah satu target makro/mikro nutrien di atas.
Paragraf 2: Berikan pujian kecil dan semangat kepada orang tua karena telah menyajikan makanan bernutrisi.
Gunakan bahasa Indonesia yang santai, profesional, dan hangat (sapaan Bunda/Ayah). Jangan gunakan emoji, simbol atau format markdown. Maksimal 4 kalimat per paragraf.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const geminiResult = await model.generateContent(promptStatus);
    const aiInsightText = geminiResult.response.text();

    // simpan rencana makan ke database
    const savedMealPlan = await prisma.mealPlan.create({
      data: {
        child_id: child.id,
        plan_type: "Bulanan",
        max_budget_limit: budgetLimit,
        actual_total_cost: actualTotalCost,
        ai_insight_text: aiInsightText,
      },
    });

    return savedMealPlan;
  } catch (error) {
    throw new Error(`AI Pipeline Error: ${error.message}`);
  }
};

module.exports = { executeMealPlanAI };
