/**
 * ============================================================================
 * GROWTH & NUTRITION HELPER (WHO & KEMENKES STANDARD)
 * ============================================================================
 */

// ==========================================
// 1. PERHITUNGAN UMUR (DOB)
// ==========================================
/**
 * Menghitung umur anak dalam hitungan bulan secara presisi.
 */
const getAgeInMonths = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months -= birthDate.getMonth();
  months += today.getMonth();
  
  // Penyesuaian jika hari ini belum melewati tanggal lahir di bulan berjalan
  if (today.getDate() < birthDate.getDate()) {
    months--;
  }
  
  return months <= 0 ? 0 : months;
};

// ==========================================
// 2. KALKULASI Z-SCORE (WFA, HFA, WFH)
// ==========================================
/**
 * Menghitung Z-Score menggunakan metode LMS (Lambda-Mu-Sigma) dari WHO.
 * Fungsi ini re-usable untuk WFA (Berat/Umur), HFA (Tinggi/Umur), dan WFH (Berat/Tinggi).
 * @param {number} x - Nilai aktual (Berat/Tinggi anak saat ini)
 * @param {number} l - Lambda (Skewness) dari tabel WHO
 * @param {number} m - Mu (Median / Nilai Ideal) dari tabel WHO
 * @param {number} s - Sigma (Coefficient of Variation) dari tabel WHO
 */
const calculateLMS = (x, l, m, s) => {
  const X = parseFloat(x);
  const L = parseFloat(l);
  const M = parseFloat(m);
  const S = parseFloat(s);

  if (S === 0) return 0; 
  if (L === 0) return parseFloat((Math.log(X / M) / S).toFixed(2));
  
  const zScore = (Math.pow(X / M, L) - 1) / (L * S);
  return parseFloat(zScore.toFixed(2));
};

// ==========================================
// 3. STATUS GIZI & GLOBAL STATUS
// ==========================================
const getStatusWFA = (zScore) => {
  if (zScore < -3) return "Berat Badan Sangat Kurang";
  if (zScore >= -3 && zScore < -2) return "Berat Badan Kurang";
  if (zScore >= -2 && zScore <= 1) return "Berat Badan Normal";
  return "Risiko Berat Badan Lebih";
};

const getStatusHFA = (zScore) => {
  if (zScore < -3) return "Sangat Pendek (Severely Stunted)";
  if (zScore >= -3 && zScore < -2) return "Pendek (Stunted)";
  if (zScore >= -2 && zScore <= 3) return "Normal";
  return "Tinggi";
};

const getStatusWFH = (zScore) => {
  if (zScore < -3) return "Gizi Buruk (Severely Wasted)";
  if (zScore >= -3 && zScore < -2) return "Gizi Kurang (Wasted)";
  if (zScore >= -2 && zScore <= 1) return "Gizi Baik (Normal)";
  if (zScore > 1 && zScore <= 2) return "Beresiko Gizi Lebih";
  if (zScore > 2 && zScore <= 3) return "Gizi Lebih (Overweight)";
  return "Obesitas (Obese)";
};

/**
 * Menentukan Status Global Anak.
 * Prioritas evaluasi medis biasanya mendahulukan gizi akut (WFH) lalu kronis (HFA).
 */
const getGlobalStatus = (statusWFH, statusHFA) => {
  // Jika ada masalah gizi akut (buruk/kurang/lebih/obesitas), jadikan status utama
  if (statusWFH !== "Gizi Baik (Normal)") return statusWFH;
  
  // Jika gizi akut normal, tapi ada masalah stunting (kronis), jadikan status utama
  if (statusHFA.includes("Pendek")) return statusHFA;

  // Jika keduanya aman
  return "Sehat & Normal";
};

// ==========================================
// 4. BUDGETING (FUZZY LOGIC) & WATERLOW
// ==========================================
const calculateDynamicBudget = (zScoreWFH, gajiOrangTua) => {
  let persentase = 0;
  
  if (zScoreWFH >= -1.9) {
    persentase = 10 + (Math.abs(zScoreWFH) / 1.9) * (12 - 10);
  } else if (zScoreWFH < -1.9 && zScoreWFH >= -3.0) {
    persentase = 12 + ((Math.abs(zScoreWFH) - 1.9) / (3.0 - 1.9)) * (20 - 12);
  } else {
    persentase = 25;
  }

  // Hitung nilai mentah
  const rawOptimalBudget = (persentase / 100) * parseFloat(gajiOrangTua);
  
  // PEMBULATAN KE RIBUAN TERDEKAT (berakhiran 000)
  const optimalBudgetRounded = Math.round(rawOptimalBudget / 1000) * 1000;
  
  return {
    persentase_gaji: parseFloat(persentase.toFixed(1)),
    optimal_budget: optimalBudgetRounded
  };
};

/**
 * Menghitung Kebutuhan Kalori (Menggunakan konsep Waterlow untuk Catch-up)
 */
const calculateWaterlowCalories = (zScoreWFH, beratAktual, beratIdeal, akgKkalPerKg) => {
  if (zScoreWFH < -2.0) {
    // Fase Catch-up Growth
    const kkalPerKgHari = (akgKkalPerKg * beratIdeal) / beratAktual;
    return kkalPerKgHari * beratAktual; 
  }
  // Fase Pemeliharaan (Normal)
  return akgKkalPerKg * beratIdeal;
};

module.exports = {
  getAgeInMonths,
  calculateLMS,
  getStatusWFA,
  getStatusHFA,
  getStatusWFH,
  getGlobalStatus,
  calculateDynamicBudget,
  calculateWaterlowCalories
};