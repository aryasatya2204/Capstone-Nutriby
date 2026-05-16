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

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateRecommendationInsight = async (req, res) => {
  try {
    const { childId } = req.params;

    // ==========================================
    // 1. AMBIL DATA ANAK & GROWTH LOG (PURE DARI DB)
    // ==========================================
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        preferences: { include: { ingredient: true } },
        allergies: { include: { allergy_category: true } },
        growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
      },
    });

    if (!child || child.growth_logs.length === 0) {
      return res
        .status(404)
        .json({ message: "Data anak atau log pertumbuhan tidak ditemukan." });
    }

    const latestLog = child.growth_logs[0];
    const ageInMonths = getAgeInMonths(child.dob);
    const allergyIds = child.allergies.map((a) => a.allergy_category_id);

    // Ambil budget langsung dari cache (Hasil hitungan Fuzzy Logic 2A)
    const budgetLimit = parseFloat(child.optimal_budget_cache);

    // ==========================================
    // 2. CANDIDATE GENERATION (Filter Umur & Alergi)
    // ==========================================
    const { candidates } = await getSafeCandidateRecipes(
      ageInMonths,
      allergyIds,
    );

    if (candidates.length === 0) {
      return res
        .status(404)
        .json({
          message:
            "Tidak ada kandidat resep yang aman untuk umur dan alergi anak ini.",
        });
    }

    // ==========================================
    // 3. HIT FASTAPI (Inference Model Keras)
    // ==========================================
    const mlPayload = {
      user: {
        id: child.id,
        age_months: ageInMonths,
        zscore_wfh: parseFloat(latestLog.zscore_wfh),
        zscore_wfa: parseFloat(latestLog.zscore_wfa),
        zscore_hfa: parseFloat(latestLog.zscore_hfa),
        daily_budget: budgetLimit / 30, // Konversi ke harian untuk model
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

    const mlResponse = await axios.post(
      "http://127.0.0.1:8000/recommend",
      mlPayload,
    );

    // ==========================================
    // 4. FILTER SCORE > 0.6 & KALKULASI 90 MENU
    // ==========================================
    // Saring hanya resep yang direkomendasikan dengan score di atas 0.6
    const passedRecommendations = mlResponse.data.recommendations.filter(
      (r) => r.score >= 0.6,
    );

    if (passedRecommendations.length === 0) {
      return res
        .status(404)
        .json({
          message: "Model gagal menemukan resep dengan kecocokan di atas 0.6.",
        });
    }

    // Ambil detail harga dari resep yang lolos filter
    const passedRecipeIds = passedRecommendations.map((r) => r.recipe_id);
    const approvedRecipesDetails = candidates.filter((c) =>
      passedRecipeIds.includes(c.id),
    );

    // Kalkulasi Actual Cost untuk 90 Porsi (1 Bulan x 3 Makan)
    // Logika: Merotasi daftar resep yang disetujui AI hingga mencapai 90 porsi
    let actualTotalCost = 0;
    const TOTAL_MEALS_PER_MONTH = 90;

    for (let i = 0; i < TOTAL_MEALS_PER_MONTH; i++) {
      // Modulo (%) digunakan untuk mengulang/merotasi resep jika jumlah approved_recipes < 90
      const recipe = approvedRecipesDetails[i % approvedRecipesDetails.length];
      actualTotalCost += recipe.est_price;
    }

    const penghematan = budgetLimit - actualTotalCost;

    // ==========================================
    // 5. THE FINISHING TOUCH: GEMINI API
    // ==========================================
    const prompt = `
      Bertindaklah sebagai Ahli Gizi Anak dan Perencana Keuangan yang sangat empatik.
      Data Anak: Nama ${child.name}, Status Gizi: ${latestLog.global_status}.
      Saran Anggaran Bulanan Bunda: Rp ${budgetLimit}.
      Berita baik: AI kami berhasil merancang rekomendasi 90 porsi makan sebulan penuh (3x sehari) yang sesuai standar medis hanya dengan total Rp ${actualTotalCost} (Lebih hemat Rp ${penghematan}).
      
      Tugas: Buat 2 paragraf singkat. 
      Paragraf 1: Berikan edukasi gizi ringan tentang kondisi anak saat ini dengan bahasa yang menenangkan (tidak menghakimi).
      Paragraf 2: Berikan semangat terkait penghematan budget ini dan berikan pujian kecil kepada orang tua.
      Gunakan bahasa Indonesia yang santai, profesional, dan hangat (gunakan sapaan Bunda/Ayah).
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const geminiResult = await model.generateContent(prompt);
    const aiInsightText = geminiResult.response.text();

    // ==========================================
    // 6. SIMPAN KE DATABASE (Tabel MealPlan)
    // ==========================================
    const savedMealPlan = await prisma.mealPlan.create({
      data: {
        child_id: child.id,
        plan_type: 'Bulanan', 
        max_budget_limit: budgetLimit,
        actual_total_cost: actualTotalCost,
        ai_insight_text: aiInsightText
      }
    });

    // ==========================================
    // 7. RESPONSE KE FRONTEND
    // ==========================================
    res.status(201).json({
      message: "Insight awal berhasil di-generate dan disimpan ke database!",
      insight: savedMealPlan
    });

  } catch (error) {
    console.error("Error generating insight:", error.message);
    res.status(500).json({ message: "Gagal memproses AI Pipeline", error: error.message });
  }
};

module.exports = { generateRecommendationInsight };
