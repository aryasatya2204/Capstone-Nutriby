const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Pastikan import helper ini sesuai dengan file Anda
const { getAgeInMonths } = require("../utils/growth.helper");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * ============================================================================
 * 1. GET GROWTH HISTORY FOR CHART (SEPARATED)
 * ============================================================================
 */
const getGrowthChartData = async (req, res) => {
  try {
    const { childId } = req.params;

    const child = await prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      return res.status(404).json({ message: "Data anak tidak ditemukan." });
    }

    const logs = await prisma.growthLog.findMany({
      where: { child_id: childId },
      orderBy: { record_date: "asc" },
    });

    if (logs.length === 0) {
      return res.status(200).json({
        message: "Anak ini belum memiliki riwayat pertumbuhan.",
        data: {
          weight_chart: [],
          height_chart: []
        }
      });
    }

    const weightChart = logs.map((log) => ({
      log_id: log.id,
      date_label: log.record_date.toISOString().split("T")[0],
      value: parseFloat(log.weight), 
      zscore: parseFloat(log.zscore_wfa), 
      status: log.global_status 
    }));

    const heightChart = logs.map((log) => ({
      log_id: log.id,
      date_label: log.record_date.toISOString().split("T")[0],
      value: parseFloat(log.tinggi), 
      zscore: parseFloat(log.zscore_hfa), 
      status: log.global_status 
    }));

    res.status(200).json({
      message: "Data grafik riwayat pertumbuhan berhasil ditarik!",
      data: {
        weight_chart: weightChart,
        height_chart: heightChart
      }
    });

  } catch (error) {
    console.error("Error fetching chart data:", error.message);
    res.status(500).json({ message: "Gagal mengambil data grafik", error: error.message });
  }
};

/**
 * ============================================================================
 * 2. ADD WEEKLY GROWTH LOG
 * ============================================================================
 */
const addWeeklyGrowthLog = async (req, res) => {
  try {
    const { childId } = req.params;
    const { weight, height } = req.body; 

    if (weight === undefined || height === undefined) {
      return res.status(400).json({ message: "Berat badan (weight) dan Tinggi badan (height) wajib diisi." });
    }

    const child = await prisma.child.findUnique({
      where: { id: childId },
    });

    if (!child) {
      return res.status(404).json({ message: "Data anak tidak ditemukan." });
    }

    const ageInMonths = getAgeInMonths(child.dob);

    // --------------------------------------------------------------------------
    // TODO: GANTI BAGIAN INI DENGAN FUNGSI HELPER WHO/KEMENKES ANDA NANTINYA
    // --------------------------------------------------------------------------
    const zscore_wfa_calc = 0; 
    const zscore_hfa_calc = 0; 
    const zscore_wfh_calc = 0; 
    const status_calc = "Gizi Baik"; 
    const kalori_calc = 800;
    const protein_calc = 15;
    const lemak_calc = 25;
    const besi_calc = 7;
    const zinc_calc = 3;
    // --------------------------------------------------------------------------

    const newLog = await prisma.growthLog.create({
      data: {
        child_id: childId,
        berat: parseFloat(weight),
        tinggi: parseFloat(height),
        zscore_wfa: zscore_wfa_calc,
        zscore_hfa: zscore_hfa_calc,
        zscore_wfh: zscore_wfh_calc,
        global_status: status_calc,
        target_kalori: kalori_calc,
        target_protein: protein_calc,
        target_lemak: lemak_calc,
        target_besi: besi_calc,
        target_zinc: zinc_calc,
        record_date: new Date()
      }
    });

    res.status(201).json({
      message: "Data pertumbuhan mingguan berhasil dicatat!",
      data: newLog
    });

  } catch (error) {
    console.error("Error adding growth log:", error.message);
    res.status(500).json({ message: "Gagal menyimpan log pertumbuhan", error: error.message });
  }
};

// ============================================================================
// BAGIAN INI YANG SEBELUMNYA HILANG DAN MEMBUAT EXPRESS.JS CRASH
// ============================================================================
module.exports = { 
  getGrowthChartData, 
  addWeeklyGrowthLog 
};