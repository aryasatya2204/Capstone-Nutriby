// hitung umur anak dalam bulan
const getAgeInMonths = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();

  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months -= birthDate.getMonth();
  months += today.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months--;
  }

  return months <= 0 ? 0 : months;
};

// hitung z-score pakai metode lms who
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

// cek status gizi wfa, hfa, dan wfh
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

// tentukan status global anak
const getGlobalStatus = (statusWFH, statusHFA) => {
  if (statusWFH !== "Gizi Baik (Normal)") return statusWFH;
  if (statusHFA.includes("Pendek")) return statusHFA;
  return "Sehat & Normal";
};

// hitung budget makanan dinamis
const calculateDynamicBudget = (zScoreWFH, gajiOrangTua) => {
  let persentase = 0;

  if (zScoreWFH >= -1.9) {
    persentase = 10 + (Math.abs(zScoreWFH) / 1.9) * (12 - 10);
  } else if (zScoreWFH < -1.9 && zScoreWFH >= -3.0) {
    persentase = 12 + ((Math.abs(zScoreWFH) - 1.9) / (3.0 - 1.9)) * (20 - 12);
  } else {
    persentase = 25;
  }

  const rawOptimalBudget = (persentase / 100) * parseFloat(gajiOrangTua);
  const optimalBudgetRounded = Math.round(rawOptimalBudget / 1000) * 1000;

  return {
    persentase_gaji: parseFloat(persentase.toFixed(1)),
    optimal_budget: optimalBudgetRounded,
  };
};

// hitung kalori pakai rumus waterlow
const calculateWaterlowCalories = (
  zScoreWFH,
  beratAktual,
  beratIdeal,
  akgKkalPerKg,
) => {
  if (zScoreWFH < -2.0) {
    const kkalPerKgHari = (akgKkalPerKg * beratIdeal) / beratAktual;
    return kkalPerKgHari * beratAktual;
  }
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
  calculateWaterlowCalories,
};
