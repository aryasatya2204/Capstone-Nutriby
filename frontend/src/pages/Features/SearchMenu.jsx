import { useState, useEffect, useRef, useCallback } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";

const API_BASE = "http://localhost:3000/api";

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);

const formatAngkaRibuan = (val) => {
  const num = val.toString().replace(/\D/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const hitungBudgetPerPorsi = (budgetBulanan) => {
  if (!budgetBulanan || isNaN(budgetBulanan)) return 0;
  return Math.round(parseFloat(budgetBulanan) / 30 / 3);
};

// ─── KOMPONEN: NUTRISI BAR ────────────────────────────────────────────────────
function NutriBar({ label, value, max, color }) {
  const persen = Math.min(100, (parseFloat(value) / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-[#6B4C3B]/60 uppercase tracking-wide font-semibold">
          {label}
        </span>
        <span className="text-[10px] font-bold text-[#3D2314]">{value}</span>
      </div>
      <div className="h-1.5 bg-[#EDE0D4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${persen}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── KOMPONEN: CHIP BAHAN ────────────────────────────────────────────────────
function IngredientChip({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
      bg-[#8B2020] text-white transition-all duration-150"
    >
      {label}
      <button
        onClick={onRemove}
        className="w-3.5 h-3.5 rounded-full flex items-center justify-center
          hover:bg-white/20 transition-colors text-white/80 hover:text-white ml-0.5"
        aria-label={`Hapus ${label}`}
      >
        ×
      </button>
    </span>
  );
}

// ─── KOMPONEN: SKELETON CARD ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE0D4] overflow-hidden animate-pulse">
      <div className="h-2 bg-[#8B2020]/20 w-full" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#EDE0D4] rounded w-3/4" />
        <div className="h-3 bg-[#EDE0D4] rounded w-full" />
        <div className="h-3 bg-[#EDE0D4] rounded w-2/3" />
        <div className="flex gap-2 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-16 bg-[#EDE0D4] rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HELPER: NORMALIZE RECIPE ────────────────────────────────────────────────
function normalizeRecipe(r) {
  if (!r) return r;
  return {
    ...r,
    name: r.name || "(Nama tidak tersedia)",
    description: r.description || "",
    instructions: r.instructions || "",
    bahan_masakan: r.bahan_masakan || "",
    calories: parseFloat(r.calories || 0),
    protein: parseFloat(r.protein || 0),
    fat: parseFloat(r.fat || 0),
    iron: parseFloat(r.iron || 0),
    zinc: parseFloat(r.zinc || 0),
    est_price: parseFloat(r.est_price || 0),
    min_age_months: r.min_age_months || null,
    max_age_months: r.max_age_months || null,
    texture: r.texture || "",
    image_url: r.image_url || "",
    tags: r.tags || "",
  };
}

// ─── KOMPONEN: POPUP DETAIL MENU ──────────────────────────────────────────────
function MenuDetailPopup({ recipe: rawRecipe, onClose, sourceLabel }) {
  if (!rawRecipe) return null;
  const recipe = normalizeRecipe(rawRecipe);

  const bahanList = recipe.bahan_masakan
    ? recipe.bahan_masakan
        .split(/[,\n]/)
        .map((b) => b.trim())
        .filter(Boolean)
    : Array.isArray(rawRecipe.ingredients)
      ? rawRecipe.ingredients
      : [];

  const NUTRI = [
    {
      label: "Kalori",
      value: `${recipe.calories.toFixed(0)} kkal`,
      max: 300,
      color: "#D97706",
    },
    {
      label: "Protein",
      value: `${recipe.protein.toFixed(1)}g`,
      max: 15,
      color: "#2563EB",
    },
    {
      label: "Lemak",
      value: `${recipe.fat.toFixed(1)}g`,
      max: 15,
      color: "#7C3AED",
    },
    {
      label: "Zat Besi",
      value: `${recipe.iron.toFixed(1)}mg`,
      max: 10,
      color: "#DC2626",
    },
    {
      label: "Seng",
      value: `${recipe.zinc.toFixed(1)}mg`,
      max: 5,
      color: "#0D9488",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center"
      style={{ backdropFilter: "blur(6px)", background: "rgba(30,10,5,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#FFF8F2] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden
          animate-[slideUp_0.28s_cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header strip */}
        <div className="relative bg-[#8B2020] px-5 pt-5 pb-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 bg-white/15 rounded-full flex items-center
              justify-center text-white/80 hover:bg-white/25 hover:text-white transition-all text-base leading-none"
          >
            ✕
          </button>

          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.name}
              className="w-14 h-14 rounded-xl object-cover mb-3 shadow-lg border-2 border-white/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center text-2xl mb-3">
              🍱
            </div>
          )}

          <h3 className="text-lg font-bold text-white leading-tight pr-8">
            {recipe.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {recipe.texture && (
              <span className="text-[10px] font-semibold text-white/70 bg-white/10 px-2 py-0.5 rounded-full capitalize">
                {recipe.texture}
              </span>
            )}
            {recipe.min_age_months && (
              <span className="text-[10px] font-semibold text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                👶 {recipe.min_age_months}–{recipe.max_age_months} bln
              </span>
            )}
            {sourceLabel && (
              <span className="text-[10px] font-semibold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                {sourceLabel}
              </span>
            )}
          </div>
        </div>

        {/* Body scrollable */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 130px)" }}
        >
          <div className="p-5 space-y-5">
            {/* Harga */}
            <div className="flex items-center justify-between bg-[#FFF0E6] border border-[#8B2020]/15 rounded-2xl px-4 py-3">
              <div>
                <p className="text-[10px] text-[#8B2020]/60 uppercase font-semibold tracking-wide">
                  Estimasi Harga
                </p>
                <p className="text-xl font-bold text-[#8B2020]">
                  {formatRupiah(recipe.est_price)}
                </p>
              </div>
              <span className="text-2xl">💰</span>
            </div>

            {/* Nutrisi */}
            <div>
              <p className="text-[10px] font-bold text-[#6B4C3B]/60 uppercase tracking-wider mb-3">
                Nilai Gizi
              </p>
              <div className="space-y-2.5">
                {NUTRI.map((n) => (
                  <NutriBar
                    key={n.label}
                    label={n.label}
                    value={n.value}
                    max={n.max}
                    color={n.color}
                  />
                ))}
              </div>
            </div>

            {/* Deskripsi */}
            {recipe.description && (
              <div>
                <p className="text-[10px] font-bold text-[#6B4C3B]/60 uppercase tracking-wider mb-1.5">
                  Tentang Menu
                </p>
                <p className="text-sm text-[#3D2314]/70 leading-relaxed">
                  {recipe.description}
                </p>
              </div>
            )}

            {/* Bahan Masakan */}
            {bahanList.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[#6B4C3B]/60 uppercase tracking-wider mb-2">
                  Bahan Masakan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bahanList.map((b, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[#FFF0E6] text-[#8B2020] font-semibold px-2.5 py-1 rounded-full border border-[#8B2020]/15"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cara Masak */}
            {recipe.instructions && (
              <div>
                <p className="text-[10px] font-bold text-[#6B4C3B]/60 uppercase tracking-wider mb-2">
                  Cara Membuat
                </p>
                <div className="bg-white border border-[#EDE0D4] rounded-2xl p-4">
                  <p className="text-sm text-[#3D2314]/70 leading-relaxed whitespace-pre-line">
                    {recipe.instructions}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {recipe.tags && (
              <div className="flex flex-wrap gap-1.5">
                {recipe.tags
                  .split(/[,;]/)
                  .filter((t) => t.trim())
                  .map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-[#EDE0D4] text-[#6B4C3B] font-semibold px-2.5 py-1 rounded-full"
                    >
                      {t.trim()}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KOMPONEN: KARTU MENU ─────────────────────────────────────────────────────
function RecipeCard({ recipe: rawRecipe, onClick, searchQuery }) {
  const recipe = normalizeRecipe(rawRecipe);
  const bahanList = recipe.bahan_masakan
    ? recipe.bahan_masakan
        .split(/[,\n]/)
        .map((b) => b.trim())
        .filter(Boolean)
        .slice(0, 4)
    : Array.isArray(rawRecipe.ingredients)
      ? rawRecipe.ingredients.slice(0, 4)
      : [];
  const totalBahan = recipe.bahan_masakan
    ? recipe.bahan_masakan.split(/[,\n]/).filter((b) => b.trim()).length
    : Array.isArray(rawRecipe.ingredients)
      ? rawRecipe.ingredients.length
      : 0;

  // Highlight bahan yang cocok dengan query
  const isHighlighted =
    searchQuery &&
    (recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bahanList.some((b) =>
        b.toLowerCase().includes(searchQuery.toLowerCase()),
      ));

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border overflow-hidden cursor-pointer
        transition-all duration-250 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]
        ${isHighlighted ? "border-[#8B2020]/40 shadow-sm" : "border-[#EDE0D4]"}`}
    >
      {/* Aksen atas */}
      <div
        className={`h-1 w-full ${isHighlighted ? "bg-[#8B2020]" : "bg-[#EDE0D4]"}`}
      />

      <div className="p-4">
        {/* Badges atas */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {recipe.min_age_months && (
            <span className="text-[10px] font-semibold text-[#8B2020] bg-[#FFF0E6] px-2 py-0.5 rounded-full border border-[#8B2020]/15">
              👶 ≥{recipe.min_age_months} bln
            </span>
          )}
          {recipe.texture && (
            <span className="text-[10px] font-semibold text-[#6B4C3B] bg-[#F5EDE4] px-2 py-0.5 rounded-full capitalize">
              {recipe.texture}
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-[#3D2314] leading-snug mb-1">
          {recipe.name}
        </h3>
        {recipe.description && (
          <p className="text-xs text-[#6B4C3B]/60 leading-relaxed line-clamp-2 mb-3">
            {recipe.description}
          </p>
        )}

        {/* Harga */}
        <div className="flex items-center gap-1 mb-3">
          <span className="text-sm font-bold text-[#8B2020]">
            {formatRupiah(recipe.est_price)}
          </span>
          <span className="text-[10px] text-[#6B4C3B]/50">/ porsi</span>
        </div>

        {/* Bahan utama */}
        {bahanList.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {bahanList.map((bahan, i) => (
              <span
                key={i}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                ${
                  searchQuery &&
                  bahan.toLowerCase().includes(searchQuery.toLowerCase())
                    ? "bg-[#8B2020] text-white"
                    : "bg-[#F5EDE4] text-[#6B4C3B]"
                }`}
              >
                {bahan}
              </span>
            ))}
            {totalBahan > 4 && (
              <span className="text-[10px] text-[#6B4C3B]/50 px-1 py-0.5">
                +{totalBahan - 4}
              </span>
            )}
          </div>
        )}

        {/* Nutrisi ringkas */}
        <div className="flex gap-3 pt-3 border-t border-[#EDE0D4]">
          {[
            {
              label: "Kalori",
              val: `${recipe.calories.toFixed(0)}kkal`,
              color: "text-amber-600",
            },
            {
              label: "Protein",
              val: `${recipe.protein.toFixed(1)}g`,
              color: "text-blue-600",
            },
            {
              label: "Lemak",
              val: `${recipe.fat.toFixed(1)}g`,
              color: "text-purple-600",
            },
          ].map((n) => (
            <div key={n.label} className="flex-1 text-center">
              <p className={`text-xs font-bold ${n.color}`}>{n.val}</p>
              <p className="text-[9px] text-[#6B4C3B]/50 uppercase tracking-wide">
                {n.label}
              </p>
            </div>
          ))}
        </div>

        {/* Tap hint */}
        <div className="mt-3 text-center text-[10px] text-[#6B4C3B]/40 group-hover:text-[#8B2020] transition-colors font-semibold">
          Tap untuk detail lengkap →
        </div>
      </div>
    </div>
  );
}

// ─── KOMPONEN: KARTU JADWAL MINGGUAN ─────────────────────────────────────────
function WeeklyRecipeCard({ item, onClick }) {
  const recipe = item.recipe;
  if (!recipe) return null;
  const MEAL_ICON = { pagi: "🌅", siang: "☀️", malam: "🌙" };
  const MEAL_LABEL = { pagi: "Pagi", siang: "Siang", malam: "Malam" };
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-[#EDE0D4] flex items-center gap-3 p-3 cursor-pointer
        transition-all duration-200 hover:border-[#8B2020]/30 hover:shadow-sm active:scale-[0.99]"
    >
      <div className="w-9 h-9 rounded-xl bg-[#FFF0E6] flex items-center justify-center text-base flex-shrink-0">
        {MEAL_ICON[item.meal_time] || "🍱"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#6B4C3B]/50 font-semibold uppercase tracking-wide">
          Hari {item.day_number} ·{" "}
          {MEAL_LABEL[item.meal_time] || item.meal_time}
        </p>
        <p className="text-sm font-bold text-[#3D2314] truncate">
          {recipe.name}
        </p>
        <p className="text-xs text-[#8B2020] font-semibold">
          {formatRupiah(recipe.est_price)}
        </p>
      </div>
      <svg
        className="w-4 h-4 text-[#EDE0D4] group-hover:text-[#8B2020] transition-colors flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// ─── KOMPONEN UTAMA: SearchMenu ───────────────────────────────────────────────
export default function SearchMenu() {
  const [childData, setChildData] = useState(null);
  const [allIngredients, setAllIngredients] = useState([]);
  const [results, setResults] = useState([]);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [budgetApplied, setBudgetApplied] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState([]);

  // State untuk query yang digunakan saat search (untuk highlight)
  const [appliedQuery, setAppliedQuery] = useState("");

  const [budgetInput, setBudgetInput] = useState("");
  const [budgetAiValue, setBudgetAiValue] = useState(0);
  const [detailPopup, setDetailPopup] = useState(null);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ─── FETCH DATA AWAL ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoadingData(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
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
          if (child.preferences && child.preferences.length > 0) {
            setSelectedIngredients(
              child.preferences.map((p) => ({
                id: p.ingredient.id,
                name: p.ingredient.name,
              })),
            );
          }
          if (child.optimal_budget_cache) {
            const perPorsi = hitungBudgetPerPorsi(child.optimal_budget_cache);
            setBudgetAiValue(perPorsi);
            setBudgetInput(formatAngkaRibuan(perPorsi.toString()));
          }
        }
        if (Array.isArray(ingredientsJson)) setAllIngredients(ingredientsJson);
      } catch (err) {
        console.error("Gagal fetch data awal:", err);
        setErrorMsg("Gagal memuat data. Silakan refresh halaman.");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchAll();
  }, []);

  // ─── FETCH WEEKLY PLAN ───────────────────────────────────────────────────
  const fetchWeeklyPlan = useCallback(async (childId) => {
    if (!childId) return;
    setIsLoadingWeekly(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/meal-plan/${childId}?plan_type=mingguan`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setWeeklyPlan(Array.isArray(data) ? data[0] : data);
      }
    } catch (err) {
      console.error("Gagal fetch weekly plan:", err);
    } finally {
      setIsLoadingWeekly(false);
    }
  }, []);

  // ─── AUTOCOMPLETE ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = allIngredients
      .filter(
        (ing) =>
          ing.name.toLowerCase().includes(q) &&
          !selectedIngredients.find((s) => s.id === ing.id),
      )
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [searchQuery, allIngredients, selectedIngredients]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectIngredient = useCallback((ingredient) => {
    setSelectedIngredients((prev) => {
      if (prev.find((s) => s.id === ingredient.id)) return prev;
      return [...prev, ingredient];
    });
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  const handleRemoveIngredient = useCallback((id) => {
    setSelectedIngredients((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      if (suggestions.length > 0) {
        handleSelectIngredient(suggestions[0]);
      } else if (searchQuery.trim()) {
        // FIX: Jika tidak ada di autocomplete, tambahkan sebagai free-text ingredient
        // Cari di allIngredients dengan partial match yang lebih fleksibel
        const q = searchQuery.toLowerCase();
        const fuzzyMatch = allIngredients.find(
          (ing) =>
            ing.name.toLowerCase().includes(q) &&
            !selectedIngredients.find((s) => s.id === ing.id),
        );
        if (fuzzyMatch) handleSelectIngredient(fuzzyMatch);
      }
    }
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const handleBudgetInputChange = (e) => {
    const raw = e.target.value.replace(/\./g, "");
    if (raw === "" || /^\d+$/.test(raw)) setBudgetInput(formatAngkaRibuan(raw));
  };

  const getBudgetNilai = () => {
    const raw = budgetInput.replace(/\./g, "");
    return parseInt(raw, 10) || 0;
  };

  // ─── HANDLER: CARI REKOMENDASI ───────────────────────────────────────────
  const handleSearch = async () => {
    if (!childData?.id) return;

    // FIX: Jika ada searchQuery yang belum dipilih, coba match ke ingredient
    let finalIngredients = [...selectedIngredients];
    if (searchQuery.trim() && finalIngredients.length === 0) {
      const q = searchQuery.toLowerCase();
      const matched = allIngredients.filter((ing) =>
        ing.name.toLowerCase().includes(q),
      );
      if (matched.length > 0) {
        finalIngredients = matched.slice(0, 3);
        setSelectedIngredients(finalIngredients);
      }
    }

    if (finalIngredients.length === 0) {
      setErrorMsg("Pilih minimal 1 bahan makanan untuk mencari rekomendasi.");
      return;
    }

    setIsSearching(true);
    setErrorMsg("");
    setResults([]);
    setWeeklyPlan(null);
    setAppliedQuery(searchQuery.trim());

    try {
      const token = localStorage.getItem("token");
      const authHeader = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // ── LANGKAH 1: Simpan preferensi ke DB ─────────────────────────────
      const existingAllergyIds = (childData.allergies || []).map(
        (a) => a.allergy_category_id,
      );
      const preferenceIds = finalIngredients.map((s) => s.id);

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
        throw new Error(
          updateData.details ||
            updateData.message ||
            "Gagal menyimpan preferensi.",
        );
      }

      // ── LANGKAH 2: Generate rekomendasi dari ML ─────────────────────────
      const generateRes = await fetch(
        `${API_BASE}/mpasi/generate-menu/${childData.id}`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({
            custom_budget: getBudgetNilai() > 0 ? getBudgetNilai() : undefined,
          }),
        },
      );

      const generateData = await generateRes.json();
      if (!generateRes.ok) {
        throw new Error(
          generateData.message || "Gagal mendapatkan rekomendasi.",
        );
      }

      let rawResults = generateData.data || [];

      //  Post-filter + re-rank berdasarkan query ─────────
      // Jika ada search query, prioritaskan menu yang mengandung kata kunci
      // di nama, deskripsi, bahan_masakan, atau ingredients
      const queryTerms = finalIngredients.map((i) => i.name.toLowerCase());
      if (queryTerms.length > 0) {
        const scored = rawResults.map((r) => {
          const norm = normalizeRecipe(r);
          const haystack = [
            norm.name,
            norm.description,
            norm.bahan_masakan,
            Array.isArray(r.ingredients) ? r.ingredients.join(" ") : "",
            norm.tags,
          ]
            .join(" ")
            .toLowerCase();

          let bonus = 0;
          for (const term of queryTerms) {
            if (haystack.includes(term)) bonus += 2;
          }
          return { ...r, _relevanceBonus: bonus };
        });

        // Urutkan: yang punya bonus lebih tinggi muncul duluan, preserve skor ML untuk tie-breaking
        scored.sort((a, b) => {
          const bonusDiff = (b._relevanceBonus || 0) - (a._relevanceBonus || 0);
          if (bonusDiff !== 0) return bonusDiff;
          return (b.match_score || 0) - (a.match_score || 0);
        });

        rawResults = scored;
      }

      setResults(rawResults);
      setBudgetApplied(
        generateData.budget_per_menu_applied || getBudgetNilai(),
      );
      setHasSearched(true);

      // ── LANGKAH 3: Fetch weekly plan ────────────────────────────────────
      await fetchWeeklyPlan(childData.id);
    } catch (err) {
      console.error("Error cari menu:", err);
      setErrorMsg(err.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setHasSearched(false);
    setResults([]);
    setWeeklyPlan(null);
    setAppliedQuery("");
    setErrorMsg("");
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div
      className="flex min-h-screen flex-col bg-[#FAF5F0]"
      style={{ fontFamily: "'Lato', sans-serif" }}
    >
      <NavbarDashboard />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-10">
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className="mb-7">
          <div className="flex items-center gap-1.5 text-xs text-[#6B4C3B]/60 mb-3">
            <a
              href="/features"
              className="hover:text-[#8B2020] transition-colors"
            >
              Fitur
            </a>
            <span>›</span>
            <span className="text-[#8B2020] font-semibold">Cari Menu</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#3D2314] leading-tight">
            Temukan Menu MPASI
          </h1>
          <p className="text-[#6B4C3B]/70 text-sm mt-1">
            Cari berdasarkan bahan makanan, AI akan merekomendasikan menu
            terbaik sesuai kebutuhan gizi si kecil
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ═══ PANEL KIRI ════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-4">
            {/* Data Anak */}
            {isLoadingData ? (
              <div className="bg-white rounded-2xl border border-[#EDE0D4] p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-[#EDE0D4] rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#EDE0D4] rounded w-2/3" />
                    <div className="h-2.5 bg-[#EDE0D4] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ) : childData ? (
              <div className="bg-white rounded-2xl border border-[#EDE0D4] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8B2020]/10 flex items-center justify-center text-[#8B2020] font-bold text-base flex-shrink-0">
                    {childData.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-[#3D2314] text-[17px]">
                      {childData.name}
                    </p>
                    <p className="text-[13px] text-[#6B4C3B]/60">
                      {childData.dob
                        ? `${Math.floor((Date.now() - new Date(childData.dob)) / (1000 * 60 * 60 * 24 * 30.44))} bulan`
                        : ""}
                      {childData.gender
                        ? ` · ${childData.gender === "L" ? "Laki-laki" : "Perempuan"}`
                        : ""}
                    </p>
                  </div>
                </div>
                {childData.allergies && childData.allergies.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-[12px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">
                      ⚠️ Pantangan Alergi
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {childData.allergies.map((a) => (
                        <span
                          key={a.allergy_category_id}
                          className="text-[14px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full"
                        >
                          {a.allergy_category?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Budget */}
            <div className="bg-white rounded-2xl border border-[#EDE0D4] p-4">
              <h2 className="text-sm font-bold text-[#3D2314] mb-1 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-[17px]">
                  💰
                </span>
                Budget Per Porsi
              </h2>
              <p className="text-[13px] text-[#6B4C3B]/60 mb-3">
                Sesuaikan budget per porsi atau gunakan saran AI.
              </p>
              <div className="flex items-center border border-[#EDE0D4] rounded-xl overflow-hidden focus-within:border-[#8B2020] focus-within:ring-2 focus-within:ring-[#8B2020]/10 transition-all bg-white">
                <span className="pl-3 pr-2 text-sm font-bold text-[#6B4C3B]/50 flex-shrink-0">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={handleBudgetInputChange}
                  placeholder="0"
                  className="flex-1 py-2.5 text-sm font-bold text-[#3D2314] outline-none bg-transparent"
                  disabled={isLoadingData}
                />
              </div>
              {budgetAiValue > 0 && (
                <div className="mt-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-emerald-700 uppercase tracking-wide">
                      Saran AI
                    </p>
                    <p className="text-sm font-bold text-emerald-800">
                      {formatRupiah(budgetAiValue)}
                      <span className="text-xs font-normal text-emerald-600 ml-1">
                        / porsi
                      </span>
                    </p>
                  </div>
                  {getBudgetNilai() !== budgetAiValue && (
                    <button
                      onClick={() =>
                        setBudgetInput(
                          formatAngkaRibuan(budgetAiValue.toString()),
                        )
                      }
                      className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                    >
                      Pakai
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cari Bahan */}
            <div className="bg-white rounded-2xl border border-[#EDE0D4] p-4">
              <h2 className="text-sm font-bold text-[#3D2314] mb-1 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-[19px]">
                  🔍
                </span>
                Cari Bahan Makanan
              </h2>
              <p className="text-[13px] text-[#6B4C3B]/60 mb-3">
                Ketik bahan favorit si kecil, AI memprioritaskan resep yang
                mengandungnya.
              </p>

              <div className="relative" ref={dropdownRef}>
                <div className="flex items-center border border-[#EDE0D4] rounded-xl overflow-hidden focus-within:border-[#8B2020] focus-within:ring-2 focus-within:ring-[#8B2020]/10 transition-all bg-white">
                  <div className="pl-3 text-[#6B4C3B]/40 flex-shrink-0">
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() =>
                      suggestions.length > 0 && setShowSuggestions(true)
                    }
                    placeholder="Cari bahan... (misal: Ayam)"
                    className="w-full px-2.5 py-2.5 text-sm outline-none bg-transparent placeholder-[#6B4C3B]/30 text-[#3D2314]"
                    disabled={isLoadingData}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="pr-3 text-[#6B4C3B]/30 hover:text-[#6B4C3B] transition-colors text-base leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>

                {showSuggestions && (
                  <div
                    className="absolute z-20 top-full left-0 right-0 mt-1
                    bg-white rounded-xl shadow-lg border border-[#EDE0D4] overflow-hidden
                    animate-[fadeDown_0.15s_ease]"
                  >
                    {suggestions.map((ing) => (
                      <button
                        key={ing.id}
                        onMouseDown={() => handleSelectIngredient(ing)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#FFF0E6] transition-colors group"
                      >
                        <span className="w-6 h-6 bg-[#8B2020]/10 rounded-lg flex items-center justify-center text-xs flex-shrink-0">
                          🥄
                        </span>
                        <span className="text-sm text-[#3D2314] group-hover:text-[#8B2020] transition-colors">
                          {ing.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chips bahan terpilih */}
              {selectedIngredients.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-[#6B4C3B]/60 uppercase tracking-wide">
                      Dipilih ({selectedIngredients.length})
                    </p>
                    {selectedIngredients.length > 1 && (
                      <button
                        onClick={() => setSelectedIngredients([])}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIngredients.map((ing) => (
                      <IngredientChip
                        key={ing.id}
                        label={ing.name}
                        onRemove={() => handleRemoveIngredient(ing.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick pick */}
              {selectedIngredients.length === 0 &&
                !searchQuery &&
                allIngredients.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-[#6B4C3B]/50 mb-2 font-semibold uppercase tracking-wide">
                      💡 Populer
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allIngredients.slice(0, 8).map((ing) => (
                        <button
                          key={ing.id}
                          onClick={() => handleSelectIngredient(ing)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#F5EDE4] text-[#6B4C3B]
                          hover:bg-[#8B2020]/10 hover:text-[#8B2020] border border-transparent hover:border-[#8B2020]/15 transition-all"
                        >
                          + {ing.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Error */}
              {errorMsg && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs text-red-600 font-semibold">
                    ⚠️ {errorMsg}
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Cari */}
            <button
              onClick={handleSearch}
              disabled={
                isSearching ||
                isLoadingData ||
                selectedIngredients.length === 0 ||
                !childData
              }
              className="w-full bg-[#8B2020] text-white font-bold text-sm py-3.5 rounded-2xl
                shadow-md shadow-[#8B2020]/25 transition-all duration-200
                hover:bg-[#6b1010] hover:shadow-lg hover:shadow-[#8B2020]/30 hover:-translate-y-0.5
                active:translate-y-0 active:shadow-sm
                disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
                flex items-center justify-center gap-2"
            >
              {isSearching ? (
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
                  AI Sedang Memproses...
                </>
              ) : (
                <>✨ Cari Rekomendasi AI</>
              )}
            </button>
            {selectedIngredients.length === 0 && !isLoadingData && (
              <p className="text-[11px] text-[#6B4C3B]/50 text-center -mt-2">
                Pilih minimal 1 bahan dulu
              </p>
            )}
          </div>

          {/* ═══ PANEL KANAN: HASIL ════════════════════════════════ */}
          <div className="lg:col-span-8">
            {/* Loading */}
            {isSearching && (
              <div>
                <div className="bg-[#8B2020] rounded-2xl p-4 mb-5 flex items-center gap-4 text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 animate-bounce">
                    🤖
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      AI sedang merekomendasikan...
                    </p>
                    <p className="text-xs text-white/70 mt-0.5">
                      Menganalisis "
                      {selectedIngredients.map((s) => s.name).join(", ")}" dan
                      mencocokkan kebutuhan gizi si kecil
                      {getBudgetNilai() > 0 &&
                        ` · Budget ${formatRupiah(getBudgetNilai())}/porsi`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Belum search */}
            {!isSearching && !hasSearched && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-[#EDE0D4] flex items-center justify-center text-4xl mb-5">
                  🍱
                </div>
                <h3 className="text-lg font-bold text-[#3D2314] mb-2">
                  Belum Ada Rekomendasi
                </h3>
                <p className="text-sm text-[#6B4C3B]/60 max-w-xs leading-relaxed">
                  Pilih bahan makanan di panel kiri, lalu klik{" "}
                  <strong className="text-[#8B2020]">
                    "Cari Rekomendasi AI"
                  </strong>{" "}
                  untuk mendapatkan menu MPASI yang dipersonalisasi.
                </p>
                <div className="mt-8 flex gap-3">
                  {[
                    { step: "1", icon: "💰", label: "Atur Budget" },
                    { step: "2", icon: "🔍", label: "Pilih Bahan" },
                    { step: "3", icon: "✨", label: "Dapat Menu" },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-[#EDE0D4] text-center w-24"
                    >
                      <div className="text-xl mb-1.5">{item.icon}</div>
                      <p className="text-[11px] font-bold text-[#6B4C3B]">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tidak ada hasil */}
            {!isSearching && hasSearched && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">😔</div>
                <h3 className="text-lg font-bold text-[#3D2314] mb-2">
                  Tidak Ada Hasil
                </h3>
                <p className="text-sm text-[#6B4C3B]/60 max-w-xs">
                  Tidak ada menu yang cocok dengan kombinasi bahan dan budget
                  saat ini. Coba kurangi bahan atau atur budget lebih tinggi.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-sm font-semibold text-[#8B2020] hover:underline"
                >
                  ← Cari Ulang
                </button>
              </div>
            )}

            {/* Ada hasil */}
            {!isSearching && hasSearched && results.length > 0 && (
              <div>
                {/* Summary bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-white rounded-2xl border border-[#EDE0D4] px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-[#3D2314]">
                      🎯 {results.length} Menu Direkomendasikan
                    </p>
                    <p className="text-xs text-[#6B4C3B]/60 mt-0.5">
                      Berdasarkan "
                      {selectedIngredients.map((s) => s.name).join(", ")}" ·
                      semua sudah difilter alergi
                    </p>
                  </div>
                  {budgetApplied && (
                    <div className="bg-[#FFF0E6] rounded-xl px-3 py-2 flex-shrink-0">
                      <p className="text-[10px] text-[#6B4C3B]/60">
                        Budget / porsi
                      </p>
                      <p className="text-sm font-bold text-[#8B2020]">
                        {formatRupiah(parseFloat(budgetApplied))}
                      </p>
                    </div>
                  )}
                </div>

                {/* Grid hasil */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      searchQuery={appliedQuery}
                      onClick={() =>
                        setDetailPopup({
                          recipe,
                          sourceLabel: "Rekomendasi AI",
                        })
                      }
                    />
                  ))}
                </div>

                {/* Jadwal Mingguan */}
                {(weeklyPlan?.items?.length > 0 || isLoadingWeekly) && (
                  <div className="mt-10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[#EDE0D4]" />
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-[#EDE0D4] shadow-sm">
                        <span className="text-sm">📅</span>
                        <p className="text-xs font-bold text-[#3D2314] whitespace-nowrap">
                          Juga ada di Jadwal Mingguan
                        </p>
                      </div>
                      <div className="flex-1 h-px bg-[#EDE0D4]" />
                    </div>
                    {isLoadingWeekly ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-16 bg-white rounded-xl animate-pulse border border-[#EDE0D4]"
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        {weeklyPlan.actual_total_cost && (
                          <div className="bg-white rounded-xl border border-[#EDE0D4] px-4 py-3 mb-4 flex items-center justify-between">
                            <p className="text-xs text-[#6B4C3B]/60 font-semibold">
                              Total biaya minggu ini
                            </p>
                            <p className="text-sm font-bold text-[#8B2020]">
                              {formatRupiah(weeklyPlan.actual_total_cost)}
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {weeklyPlan.items.map((item) => (
                            <WeeklyRecipeCard
                              key={item.id}
                              item={item}
                              onClick={() =>
                                setDetailPopup({
                                  recipe: item.recipe,
                                  sourceLabel: `Jadwal Mingguan · Hari ${item.day_number}`,
                                })
                              }
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Cari ulang */}
                <div className="mt-8 text-center">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B2020] hover:underline transition-all"
                  >
                    ← Cari Ulang
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <FooterDashboard />

      {detailPopup && (
        <MenuDetailPopup
          recipe={detailPopup.recipe}
          sourceLabel={detailPopup.sourceLabel}
          onClose={() => setDetailPopup(null)}
        />
      )}

      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
