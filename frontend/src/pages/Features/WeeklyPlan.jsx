import { useState, useEffect, useCallback } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api";
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu", "Minggu"];
const STORAGE_KEY = "mpasi_weekly_plan";

// ─── HELPER: FORMAT RUPIAH ────────────────────────────────────────────────────
const formatRupiah = (angka) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);

const formatLabel = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

// ─── HELPER: CEK APAKAH HARI SUDAH LEWAT ─────────────────────────────────────
function isDayPast(dayIdx, generatedAt) {
  if (!generatedAt) return false;
  const startDate = new Date(generatedAt);
  startDate.setHours(0, 0, 0, 0);
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + dayIdx);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return targetDate < today;
}

// ─── KOMPONEN: POPUP DETAIL MENU ──────────────────────────────────────────────
function MenuDetailPopup({ menu, label, icon, onClose }) {
  if (!menu) return null;
  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header popup */}
        <div className="relative bg-gradient-to-br from-[#8B2020] to-[#c0392b] px-5 pt-5 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/70 text-xs font-bold uppercase tracking-wider">{label}</span>
          </div>
          {menu?.image_url ? (
            <img
              src={menu.image_url}
              alt={menu.name}
              className="w-16 h-16 rounded-2xl object-cover mb-3 shadow-lg border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-3">
              {icon}
            </div>
          )}
          <h3 className="text-xl font-black text-white leading-tight">
            {menu?.name || menu?.nama || "Menu"}
          </h3>
          <p className="text-white/70 text-sm mt-1">
            {menu?.texture || menu?.tekstur || ""}
            {(menu?.texture || menu?.tekstur) && (menu?.min_age_months || menu?.usia_min) ? " · " : ""}
            {menu?.min_age_months || menu?.usia_min
              ? `${menu?.min_age_months || menu?.usia_min}–${menu?.max_age_months || menu?.usia_max} bulan`
              : ""}
          </p>
        </div>

        {/* Body popup scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
          <div className="p-5 space-y-4">
            {/* Harga, Kalori, Protein */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#FFF8F0] rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Harga Est.</p>
                <p className="text-sm font-black text-[#8B2020]">
                  {formatRupiah(menu?.est_price || menu?.harga || 0)}
                </p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Kalori</p>
                <p className="text-sm font-black text-orange-600">
                  {menu?.calories || menu?.kalori || "-"}{" "}
                  <span className="text-xs font-normal">kkal</span>
                </p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Protein</p>
                <p className="text-sm font-black text-blue-600">
                  {menu?.protein || "-"} <span className="text-xs font-normal">g</span>
                </p>
              </div>
            </div>

            {/* Nutrisi lanjutan */}
            {(menu?.fat || menu?.iron || menu?.zinc) && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-yellow-50 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Lemak</p>
                  <p className="text-sm font-black text-yellow-600">
                    {menu?.fat || "-"} <span className="text-xs font-normal">g</span>
                  </p>
                </div>
                <div className="bg-red-50 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Zat Besi</p>
                  <p className="text-sm font-black text-red-500">
                    {menu?.iron || "-"} <span className="text-xs font-normal">mg</span>
                  </p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Seng</p>
                  <p className="text-sm font-black text-purple-600">
                    {menu?.zinc || "-"} <span className="text-xs font-normal">mg</span>
                  </p>
                </div>
              </div>
            )}

            {/* Deskripsi */}
            {(menu?.description || menu?.deskripsi) && (
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  Deskripsi
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {menu?.description || menu?.deskripsi}
                </p>
              </div>
            )}

            {/* Bahan Masakan */}
            {(menu?.bahan_masakan || menu?.ingredients?.length > 0) && (
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                  🥕 Bahan Masakan
                </p>
                {menu?.bahan_masakan ? (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                    {menu.bahan_masakan}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {menu?.ingredients?.map((ing, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full"
                      >
                        {ing?.ingredient?.name || ing?.name || ing}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cara Membuat */}
            {(menu?.instructions || menu?.cara_masak) && (
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                  📖 Cara Membuat
                </p>
                <p className="text-sm text-gray-600 bg-[#FFF8F0] rounded-xl p-3 leading-relaxed whitespace-pre-line">
                  {menu?.instructions || menu?.cara_masak}
                </p>
              </div>
            )}

            {/* Tags */}
            {menu?.tags && (
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🏷️ Tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {menu.tags.split(",").map((tag, i) => (
                    <span
                      key={i}
                      className="bg-[#8B2020]/10 text-[#8B2020] text-xs font-bold px-2.5 py-1 rounded-full"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KOMPONEN: POPUP EDIT ALERGI ──────────────────────────────────────────────
function AllergyEditPopup({ masterAllergies, selectedIds, onSave, onClose, isSaving }) {
  const [localIds, setLocalIds] = useState(selectedIds);
  const toggle = (id) => {
    setLocalIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-[#8B2020]">⚠️ Edit Alergi / Pantangan</h3>
            <p className="text-xs text-gray-400 mt-0.5">Pilih satu atau lebih alergi si kecil</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Daftar alergi */}
        <div className="overflow-y-auto p-4 space-y-1" style={{ maxHeight: "50vh" }}>
          {masterAllergies.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Data alergi kosong dari server.</p>
          ) : (
            masterAllergies.map((a) => {
              const checked = localIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    checked
                      ? "bg-orange-50 border border-orange-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(a.id)}
                    className="w-4 h-4 accent-[#8B2020]"
                  />
                  <span className={`text-sm font-bold ${checked ? "text-orange-700" : "text-gray-700"}`}>
                    {formatLabel(a.name)}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Footer tombol */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onSave(localIds)}
            disabled={isSaving}
            className="flex-1 py-3 rounded-2xl bg-[#8B2020] text-white text-sm font-black hover:bg-[#6b1020] transition-colors disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KOMPONEN: KARTU MENU SATU HARI ──────────────────────────────────────────
function MealCard({ label, icon, menu, warna, isPast, onClick }) {
  return (
    <div
      onClick={!isPast ? onClick : undefined}
      className={`group flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 shadow-sm
        ${
          isPast
            ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
            : "bg-white border-gray-100 hover:shadow-md hover:-translate-y-0.5 hover:border-[#8B2020]/20 cursor-pointer"
        }`}
    >
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl ${
          isPast ? "bg-gray-100" : warna
        } flex items-center justify-center text-lg shadow-sm overflow-hidden`}
      >
        {menu?.image_url && !isPast ? (
          <img src={menu.image_url} alt="" className="w-11 h-11 object-cover" />
        ) : (
          icon
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p
          className={`text-sm font-bold truncate transition-colors ${
            isPast ? "text-gray-400" : "text-gray-800 group-hover:text-[#8B2020]"
          }`}
        >
          {menu?.name || menu?.nama || "Menu tidak tersedia"}
        </p>
        <p className={`text-xs ${isPast ? "text-gray-300" : "text-gray-400"}`}>
          {menu?.calories || menu?.kalori ? `${menu?.calories || menu?.kalori} kkal` : "-"}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className={`text-xs font-bold ${isPast ? "text-gray-400" : "text-[#8B2020]"}`}>
          {formatRupiah(menu?.est_price || menu?.harga || 0)}
        </p>
        {!isPast ? (
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-[#8B2020] transition-colors ml-auto mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="text-xs text-gray-300 mt-0.5 block">Lewat</span>
        )}
      </div>
    </div>
  );
}

// ─── KOMPONEN: TAB HARI ───────────────────────────────────────────────────────
function DayTab({ label, isActive, isPast, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200
        ${
          isActive
            ? "bg-[#8B2020] text-white shadow-md shadow-[#8B2020]/30"
            : isPast
            ? "bg-gray-100 text-gray-400 border border-gray-200"
            : "bg-white text-gray-500 hover:bg-[#8B2020]/10 hover:text-[#8B2020] border border-gray-200"
        }`}
    >
      {label}
    </button>
  );
}

// ─── KOMPONEN UTAMA: WeeklyPlan ───────────────────────────────────────────────
export default function WeeklyPlan() {
  // === STATE UTAMA ===
  const [childData, setChildData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // === STATE TAMPILAN ===
  const [activeDay, setActiveDay] = useState(0);
  const [weeklyMenu, setWeeklyMenu] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [budget, setBudget] = useState(158000);
  const [budgetDisplay, setBudgetDisplay] = useState("");

  // === STATE POPUP DETAIL MENU ===
  const [detailPopup, setDetailPopup] = useState(null); // { menu, label, icon }

  // === STATE ALERGI ===
  const [showAllergyEdit, setShowAllergyEdit] = useState(false);
  const [selectedAllergyIds, setSelectedAllergyIds] = useState([]);
  const [isSavingAllergy, setIsSavingAllergy] = useState(false);
  const [masterAllergies, setMasterAllergies] = useState([]);

  // ─── LOAD DARI LOCALSTORAGE SAAT MOUNT ─────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.weeklyMenu && parsed.weeklyMenu.length > 0) {
          setWeeklyMenu(parsed.weeklyMenu);
          setGeneratedAt(parsed.generatedAt || null);
          setAiInsight(parsed.aiInsight || "");
          setHasGenerated(true);
        }
      }
    } catch (e) {
      // ignore corrupt storage
    }
  }, []);

  // ─── FETCH DATA ANAK & ALERGI SAAT MOUNT ───────────────────────────────────
  useEffect(() => {
    const fetchChild = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const res = await fetch(`${API_BASE}/children`, { headers });
        const data = await res.json();
        if (data && data.length > 0) {
          const child = data[0];
          setChildData(child);

          if (child.optimal_budget_cache) {
            const weeklyBudget = Math.round(parseFloat(child.optimal_budget_cache) / 4);
            setBudget(weeklyBudget);
            setBudgetDisplay(new Intl.NumberFormat("id-ID").format(weeklyBudget));
          }

          if (child.allergies) {
            const allergyIds = child.allergies.map((a) => a.allergy_category_id || a.id);
            setSelectedAllergyIds(allergyIds);
          }
        }

        const allergyRes = await fetch(`${API_BASE}/master/allergies`, { headers });
        const allergyData = await allergyRes.json();
        setMasterAllergies(allergyData);
      } catch (err) {
        console.error("Gagal fetch data anak:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchChild();
  }, []);

  // ─── HANDLER: GENERATE REKOMENDASI ─────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!childData?.id) return;
    setIsGenerating(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/mpasi/generate-weekly/${childData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ budget }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal generate rekomendasi.");

      let insight = "";
      if (data.insight?.ai_insight_text) insight = data.insight.ai_insight_text;
      else if (data.ai_insight_text) insight = data.ai_insight_text;
      setAiInsight(insight);

      // EXTRACTION: Menangkap array data resep dari berbagai shape response backend
      let serverWeeklyPlan = null;
      if (Array.isArray(data)) serverWeeklyPlan = data;
      else if (data.weeklyPlan && Array.isArray(data.weeklyPlan)) serverWeeklyPlan = data.weeklyPlan;
      else if (data.weeklyMenu && Array.isArray(data.weeklyMenu)) serverWeeklyPlan = data.weeklyMenu;
      else if (data.data && Array.isArray(data.data)) serverWeeklyPlan = data.data;
      else if (data.plan && Array.isArray(data.plan)) serverWeeklyPlan = data.plan;

      if (serverWeeklyPlan && serverWeeklyPlan.length > 0) {
        const now = new Date().toISOString();
        setWeeklyMenu(serverWeeklyPlan);
        setGeneratedAt(now);
        setHasGenerated(true);
        setActiveDay(0);

        // Simpan ke localStorage supaya tidak hilang saat pindah halaman
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ weeklyMenu: serverWeeklyPlan, generatedAt: now, aiInsight: insight })
        );
      } else {
        throw new Error("Data menu mingguan kosong atau format respons JSON dari backend belum sesuai.");
      }
    } catch (err) {
      console.error("Error generate:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsGenerating(false);
    }
  }, [childData, budget]);

  // ─── HANDLER: SIMPAN ALERGI ─────────────────────────────────────────────────
  const handleSaveAllergy = async (newIds) => {
    if (!childData?.id) return;
    setIsSavingAllergy(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/children/${childData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ allergy_ids: newIds }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan alergi.");
      setSelectedAllergyIds(newIds);

      const updatedAllergies = masterAllergies
        .filter((a) => newIds.includes(a.id))
        .map((a) => ({
          id: a.id,
          allergy_category_id: a.id,
          allergy_category: { name: a.name },
          name: a.name,
        }));
      setChildData((prev) => ({ ...prev, allergies: updatedAllergies }));
      setShowAllergyEdit(false);
    } catch (err) {
      alert("Gagal menyimpan alergi: " + err.message);
    } finally {
      setIsSavingAllergy(false);
    }
  };

  // ─── KALKULASI TOTAL HARGA MINGGUAN ────────────────────────────────────────
  const totalMingguan = weeklyMenu.reduce(
    (sum, hari) =>
      sum +
      (hari?.pagi?.est_price || hari?.pagi?.harga || 0) +
      (hari?.siang?.est_price || hari?.siang?.harga || 0) +
      (hari?.malam?.est_price || hari?.malam?.harga || 0),
    0
  );
  const selisihBudget = budget - totalMingguan;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']">
      <NavbarDashboard />

      <main className="flex-1 px-4 py-6 md:px-6 lg:px-10 max-w-7xl mx-auto w-full">

        {/* ── HEADER HALAMAN ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
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

        {/* ── LAYOUT UTAMA: 2 KOLOM ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ═══ KOLOM KIRI: FORM INPUT ════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-4">

            {/* Card: Informasi Si Kecil */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-black text-[#8B2020] mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-sm">👶</span>
                Informasi Si Kecil
              </h2>

              {isLoadingData ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-10 bg-gray-100 rounded-xl" />
                  <div className="h-10 bg-gray-100 rounded-xl" />
                </div>
              ) : childData ? (
                <div className="space-y-3">
                  {/* Nama & umur */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[#F3EFEA] rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Nama</p>
                      <p className="font-bold text-gray-800 text-sm truncate">{childData.name}</p>
                    </div>
                    <div className="flex-1 bg-[#F3EFEA] rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Usia</p>
                      <p className="font-bold text-gray-800 text-sm">
                        {childData.dob
                          ? `${Math.floor(
                              (Date.now() - new Date(childData.dob)) / (1000 * 60 * 60 * 24 * 30.44)
                            )} Bulan`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Alergi + tombol Ubah */}
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-orange-600 font-bold">⚠️ Alergi / Pantangan</p>
                      <button
                        onClick={() => setShowAllergyEdit(true)}
                        className="text-xs font-black text-[#8B2020] bg-white border border-[#8B2020]/20 px-2.5 py-1 rounded-full
                          hover:bg-[#8B2020] hover:text-white transition-all duration-200"
                      >
                        ✏️ Ubah
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {childData?.allergies && childData.allergies.length > 0 ? (
                        childData.allergies.map((a) => (
                          <span
                            key={a.allergy_category_id || a.id}
                            className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full"
                          >
                            {a.allergy_category?.name || a.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-orange-400 italic">Belum ada alergi terdaftar</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Data anak belum tersedia.</p>
                  <a href="/dashboard" className="text-[#8B2020] text-xs font-bold hover:underline">
                    Daftarkan anak →
                  </a>
                </div>
              )}
            </div>

            {/* Card: Budget Mingguan */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-black text-[#8B2020] mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-sm">💰</span>
                Budget Mingguan
              </h2>

              <label className="text-xs font-bold text-gray-600 mb-1.5 block">Masukkan Budget</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#8B2020] focus-within:ring-2 focus-within:ring-[#8B2020]/10 transition-all">
                <span className="px-3 text-sm text-gray-400 font-bold bg-gray-50 py-3 border-r border-gray-200">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\./g, "");
                    if (!/^\d*$/.test(raw)) return;
                    const num = Number(raw);
                    setBudget(num);
                    setBudgetDisplay(new Intl.NumberFormat("id-ID").format(num));
                  }}
                  placeholder="Contoh: 150.000"
                  className="flex-1 px-3 py-3 text-sm font-bold text-gray-800 outline-none bg-white"
                />
              </div>

              {childData?.optimal_budget_cache && (
                <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                  <span className="text-green-500 text-base">✅</span>
                  <div>
                    <p className="text-xs text-green-700 font-bold">Rekomendasi AI</p>
                    <p className="text-xs text-green-600">
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
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sedang Diproses AI...
                </>
              ) : (
                <>✨ Buat Rekomendasi AI</>
              )}
            </button>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-red-600 text-xs font-bold">⚠️ {errorMsg}</p>
              </div>
            )}
          </div>

          {/* ═══ KOLOM KANAN: HASIL REKOMENDASI ═══════════════════════════ */}
          <div className="lg:col-span-3 space-y-4">

            {/* Card: Plan Mingguan */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Header card */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-black text-gray-800">Rekomendasi MPASI Mingguan</h2>
                  <span className="bg-[#8B2020] text-white text-xs font-black px-2.5 py-1 rounded-full">7 Hari</span>
                </div>
                {hasGenerated && (
                  <button
                    className="flex items-center gap-1.5 text-xs font-bold text-[#8B2020] border border-[#8B2020]/30
                    px-3 py-2 rounded-xl hover:bg-[#8B2020]/5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Unduh PDF
                  </button>
                )}
              </div>

              {/* Tab navigasi hari (Senin–Minggu) */}
              {hasGenerated && (
                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {HARI.map((hari, idx) => {
                      const past = isDayPast(idx, generatedAt);
                      return (
                        <DayTab
                          key={hari}
                          label={hari}
                          isActive={activeDay === idx}
                          isPast={past}
                          onClick={() => setActiveDay(idx)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Isi: Menu Hari Aktif / State Kosong */}
              <div className="p-5">
                {!hasGenerated || weeklyMenu.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-[#F3EFEA] rounded-3xl flex items-center justify-center text-4xl mb-4 animate-bounce">
                      🍱
                    </div>
                    <h3 className="text-lg font-black text-gray-700 mb-2">Menu Mingguan Belum Dibuat</h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                      Atur budget di kiri, lalu klik <strong>"Buat Rekomendasi AI"</strong> untuk mendapatkan
                      menu MPASI 7 hari yang dipersonalisasi.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header hari aktif */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-gray-800">{HARI[activeDay]}</h3>
                          {isDayPast(activeDay, generatedAt) && (
                            <span className="text-xs bg-gray-100 text-gray-400 font-bold px-2 py-0.5 rounded-full">
                              Sudah Lewat
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          3 waktu makan ·{" "}
                          {formatRupiah(
                            (weeklyMenu[activeDay]?.pagi?.est_price || weeklyMenu[activeDay]?.pagi?.harga || 0) +
                            (weeklyMenu[activeDay]?.siang?.est_price || weeklyMenu[activeDay]?.siang?.harga || 0) +
                            (weeklyMenu[activeDay]?.malam?.est_price || weeklyMenu[activeDay]?.malam?.harga || 0)
                          )}{" "}
                          / hari
                        </p>
                      </div>
                      {/* Navigasi prev/next */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveDay(Math.max(0, activeDay - 1))}
                          disabled={activeDay === 0}
                          className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center
                            hover:bg-[#8B2020]/10 hover:text-[#8B2020] disabled:opacity-30 disabled:cursor-not-allowed
                            transition-colors text-gray-600"
                        >‹</button>
                        <button
                          onClick={() => setActiveDay(Math.min(6, activeDay + 1))}
                          disabled={activeDay === 6}
                          className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center
                            hover:bg-[#8B2020]/10 hover:text-[#8B2020] disabled:opacity-30 disabled:cursor-not-allowed
                            transition-colors text-gray-600"
                        >›</button>
                      </div>
                    </div>

                    {/* 3 kartu menu: Pagi, Siang, Malam */}
                    <div className="space-y-3">
                      {[
                        { slot: "pagi", label: "Sarapan · 08:00", icon: "☀️", warna: "bg-amber-50" },
                        { slot: "siang", label: "Makan Siang · 12:00", icon: "🌤️", warna: "bg-orange-50" },
                        { slot: "malam", label: "Makan Malam · 19:00", icon: "🌙", warna: "bg-indigo-50" },
                      ].map(({ slot, label, icon, warna }) => {
                        const menu = weeklyMenu[activeDay]?.[slot];
                        const past = isDayPast(activeDay, generatedAt);
                        return (
                          <MealCard
                            key={slot}
                            label={label}
                            icon={icon}
                            menu={menu}
                            warna={warna}
                            isPast={past}
                            onClick={() => setDetailPopup({ menu, label, icon })}
                          />
                        );
                      })}
                    </div>

                    {/* Banner hari lewat */}
                    {isDayPast(activeDay, generatedAt) && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-center">
                        <p className="text-xs text-gray-400 font-bold">
                          📅 Menu hari ini sudah lewat dan tidak bisa diklik.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card: Ringkasan Budget & AI Insight */}
            {hasGenerated && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {aiInsight && (
                  <div className="bg-gradient-to-br from-[#8B2020] to-[#c0392b] rounded-3xl shadow-sm p-5">
                    <h3 className="text-sm font-black text-white mb-3">✨ Insight AI</h3>
                    <p className="text-xs text-white/80 leading-relaxed">{aiInsight}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterDashboard />

      {/* ─── POPUP DETAIL MENU ──────────────────────────────────────────────── */}
      {detailPopup && (
        <MenuDetailPopup
          menu={detailPopup.menu}
          label={detailPopup.label}
          icon={detailPopup.icon}
          onClose={() => setDetailPopup(null)}
        />
      )}

      {/* ─── POPUP EDIT ALERGI ──────────────────────────────────────────────── */}
      {showAllergyEdit && (
        <AllergyEditPopup
          masterAllergies={masterAllergies}
          selectedIds={selectedAllergyIds}
          onSave={handleSaveAllergy}
          onClose={() => setShowAllergyEdit(false)}
          isSaving={isSavingAllergy}
        />
      )}
    </div>
  );
}
