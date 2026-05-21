/**
 * ============================================================================
 * WeeklyPlan.jsx — Generator Rekomendasi MPASI Mingguan
 * ============================================================================
 * Halaman ini menampilkan fitur Plan Mingguan NutriBy.
 *
 * ALUR KERJA:
 * 1. Saat halaman dimuat, fetch data anak dari GET /api/children
 * 2. User bisa atur budget lewat slider/input (dikirim ke backend)
 * 3. Klik "Buat Rekomendasi" → POST /api/mealplan/generate-insight/:childId
 *    Backend meneruskan budget ke AI untuk menyesuaikan menu
 * 4. Hasil ditampilkan sebagai grid menu 7 hari (pagi, siang, malam)
 *    Menu di-randomize dari data MealPlanItem di database
 *
 * CATATAN INTEGRASI BACKEND:
 * - Endpoint generate: POST /api/mealplan/generate-insight/:childId
 *   → Body: { budget: number } (budget user dalam Rupiah)
 * - Endpoint get weekly plan: GET /api/mealplan/weekly/:childId
 *   → Belum ada, data menu sementara di-generate di FE dari insight
 * - Auth: semua request pakai Bearer token dari localStorage
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api";
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu", "Minggu"];

// Data menu contoh — dipakai saat API belum mengembalikan MealPlanItems detail
// Di production, ini akan diganti data nyata dari backend
const SAMPLE_MENU_POOL = {
  pagi: [
    { nama: "Bubur Ayam Labu", kalori: "180 kcal", emoji: "🍚", harga: 8500 },
    { nama: "Oatmeal Pisang", kalori: "160 kcal", emoji: "🌾", harga: 6000 },
    { nama: "Bubur Kacang Hijau", kalori: "150 kcal", emoji: "🫘", harga: 5500 },
    { nama: "Nasi Tim Wortel", kalori: "170 kcal", emoji: "🥕", harga: 7000 },
    { nama: "Bubur Beras Merah", kalori: "155 kcal", emoji: "🍙", harga: 6500 },
    { nama: "Puree Alpukat Susu", kalori: "200 kcal", emoji: "🥑", harga: 9000 },
    { nama: "Bubur Havermut Apel", kalori: "165 kcal", emoji: "🍎", harga: 7500 },
  ],
  siang: [
    { nama: "Nasi Tim Ikan Kakap", kalori: "210 kcal", emoji: "🐟", harga: 12000 },
    { nama: "Bubur Ayam Tempe", kalori: "190 kcal", emoji: "🍗", harga: 9000 },
    { nama: "Puree Kentang Daging", kalori: "220 kcal", emoji: "🥔", harga: 13000 },
    { nama: "Nasi Tim Telur Tahu", kalori: "195 kcal", emoji: "🥚", harga: 8000 },
    { nama: "Bubur Jagung Ayam", kalori: "205 kcal", emoji: "🌽", harga: 10000 },
    { nama: "Tim Ikan Salmon Bayam", kalori: "230 kcal", emoji: "🍣", harga: 18000 },
    { nama: "Nasi Tim Hati Ayam", kalori: "215 kcal", emoji: "🍖", harga: 11000 },
  ],
  malam: [
    { nama: "Bubur Brokoli Keju", kalori: "175 kcal", emoji: "🥦", harga: 9500 },
    { nama: "Tim Tahu Bayam", kalori: "160 kcal", emoji: "🫛", harga: 7000 },
    { nama: "Puree Labu Siam Ayam", kalori: "180 kcal", emoji: "🎃", harga: 8500 },
    { nama: "Bubur Wortel Tempe", kalori: "155 kcal", emoji: "🥦", harga: 7500 },
    { nama: "Tim Ubi Jalar Susu", kalori: "185 kcal", emoji: "🍠", harga: 8000 },
    { nama: "Bubur Kacang Merah", kalori: "165 kcal", emoji: "🫘", harga: 6500 },
    { nama: "Puree Buncis Daging", kalori: "190 kcal", emoji: "🌿", harga: 10000 },
  ],
};

// ─── HELPER: FORMAT RUPIAH ────────────────────────────────────────────────────
const formatRupiah = (angka) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

// ─── HELPER: GENERATE MENU MINGGUAN ──────────────────────────────────────────
// Mengacak menu dari pool berdasarkan seed (childId + minggu) agar konsisten per sesi
// Di production, ini akan digantikan data dari backend (MealPlanItem)
const generateWeeklyMenu = (seed = 0) => {
  // Simple seeded shuffle untuk konsistensi
  const seededRand = (max, offset) => Math.floor(((seed + offset) * 9301 + 49297) % 233280 / 233280 * max);
  return HARI.map((_, idx) => ({
    pagi: SAMPLE_MENU_POOL.pagi[seededRand(7, idx)],
    siang: SAMPLE_MENU_POOL.siang[seededRand(7, idx + 7)],
    malam: SAMPLE_MENU_POOL.malam[seededRand(7, idx + 14)],
  }));
};

// ─── KOMPONEN: KARTU MENU SATU HARI ──────────────────────────────────────────
function MealCard({ label, icon, menu, warna }) {
  return (
    <div
      className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3
        shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#8B2020]/20 cursor-pointer"
    >
      {/* Ikon waktu makan */}
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${warna} flex items-center justify-center text-lg shadow-sm`}>
        {icon}
      </div>

      {/* Detail menu */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#8B2020] transition-colors">
          {menu.emoji} {menu.nama}
        </p>
        <p className="text-xs text-gray-400">{menu.kalori}</p>
      </div>

      {/* Harga */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-bold text-[#8B2020]">{formatRupiah(menu.harga)}</p>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#8B2020] transition-colors ml-auto mt-0.5"
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

// ─── KOMPONEN: TAB HARI ───────────────────────────────────────────────────────
function DayTab({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200
        ${isActive
          ? "bg-[#8B2020] text-white shadow-md shadow-[#8B2020]/30"
          : "bg-white text-gray-500 hover:bg-[#8B2020]/10 hover:text-[#8B2020] border border-gray-200"
        }`}
    >
      {label}
    </button>
  );
}

// ─── KOMPONEN: BUDGET SLIDER ──────────────────────────────────────────────────
function BudgetSlider({ value, onChange, min, max, step }) {
  // Hitung persentase untuk warna progres slider
  const persen = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Budget Mingguan</span>
        <span className="text-lg font-black text-[#8B2020]">{formatRupiah(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 appearance-none rounded-full cursor-pointer"
          style={{
            // Gradient dua warna untuk progress bar slider
            background: `linear-gradient(to right, #8B2020 ${persen}%, #e5e7eb ${persen}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatRupiah(min)}</span>
        <span>{formatRupiah(max)}</span>
      </div>
    </div>
  );
}

// ─── KOMPONEN UTAMA: WeeklyPlan ───────────────────────────────────────────────
export default function WeeklyPlan() {
  // === STATE UTAMA ===
  const [childData, setChildData] = useState(null);         // Data anak dari /api/children
  const [isLoadingData, setIsLoadingData] = useState(true); // Loading saat fetch anak
  const [isGenerating, setIsGenerating] = useState(false);  // Loading saat generate AI
  const [hasGenerated, setHasGenerated] = useState(false);  // Apakah sudah ada hasil

  // === STATE TAMPILAN ===
  const [activeDay, setActiveDay] = useState(0);             // Index hari yang aktif (0=Senin)
  const [weeklyMenu, setWeeklyMenu] = useState([]);          // Array 7 hari menu
  const [aiInsight, setAiInsight] = useState("");            // Teks insight dari AI/Gemini
  const [errorMsg, setErrorMsg] = useState("");              // Pesan error bila ada

  // === STATE BUDGET ===
  // Budget default Rp 158.000 (sesuai desain referensi)
  // Nilai ini bisa diubah user sebelum dikirim ke AI
  const [budget, setBudget] = useState(158000);

  // ─── FETCH DATA ANAK SAAT MOUNT ────────────────────────────────────────────
  useEffect(() => {
    const fetchChild = async () => {
      try {
        const token = localStorage.getItem("token");
        // GET /api/children → ambil anak pertama (sama seperti dashboard.jsx)
        const res = await fetch(`${API_BASE}/children`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data && data.length > 0) {
          setChildData(data[0]);
          // Set budget awal dari optimal_budget_cache jika ada
          if (data[0].optimal_budget_cache) {
            setBudget(Math.round(parseFloat(data[0].optimal_budget_cache) / 4)); // Bagi 4 = per minggu
          }
        }
      } catch (err) {
        console.error("Gagal fetch data anak:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchChild();
  }, []);

  // ─── HANDLER: GENERATE REKOMENDASI ─────────────────────────────────────────
  // Mengirim budget ke backend, lalu backend teruskan ke AI (Gemini + ML)
  const handleGenerate = useCallback(async () => {
    if (!childData?.id) return;
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");

      /**
       * POST /api/mealplan/generate-insight/:childId
       * Body: { budget } — nilai budget mingguan dari user (Rupiah)
       * Backend akan konversi ke daily_budget = budget / 7 lalu diteruskan ke ML model
       *
       * Catatan: Endpoint ini saat ini menerima request dan mengembalikan
       * { message, insight: { id, ai_insight_text, actual_total_cost, ... } }
       */
      const res = await fetch(`${API_BASE}/mealplan/generate-insight/${childData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Budget dikirim dalam satuan mingguan; backend membagi sesuai kebutuhan
        body: JSON.stringify({ budget: budget }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal generate rekomendasi.");
      }

      // Simpan insight teks dari AI
      if (data.insight?.ai_insight_text) {
        setAiInsight(data.insight.ai_insight_text);
      }

      /**
       * Generate menu mingguan:
       * Idealnya backend mengembalikan MealPlanItems (7 hari × 3 waktu = 21 item)
       * Sementara kita generate di FE menggunakan seed dari childId + timestamp
       * agar menu tampak berbeda setiap kali generate tapi konsisten dalam sesi
       */
      const seed = childData.id
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0) + Date.now() % 10000;
      setWeeklyMenu(generateWeeklyMenu(seed));
      setHasGenerated(true);
      setActiveDay(0); // Reset ke Senin

    } catch (err) {
      console.error("Error generate:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsGenerating(false);
    }
  }, [childData, budget]);

  // ─── KALKULASI TOTAL HARGA MINGGUAN ────────────────────────────────────────
  // Menjumlahkan harga semua menu 7 hari (pagi + siang + malam)
  const totalMingguan = weeklyMenu.reduce(
    (sum, hari) => sum + (hari.pagi?.harga || 0) + (hari.siang?.harga || 0) + (hari.malam?.harga || 0),
    0
  );
  const selisihBudget = budget - totalMingguan; // Positif = hemat, negatif = melebihi

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']">
      <NavbarDashboard />

      <main className="flex-1 px-4 py-6 md:px-6 lg:px-10 max-w-7xl mx-auto w-full">

        {/* ── HEADER HALAMAN ─────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            {/* Breadcrumb */}
            <a href="/features" className="hover:text-[#8B2020] transition-colors">Fitur</a>
            <span>›</span>
            <span className="text-[#8B2020] font-bold">Plan Mingguan</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#8B2020] leading-tight">
            Generator Rekomendasi
          </h1>
          <h1 className="text-2xl md:text-3xl font-black text-[#8B2020] leading-tight mb-1">
            MPASI Mingguan
          </h1>
          <p className="text-gray-500 text-sm md:text-base">
            Dapatkan rekomendasi menu MPASI selama 7 hari yang sesuai dengan kebutuhan si kecil.
          </p>
        </div>

        {/* ── LAYOUT UTAMA: 2 KOLOM (Form | Hasil) ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ═══ KOLOM KIRI: FORM INPUT ═══════════════════════════════ */}
          <div className="lg:col-span-2 space-y-4">

            {/* Card: Informasi Si Kecil */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-black text-[#8B2020] mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-sm">👶</span>
                Informasi Si Kecil
              </h2>

              {/* Tampilkan data anak atau skeleton loader */}
              {isLoadingData ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-10 bg-gray-100 rounded-xl" />
                  <div className="h-10 bg-gray-100 rounded-xl" />
                </div>
              ) : childData ? (
                <div className="space-y-3">
                  {/* Nama & umur — ditarik dari childData.name dan childData.dob */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[#F3EFEA] rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Nama</p>
                      <p className="font-bold text-gray-800 text-sm truncate">{childData.name}</p>
                    </div>
                    <div className="flex-1 bg-[#F3EFEA] rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Usia</p>
                      <p className="font-bold text-gray-800 text-sm">
                        {/* Hitung umur dalam bulan dari dob */}
                        {childData.dob
                          ? `${Math.floor((Date.now() - new Date(childData.dob)) / (1000 * 60 * 60 * 24 * 30.44))} Bulan`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Alergi — ditarik dari childData.allergies (array) */}
                  {childData.allergies && childData.allergies.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <p className="text-xs text-orange-600 font-bold mb-1.5">⚠️ Alergi / Pantangan</p>
                      <div className="flex flex-wrap gap-1.5">
                        {childData.allergies.map((a) => (
                          <span key={a.allergy_category_id || a.id}
                            className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {a.allergy_category?.name || a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Jika tidak ada data anak
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Data anak belum tersedia.</p>
                  <a href="/dashboard" className="text-[#8B2020] text-xs font-bold hover:underline">
                    Daftarkan anak →
                  </a>
                </div>
              )}
            </div>

            {/* Card: Pengaturan Budget */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-black text-[#8B2020] mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-sm">💰</span>
                Atur Budget Mingguan
              </h2>

              <BudgetSlider
                value={budget}
                onChange={setBudget}
                min={50000}
                max={500000}
                step={5000}
              />

              {/* Input manual budget — untuk ketepatan nilai */}
              <div className="mt-3">
                <label className="text-xs text-gray-500 mb-1 block">Atau ketik langsung:</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden
                  focus-within:border-[#8B2020] focus-within:ring-2 focus-within:ring-[#8B2020]/10 transition-all">
                  <span className="px-3 text-sm text-gray-400 font-bold bg-gray-50 py-2.5 border-r border-gray-200">Rp</span>
                  <input
                    type="number"
                    value={budget}
                    min={50000}
                    max={500000}
                    step={5000}
                    onChange={(e) => {
                      const val = Math.min(500000, Math.max(50000, Number(e.target.value)));
                      setBudget(val);
                    }}
                    className="flex-1 px-3 py-2.5 text-sm font-bold text-gray-800 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Info budget yang direkomendasikan AI */}
              {childData?.optimal_budget_cache && (
                <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                  <span className="text-green-500 text-base">✅</span>
                  <div>
                    <p className="text-xs text-green-700 font-bold">Rekomendasi AI</p>
                    <p className="text-xs text-green-600">
                      {/* Konversi dari budget bulanan ke mingguan */}
                      {formatRupiah(Math.round(parseFloat(childData.optimal_budget_cache) / 4))} / minggu
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card: Catatan */}
            <div className="bg-[#FFF8F0] rounded-3xl border border-orange-100 p-5">
              <h3 className="text-sm font-black text-[#8B2020] mb-3 flex items-center gap-2">
                <span>📋</span> Catatan
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                {[
                  "Pastikan tekstur makanan sesuai dengan kemampuan makan si kecil.",
                  "Perkenalkan satu bahan baru dalam 3-4 hari untuk memantau alergi.",
                  "ASI tetap menjadi sumber nutrisi hingga usia 2 tahun.",
                ].map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B2020] mt-1.5 flex-shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tombol Generate */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !childData || isLoadingData}
              className="w-full bg-[#8B2020] text-white font-black text-sm py-4 rounded-2xl
                shadow-lg shadow-[#8B2020]/30 transition-all duration-300
                hover:bg-[#6b1020] hover:shadow-xl hover:shadow-[#8B2020]/40 hover:-translate-y-0.5
                active:translate-y-0 active:shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
                flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  {/* Spinner saat loading */}
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Sedang Diproses AI...
                </>
              ) : (
                <>✨ Buat Rekomendasi</>
              )}
            </button>

            {/* Tampilkan pesan error jika ada */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-red-600 text-xs font-bold">⚠️ {errorMsg}</p>
              </div>
            )}
          </div>

          {/* ═══ KOLOM KANAN: HASIL REKOMENDASI ══════════════════════ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Card: Hasil Plan Mingguan */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Header card dengan badge dan tombol unduh */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-black text-gray-800">Rekomendasi MPASI Mingguan</h2>
                  <span className="bg-[#8B2020] text-white text-xs font-black px-2.5 py-1 rounded-full">
                    7 Hari
                  </span>
                </div>
                {/* Tombol unduh PDF — placeholder, implementasi bisa pakai html2pdf.js */}
                {hasGenerated && (
                  <button className="flex items-center gap-1.5 text-xs font-bold text-[#8B2020] border border-[#8B2020]/30
                    px-3 py-2 rounded-xl hover:bg-[#8B2020]/5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                    </svg>
                    Unduh PDF
                  </button>
                )}
              </div>

              {/* Tab navigasi hari (Senin–Minggu) */}
              {hasGenerated && (
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {HARI.map((hari, idx) => (
                      <DayTab
                        key={hari}
                        label={hari}
                        isActive={activeDay === idx}
                        onClick={() => setActiveDay(idx)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Isi: Menu Hari Aktif / State Kosong */}
              <div className="p-5">
                {!hasGenerated ? (
                  // ── STATE KOSONG: Belum generate ────────────────────
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-[#F3EFEA] rounded-3xl flex items-center justify-center text-4xl mb-4
                      animate-bounce">
                      🍱
                    </div>
                    <h3 className="text-lg font-black text-gray-700 mb-2">
                      Menu Mingguan Belum Dibuat
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                      Atur budget di kiri, lalu klik <strong>"Buat Rekomendasi"</strong> untuk
                      mendapatkan menu MPASI 7 hari yang dipersonalisasi AI.
                    </p>
                  </div>
                ) : (
                  // ── STATE BERHASIL: Tampilkan menu hari aktif ────────
                  <div className="space-y-4">

                    {/* Header hari aktif */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-gray-800">{HARI[activeDay]}</h3>
                        <p className="text-xs text-gray-400">3 waktu makan · {
                          formatRupiah(
                            (weeklyMenu[activeDay]?.pagi?.harga || 0) +
                            (weeklyMenu[activeDay]?.siang?.harga || 0) +
                            (weeklyMenu[activeDay]?.malam?.harga || 0)
                          )
                        } / hari</p>
                      </div>
                      {/* Navigasi hari prev/next */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveDay(Math.max(0, activeDay - 1))}
                          disabled={activeDay === 0}
                          className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center
                            hover:bg-[#8B2020]/10 hover:text-[#8B2020] disabled:opacity-30 disabled:cursor-not-allowed
                            transition-colors text-gray-600">
                          ‹
                        </button>
                        <button
                          onClick={() => setActiveDay(Math.min(6, activeDay + 1))}
                          disabled={activeDay === 6}
                          className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center
                            hover:bg-[#8B2020]/10 hover:text-[#8B2020] disabled:opacity-30 disabled:cursor-not-allowed
                            transition-colors text-gray-600">
                          ›
                        </button>
                      </div>
                    </div>

                    {/* 3 kartu menu: Pagi, Siang, Malam */}
                    <div className="space-y-3">
                      <MealCard
                        label="Sarapan · 08:00"
                        icon="☀️"
                        menu={weeklyMenu[activeDay]?.pagi}
                        warna="bg-amber-50"
                      />
                      <MealCard
                        label="Makan Siang · 12:00"
                        icon="🌤️"
                        menu={weeklyMenu[activeDay]?.siang}
                        warna="bg-orange-50"
                      />
                      <MealCard
                        label="Makan Malam · 19:00"
                        icon="🌙"
                        menu={weeklyMenu[activeDay]?.malam}
                        warna="bg-indigo-50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Ringkasan Budget & AI Insight */}
            {hasGenerated && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Ringkasan Budget */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-700 mb-4">💳 Ringkasan Budget</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Budget Kamu</span>
                      <span className="text-sm font-black text-gray-800">{formatRupiah(budget)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Total Menu AI</span>
                      <span className="text-sm font-black text-gray-800">{formatRupiah(totalMingguan)}</span>
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-600">
                        {selisihBudget >= 0 ? "💚 Hemat" : "⚠️ Melebihi"}
                      </span>
                      <span className={`text-sm font-black ${selisihBudget >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {selisihBudget >= 0 ? "+" : ""}{formatRupiah(selisihBudget)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar visual budget */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Terpakai</span>
                      <span>{Math.min(100, Math.round((totalMingguan / budget) * 100))}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          totalMingguan <= budget ? "bg-green-500" : "bg-red-400"
                        }`}
                        style={{ width: `${Math.min(100, (totalMingguan / budget) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* AI Insight dari Gemini */}
                <div className="bg-gradient-to-br from-[#8B2020] to-[#6b1020] rounded-3xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">✨</span>
                    <h3 className="text-sm font-black">Insight AI</h3>
                  </div>
                  {aiInsight ? (
                    <p className="text-xs text-white/90 leading-relaxed line-clamp-6">{aiInsight}</p>
                  ) : (
                    <p className="text-xs text-white/60 italic">
                      AI insight akan muncul setelah generate berhasil...
                    </p>
                  )}
                  {childData?.name && (
                    <p className="text-xs text-white/50 mt-3 font-bold">untuk {childData.name} 💕</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterDashboard />
    </div>
  );
}
