import { useState, useEffect } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";
import RecipeDetailPopup from "./RecipeDetailPopup";
import { useAuth } from "../../context/authContext";

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

function RecipeCard({ recipe, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#8B2020]/50 flex flex-col h-full"
    >
      <div className="h-44 bg-gray-100 relative overflow-hidden flex-shrink-0">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            crossOrigin="anonymous"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20 bg-orange-50">
            🍳
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-black text-[#8B2020] shadow-md border border-white/50">
          {formatRupiah(Math.round(recipe.est_price))}
        </div>
      </div>
      <div className="p-4 flex-1 flex items-center justify-center">
        <h3 className="text-[15px] font-black text-gray-800 leading-snug text-center group-hover:text-[#8B2020] transition-colors line-clamp-2">
          {recipe.name}
        </h3>
      </div>
    </div>
  );
}

export default function SearchMenu() {
  const { activeChild } = useAuth();
  const [childData, setChildData] = useState(null);
  const [masterAllergies, setMasterAllergies] = useState([]);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [results, setResults] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [searchIngredients, setSearchIngredients] = useState([]);
  const [budgetInput, setBudgetInput] = useState("");

  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchTextPreferences, setSearchTextPreferences] = useState("");
  const [searchTextSearch, setSearchTextSearch] = useState("");
  const [detailPopup, setDetailPopup] = useState(null);

  // ambil data master alergi, bahan baku, sama data anak pas halaman pertama kali dibuka
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [resAlg, resIng] = await Promise.all([
          fetch(`${API_BASE}/master/allergies`, { headers }),
          fetch(`${API_BASE}/master/ingredients`, { headers }),
        ]);

        setMasterAllergies(await resAlg.json());
        setMasterIngredients(await resIng.json());

        if (activeChild) {
          const child = activeChild;
          setChildData(child);

          setSelectedAllergies(
            child.allergies?.map((a) => a.allergy_category_id) || [],
          );
          setSelectedPreferences(
            child.preferences?.map((p) => p.ingredient) || [],
          );

          // hitung anggaran harian otomatis dari plan bulanan atau cache data anak
          let rawBudget = 0;
          const activeBulanan = child.meal_plans?.find(
            (p) => p.plan_type === "Bulanan" || p.plan_type === "bulanan",
          );

          if (activeBulanan && activeBulanan.actual_total_cost) {
            rawBudget = parseFloat(activeBulanan.actual_total_cost) / 90;
          } else if (child.optimal_budget_cache) {
            rawBudget = parseFloat(child.optimal_budget_cache) / 30 / 3;
          }

          const roundedBudget = Math.round(rawBudget / 100) * 100;
          setBudgetInput(formatAngkaRibuan(roundedBudget.toString()));

          if (child.last_search_cache && child.last_search_cache.length > 0) {
            setResults(child.last_search_cache);
          }
        }
      } catch (err) {
        console.error("Gagal fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleBudgetChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setBudgetInput(formatAngkaRibuan(raw));
  };

  // ngecek apakah bahan makanan mengandung unsur yang bikin anak alergi
  const checkIsDisabled = (ingredient) => {
    const selectedCats = masterAllergies.filter((a) =>
      selectedAllergies.includes(a.id),
    );
    return selectedCats.some((cat) => {
      const matchCat = ingredient.name
        .toLowerCase()
        .includes(cat.name.toLowerCase());
      const matchItem =
        cat.items &&
        cat.items.some(
          (item) =>
            ingredient.name
              .toLowerCase()
              .includes(item.item_name.toLowerCase()) ||
            item.item_name
              .toLowerCase()
              .includes(ingredient.name.toLowerCase()),
        );
      return matchCat || matchItem;
    });
  };

  // pas alergi di klik, langsung hapus bahan makanan yang bikin alergi dari daftar kesukaan dan pencarian
  const toggleAllergy = (id) => {
    let newAllergies = [...selectedAllergies];
    if (newAllergies.includes(id))
      newAllergies = newAllergies.filter((a) => a !== id);
    else newAllergies.push(id);
    setSelectedAllergies(newAllergies);

    setSelectedPreferences((prev) =>
      prev.filter((ing) => !checkIsDisabledByList(ing, newAllergies)),
    );
    setSearchIngredients((prev) =>
      prev.filter((ing) => !checkIsDisabledByList(ing, newAllergies)),
    );
  };

  const checkIsDisabledByList = (ingredient, allergyList) => {
    const selectedCats = masterAllergies.filter((a) =>
      allergyList.includes(a.id),
    );
    return selectedCats.some((cat) => {
      const matchCat = ingredient.name
        .toLowerCase()
        .includes(cat.name.toLowerCase());
      const matchItem =
        cat.items &&
        cat.items.some(
          (item) =>
            ingredient.name
              .toLowerCase()
              .includes(item.item_name.toLowerCase()) ||
            item.item_name
              .toLowerCase()
              .includes(ingredient.name.toLowerCase()),
        );
      return matchCat || matchItem;
    });
  };

  const togglePreference = (ing, isDisabled) => {
    if (isDisabled) return;
    let newPrefs = [...selectedPreferences];
    if (newPrefs.find((i) => i.id === ing.id))
      newPrefs = newPrefs.filter((i) => i.id !== ing.id);
    else newPrefs.push(ing);
    setSelectedPreferences(newPrefs);
  };

  const toggleSearchIngredient = (ing, isDisabled) => {
    if (isDisabled) return;
    let newSearch = [...searchIngredients];
    if (newSearch.find((i) => i.id === ing.id))
      newSearch = newSearch.filter((i) => i.id !== ing.id);
    else newSearch.push(ing);
    setSearchIngredients(newSearch);
  };

  // simpan data alergi dan kesukaan terbaru ke database, terus panggil ai buat cari rekomendasi menu mpasi sesuai budget dan bahan pilihan
  const handleSearch = async () => {
    if (!childData) return;
    setIsSearching(true);
    setOpenDropdown(null);

    try {
      const token = localStorage.getItem("token");
      const authHeader = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      await fetch(`${API_BASE}/children/${childData.id}`, {
        method: "PUT",
        headers: authHeader,
        body: JSON.stringify({
          allergy_ids: selectedAllergies,
          preference_ids: selectedPreferences.map((i) => i.id),
        }),
      });

      const budgetNilai = parseInt(budgetInput.replace(/\./g, ""), 10) || 0;
      const resSearch = await fetch(
        `${API_BASE}/mpasi/search-menu/${childData.id}`,
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({
            custom_budget: budgetNilai,
            ingredients: searchIngredients.map((i) => i.name),
          }),
        },
      );

      const dataSearch = await resSearch.json();
      if (resSearch.ok) {
        setResults(dataSearch.data || []);
      } else {
        alert(dataSearch.message || "Gagal mencari menu.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3EFEA]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2020] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']"
      onClick={() => setOpenDropdown(null)}
    >
      <NavbarDashboard />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a
              href="/features"
              className="hover:text-[#8B2020] transition-colors"
            >
              Fitur
            </a>
            <span>›</span>
            <span className="text-[#8B2020] font-bold">Cari Menu</span>
          </div>
          <h1 className="text-3xl font-black text-[#8B2020] uppercase tracking-wide">
            Cari Inspirasi Menu
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Pilih bahan favorit dan temukan inspirasi menu baru untuk si kecil
            ✨
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
              <div className="relative">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  Batas Anggaran / Porsi
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3.5 focus-within:border-[#8B2020] transition-colors">
                  <span className="text-base font-black text-[#8B2020] mr-2">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={budgetInput}
                    onChange={handleBudgetChange}
                    className="w-full text-xl font-black text-gray-800 bg-transparent outline-none tracking-wide"
                  />
                </div>
              </div>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  ⚠️ Alergi/Pantangan
                </label>
                <div
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "allergy" ? null : "allergy",
                    )
                  }
                  className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-gray-300 min-h-[56px] flex flex-wrap gap-2 items-center"
                >
                  {selectedAllergies.length > 0 ? (
                    selectedAllergies.map((id) => {
                      const cat = masterAllergies.find((a) => a.id === id);
                      return cat ? (
                        <span
                          key={id}
                          className="bg-red-50 text-[#8B2020] text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wide border border-red-100"
                        >
                          {cat.name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="text-sm font-bold text-gray-400">
                      Pilih alergi anak...
                    </span>
                  )}
                </div>
                {openDropdown === "allergy" && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 max-h-60 overflow-y-auto z-50">
                    {masterAllergies.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-3 p-3.5 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAllergies.includes(a.id)}
                          onChange={() => toggleAllergy(a.id)}
                          className="w-4 h-4 accent-[#8B2020]"
                        />
                        <span className="text-sm font-bold text-gray-700">
                          {a.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">
                  ⭐ KESUKAAN
                </label>
                <div
                  onClick={() => setOpenDropdown("preference")}
                  className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-gray-300 min-h-[56px] flex flex-wrap gap-2 items-center"
                >
                  {selectedPreferences.length > 0 ? (
                    selectedPreferences.map((ing) => (
                      <span
                        key={ing.id}
                        className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wide flex items-center gap-1.5"
                      >
                        {ing.name}{" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreference(ing, false);
                          }}
                          className="hover:text-blue-500 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-bold text-gray-400">
                      Pilih favorit...
                    </span>
                  )}
                </div>
                {openDropdown === "preference" && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-40">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Cari kesukaan..."
                      value={searchTextPreferences}
                      onChange={(e) => setSearchTextPreferences(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {masterIngredients
                        .filter((i) =>
                          i.name
                            .toLowerCase()
                            .includes(searchTextPreferences.toLowerCase()),
                        )
                        .map((i) => {
                          const isDisabled = checkIsDisabled(i);
                          return (
                            <label
                              key={i.id}
                              className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors ${isDisabled ? "bg-red-50/50 opacity-50 cursor-not-allowed" : "hover:bg-blue-50 cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedPreferences.some(
                                  (si) => si.id === i.id,
                                )}
                                onChange={() => togglePreference(i, isDisabled)}
                                disabled={isDisabled}
                                className="w-4 h-4 accent-blue-600"
                              />
                              <span
                                className={`text-sm font-bold flex-1 ${isDisabled ? "text-red-700 line-through" : "text-gray-700"}`}
                              >
                                {i.name}
                              </span>
                              {isDisabled && (
                                <span className="text-[8px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">
                                  Alergi
                                </span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bahan Pencarian (Murni Pencarian OR) */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex justify-between items-end">
                  <span> Bahan Pencarian </span>
                  <span className="text-[9px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold border border-green-100">
                    Bisa 1
                  </span>
                </label>
                <div
                  onClick={() => setOpenDropdown("search")}
                  className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-gray-300 min-h-[56px] flex flex-wrap gap-2 items-center"
                >
                  {searchIngredients.length > 0 ? (
                    searchIngredients.map((ing) => (
                      <span
                        key={ing.id}
                        className="bg-green-50 text-green-800 border border-green-200 text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wide flex items-center gap-1.5"
                      >
                        {ing.name}{" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSearchIngredient(ing, false);
                          }}
                          className="hover:text-green-600 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-bold text-gray-400">
                      Mencari menu berdasarkan bahan....
                    </span>
                  )}
                </div>
                {openDropdown === "search" && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-30">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Cari bahan masakan..."
                      value={searchTextSearch}
                      onChange={(e) => setSearchTextSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {masterIngredients
                        .filter((i) =>
                          i.name
                            .toLowerCase()
                            .includes(searchTextSearch.toLowerCase()),
                        )
                        .map((i) => {
                          const isDisabled = checkIsDisabled(i);
                          return (
                            <label
                              key={i.id}
                              className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors ${isDisabled ? "bg-red-50/50 opacity-50 cursor-not-allowed" : "hover:bg-green-50 cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={searchIngredients.some(
                                  (si) => si.id === i.id,
                                )}
                                onChange={() =>
                                  toggleSearchIngredient(i, isDisabled)
                                }
                                disabled={isDisabled}
                                className="w-4 h-4 accent-green-600"
                              />
                              <span
                                className={`text-sm font-bold flex-1 ${isDisabled ? "text-red-700 line-through" : "text-gray-700"}`}
                              >
                                {i.name}
                              </span>
                              {isDisabled && (
                                <span className="text-[8px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase">
                                  Alergi
                                </span>
                              )}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full bg-[#8B2020] text-white font-black text-sm py-4 rounded-2xl shadow-lg hover:bg-red-800 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "✨ Cari Menu untuk Si Kecil"
                )}
              </button>
            </div>
          </div>

          {/*PANEL KANAN: HASIL REKOMENDASI */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 min-h-[600px]">
              <div className="flex justify-between items-center border-b border-gray-100 pb-5 mb-6">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">🍽️</span> Inspirasi Menu MPASI
                </h2>
                <span className="bg-orange-50 border border-orange-100 text-orange-700 text-[11px] font-black px-3 py-1.5 rounded-lg tracking-wider uppercase">
                  {results.length} Hasil Ditemukan
                </span>
              </div>

              {results.length === 0 ? (
                <div className="text-center py-28 flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-5 shadow-inner grayscale opacity-60">
                    🍱
                  </div>
                  <h3 className="text-lg font-black text-gray-600 mb-2">
                    Belum Ada Rekomendasi
                  </h3>
                  <p className="text-sm text-gray-400 max-w-sm leading-relaxed font-medium">
                    Sesuaikan preferensi bahan dan klik tombol "Temukan Resep"
                    untuk mulai menjelajahi referensi nutrisi ajaib dari AI.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {results.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onClick={() => setDetailPopup(recipe)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <FooterDashboard />

      {detailPopup && (
        <RecipeDetailPopup
          menu={detailPopup}
          onClose={() => setDetailPopup(null)}
        />
      )}
    </div>
  );
}
