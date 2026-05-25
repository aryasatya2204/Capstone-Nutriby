const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getAgeInMonths } = require("../utils/growth.helper");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// format tanggal jadi YYYY-MM-DD waktu wib
const getWIBDateString = (dateObj) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(dateObj);
};

// ambil tips gizi harian anak pakai ai
const getDailyInsight = async (req, res) => {
  try {
    const { childId } = req.params;

    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: { growth_logs: { orderBy: { record_date: "desc" }, take: 1 } },
    });

    if (!child)
      return res.status(404).json({ message: "Data anak tidak ditemukan." });

    const todayString = getWIBDateString(new Date());
    const lastInsightString = child.last_insight_date
      ? getWIBDateString(new Date(child.last_insight_date))
      : null;

    // cek cache biar gemini gak kepanggil dua kali sehari
    if (lastInsightString === todayString && child.daily_insight_text) {
      return res.status(200).json({ insight: child.daily_insight_text });
    }

    const latestLog = child.growth_logs[0];
    const ageMonths = getAgeInMonths(child.dob);
    const statusGizi = latestLog ? latestLog.global_status : "Normal";

    const budgetLimit = child.optimal_budget_cache
      ? parseFloat(child.optimal_budget_cache)
      : 0;

    const prompt = `
      Bertindaklah sebagai Ahli Gizi Anak yang sangat empatik.
      Data Anak: Nama ${child.name}, Usia ${ageMonths} bulan, Status Gizi: ${statusGizi}.

      Tugas: Buat tepat 1 kalimat tips gizi harian yang relevan dengan kondisi anak dan usia MPASI-nya.
      Gunakan bahasa Indonesia yang santai dan hangat (sapaan Bunda/Ayah). Jangan gunakan emoji, simbol bintang (*), tanda pagar (#), atau format markdown apapun. Maksimal 2 kalimat.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const newInsight = result.response.text().trim();

    // simpan tips baru dan tandai tanggal hari ini
    await prisma.child.update({
      where: { id: childId },
      data: {
        daily_insight_text: newInsight,
        last_insight_date: new Date(),
      },
    });

    res.status(200).json({ insight: newInsight });
  } catch (error) {
    console.error("Error generating daily insight:", error);
    res.status(500).json({ message: "Gagal memproses tips harian." });
  }
};

module.exports = { getDailyInsight };
