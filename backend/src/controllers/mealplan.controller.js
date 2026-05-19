const { executeMealPlanAI } = require('../services/mealplan.service');

/**
 * Controller ini sekarang bertugas hanya untuk melayani request dari Frontend (jika ada).
 * Seluruh logika berat AI sudah dipindahkan ke mealplan.service.js agar bisa di-reuse.
 */
const generateRecommendationInsight = async (req, res) => {
  try {
    const { childId } = req.params;

    // Memanggil service AI (isUpdate = false karena ini digenerate pertama kali atau secara manual)
    const savedMealPlan = await executeMealPlanAI(childId, false);

    res.status(201).json({
      message: "Insight awal berhasil di-generate dan disimpan ke database!",
      insight: savedMealPlan
    });

  } catch (error) {
    console.error("Error generating insight in controller:", error.message);
    
    // Memberikan respon error yang lebih spesifik jika AI gagal
    if (error.message.includes("Data anak") || error.message.includes("kandidat resep")) {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: "Gagal memproses AI Pipeline", error: error.message });
  }
};

module.exports = { generateRecommendationInsight };