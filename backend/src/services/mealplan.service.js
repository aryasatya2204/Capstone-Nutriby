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
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        preferences: { include: { ingredient: true } },
        allergies: { include: { allergy_category: true } },
        growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
      },
    });

    if (!child || child.growth_logs.length === 0) throw new Error("Data anak atau log pertumbuhan tidak ditemukan.");

    const latestLog = child.growth_logs[0];
    const ageInMonths = getAgeInMonths(child.dob);
    const allergyIds = child.allergies.map((a) => a.allergy_category_id);
    const budgetLimit = parseFloat(child.optimal_budget_cache);

    // 1. FILTER UMUR & ALERGI
    const { candidates } = await getSafeCandidateRecipes(ageInMonths, allergyIds);
    if (candidates.length === 0) throw new Error("Tidak ada kandidat resep yang aman.");

    // 2. HIT FASTAPI
    const mlPayload = {
      user: {
        id: child.id,
        age_months: ageInMonths,
        zscore_wfh: parseFloat(latestLog.zscore_wfh),
        zscore_wfa: parseFloat(latestLog.zscore_wfa),
        zscore_hfa: parseFloat(latestLog.zscore_hfa),
        daily_budget: budgetLimit / 30,
        target_calories: parseFloat(latestLog.target_kalori),
        target_protein: parseFloat(latestLog.target_protein),
        target_fat: parseFloat(latestLog.target_lemak),
        target_iron: parseFloat(latestLog.target_besi),
        target_zinc: parseFloat(latestLog.target_zinc),
        favorite_foods: child.preferences.map((p) => p.ingredient.name),
        allergies: child.allergies.map(a => a.allergy_category.name)
      },
      recipes: candidates,
    };

    const mlResponse = await axios.post("http://127.0.0.1:8000/recommend", mlPayload);
    const passedRecommendations = mlResponse.data.recommendations.filter((r) => r.score >= 0.6);
    if (passedRecommendations.length === 0) throw new Error("Model gagal menemukan resep.");

    // 3. KALKULASI COST
    const passedRecipeIds = passedRecommendations.map((r) => r.recipe_id);
    const approvedRecipesDetails = candidates.filter((c) => passedRecipeIds.includes(c.id));

    let actualTotalCost = 0;
    const TOTAL_MEALS_PER_MONTH = 90;
    for (let i = 0; i < TOTAL_MEALS_PER_MONTH; i++) {
      actualTotalCost += approvedRecipesDetails[i % approvedRecipesDetails.length].est_price;
    }
    const penghematan = budgetLimit - actualTotalCost;

    // 4. HIT GEMINI
    let promptStatus = isUpdate
      ? `Bertindaklah sebagai Ahli Gizi Anak yang empatik. Data terbaru anak: Nama ${child.name}, Status Gizi: ${latestLog.global_status}. Saran Anggaran Bulanan: Rp ${Math.round(budgetLimit).toLocaleString("id-ID")}. AI merancang 90 porsi senilai Rp ${Math.round(actualTotalCost).toLocaleString("id-ID")} (hemat Rp ${Math.round(penghematan).toLocaleString("id-ID")}).

Tugas: Buat tepat 2 paragraf singkat.
Paragraf 1: Berikan evaluasi positif atas perubahan data terbaru anak dengan bahasa menenangkan.
Paragraf 2: Berikan semangat terkait penghematan budget dan pujian kecil kepada orang tua.
Gunakan bahasa Indonesia yang santai, profesional, dan hangat (sapaan Bunda/Ayah). Jangan gunakan emoji, simbol bintang (*), tanda pagar (#), atau format markdown apapun. Maksimal 4 kalimat per paragraf.`
      : `Bertindaklah sebagai Ahli Gizi Anak yang empatik. Data anak: Nama ${child.name}, Status Gizi: ${latestLog.global_status}. Saran Anggaran Bulanan: Rp ${Math.round(budgetLimit).toLocaleString("id-ID")}. AI merancang 90 porsi senilai Rp ${Math.round(actualTotalCost).toLocaleString("id-ID")} (hemat Rp ${Math.round(penghematan).toLocaleString("id-ID")}).

Tugas: Buat tepat 2 paragraf singkat.
Paragraf 1: Berikan edukasi gizi ringan tentang kondisi anak saat ini dengan bahasa yang menenangkan (tidak menghakimi).
Paragraf 2: Berikan semangat terkait penghematan budget dan pujian kecil kepada orang tua.
Gunakan bahasa Indonesia yang santai, profesional, dan hangat (sapaan Bunda/Ayah). Jangan gunakan emoji, simbol bintang (*), tanda pagar (#), atau format markdown apapun. Maksimal 4 kalimat per paragraf.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const geminiResult = await model.generateContent(promptStatus);
    const aiInsightText = geminiResult.response.text();

    // 5. SIMPAN KE DATABASE MEALPLAN
    const savedMealPlan = await prisma.mealPlan.create({
      data: {
        child_id: child.id,
        plan_type: 'Bulanan', 
        max_budget_limit: budgetLimit,
        actual_total_cost: actualTotalCost,
        ai_insight_text: aiInsightText
      }
    });

    return savedMealPlan;
  } catch (error) {
    throw new Error(`AI Pipeline Error: ${error.message}`);
  }
};

module.exports = { executeMealPlanAI };