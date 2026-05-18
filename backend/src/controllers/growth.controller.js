const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// 1. Import SEMUA helper yang dibutuhkan dari file helper Anda
const { 
  getAgeInMonths, 
  calculateLMS, 
  getStatusWFA, 
  getStatusHFA, 
  getStatusWFH, 
  getGlobalStatus, 
  calculateWaterlowCalories 
} = require("../utils/growth.helper");

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

    // PERBAIKAN: log.weight diubah jadi log.berat, dan ditambah validasi null safety
    const weightChart = logs.map((log) => ({
      log_id: log.id,
      date_label: log.record_date.toISOString().split("T")[0],
      value: log.berat ? parseFloat(log.berat) : null, 
      zscore: log.zscore_wfa ? parseFloat(log.zscore_wfa) : null, 
      status: log.global_status 
    }));

    const heightChart = logs.map((log) => ({
      log_id: log.id,
      date_label: log.record_date.toISOString().split("T")[0],
      value: log.tinggi ? parseFloat(log.tinggi) : null, 
      zscore: log.zscore_hfa ? parseFloat(log.zscore_hfa) : null, 
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
 * 2. ADD WEEKLY GROWTH LOG (FULLY INTEGRATED)
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
    const currentWeight = parseFloat(weight);
    const currentHeight = parseFloat(height);

    // --------------------------------------------------------------------------
    // A. TARIK DATA STANDAR WHO DARI DATABASE
    // --------------------------------------------------------------------------
    const whoWFA = await prisma.whoStandard.findFirst({
      where: { indicator: "WFA", gender: child.gender, month_or_length: ageInMonths }
    });

    const whoHFA = await prisma.whoStandard.findFirst({
      where: { indicator: "HFA", gender: child.gender, month_or_length: ageInMonths }
    });

    // Pembulatan tinggi badan ke 0.5 terdekat untuk mencocokkan standar tabel WFH WHO
    const heightRounded = Math.round(currentHeight * 2) / 2;
    const whoWFH = await prisma.whoStandard.findFirst({
      where: { indicator: "WFH", gender: child.gender, month_or_length: heightRounded }
    });

    // --------------------------------------------------------------------------
    // B. KALKULASI Z-SCORE & STATUS GIZI
    // --------------------------------------------------------------------------
    const zscore_wfa_calc = whoWFA ? calculateLMS(currentWeight, whoWFA.l, whoWFA.m, whoWFA.s) : null;
    const zscore_hfa_calc = whoHFA ? calculateLMS(currentHeight, whoHFA.l, whoHFA.m, whoHFA.s) : null;
    const zscore_wfh_calc = whoWFH ? calculateLMS(currentWeight, whoWFH.l, whoWFH.m, whoWFH.s) : null;

    const status_wfa = zscore_wfa_calc !== null ? getStatusWFA(zscore_wfa_calc) : null;
    const status_hfa = zscore_hfa_calc !== null ? getStatusHFA(zscore_hfa_calc) : null;
    const status_wfh = zscore_wfh_calc !== null ? getStatusWFH(zscore_wfh_calc) : null;
    
    const global_status_calc = (status_wfh && status_hfa) 
      ? getGlobalStatus(status_wfh, status_hfa) 
      : "Data Tidak Lengkap";

    // --------------------------------------------------------------------------
    // C. TARIK DATA STANDAR AKG & KALKULASI WATERLOW
    // --------------------------------------------------------------------------
    const akg = await prisma.akgStandard.findFirst({
      where: {
        gender: child.gender,
        min_age_months: { lte: ageInMonths },
        max_age_months: { gte: ageInMonths }
      }
    });

    let target_kalori = null;
    let target_protein = null;
    let target_lemak = null;
    let target_besi = null;
    let target_zinc = null;
    
    // Berat Badan Ideal (BBI) diambil dari Median (m) standar WFA WHO
    const bbi_kg = whoWFA ? parseFloat(whoWFA.m) : currentWeight;

    if (akg) {
      // Hitung Kalori Catch-up (Waterlow)
      const kkalPerKg = parseFloat(akg.calories) / parseFloat(akg.base_weight_kg);
      target_kalori = calculateWaterlowCalories(zscore_wfh_calc || 0, currentWeight, bbi_kg, kkalPerKg);
      
      // Ambil target nutrisi lainnya langsung dari standar AKG
      target_protein = parseFloat(akg.protein);
      target_lemak = parseFloat(akg.fat);
      target_besi = parseFloat(akg.iron);
      target_zinc = parseFloat(akg.zinc);
    }

    // --------------------------------------------------------------------------
    // D. SIMPAN KE DATABASE (Sesuai dengan schema.prisma)
    // --------------------------------------------------------------------------
    const newLog = await prisma.growthLog.create({
      data: {
        child_id: childId,
        berat: currentWeight,
        tinggi: currentHeight,
        zscore_wfa: zscore_wfa_calc,
        zscore_hfa: zscore_hfa_calc,
        zscore_wfh: zscore_wfh_calc,
        status_wfa: status_wfa,
        status_hfa: status_hfa,
        status_wfh: status_wfh,
        global_status: global_status_calc,
        bbi_kg: bbi_kg,
        target_kalori: target_kalori,
        target_protein: target_protein,
        target_lemak: target_lemak,
        target_besi: target_besi,
        target_zinc: target_zinc,
        record_date: new Date()
      }
    });

    res.status(201).json({
      message: "Data pertumbuhan mingguan berhasil dicatat beserta analisis gizinya!",
      data: newLog
    });

  } catch (error) {
    console.error("Error adding growth log:", error.message);
    res.status(500).json({ message: "Gagal menyimpan log pertumbuhan", error: error.message });
  }
};

module.exports = { 
  getGrowthChartData, 
  addWeeklyGrowthLog 
};