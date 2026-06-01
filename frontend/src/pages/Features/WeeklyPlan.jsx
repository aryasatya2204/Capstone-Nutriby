import { useState, useEffect, useRef } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import RecipeDetailPopup from "./RecipeDetailPopup";
import PrintableWeeklyPlan from "./PrintableWeeklyPlan";
import { useAuth } from "../../context/authContext";
import { apiFetch, getImageUrl } from "../../config/api.js";

//konfigurasi
const BASE_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jum'at",
  "Sabtu",
];

//FUNGSI HELPERR
const formatRupiah = (angka) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);

const formatLabel = (str) => {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const getAgeDetail = (dob) => {
  if (!dob) return { months: 0, days: 0 };
  const birthDate = new Date(dob);
  const today = new Date();
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months -= birthDate.getMonth();
  months += today.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  return { months: months < 0 ? 0 : months, days };
};

const calculateDayOffset = (createdAt) => {
  if (!createdAt) return 0;
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
};

//fungsi ini adalah modal alert global untuk nampilih pesan error/peringatan
function ErrorModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-red-100">
          ⚠️
        </div>
        <h3 className="text-lg font-black text-gray-800 mb-2">Pemberitahuan</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#8B2020] text-white text-sm font-black hover:bg-red-800 shadow-md"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}

//fungsi ini untuk konfirmasi sebelum hapus perencanaan menu yang ada
function DeleteConfirmationModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-red-100">
          🗑️
        </div>
        <h3 className="text-lg font-black text-gray-800 mb-2">
          Hapus Perencanaan Menu?
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Tindakan ini akan menghapus seluruh jadwal mingguan aktif si kecil
          dari sistem.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 shadow-md"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

//POP UP PREFERENSI ANAK (seperti alergi dan makanan fav)
function PreferenceEditPopup({
  masterAllergies,
  masterIngredients,
  childData,
  onSave,
  onClose,
  isSaving,
}) {
  //inisialisasi state lokal
  const [localAllergyIds, setLocalAllergyIds] = useState(
    childData.allergies?.map((a) => a.allergy_category_id || a.id) || [],
  );
  const [localPrefIds, setLocalPrefIds] = useState(
    childData.preferences?.map((p) => p.ingredient_id || p.id) || [],
  );
  const [activeTab, setActiveTab] = useState("allergy");

  //mengatur logika pemilihan alergi
  const toggleAllergy = (id) => {
    let newAllergies = [...localAllergyIds];
    if (newAllergies.includes(id))
      newAllergies = newAllergies.filter((a) => a !== id);
    else newAllergies.push(id);

    const selectedCategories = masterAllergies.filter((a) =>
      newAllergies.includes(a.id),
    );

    //filter bahan makanan kesukaan agar tidak bentrok dengan alergi yang dipilih
    const safePreferences = localPrefIds.filter((prefId) => {
      const prefObj = masterIngredients.find((i) => i.id === prefId);
      if (!prefObj) return false;
      return !selectedCategories.some((cat) => {
        const matchCategory = prefObj.name
          .toLowerCase()
          .includes(cat.name.toLowerCase());
        const matchItem =
          cat.items &&
          cat.items.some(
            (item) =>
              prefObj.name
                .toLowerCase()
                .includes(item.item_name.toLowerCase()) ||
              item.item_name.toLowerCase().includes(prefObj.name.toLowerCase()),
          );
        return matchCategory || matchItem;
      });
    });
    setLocalAllergyIds(newAllergies);
    setLocalPrefIds(safePreferences);
  };

  const togglePref = (id, isDisabled) => {
    if (isDisabled) return;
    setLocalPrefIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex bg-gray-50 border-b border-gray-100">
          <button
            onClick={() => setActiveTab("allergy")}
            className={`flex-1 py-4 text-sm font-bold ${activeTab === "allergy" ? "text-[#8B2020] border-b-2 border-[#8B2020]" : "text-gray-400"}`}
          >
            ⚠️ Pantangan
          </button>
          <button
            onClick={() => setActiveTab("preference")}
            className={`flex-1 py-4 text-sm font-bold ${activeTab === "preference" ? "text-green-600 border-b-2 border-green-600" : "text-gray-400"}`}
          >
            🥦 Kesukaan
          </button>
        </div>
        <div
          className="overflow-y-auto p-4"
          style={{ maxHeight: "50vh", minHeight: "300px" }}
        >
          {activeTab === "allergy" && (
            <div className="space-y-1">
              {masterAllergies.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-orange-50 border border-transparent"
                >
                  <input
                    type="checkbox"
                    checked={localAllergyIds.includes(a.id)}
                    onChange={() => toggleAllergy(a.id)}
                    className="w-4 h-4 accent-[#8B2020]"
                  />
                  <span className="text-sm font-bold text-gray-700">
                    {formatLabel(a.name)}
                  </span>
                </label>
              ))}
            </div>
          )}
          {activeTab === "preference" && (
            <div className="space-y-1">
              {masterIngredients.map((i) => {
                const selectedCategories = masterAllergies.filter((a) =>
                  localAllergyIds.includes(a.id),
                );
                const isDisabled = selectedCategories.some((cat) => {
                  const matchCategory = i.name
                    .toLowerCase()
                    .includes(cat.name.toLowerCase());
                  const matchItem =
                    cat.items &&
                    cat.items.some(
                      (item) =>
                        i.name
                          .toLowerCase()
                          .includes(item.item_name.toLowerCase()) ||
                        item.item_name
                          .toLowerCase()
                          .includes(i.name.toLowerCase()),
                    );
                  return matchCategory || matchItem;
                });
                return (
                  <label
                    key={i.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl ${isDisabled ? "bg-red-50 opacity-60 cursor-not-allowed" : "hover:bg-green-50 cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={localPrefIds.includes(i.id)}
                      onChange={() => togglePref(i.id, isDisabled)}
                      disabled={isDisabled}
                      className="w-4 h-4 accent-green-600"
                    />
                    <span
                      className={`text-sm font-bold flex-1 ${isDisabled ? "text-red-700 line-through" : "text-gray-700"}`}
                    >
                      {formatLabel(i.name)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-bold"
          >
            Batal
          </button>
          <button
            onClick={() => onSave(localAllergyIds, localPrefIds)}
            disabled={isSaving}
            className="flex-1 py-3 rounded-2xl bg-[#8B2020] text-white text-sm font-black disabled:opacity-50"
          >
            {isSaving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

//fungsi ini adalah pop up untuk mengganti/menukar menu masakan tertentu (swap menu)
function SwapMenuPopup({
  childId,
  itemToSwap,
  onClose,
  onSwapSuccess,
  onError,
}) {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);

  //mengambil daftar menu dari API
  useEffect(() => {
    const fetchAlts = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await apiFetch(
          `/mpasi/alternatives/${childId}/${itemToSwap.mealPlanItemId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        setCandidates(data.data || []);
      } catch {
        onError("Gagal mencari alternatif pengganti.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlts();
  }, [childId, itemToSwap.mealPlanItemId]);

  const handleSwap = async (candidate) => {
    setIsSwapping(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(
        `/mpasi/mealplan/swap/${itemToSwap.mealPlanItemId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            new_recipe_id: candidate.id,
            new_estimated_cost: candidate.est_price,
            new_match_score: candidate.match_score,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onSwapSuccess(data.data);
    } catch (err) {
      onError("Gagal ganti menu: " + err.message);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-[#8B2020]">
            Pilih Menu Pengganti
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full font-bold text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>
        {isLoading ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-[#8B2020] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm font-medium bg-gray-50 rounded-xl border border-gray-100">
            Kandidat resep tidak tersedia untuk sisa alokasi anggaran ini.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center border border-gray-100 p-3 rounded-2xl hover:border-orange-200 hover:bg-orange-50"
              >
                <div>
                  <p className="text-sm font-bold text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.calories} kkal ·{" "}
                    <span className="font-bold text-[#8B2020]">
                      {formatRupiah(c.est_price)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleSwap(c)}
                  disabled={isSwapping}
                  className="bg-[#8B2020] text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  {isSwapping ? "..." : "Pilih"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

//KARTU RESEP MPASI
function MealCard({ label, icon, menu, warna, onSwap, onDetail, isLocked }) {
  return (
    <div
      className={`group relative flex items-center gap-3 rounded-2xl border border-gray-100 p-3 transition-all duration-200 
      ${isLocked ? "bg-gray-50/70 opacity-60 cursor-not-allowed border-dashed" : "bg-white shadow-sm hover:shadow-md cursor-pointer"}`}
      onClick={!isLocked ? onDetail : undefined}
    >
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl ${warna} flex items-center justify-center text-lg overflow-hidden ${isLocked && "grayscale"}`}
      >
        {menu?.image_url ? (
          <img
            src={getImageUrl(menu.image_url)}
            alt=""
            className="w-11 h-11 object-cover"
          />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`text-sm font-bold truncate mt-0.5 ${isLocked ? "text-gray-500" : "text-gray-800 group-hover:text-[#8B2020]"}`}
        >
          {menu?.name || "Menu tidak tersedia"}{" "}
          {isLocked && <span className="ml-1 text-[10px]">🔒</span>}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {menu?.calories ? `${menu.calories} kkal` : "-"}
        </p>
      </div>
      <div className="flex-shrink-0 text-right pr-12">
        <p
          className={`text-xs font-bold ${isLocked ? "text-gray-400" : "text-[#8B2020]"}`}
        >
          {formatRupiah(menu?.est_price || 0)}
        </p>
      </div>
      {menu && !isLocked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwap();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-600 rounded-full p-2 border border-gray-100 shadow-sm z-10"
        >
          🔄
        </button>
      )}
    </div>
  );
}

//Main export komponen
export default function WeeklyPlan() {
  const { activeChild } = useAuth();
  const [childData, setChildData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [activeDay, setActiveDay] = useState(0);
  const [currentDayOffset, setCurrentDayOffset] = useState(0);
  const [weeklyMenu, setWeeklyMenu] = useState([]);

  const [budgetMingguan, setBudgetMingguan] = useState("");
  const [showPrefEdit, setShowPrefEdit] = useState(false);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [masterAllergies, setMasterAllergies] = useState([]);
  const [masterIngredients, setMasterIngredients] = useState([]);

  const [itemToSwap, setItemToSwap] = useState(null);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorModalMsg, setErrorModalMsg] = useState("");

  const [dynamicDays, setDynamicDays] = useState([
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jum'at",
    "Sabtu",
    "Minggu",
  ]);

  const componentRef = useRef();
  const [isDownloading, setIsDownloading] = useState(false);

  //mengonversi layout cetak menjadi pdf fan download
  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    const element = componentRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      const pages = element.querySelectorAll(".pdf-page");
      let pdf;

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.75);

        // Tetapkan lebar standar A4, dan hitung tingginya secara dinamis
        const pdfWidth = 210;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        if (i === 0) {
          // Buat file PDF di mana halaman pertama di-set ukurannya secara dinamis
          pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: [pdfWidth, imgHeight],
          });
          pdf.addImage(
            imgData,
            "JPEG",
            0,
            0,
            pdfWidth,
            imgHeight,
            undefined,
            "FAST",
          );
        } else {
          // Tambahkan halaman berikutnya, juga dengan tinggi yang mengikuti kontennya
          pdf.addPage([pdfWidth, imgHeight], "p");
          pdf.addImage(
            imgData,
            "JPEG",
            0,
            0,
            pdfWidth,
            imgHeight,
            undefined,
            "FAST",
          );
        }
      }

      pdf.save(`Katalog_Resep_MPASI_${childData?.name || "Si_Kecil"}.pdf`);
    } catch (error) {
      setErrorModalMsg("Gagal mengunduh file PDF. Silakan coba lagi.");
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const loadPlanFromBackend = (planItems, createdAt) => {
    const formatted = [];
    for (let day = 1; day <= 7; day++) {
      const dayItems = planItems.filter((item) => item.day_number === day);
      const getRecipeByTime = (time) => {
        const found = dayItems.find((item) => item.meal_time === time);
        return found ? { ...found.recipe, mealPlanItemId: found.id } : null;
      };
      formatted.push({
        pagi: getRecipeByTime("pagi"),
        siang: getRecipeByTime("siang"),
        malam: getRecipeByTime("malam"),
      });
    }
    setWeeklyMenu(formatted);
    setHasGenerated(true);

    if (createdAt) {
      const startDate = new Date(createdAt);
      const startDayIndex = startDate.getDay();

      const reorderedDays = [
        ...BASE_HARI.slice(startDayIndex),
        ...BASE_HARI.slice(0, startDayIndex),
      ];
      setDynamicDays(reorderedDays);

      const offset = calculateDayOffset(createdAt);
      setCurrentDayOffset(offset);
      setActiveDay(Math.max(0, Math.min(6, offset)));
    } else {
      setCurrentDayOffset(0);
      setActiveDay(0);
      setDynamicDays([
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jum'at",
        "Sabtu",
        "Minggu",
      ]);
    }
  };

  //mengambil data inisialiasi awal
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [resAlg, resIng] = await Promise.all([
          apiFetch("/master/allergies", { headers }),
          apiFetch("/master/ingredients", { headers }),
        ]);
        setMasterAllergies(await resAlg.json());
        setMasterIngredients(await resIng.json());

        if (activeChild) {
          // Fetch semua anak lalu filter yang aktif (tidak ada endpoint GET /children/:id)
          const resChildren = await apiFetch("/children", { headers });
          const allChildren = await resChildren.json();
          const child = Array.isArray(allChildren)
            ? (allChildren.find((c) => c.id === activeChild.id) ??
              allChildren[0])
            : null;
          if (!child) return;
          setChildData(child);

          // Render item menu mingguan murni untuk kebutuhan pemetaan visual saja
          const activeWeeklyPlan = child.meal_plans?.find(
            (p) => p.plan_type === "mingguan",
          );
          if (activeWeeklyPlan) {
            loadPlanFromBackend(
              activeWeeklyPlan.items,
              activeWeeklyPlan.created_at,
            );
          }

          // PERUBAHAN KRITIKAL: Anggaran mingguan murni diturunkan dari actual cost BULANAN (dibagi 4)
          const activeBulananPlan = child.meal_plans?.find(
            (p) => p.plan_type === "Bulanan",
          );
          if (activeBulananPlan && activeBulananPlan.actual_total_cost) {
            setBudgetMingguan(
              Math.round(parseFloat(activeBulananPlan.actual_total_cost) / 4),
            );
          } else if (child.optimal_budget_cache) {
            const mlDaily = parseFloat(child.optimal_budget_cache) / 30;
            setBudgetMingguan(Math.round(mlDaily * 7));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchInit();
  }, [activeChild?.id]);

  const handleGenerate = async () => {
    if (!childData?.id) return;

    // 1. VALIDASI: Cegah generate ulang jika menu sudah ada
    if (hasGenerated) {
      setErrorModalMsg(
        "Jadwal mingguan sudah ada! Silakan klik tombol '🗑️ Reset' terlebih dahulu jika ingin menyusun jadwal baru.",
      );
      return;
    }

    if (!budgetMingguan || parseFloat(budgetMingguan) <= 0) {
      setErrorModalMsg("Masukkan nominal anggaran belanja valid.");
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/mpasi/generate-weekly/${childData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ custom_budget: parseFloat(budgetMingguan) }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message);

      if (responseData.data && responseData.data.items) {
        loadPlanFromBackend(
          responseData.data.items,
          responseData.data.created_at,
        );
      } else {
        setErrorModalMsg("Gagal membaca struktur menu AI.");
      }
    } catch (err) {
      setErrorModalMsg(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePref = async (allergyIds, prefIds) => {
    setIsSavingPref(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/children/${childData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          allergy_ids: allergyIds,
          preference_ids: prefIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setChildData(data.data);
        setShowPrefEdit(false);
      } else throw new Error(data.message);
    } catch (err) {
      setErrorModalMsg(err.message || "Gagal menyimpan data preferensi.");
    } finally {
      setIsSavingPref(false);
    }
  };

  const handleExecuteDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`/mpasi/weekly/${childData.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setWeeklyMenu([]);
      setHasGenerated(false);
      setShowDeleteModal(false);
      setCurrentDayOffset(0);
      setActiveDay(0);
    } catch {
      setErrorModalMsg("Gagal mereset jadwal mingguan.");
    }
  };

  const handleBudgetInputChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setBudgetMingguan(rawValue ? parseInt(rawValue) : 0);
  };

  let sumCal = 0,
    sumPro = 0,
    sumFat = 0;
  if (hasGenerated && weeklyMenu.length > 0) {
    weeklyMenu.forEach((hari) => {
      ["pagi", "siang", "malam"].forEach((waktu) => {
        if (hari[waktu]) {
          sumCal += parseFloat(hari[waktu].calories) || 0;
          sumPro += parseFloat(hari[waktu].protein) || 0;
          sumFat += parseFloat(hari[waktu].fat) || 0;
        }
      });
    });
  }
  const avgCal = Math.round(sumCal / 7);
  const avgPro = Math.round(sumPro / 7);
  const avgFat = Math.round(sumFat / 7);
  const age = getAgeDetail(childData?.dob);

  // Nilai budget cetak PDF ditarik murni dari basis data bulanan aktual dibagi 4
  const activeBulananPlan = childData?.meal_plans?.find(
    (p) => p.plan_type === "Bulanan",
  );
  const totalMingguanBerbasisBulan =
    activeBulananPlan && activeBulananPlan.actual_total_cost
      ? parseFloat(activeBulananPlan.actual_total_cost) / 4
      : budgetMingguan || 0;

  if (isLoadingData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3EFEA]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2020] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato'] relative">
      <NavbarDashboard />

      <main className="flex-1 px-4 py-6 md:px-6 lg:px-10 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <a
              href="/features"
              className="hover:text-[#8B2020] transition-colors"
            >
              Fitur
            </a>
            <span>›</span>
            <span className="text-[#8B2020] font-bold">MPASI Mingguan</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#8B2020]">
            MPASI Mingguan
          </h1>
          <p className="text-gray-500 text-sm">
            Dapatkan rekomendasi 21 ide menu MPASI praktis yang disesuaikan
            dengan budget Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h2 className="text-base font-black text-[#8B2020]">
                  Informasi Si Kecil
                </h2>
                <button
                  onClick={() => setShowPrefEdit(true)}
                  className="text-[10px] font-black uppercase tracking-wider text-[#8B2020] bg-red-50 px-3 py-1.5 rounded-full border border-red-100 hover:bg-red-100"
                >
                  ✏️ Ubah Data
                </button>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">
                    Nama Anak
                  </p>
                  <p className="text-sm font-black text-gray-800">
                    {childData?.name || "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">
                    Usia
                  </p>
                  <p className="text-sm font-black text-[#8B2020]">
                    {age.months} Bln {age.days} Hr
                  </p>
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 mb-2 border border-orange-100">
                <p className="text-xs text-orange-600 font-black uppercase mb-2">
                  ⚠️ Pantangan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {childData?.allergies?.length ? (
                    childData.allergies.map((a) => (
                      <span
                        key={a.allergy_category?.id}
                        className="bg-white text-orange-700 text-xs font-bold px-2 py-0.5 rounded border border-orange-200"
                      >
                        {formatLabel(a.allergy_category?.name)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-orange-400 italic font-medium">
                      Tidak ada pantangan
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <p className="text-xs text-green-700 font-black uppercase mb-2">
                  🥦 Kesukaan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {childData?.preferences?.length ? (
                    childData.preferences.map((p) => (
                      <span
                        key={p.ingredient?.id}
                        className="bg-white text-green-700 text-xs font-bold px-2 py-0.5 rounded border border-green-200"
                      >
                        {formatLabel(p.ingredient?.name)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-green-500 italic font-medium">
                      Belum ada kesukaan
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#8B2020]"></div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mt-2">
                Kisaran Budget Mingguan
              </p>
              <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 max-w-xs mx-auto">
                <span className="text-xl font-black text-[#8B2020] mr-1.5">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full text-2xl font-black text-gray-800 bg-transparent outline-none tracking-wide"
                  value={
                    budgetMingguan
                      ? Number(budgetMingguan).toLocaleString("id-ID")
                      : ""
                  }
                  onChange={handleBudgetInputChange}
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium mt-3 leading-relaxed">
                Perkiraan budget untuk membantu ayah & bunda merencanakan MPASI
                si kecil 💛.
              </p>
            </div>

            {hasGenerated && (
              <div className="bg-[#FFF8F0] rounded-3xl p-5 shadow-sm border border-orange-100">
                <h3 className="text-sm font-black text-gray-800 mb-3 text-center border-b border-orange-100 pb-2">
                  Rata-rata Nutrisi Harian Si Kecil
                </h3>
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <p className="text-lg font-black text-orange-600">
                      {avgCal}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                      Kalori
                    </p>
                  </div>
                  <div className="w-px h-8 bg-orange-200"></div>
                  <div className="text-center flex-1">
                    <p className="text-lg font-black text-blue-600">
                      {avgPro}g
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                      Protein
                    </p>
                  </div>
                  <div className="w-px h-8 bg-orange-200"></div>
                  <div className="text-center flex-1">
                    <p className="text-lg font-black text-green-600">
                      {avgFat}g
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                      Lemak
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !childData}
              className="w-full bg-[#8B2020] text-white font-black text-sm py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "✨ Mulai Susun Menu Si Kecil"
              )}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 min-h-[500px]">
              <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-100 pb-4 mb-4 gap-3">
                <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
                  📅 Rencana Jadwal MPASI 7 Hari
                </h2>
                {hasGenerated && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl"
                    >
                      {isDownloading
                        ? "⏳ Mengunduh..."
                        : "📄 Unduh PDF Katalog"}
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-xl"
                    >
                      🗑️ Reset
                    </button>
                  </div>
                )}
              </div>

              {!hasGenerated ? (
                <div className="text-center py-24 flex flex-col items-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner grayscale opacity-50">
                    🍱
                  </div>
                  <h3 className="font-bold text-gray-600 mb-1">
                    Jadwal Belum Tersusun
                  </h3>
                  <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                    Klik tombol susun jadwal di sebelah kiri untuk men-generate
                    otomatis matriks rencana makan.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                    {dynamicDays.map((h, i) => {
                      const isPastDay = i < currentDayOffset;
                      return (
                        <button
                          key={h}
                          onClick={() => setActiveDay(i)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1
                          ${activeDay === i ? "bg-[#8B2020] text-white shadow-md" : "bg-gray-50 text-gray-500 border border-gray-200"} 
                          ${isPastDay ? "opacity-60" : ""}`}
                        >
                          {h}{" "}
                          {isPastDay && <span className="text-[10px]">🔒</span>}
                          {i === currentDayOffset && (
                            <span className="ml-1 bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full border border-green-200">
                              HARI INI
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        slot: "pagi",
                        label: "Sarapan Pagi (08:00)",
                        icon: "☀️",
                        warna: "bg-amber-50 text-amber-600",
                      },
                      {
                        slot: "siang",
                        label: "Makan Siang (12:00)",
                        icon: "🌤️",
                        warna: "bg-orange-50 text-orange-600",
                      },
                      {
                        slot: "malam",
                        label: "Makan Malam (19:00)",
                        icon: "🌙",
                        warna: "bg-indigo-50 text-indigo-600",
                      },
                    ].map(({ slot, label, icon, warna }) => {
                      const menu = weeklyMenu[activeDay]?.[slot];
                      const isLocked = activeDay < currentDayOffset;
                      return (
                        <MealCard
                          key={slot}
                          label={label}
                          icon={icon}
                          menu={menu}
                          warna={warna}
                          isLocked={isLocked}
                          onSwap={() => setItemToSwap(menu)}
                          onDetail={() => setSelectedMenuDetail(menu)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {showPrefEdit && (
        <PreferenceEditPopup
          masterAllergies={masterAllergies}
          masterIngredients={masterIngredients}
          childData={childData}
          isSaving={isSavingPref}
          onSave={handleSavePref}
          onClose={() => setShowPrefEdit(false)}
        />
      )}
      {itemToSwap && (
        <SwapMenuPopup
          childId={childData.id}
          itemToSwap={itemToSwap}
          onClose={() => setItemToSwap(null)}
          onSwapSuccess={(newPlan) => {
            setWeeklyMenu(newPlan);
            setItemToSwap(null);
          }}
          onError={(msg) => {
            setItemToSwap(null);
            setErrorModalMsg(msg);
          }}
        />
      )}
      {selectedMenuDetail && (
        <RecipeDetailPopup
          menu={selectedMenuDetail}
          onClose={() => setSelectedMenuDetail(null)}
        />
      )}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleExecuteDelete}
      />
      <ErrorModal
        message={errorModalMsg}
        onClose={() => setErrorModalMsg("")}
      />

      <div
        style={{
          overflow: "hidden",
          height: 0,
          width: 0,
          position: "absolute",
        }}
      >
        <PrintableWeeklyPlan
          ref={componentRef}
          childData={childData}
          weeklyMenu={weeklyMenu}
          totalMingguan={totalMingguanBerbasisBulan}
          dynamicDays={dynamicDays}
        />
      </div>

      <FooterDashboard />
    </div>
  );
}
