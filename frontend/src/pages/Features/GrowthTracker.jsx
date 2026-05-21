/**
 * ============================================================================
 * GrowthTracker.jsx — Smart Growth Tracker
 * ============================================================================
 * Halaman ini menampilkan fitur pemantauan pertumbuhan anak (berat & tinggi)
 * dibandingkan dengan standar WHO, lengkap dengan grafik dan status gizi.
 *
 * ALUR KERJA:
 * 1. Mount → GET /api/children  (ambil data anak + childId)
 * 2. Mount → GET /api/growth/:childId/chart  (ambil riwayat log pertumbuhan)
 * 3. User input berat & tinggi → POST /api/growth/:childId/log
 *    Backend akan hitung z-score, status gizi, lalu trigger AI meal plan update
 * 4. Setelah berhasil simpan, tombol masuk cooldown 7 hari (168 jam)
 *    Timestamp cooldown disimpan di localStorage dengan key "growth_cooldown_{childId}"
 *
 * CATATAN INTEGRASI BACKEND:
 * - GET  /api/growth/:childId/chart
 *   → Response: { data: { weight_chart: [...], height_chart: [...] } }
 *   → Setiap item: { log_id, date_label, value, zscore, status }
 * - POST /api/growth/:childId/log
 *   → Body: { weight: number, height: number }
 *   → Response: { message, data: { berat, tinggi, global_status, ... } }
 * - Auth: Bearer token dari localStorage
 *
 * ATURAN COOLDOWN:
 * - Setelah simpan berhasil, simpan timestamp ke localStorage
 * - Cek selisih waktu saat ini vs timestamp → jika < 7 hari, tombol disabled
 * - Key localStorage: "growth_cooldown_{childId}"
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api";
const COOLDOWN_DAYS = 7; // Durasi cooldown dalam hari
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000; // Konversi ke milidetik

// ─── HELPER: FORMAT TANGGAL INDONESIA ────────────────────────────────────────
const formatTanggal = (isoString) => {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ─── HELPER: FORMAT JAM:MENIT COUNTDOWN ──────────────────────────────────────
const formatCountdown = (ms) => {
  if (ms <= 0) return "0 hari";
  const hari = Math.floor(ms / (1000 * 60 * 60 * 24));
  const jam = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (hari > 0) return `${hari} hari ${jam} jam`;
  const menit = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${jam} jam ${menit} menit`;
};

// ─── HELPER: WARNA STATUS GIZI ────────────────────────────────────────────────
// Mengembalikan class Tailwind sesuai status dari backend
const getStatusStyle = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("baik") || s.includes("normal"))
    return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
  if (s.includes("kurang") || s.includes("ringan"))
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      dot: "bg-yellow-500",
    };
  if (s.includes("buruk") || s.includes("berat") || s.includes("lebih"))
    return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
  return { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
};

// ─── KOMPONEN: GRAFIK CUSTOM SVG ──────────────────────────────────────────────
/**
 * GrowthChart — Grafik garis pertumbuhan menggunakan SVG murni (tanpa library)
 * Menampilkan dua garis: data aktual anak vs target WHO
 *
 * Props:
 * - data: array { date_label, value }  — data dari backend
 * - whoTarget: angka target WHO rata-rata (opsional, untuk garis referensi)
 * - unit: string ("kg" atau "cm")
 * - color: hex warna garis aktual
 */
function GrowthChart({ data, whoTarget, unit, color = "#8B2020" }) {
  // Guard: jika data kosong tampilkan placeholder
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-sm text-gray-400">
          Belum ada data untuk ditampilkan
        </p>
        <p className="text-xs text-gray-300 mt-1">
          Tambahkan data pertumbuhan pertama
        </p>
      </div>
    );
  }

  // ── KALKULASI TITIK SVG ───────────────────────────────────────────────────
  const W = 500; // Lebar SVG viewBox
  const H = 180; // Tinggi SVG viewBox
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 }; // Padding dalam

  // Range nilai Y (nilai aktual anak)
  const values = data.map((d) => d.value).filter(Boolean);
  const minVal = Math.max(0, Math.min(...values) - (unit === "kg" ? 1 : 3));
  const maxVal = Math.max(...values) + (unit === "kg" ? 1 : 3);

  // Fungsi konversi nilai → koordinat SVG
  const toX = (idx) =>
    PAD.left +
    (idx / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);
  const toY = (val) =>
    PAD.top + ((maxVal - val) / (maxVal - minVal)) * (H - PAD.top - PAD.bottom);

  // Buat path string untuk garis aktual
  const pathActual = data
    .filter((d) => d.value)
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${toX(data.indexOf(d))} ${toY(d.value)}`,
    )
    .join(" ");

  // Buat path area (fill bawah garis)
  const firstIdx = 0;
  const lastIdx = data.length - 1;
  const areaPath = `${pathActual} L ${toX(lastIdx)} ${H - PAD.bottom} L ${toX(firstIdx)} ${H - PAD.bottom} Z`;

  // Buat path garis WHO target (horizontal)
  const whoY = whoTarget ? toY(whoTarget) : null;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[280px]"
        style={{ height: "auto" }}
      >
        {/* Defs: gradient area di bawah garis */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid horizontal — 4 garis bantu */}
        {[0.25, 0.5, 0.75].map((ratio, i) => {
          const y = PAD.top + ratio * (H - PAD.top - PAD.bottom);
          return (
            <line
              key={i}
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          );
        })}

        {/* Garis WHO Target (jika ada) */}
        {whoY && (
          <>
            <line
              x1={PAD.left}
              y1={whoY}
              x2={W - PAD.right}
              y2={whoY}
              stroke="#e2b96e"
              strokeWidth="1.5"
              strokeDasharray="6,4"
            />
            <text
              x={W - PAD.right - 2}
              y={whoY - 4}
              textAnchor="end"
              fontSize="9"
              fill="#e2b96e"
              fontWeight="bold"
            >
              Target WHO
            </text>
          </>
        )}

        {/* Area fill di bawah garis aktual */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Garis aktual */}
        <path
          d={pathActual}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Titik data */}
        {data.map((d, i) => {
          if (!d.value) return null;
          const cx = toX(i);
          const cy = toY(d.value);
          return (
            <g key={i}>
              {/* Lingkaran luar (hover area) */}
              <circle cx={cx} cy={cy} r="6" fill="white" />
              {/* Lingkaran dalam berwarna */}
              <circle cx={cx} cy={cy} r="4" fill={color} />

              {/* Label nilai di atas titik */}
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fontSize="9"
                fill={color}
                fontWeight="bold"
              >
                {d.value}
                {unit}
              </text>
            </g>
          );
        })}

        {/* Label sumbu X (nama bulan/tanggal) */}
        {data.map((d, i) => {
          const cx = toX(i);
          // Tampilkan label hanya jika tidak terlalu berdekatan
          const show =
            data.length <= 6 ||
            i % Math.ceil(data.length / 6) === 0 ||
            i === data.length - 1;
          if (!show) return null;
          // Format singkat: "Bln X" atau tanggal
          const label = d.date_label
            ? `Bln ${new Date(d.date_label + "T00:00:00").getMonth() + 1}`
            : `Data ${i + 1}`;
          return (
            <text
              key={`lbl-${i}`}
              x={cx}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {label}
            </text>
          );
        })}

        {/* Label sumbu Y (nilai) */}
        <text
          x={PAD.left - 6}
          y={PAD.top + 4}
          textAnchor="end"
          fontSize="9"
          fill="#9ca3af"
        >
          {maxVal.toFixed(1)}
        </text>
        <text
          x={PAD.left - 6}
          y={H - PAD.bottom}
          textAnchor="end"
          fontSize="9"
          fill="#9ca3af"
        >
          {minVal.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}

// ─── KOMPONEN: STAT CARD ──────────────────────────────────────────────────────
function StatCard({ label, value, unit, delta, icon }) {
  const isPositive = delta > 0;
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-base">{icon}</span>
        {delta !== undefined && delta !== null && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
            ${isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
          >
            {isPositive ? "+" : ""}
            {delta}
            {unit}
          </span>
        )}
      </div>
      <p className="text-lg font-black text-gray-800 leading-tight">
        {value}
        <span className="text-xs font-bold text-gray-400 ml-0.5">{unit}</span>
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

// ─── KOMPONEN UTAMA: GrowthTracker ───────────────────────────────────────────
export default function GrowthTracker() {
  // === STATE DATA ===
  const [childData, setChildData] = useState(null); // Data anak dari /api/children
  const [chartData, setChartData] = useState({
    // Data grafik dari /api/growth/:id/chart
    weight_chart: [],
    height_chart: [],
  });
  const [isLoadingData, setIsLoadingData] = useState(true); // Loading saat fetch awal
  const [isSaving, setIsSaving] = useState(false); // Loading saat POST log baru
  const [saveSuccess, setSaveSuccess] = useState(false); // Flag sukses simpan
  const [errorMsg, setErrorMsg] = useState(""); // Pesan error

  // === STATE FORM INPUT ===
  const [beratInput, setBeratInput] = useState(""); // Input berat badan (kg)
  const [tinggiInput, setTinggiInput] = useState(""); // Input tinggi badan (cm)
  const [tanggalInput, setTanggalInput] = useState(
    // Default: hari ini
    new Date().toISOString().split("T")[0],
  );

  // === STATE TAMPILAN ===
  const [activeChart, setActiveChart] = useState("berat"); // "berat" atau "tinggi"
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // Sisa cooldown dalam ms

  // ─── CEK COOLDOWN DARI LOCALSTORAGE ──────────────────────────────────────
  /**
   * Cooldown disimpan di localStorage dengan format:
   * Key: "growth_cooldown_{childId}"
   * Value: timestamp ISO saat terakhir submit berhasil
   *
   * Setiap 1 menit, state cooldownRemaining di-update agar countdown real-time
   */
  const checkCooldown = useCallback((childId) => {
    if (!childId) return;
    const stored = localStorage.getItem(`growth_cooldown_${childId}`);
    if (!stored) {
      setCooldownRemaining(0);
      return;
    }
    const lastSubmit = new Date(stored).getTime();
    const now = Date.now();
    const elapsed = now - lastSubmit;
    const remaining = COOLDOWN_MS - elapsed;
    setCooldownRemaining(remaining > 0 ? remaining : 0);
  }, []);

  // Update countdown setiap menit
  useEffect(() => {
    if (!childData?.id) return;
    checkCooldown(childData.id);
    const interval = setInterval(() => checkCooldown(childData.id), 60000);
    return () => clearInterval(interval);
  }, [childData?.id, checkCooldown]);

  // ─── FETCH DATA AWAL ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoadingData(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch data anak — sama seperti dashboard.jsx
        const childRes = await fetch(`${API_BASE}/children`, { headers });
        const childJson = await childRes.json();
        const child = childJson?.[0];
        if (!child) return;
        setChildData(child);

        // 2. Fetch data chart pertumbuhan — GET /api/growth/:childId/chart
        const chartRes = await fetch(`${API_BASE}/growth/${child.id}/chart`, {
          headers,
        });
        const chartJson = await chartRes.json();
        if (chartJson?.data) {
          setChartData(chartJson.data);
        }

        // 3. Cek cooldown setelah dapat childId
        checkCooldown(child.id);
      } catch (err) {
        console.error("Gagal fetch data growth tracker:", err);
        setErrorMsg("Gagal memuat data. Silakan refresh halaman.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchAll();
  }, [checkCooldown]);

  // ─── HANDLER: SIMPAN DATA PERTUMBUHAN ───────────────────────────────────
  const handleSave = async () => {
    if (!childData?.id || cooldownRemaining > 0) return;
    if (!beratInput || !tinggiInput) {
      setErrorMsg("Berat badan dan tinggi badan wajib diisi.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");

      /**
       * POST /api/growth/:childId/log
       * Body: { weight, height }
       * Backend akan:
       * 1. Hitung z-score WFA, HFA, WFH vs standar WHO
       * 2. Tentukan status gizi global (global_status)
       * 3. Hitung target kalori, protein, dll via Waterlow
       * 4. Simpan ke growth_logs
       * 5. Trigger ulang AI meal plan (executeMealPlanAI dengan isUpdate=true)
       */
      const res = await fetch(`${API_BASE}/growth/${childData.id}/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weight: parseFloat(beratInput),
          height: parseFloat(tinggiInput),
          // Tanggal input dikirim juga jika backend support (opsional)
          date: tanggalInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan data.");

      // ── Berhasil: simpan timestamp cooldown ──────────────────────────
      // Key: "growth_cooldown_{childId}" → dipakai checkCooldown()
      localStorage.setItem(
        `growth_cooldown_${childData.id}`,
        new Date().toISOString(),
      );
      setCooldownRemaining(COOLDOWN_MS);
      setSaveSuccess(true);

      // Reset form input
      setBeratInput("");
      setTinggiInput("");

      // Refresh data grafik agar titik baru muncul
      const headers = { Authorization: `Bearer ${token}` };
      const chartRes = await fetch(`${API_BASE}/growth/${childData.id}/chart`, {
        headers,
      });
      const chartJson = await chartRes.json();
      if (chartJson?.data) setChartData(chartJson.data);

      // Sembunyikan notifikasi sukses setelah 4 detik
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error simpan log pertumbuhan:", err);
      setErrorMsg(err.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── DATA TERAKHIR (untuk StatCard) ─────────────────────────────────────
  const lastWeight = chartData.weight_chart.slice(-1)[0]; // Log berat terakhir
  const prevWeight = chartData.weight_chart.slice(-2)[0]; // Log berat sebelumnya
  const lastHeight = chartData.height_chart.slice(-1)[0]; // Log tinggi terakhir
  const prevHeight = chartData.height_chart.slice(-2)[0]; // Log tinggi sebelumnya

  // Hitung delta (selisih dengan pengukuran sebelumnya)
  const deltaWeight =
    lastWeight && prevWeight
      ? (parseFloat(lastWeight.value) - parseFloat(prevWeight.value)).toFixed(1)
      : null;
  const deltaHeight =
    lastHeight && prevHeight
      ? (parseFloat(lastHeight.value) - parseFloat(prevHeight.value)).toFixed(1)
      : null;

  // Status terbaru dari log terakhir
  const latestStatus = lastWeight?.status || "-";
  const statusStyle = getStatusStyle(latestStatus);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']">
      <NavbarDashboard />

      <main className="flex-1 px-4 py-6 md:px-6 lg:px-10 max-w-7xl mx-auto w-full">
        {/* ── HEADER HALAMAN ──────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a
              href="/features"
              className="hover:text-[#8B2020] transition-colors"
            >
              Fitur
            </a>
            <span>›</span>
            <span className="text-[#8B2020] font-bold">
              Smart Growth Tracker
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-center tracking-tight text-gray-900 uppercase">
            Smart Growth Tracker
          </h1>
          <p className="text-gray-500 text-center text-sm mt-1">
            Pantau setiap inci pertumbuhan si kecil
          </p>
        </div>

        {/* ── LAYOUT: 2 KOLOM ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ═══ KOLOM KIRI: STATUS + FORM INPUT ═══════════════════ */}
          <div className="lg:col-span-2 space-y-4">
            {/* Card: Status Saat Ini */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Status Saat Ini
                </h2>
                {lastWeight?.status && (
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full uppercase
                    ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {latestStatus}
                  </span>
                )}
              </div>

              {isLoadingData ? (
                // Skeleton loader
                <div className="space-y-3 animate-pulse">
                  <div className="h-12 bg-gray-100 rounded-xl w-32" />
                  <div className="h-4 bg-gray-100 rounded-lg w-full" />
                  <div className="h-3 bg-gray-100 rounded-lg w-48" />
                </div>
              ) : lastWeight ? (
                <>
                  {/* Berat terakhir (tampil besar seperti desain referensi) */}
                  <div className="mb-4">
                    <p className="text-4xl font-black text-gray-900">
                      {parseFloat(lastWeight.value).toFixed(1)}
                      <span className="text-xl font-bold text-gray-400 ml-1">
                        kg
                      </span>
                    </p>
                    {deltaWeight && (
                      <p
                        className={`text-xs font-bold mt-1 ${parseFloat(deltaWeight) >= 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {parseFloat(deltaWeight) >= 0 ? "+" : ""}
                        {deltaWeight} kg dari bulan lalu
                      </p>
                    )}
                  </div>

                  {/* Progress bar visual status */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${statusStyle.dot}`}
                      style={{
                        // Panjang bar berdasarkan z-score (0 = 0%, normal +0 = 50%, +2 = 100%)
                        width: `${Math.min(100, Math.max(10, ((parseFloat(lastWeight.zscore || 0) + 3) / 6) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {lastWeight.status === "Normal" ||
                    lastWeight.status?.includes("Baik")
                      ? "Berat badan ideal untuk usianya 🎉"
                      : `Berat badan ${(latestStatus || "").toLowerCase()} untuk usia si kecil`}
                  </p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-3xl mb-2">📏</p>
                  <p className="text-sm text-gray-400">
                    Belum ada data pertumbuhan
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Isi form di bawah untuk memulai
                  </p>
                </div>
              )}
            </div>

            {/* Card: Input Data Baru */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-black text-[#8B2020] mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-sm">
                  📝
                </span>
                Input Data Baru
              </h2>

              <div className="space-y-3">
                {/* Input Berat Badan */}
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Berat Badan (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="30"
                    placeholder="Misal: 8.5"
                    value={beratInput}
                    onChange={(e) => setBeratInput(e.target.value)}
                    disabled={cooldownRemaining > 0 || isSaving}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
                      focus:outline-none focus:border-[#8B2020] focus:ring-2 focus:ring-[#8B2020]/10
                      disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                      transition-all placeholder-gray-300"
                  />
                </div>

                {/* Input Tinggi Badan */}
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Tinggi Badan (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="150"
                    placeholder="Misal: 72.0"
                    value={tinggiInput}
                    onChange={(e) => setTinggiInput(e.target.value)}
                    disabled={cooldownRemaining > 0 || isSaving}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
                      focus:outline-none focus:border-[#8B2020] focus:ring-2 focus:ring-[#8B2020]/10
                      disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                      transition-all placeholder-gray-300"
                  />
                </div>

                {/* Input Tanggal Pengukuran */}
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Tanggal Pengukuran
                  </label>
                  <input
                    type="date"
                    value={tanggalInput}
                    onChange={(e) => setTanggalInput(e.target.value)}
                    disabled={cooldownRemaining > 0 || isSaving}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm
                      focus:outline-none focus:border-[#8B2020] focus:ring-2 focus:ring-[#8B2020]/10
                      disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
                      transition-all"
                  />
                </div>
              </div>

              {/* Notifikasi Error */}
              {errorMsg && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs text-red-600 font-bold">
                    ⚠️ {errorMsg}
                  </p>
                </div>
              )}

              {/* Notifikasi Sukses */}
              {saveSuccess && (
                <div
                  className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3
                  animate-pulse"
                >
                  <p className="text-xs text-green-700 font-bold">
                    ✅ Data berhasil disimpan! AI meal plan sedang diperbarui...
                  </p>
                </div>
              )}

              {/* Tombol Simpan Data — dengan logika cooldown */}
              <button
                onClick={handleSave}
                disabled={
                  cooldownRemaining > 0 ||
                  isSaving ||
                  isLoadingData ||
                  !childData
                }
                className={`w-full mt-4 py-3.5 rounded-2xl text-sm font-black
                  transition-all duration-300 flex items-center justify-center gap-2
                  ${
                    cooldownRemaining > 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : isSaving
                        ? "bg-[#8B2020]/70 text-white cursor-wait"
                        : "bg-[#8B2020] text-white shadow-lg shadow-[#8B2020]/30 hover:bg-[#6b1020] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  }`}
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Menyimpan...
                  </>
                ) : cooldownRemaining > 0 ? (
                  /* Tombol cooldown: abu-abu dengan countdown */
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Tersedia dalam {formatCountdown(cooldownRemaining)}
                  </>
                ) : (
                  "Simpan Data"
                )}
              </button>

              {/* Info aturan cooldown 7 hari */}
              <p className="text-xs text-gray-400 text-center mt-2">
                {cooldownRemaining > 0
                  ? `Input berikutnya tersedia setelah 7 hari dari pengisian terakhir`
                  : "Data dapat diperbarui setiap 7 hari sekali"}
              </p>
            </div>
          </div>

          {/* ═══ KOLOM KANAN: GRAFIK & STATISTIK ═══════════════════ */}
          <div className="lg:col-span-3 space-y-4">
            {/* Card: Grafik Pertumbuhan */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-gray-800">
                  Grafik Pertumbuhan
                </h2>

                {/* Toggle Berat / Tinggi — sesuai desain referensi */}
                <div className="flex rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setActiveChart("berat")}
                    className={`px-4 py-2 text-xs font-black transition-all duration-200
                      ${
                        activeChart === "berat"
                          ? "bg-[#8B2020] text-white"
                          : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    Berat
                  </button>
                  <button
                    onClick={() => setActiveChart("tinggi")}
                    className={`px-4 py-2 text-xs font-black transition-all duration-200
                      ${
                        activeChart === "tinggi"
                          ? "bg-[#8B2020] text-white"
                          : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    Tinggi
                  </button>
                </div>
              </div>

              {/* Grafik SVG */}
              {isLoadingData ? (
                <div className="h-48 bg-gray-50 rounded-2xl animate-pulse flex items-center justify-center">
                  <p className="text-xs text-gray-300">Memuat grafik...</p>
                </div>
              ) : (
                <GrowthChart
                  data={
                    activeChart === "berat"
                      ? chartData.weight_chart
                      : chartData.height_chart
                  }
                  unit={activeChart === "berat" ? "kg" : "cm"}
                  color="#8B2020"
                  // WHO target perkiraan sederhana (nilai median)
                  whoTarget={
                    activeChart === "berat"
                      ? chartData.weight_chart.length > 0
                        ? // Ambil rata-rata nilai sebagai "target acuan" jika tidak ada data WHO di FE
                          null
                        : null
                      : null
                  }
                />
              )}

              {/* Legenda grafik */}
              <div className="flex items-center gap-4 mt-3 justify-end">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#8B2020]" />
                  <span className="text-xs text-gray-500">
                    {activeChart === "berat"
                      ? "Berat Badan Si Kecil"
                      : "Tinggi Badan Si Kecil"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Statistik (4 stat card — 1 baris horizontal) */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard
                icon="⚖️"
                label="Berat Saat Ini"
                value={
                  lastWeight ? parseFloat(lastWeight.value).toFixed(1) : "-"
                }
                unit="kg"
                delta={deltaWeight ? parseFloat(deltaWeight) : null}
              />
              <StatCard
                icon="📏"
                label="Tinggi Saat Ini"
                value={
                  lastHeight ? parseFloat(lastHeight.value).toFixed(1) : "-"
                }
                unit="cm"
                delta={deltaHeight ? parseFloat(deltaHeight) : null}
              />
              <StatCard
                icon="📅"
                label="Pengukuran Terakhir"
                value={
                  lastWeight
                    ? formatTanggal(lastWeight.date_label)
                        .split(" ")
                        .slice(0, 2)
                        .join(" ")
                    : "-"
                }
                unit=""
                delta={null}
              />
              <StatCard
                icon="🎯"
                label="Total Pengukuran"
                value={chartData.weight_chart.length || 0}
                unit="kali"
                delta={null}
              />
            </div>

            {/* Card: Motivasi Bunda (sesuai desain referensi) */}
            {!isLoadingData && chartData.weight_chart.length > 0 && (
              <div
                className="bg-gradient-to-br from-[#8B2020] to-[#6b1020] rounded-3xl p-6 text-white
                relative overflow-hidden"
              >
                {/* Dekorasi lingkaran di background */}
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/5" />

                <div className="relative">
                  <h3 className="font-black text-lg mb-2">
                    Lanjutkan Perjuangan Bunda! 💪
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed mb-4">
                    {chartData.weight_chart.length > 1
                      ? `Pertumbuhan ${chartData.weight_chart.length} bulan terakhir menunjukkan dedikasi luar biasa dalam memberikan nutrisi terbaik. Terus berikan kasih sayang lewat setiap suapan MPASI yang bergizi.`
                      : "Data pertumbuhan pertama sudah tercatat! Pantau terus setiap 7 hari untuk melihat perkembangan si kecil."}
                  </p>

                  {/* Tombol unduh laporan PDF — placeholder */}
                  <button
                    className="flex items-center gap-2 bg-white/15 hover:bg-white/25
                    text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200
                    border border-white/20 hover:border-white/40"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Unduh Laporan PDF
                  </button>
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
