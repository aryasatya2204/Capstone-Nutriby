/**
 * ============================================================================
 * SearchMenu.jsx — Cari Menu MPASI
 * ============================================================================
 *
 * ALUR KERJA LENGKAP:
 *
 * 1. MOUNT — 3 fetch paralel:
 *    a. GET /api/children           → data anak (id, preferensi saat ini, alergi)
 *    b. GET /api/master/ingredients → semua bahan makanan dari DB (untuk autocomplete)
 *    c. GET /api/master/allergies   → semua kategori alergi (untuk info card)
 *
 * 2. USER KETIK di search box → autocomplete realtime dari data ingredients (FE only, tanpa fetch)
 *
 * 3. USER PILIH bahan (misal "Ayam"):
 *    → Bahan ditambah ke list "preferensi aktif" secara visual (chips)
 *    → Bahan yang dipilih = ingredient_id dari master ingredients
 *
 * 4. USER KLIK "Cari Rekomendasi":
 *    a. PUT /api/children/:childId
 *       Body: { preference_ids: [id1, id2, ...] }
 *       → Backend simpan preferensi ke child_preferences table
 *       → Backend JUGA mempertahankan allergy_ids yang sudah ada
 *         (kita fetch dulu current allergy_ids agar tidak terhapus)
 *
 *    b. POST /api/mpasi/generate-menu/:childId
 *       Body: {} (tanpa custom_budget → pakai optimal dari DB)
 *       → Backend teruskan preferensi ke ML model (favorite_foods array)
 *       → ML menghasilkan ranked recommendations berdasarkan:
 *          - favorite_foods (preferensi yang baru disimpan)
 *          - z-score (status gizi anak)
 *          - budget optimal
 *          - filter alergi
 *       → Response: array recipe dengan match_score, kalori, nutrisi, harga
 *
 * 5. HASIL ditampilkan sebagai grid kartu menu dengan:
 *    - Match score badge (tinggi=hijau, medium=kuning, rendah=merah)
 *    - Info nutrisi (kalori, protein, lemak)
 *    - Harga estimasi
 *    - Tag bahan utama
 *    - Tekstur & usia minimum
 *
 * CATATAN PENTING BACKEND:
 * - PUT /api/children/:id menerima { allergy_ids, preference_ids }
 *   → Keduanya optional TAPI backend melakukan deleteMany dulu lalu insert
 *   → Jadi kita HARUS kirim allergy_ids yang sudah ada agar tidak terhapus
 * - POST /api/mpasi/generate-menu/:childId mengembalikan:
 *   { message, budget_per_menu_applied, data: Recipe[] dengan match_score }
 * - Recipe fields: id, name, description, bahan_masakan, instructions,
 *   min_age_months, texture, est_price, calories, protein, fat, iron, zinc,
 *   tags, image_url, match_score
 * ============================================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api";

// ─── HELPER: FORMAT RUPIAH ────────────────────────────────────────────────────
const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

// ─── HELPER: WARNA MATCH SCORE ────────────────────────────────────────────────
// Mengembalikan kelas Tailwind sesuai skor kecocokan dari ML model (0.0–1.0)
const getScoreStyle = (score) => {
  if (score >= 0.85) return { ring: "ring-green-400", bg: "bg-green-500", label: "Sangat Cocok", text: "text-green-700", lightBg: "bg-green-50" };
  if (score >= 0.7)  return { ring: "ring-yellow-400", bg: "bg-yellow-400", label: "Cocok", text: "text-yellow-700", lightBg: "bg-yellow-50" };
  return               { ring: "ring-orange-300", bg: "bg-orange-400", label: "Cukup Cocok", text: "text-orange-600", lightBg: "bg-orange-50" };
};

// ─── HELPER: WARNA NUTRISI BAR ────────────────────────────────────────────────
const getNutriColor = (type) => ({
  kalori: "bg-amber-400",
  protein: "bg-blue-400",
  lemak: "bg-purple-400",
  besi: "bg-red-400",
  zinc: "bg-teal-400",
})[type] || "bg-gray-400";

// ─── KOMPONEN: CHIP PREFERENSI ────────────────────────────────────────────────
// Menampilkan bahan makanan yang sudah dipilih user sebagai tag yang bisa dihapus
function PreferenceChip({ label, onRemove, isNew }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
        transition-all duration-200 group
        ${isNew
          ? "bg-[#8B2020] text-white shadow-md shadow-[#8B2020]/25 animate-[pop_0.2s_ease]"
          : "bg-[#F3EFEA] text-[#8B2020] border border-[#8B2020]/20 hover:bg-[#8B2020]/10"
        }`}
    >
      <span>🥄</span>
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center
          hover:bg-white/30 transition-colors text-current opacity-60 hover:opacity-100"
        aria-label={`Hapus ${label}`}
      >
        ×
      </button>
    </span>
  );
}

// ─── KOMPONEN: NUTRISI BAR MINI ───────────────────────────────────────────────
// Bar horizontal kecil untuk visualisasi nilai nutrisi dalam kartu menu
function NutriBar({ label, value, max, type }) {
  const persen = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">{label}</span>
        <span className="text-[10px] font-black text-gray-600">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getNutriColor(type)} transition-all duration-700`}
          style={{ width: `${persen}%` }}
        />
      </div>
    </div>
  );
}

// ─── KOMPONEN: KARTU MENU ─────────────────────────────────────────────────────
/**
 * RecipeCard — Kartu resep dari hasil rekomendasi AI + ML
 *
 * Data yang ditampilkan berasal dari:
 * - recipe.name, recipe.description → dari tabel recipes
 * - recipe.match_score → dari ML model (0.6–1.0, sudah difilter backend)
 * - recipe.est_price, recipe.calories, recipe.protein, dll → nutrisi dari DB
 * - recipe.bahan_masakan → string bahan (diurai jadi chip)
 * - recipe.texture, recipe.min_age_months → info keamanan untuk bayi
 */
function RecipeCard({ recipe, rank }) {
  const [expanded, setExpanded] = useState(false);
  const score = parseFloat(recipe.match_score || 0);
  const scoreStyle = getScoreStyle(score);

  // Urai bahan_masakan (string) menjadi array chip
  // Format dari DB biasanya: "Ayam, Wortel, Bayam" atau "Ayam\nWortel\nBayam"
  const bahanList = recipe.bahan_masakan
    ? recipe.bahan_masakan.split(/[,\n]/).map(b => b.trim()).filter(Boolean).slice(0, 6)
    : [];

  return (
    <div
      className={`group bg-white rounded-3xl border overflow-hidden shadow-sm
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        ${scoreStyle.ring} ring-1 hover:ring-2`}
    >
      {/* ── Header Kartu ───────────────────────────────────────── */}
      <div className={`px-5 pt-5 pb-4 ${scoreStyle.lightBg}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Nomor rank */}
          <div className="w-7 h-7 rounded-xl bg-white/80 flex items-center justify-center
            text-xs font-black text-gray-500 shadow-sm flex-shrink-0">
            #{rank}
          </div>

          {/* Badge skor kecocokan dari ML */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full
            ${scoreStyle.lightBg} border border-current/10`}>
            <div className={`w-2 h-2 rounded-full ${scoreStyle.bg} animate-pulse`} />
            <span className={`text-[10px] font-black uppercase tracking-wide ${scoreStyle.text}`}>
              {scoreStyle.label}
            </span>
            <span className={`text-[10px] font-black ${scoreStyle.text}`}>
              {Math.round(score * 100)}%
            </span>
          </div>
        </div>

        {/* Nama resep */}
        <h3 className="text-base font-black text-gray-900 leading-tight mb-1">
          {recipe.name}
        </h3>

        {/* Deskripsi singkat */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {recipe.description}
        </p>
      </div>

      {/* ── Info Cepat (harga, tekstur, usia) ──────────────────── */}
      <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">💰</span>
          <span className="text-sm font-black text-[#8B2020]">
            {formatRupiah(parseFloat(recipe.est_price))}
          </span>
          <span className="text-xs text-gray-400">/ porsi</span>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center gap-1">
          <span className="text-xs">🥄</span>
          <span className="text-xs font-bold text-gray-500 capitalize">{recipe.texture}</span>
        </div>

        <div className="w-px h-4 bg-gray-200" />

        <div className="flex items-center gap-1">
          <span className="text-xs">👶</span>
          <span className="text-xs font-bold text-gray-500">≥ {recipe.min_age_months} bulan</span>
        </div>
      </div>

      {/* ── Bahan-bahan ────────────────────────────────────────── */}
      {bahanList.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">
            Bahan Utama
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bahanList.map((bahan, i) => (
              <span key={i}
                className="text-xs bg-[#F3EFEA] text-gray-600 font-bold px-2.5 py-1 rounded-full
                  border border-[#8B2020]/10">
                {bahan}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Nutrisi ────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">
          Kandungan Nutrisi
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <NutriBar label="Kalori" value={`${parseFloat(recipe.calories || 0).toFixed(0)} kcal`} max={300} type="kalori" />
          <NutriBar label="Protein" value={`${parseFloat(recipe.protein || 0).toFixed(1)}g`} max={15} type="protein" />
          <NutriBar label="Lemak" value={`${parseFloat(recipe.fat || 0).toFixed(1)}g`} max={15} type="lemak" />
          <NutriBar label="Besi" value={`${parseFloat(recipe.iron || 0).toFixed(1)}mg`} max={10} type="besi" />
        </div>
      </div>

      {/* ── Tombol Lihat Cara Masak (Expandable) ──────────────── */}
      <div className="px-5 pb-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2.5 px-4 rounded-2xl
            bg-gray-50 hover:bg-[#F3EFEA] border border-gray-200 hover:border-[#8B2020]/20
            text-xs font-bold text-gray-600 hover:text-[#8B2020] transition-all duration-200 group"
        >
          <span>📖 Cara Memasak</span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Instruksi memasak — toggle expand */}
        {expanded && (
          <div className="mt-3 bg-[#FFF8F0] rounded-2xl p-4 border border-orange-100
            animate-[fadeDown_0.2s_ease]">
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
              {recipe.instructions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KOMPONEN: SKELETON CARD ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
      <div className="px-5 pt-5 pb-4 bg-gray-50">
        <div className="flex justify-between mb-3">
          <div className="w-7 h-7 bg-gray-200 rounded-xl" />
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
        <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded-lg w-full" />
        <div className="h-3 bg-gray-200 rounded-lg w-2/3 mt-1" />
      </div>
      <div className="px-5 py-3 flex gap-4">
        <div className="h-4 w-20 bg-gray-100 rounded" />
        <div className="h-4 w-16 bg-gray-100 rounded" />
      </div>
      <div className="px-5 py-4 space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-4 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── KOMPONEN UTAMA: SearchMenu ───────────────────────────────────────────────
export default function SearchMenu() {
  // === STATE DATA ===
  const [childData, setChildData]         = useState(null);       // Data anak dari /api/children
  const [allIngredients, setAllIngredients] = useState([]);       // Semua bahan dari /api/master/ingredients
  const [results, setResults]             = useState([]);         // Hasil rekomendasi menu dari ML
  const [isLoadingData, setIsLoadingData] = useState(true);       // Loading mount awal
  const [isSearching, setIsSearching]     = useState(false);      // Loading saat generate
  const [errorMsg, setErrorMsg]           = useState("");
  const [hasSearched, setHasSearched]     = useState(false);      // Sudah pernah cari?
  const [budgetApplied, setBudgetApplied] = useState(null);       // Budget yang dipakai AI

  // === STATE SEARCH & PREFERENSI ===
  const [searchQuery, setSearchQuery]     = useState("");         // Teks di input
  const [suggestions, setSuggestions]     = useState([]);         // Autocomplete list
  const [showSuggestions, setShowSuggestions] = useState(false);

  /**
   * selectedIngredients — array ingredient object yang dipilih user
   * Format: [{ id: Int, name: String }, ...]
   * Ini adalah "preferensi aktif" yang akan dikirim ke backend
   *
   * Saat mount, diisi dari child.preferences (preferensi yang sudah ada di DB)
   * agar user bisa lihat & edit preferensi lama + tambah baru
   */
  const [selectedIngredients, setSelectedIngredients] = useState([]);

  // === REFS ===
  const inputRef      = useRef(null);
  const dropdownRef   = useRef(null);

  // ─── FETCH DATA AWAL ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoadingData(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch paralel: anak + daftar bahan makanan
        const [childRes, ingredientsRes] = await Promise.all([
          fetch(`${API_BASE}/children`, { headers }),
          fetch(`${API_BASE}/master/ingredients`, { headers }),
        ]);

        const [childJson, ingredientsJson] = await Promise.all([
          childRes.json(),
          ingredientsRes.json(),
        ]);

        const child = childJson?.[0];
        if (child) {
          setChildData(child);

          // Isi selected ingredients dari preferensi anak yang sudah tersimpan di DB
          // child.preferences = [{ child_id, ingredient_id, ingredient: { id, name } }]
          if (child.preferences && child.preferences.length > 0) {
            setSelectedIngredients(
              child.preferences.map(p => ({ id: p.ingredient.id, name: p.ingredient.name }))
            );
          }
        }

        // Simpan semua bahan untuk autocomplete
        if (Array.isArray(ingredientsJson)) {
          setAllIngredients(ingredientsJson); // [{ id: Int, name: String }]
        }

      } catch (err) {
        console.error("Gagal fetch data awal:", err);
        setErrorMsg("Gagal memuat data. Silakan refresh halaman.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchAll();
  }, []);

  // ─── AUTOCOMPLETE: UPDATE SARAN SAAT QUERY BERUBAH ──────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter ingredients dari cache lokal (tidak perlu fetch lagi)
    const q = searchQuery.toLowerCase();
    const filtered = allIngredients
      .filter(ing =>
        ing.name.toLowerCase().includes(q) &&
        // Sembunyikan yang sudah dipilih
        !selectedIngredients.find(s => s.id === ing.id)
      )
      .slice(0, 8); // Maks 8 saran

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [searchQuery, allIngredients, selectedIngredients]);

  // ─── TUTUP DROPDOWN SAAT KLIK DI LUAR ───────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── HANDLER: PILIH BAHAN DARI AUTOCOMPLETE ─────────────────────────────
  const handleSelectIngredient = useCallback((ingredient) => {
    // Tambah ke selectedIngredients jika belum ada
    setSelectedIngredients(prev => {
      if (prev.find(s => s.id === ingredient.id)) return prev;
      return [...prev, ingredient];
    });
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  // ─── HANDLER: HAPUS BAHAN DARI PILIHAN ──────────────────────────────────
  const handleRemoveIngredient = useCallback((id) => {
    setSelectedIngredients(prev => prev.filter(s => s.id !== id));
  }, []);

  // ─── HANDLER: ENTER DI SEARCH BOX ───────────────────────────────────────
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      // Pilih saran pertama jika user tekan Enter
      handleSelectIngredient(suggestions[0]);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // ─── HANDLER: CARI REKOMENDASI ───────────────────────────────────────────
  /**
   * Alur 2 langkah:
   * 1. PUT /api/children/:id — simpan preferensi baru ke DB
   *    PENTING: sertakan allergy_ids dari child yang sudah ada agar tidak terhapus
   * 2. POST /api/mpasi/generate-menu/:childId — generate rekomendasi dari ML
   */
  const handleSearch = async () => {
    if (!childData?.id) return;
    if (selectedIngredients.length === 0) {
      setErrorMsg("Pilih minimal 1 bahan makanan untuk mencari rekomendasi.");
      return;
    }

    setIsSearching(true);
    setErrorMsg("");
    setResults([]);

    try {
      const token = localStorage.getItem("token");
      const authHeader = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      // ── LANGKAH 1: Simpan preferensi ke DB ───────────────────────────────
      /**
       * PUT /api/children/:id
       * Body: { allergy_ids, preference_ids }
       *
       * WAJIB kirim allergy_ids existing karena backend melakukan deleteMany
       * sebelum insert baru — jika tidak dikirim, alergi akan terhapus!
       * allergy_ids diambil dari child.allergies yang sudah di-fetch saat mount.
       */
      const existingAllergyIds = (childData.allergies || []).map(a => a.allergy_category_id);
      const preferenceIds = selectedIngredients.map(s => s.id);

      const updateRes = await fetch(`${API_BASE}/children/${childData.id}`, {
        method: "PUT",
        headers: authHeader,
        body: JSON.stringify({
          allergy_ids: existingAllergyIds,
          preference_ids: preferenceIds,
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.details || updateData.message || "Gagal menyimpan preferensi.");
      }

      // ── LANGKAH 2: Generate rekomendasi dari ML ───────────────────────────
      /**
       * POST /api/mpasi/generate-menu/:childId
       * Backend akan:
       * 1. Baca child.preferences yang baru saja disimpan (favorite_foods)
       * 2. Kirim ke ML model bersama z-score, budget, target nutrisi
       * 3. ML filter & rank resep berdasarkan preferensi
       * 4. Backend filter skor >= 0.6 dan budget
       * 5. Kembalikan: { data: Recipe[], budget_per_menu_applied }
       */
      const generateRes = await fetch(`${API_BASE}/mpasi/generate-menu/${childData.id}`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({}), // Tanpa custom_budget → pakai optimal dari DB
      });

      const generateData = await generateRes.json();
      if (!generateRes.ok) {
        throw new Error(generateData.message || "Gagal mendapatkan rekomendasi.");
      }

      // Simpan hasil dan budget yang dipakai
      setResults(generateData.data || []);
      setBudgetApplied(generateData.budget_per_menu_applied);
      setHasSearched(true);

    } catch (err) {
      console.error("Error cari menu:", err);
      setErrorMsg(err.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSearching(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']">
      <NavbarDashboard />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-10">

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <a href="/features" className="hover:text-[#8B2020] transition-colors">Fitur</a>
            <span>›</span>
            <span className="text-[#8B2020] font-bold">Cari Menu</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
            Temukan Menu MPASI
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Cari berdasarkan bahan makanan — AI kami akan merekomendasikan menu terbaik untuk si kecil
          </p>
        </div>

        {/* ── LAYOUT: SEARCH PANEL + RESULTS ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ═══ PANEL KIRI: SEARCH & PREFERENSI ══════════════════ */}
          <div className="lg:col-span-4 space-y-4">

            {/* Card: Data Anak */}
            {!isLoadingData && childData && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  {/* Avatar inisial anak */}
                  <div className="w-11 h-11 rounded-2xl bg-[#8B2020]/10 flex items-center justify-center
                    text-[#8B2020] font-black text-lg flex-shrink-0">
                    {childData.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-black text-gray-800">{childData.name}</p>
                    <p className="text-xs text-gray-400">
                      {childData.dob
                        ? `${Math.floor((Date.now() - new Date(childData.dob)) / (1000 * 60 * 60 * 24 * 30.44))} bulan`
                        : ""}
                      {childData.gender ? ` · ${childData.gender === "L" ? "Laki-laki" : "Perempuan"}` : ""}
                    </p>
                  </div>
                </div>

                {/* Alergi — info saja, tidak bisa diubah dari sini */}
                {childData.allergies && childData.allergies.length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-2">
                      ⚠️ Pantangan — Menu akan otomatis menghindari ini
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {childData.allergies.map((a) => (
                        <span key={a.allergy_category_id}
                          className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full">
                          {a.allergy_category?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card: Cari Bahan */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-black text-[#8B2020] mb-1 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-sm">🔍</span>
                Cari Bahan Makanan
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Ketik bahan favorit si kecil. AI akan memprioritaskan resep yang mengandung bahan ini.
              </p>

              {/* Search input dengan autocomplete */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden
                  focus-within:border-[#8B2020] focus-within:ring-2 focus-within:ring-[#8B2020]/10
                  transition-all duration-200 bg-white">
                  <div className="pl-4 text-gray-400 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Cari bahan... (misal: Ayam)"
                    className="w-full px-3 py-3 text-sm outline-none bg-transparent placeholder-gray-300"
                    disabled={isLoadingData}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}
                      className="pr-4 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
                      ×
                    </button>
                  )}
                </div>

                {/* Dropdown autocomplete */}
                {showSuggestions && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1.5
                    bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden
                    animate-[fadeDown_0.15s_ease]">
                    {suggestions.map((ing) => (
                      <button
                        key={ing.id}
                        onMouseDown={() => handleSelectIngredient(ing)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left
                          hover:bg-[#F3EFEA] transition-colors group"
                      >
                        <span className="w-7 h-7 bg-[#8B2020]/10 rounded-lg flex items-center justify-center
                          text-xs flex-shrink-0 group-hover:bg-[#8B2020]/20 transition-colors">
                          🥄
                        </span>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-[#8B2020] transition-colors">
                          {ing.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chip preferensi yang dipilih */}
              {selectedIngredients.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
                      Bahan Dipilih ({selectedIngredients.length})
                    </p>
                    {selectedIngredients.length > 1 && (
                      <button
                        onClick={() => setSelectedIngredients([])}
                        className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedIngredients.map((ing, idx) => (
                      <PreferenceChip
                        key={ing.id}
                        label={ing.name}
                        onRemove={() => handleRemoveIngredient(ing.id)}
                        isNew={idx >= (childData?.preferences?.length || 0)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Saran bahan populer jika belum ada yang dipilih & search kosong */}
              {selectedIngredients.length === 0 && !searchQuery && allIngredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wide">
                    💡 Bahan Populer
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {/* Tampilkan 8 bahan pertama sebagai quick pick */}
                    {allIngredients.slice(0, 8).map(ing => (
                      <button
                        key={ing.id}
                        onClick={() => handleSelectIngredient(ing)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#F3EFEA]
                          text-gray-600 hover:bg-[#8B2020]/10 hover:text-[#8B2020]
                          border border-transparent hover:border-[#8B2020]/20
                          transition-all duration-150"
                      >
                        + {ing.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {errorMsg && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs text-red-600 font-bold">⚠️ {errorMsg}</p>
                </div>
              )}
            </div>

            {/* Card: Info Budget */}
            {childData?.optimal_budget_cache && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                  <span>💰</span> Budget Optimal
                </h3>
                <div className="bg-[#F3EFEA] rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Per porsi (dihitung AI)</p>
                  <p className="text-xl font-black text-[#8B2020]">
                    {formatRupiah(parseFloat(childData.optimal_budget_cache) / 30 / 3)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Dari budget bulanan {formatRupiah(parseFloat(childData.optimal_budget_cache))}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  AI akan otomatis menyesuaikan rekomendasi agar sesuai budget ini.
                </p>
              </div>
            )}

            {/* Tombol Cari */}
            <button
              onClick={handleSearch}
              disabled={isSearching || isLoadingData || selectedIngredients.length === 0 || !childData}
              className="w-full bg-[#8B2020] text-white font-black text-sm py-4 rounded-2xl
                shadow-lg shadow-[#8B2020]/30 transition-all duration-300
                hover:bg-[#6b1020] hover:shadow-xl hover:shadow-[#8B2020]/40 hover:-translate-y-0.5
                active:translate-y-0 active:shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  AI Sedang Memproses...
                </>
              ) : (
                <>✨ Cari Rekomendasi AI</>
              )}
            </button>

            {selectedIngredients.length === 0 && !isLoadingData && (
              <p className="text-xs text-gray-400 text-center -mt-2">
                Pilih minimal 1 bahan dulu
              </p>
            )}
          </div>

          {/* ═══ PANEL KANAN: HASIL REKOMENDASI ═══════════════════ */}
          <div className="lg:col-span-8">

            {/* ── State: Loading ───────────────────────────────────── */}
            {isSearching && (
              <div>
                {/* Banner proses AI */}
                <div className="bg-gradient-to-r from-[#8B2020] to-[#6b1020] rounded-3xl p-5 mb-5
                  flex items-center gap-4 text-white">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0
                    animate-bounce">
                    🤖
                  </div>
                  <div>
                    <p className="font-black text-base">AI sedang bekerja...</p>
                    <p className="text-sm text-white/70">
                      Menganalisis preferensi "{selectedIngredients.map(s => s.name).join(", ")}"
                      dan mecocokkan dengan kebutuhan gizi si kecil
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
                </div>
              </div>
            )}

            {/* ── State: Kosong awal ────────────────────────────────── */}
            {!isSearching && !hasSearched && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-gray-100
                  flex items-center justify-center text-5xl mb-5">
                  🍱
                </div>
                <h3 className="text-xl font-black text-gray-700 mb-2">
                  Belum Ada Rekomendasi
                </h3>
                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                  Cari bahan makanan favorit si kecil di panel kiri, lalu klik
                  <strong className="text-[#8B2020]"> "Cari Rekomendasi AI"</strong> untuk
                  mendapatkan menu MPASI yang dipersonalisasi.
                </p>

                {/* Ilustrasi alur */}
                <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-sm">
                  {[
                    { step: "1", icon: "🔍", label: "Pilih Bahan" },
                    { step: "2", icon: "🤖", label: "AI Proses" },
                    { step: "3", icon: "✨", label: "Dapat Menu" },
                  ].map(item => (
                    <div key={item.step}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <p className="text-xs font-black text-gray-600">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── State: Tidak ada hasil ────────────────────────────── */}
            {!isSearching && hasSearched && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">😔</div>
                <h3 className="text-xl font-black text-gray-700 mb-2">Tidak Ada Hasil</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Tidak ada menu yang cocok dengan kombinasi bahan dan budget saat ini.
                  Coba kurangi bahan atau atur budget lebih tinggi.
                </p>
                <button
                  onClick={() => { setHasSearched(false); setSelectedIngredients([]); }}
                  className="mt-4 text-sm font-bold text-[#8B2020] hover:underline"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {/* ── State: Ada hasil ──────────────────────────────────── */}
            {!isSearching && hasSearched && results.length > 0 && (
              <div>
                {/* Summary bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5
                  bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5">
                  <div>
                    <p className="text-sm font-black text-gray-800">
                      🎯 {results.length} Menu Direkomendasikan
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dipersonalisasi untuk "{selectedIngredients.map(s => s.name).join(", ")}"
                      · semua sudah difilter alergi
                    </p>
                  </div>
                  {budgetApplied && (
                    <div className="bg-[#F3EFEA] rounded-xl px-3 py-2 flex-shrink-0">
                      <p className="text-xs text-gray-500">Budget / porsi</p>
                      <p className="text-sm font-black text-[#8B2020]">
                        {formatRupiah(parseFloat(budgetApplied))}
                      </p>
                    </div>
                  )}
                </div>

                {/* Grid kartu hasil */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((recipe, idx) => (
                    <RecipeCard key={recipe.id} recipe={recipe} rank={idx + 1} />
                  ))}
                </div>

                {/* Tombol cari ulang di bawah */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => { setHasSearched(false); setResults([]); }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#8B2020]
                      hover:underline transition-all"
                  >
                    ← Ubah Preferensi & Cari Ulang
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterDashboard />

      {/* Keyframes tambahan — inject via style tag */}
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
