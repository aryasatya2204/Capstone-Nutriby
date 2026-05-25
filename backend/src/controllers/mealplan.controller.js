const { executeMealPlanAI } = require("../services/mealplan.service");

// panggil ai service buat bikin insight rekomendasi makanan
const generateRecommendationInsight = async (req, res) => {
  try {
    const { childId } = req.params;

    const savedMealPlan = await executeMealPlanAI(childId, false);

    res.status(201).json({
      message: "Insight awal berhasil di-generate dan disimpan ke database!",
      insight: savedMealPlan,
    });
  } catch (error) {
    console.error("Error generating insight in controller:", error.message);

    if (
      error.message.includes("Data anak") ||
      error.message.includes("kandidat resep")
    ) {
      return res.status(404).json({ message: error.message });
    }

    res
      .status(500)
      .json({ message: "Gagal memproses AI Pipeline", error: error.message });
  }
};

module.exports = { generateRecommendationInsight };
