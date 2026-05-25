import { useState, useEffect } from "react";
import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";
import gambarDashboard from "../assets/gambarDashboard.jpeg";
import RecipeDetailPopup from "./Features/RecipeDetailPopup";
import { useAuth } from "../context/authContext";

// hitung hari buat nentuin menu mpasi
const calculateDayOffset = (createdAt) => {
  if (!createdAt) return 0;
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
};

export default function Dashboard() {
  const { activeChild: contextActiveChild, fetchChildren } = useAuth();
  const [childData, setChildData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [masterAllergies, setMasterAllergies] = useState([]);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [salaryError, setSalaryError] = useState("");

  const [editFormData, setEditFormData] = useState({
    allergy_ids: [],
    preference_ids: [],
    parent_salary: "",
  });

  const [dailyInsight, setDailyInsight] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const [todayMenu, setTodayMenu] = useState(null);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);

  // ambil data anak + menu hari ini dari api
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/api/children", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const targetId = contextActiveChild?.id;
        const child =
          (targetId ? data.find((c) => c.id === targetId) : null) ?? data[0];
        setChildData(child);

        if (child.meal_plans && child.meal_plans.length > 0) {
          const activeWeeklyPlan = child.meal_plans.find(
            (p) => p.plan_type === "mingguan",
          );
          if (activeWeeklyPlan && activeWeeklyPlan.items) {
            const diffDays = calculateDayOffset(activeWeeklyPlan.created_at);
            if (diffDays >= 0 && diffDays < 7) {
              const todayItems = activeWeeklyPlan.items.filter(
                (item) => item.day_number === diffDays + 1,
              );
              const getRecipe = (time) => {
                const found = todayItems.find((i) => i.meal_time === time);
                return found ? found.recipe : null;
              };
              setTodayMenu({
                pagi: getRecipe("pagi"),
                siang: getRecipe("siang"),
                malam: getRecipe("malam"),
              });
            } else {
              setTodayMenu(null);
            }
          }
        }
      } catch (error) {
        console.error("Gagal memuat data dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [contextActiveChild?.id]);

  // ambil tips nutrisi harian si bot
  useEffect(() => {
    const fetchDailyInsight = async () => {
      if (!childData?.id) return;

      setIsInsightLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `http://localhost:3000/api/insight/daily/${childData.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        if (res.ok) setDailyInsight(data.insight);
      } catch (err) {
        console.error("Gagal mengambil insight harian:", err);
      } finally {
        setIsInsightLoading(false);
      }
    };
    fetchDailyInsight();
  }, [childData?.id]);

  // ambil list master alergi ama bahan makanan pas web pertama buka
  useEffect(() => {
    const fetchMaster = async () => {
      const token = localStorage.getItem("token");
      try {
        const [resAllergy, resIngred] = await Promise.all([
          fetch("http://localhost:3000/api/master/allergies", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:3000/api/master/ingredients", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setMasterAllergies(await resAllergy.json());
        setMasterIngredients(await resIngred.json());
      } catch (err) {
        console.error("Gagal mengambil master data", err);
      }
    };
    fetchMaster();
  }, []);

  // masukin data anak yg lama ke form edit pas modal dibuka
  useEffect(() => {
    if (showEditModal && childData) {
      setEditFormData({
        allergy_ids:
          childData.allergies?.map((a) => a.allergy_category_id) || [],
        preference_ids:
          childData.preferences?.map((p) => p.ingredient_id) || [],
        parent_salary: childData.parent_salary
          ? Number(childData.parent_salary).toLocaleString("id-ID")
          : "",
      });
    }
  }, [showEditModal, childData]);

  // bersihin underscore ama bikin huruf kapital di awal kata
  const formatLabel = (str) => {
    if (!str) return "";
    return str
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  // hitung umur anak detail sampe ke hari
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

  // handle pilih/batal alergi + matiin kesukaan klo bahannya bikin alergi
  const toggleAllergy = (id) => {
    let newAllergies = [...editFormData.allergy_ids];
    if (newAllergies.includes(id))
      newAllergies = newAllergies.filter((a) => a !== id);
    else newAllergies.push(id);

    const selectedCategories = masterAllergies.filter((a) =>
      newAllergies.includes(a.id),
    );
    const safePreferences = editFormData.preference_ids.filter((prefId) => {
      const prefObj = masterIngredients.find((i) => i.id === prefId);
      if (!prefObj) return false;
      const isBlocked = selectedCategories.some((cat) => {
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
      return !isBlocked;
    });

    setEditFormData({
      allergy_ids: newAllergies,
      preference_ids: safePreferences,
      parent_salary: editFormData.parent_salary,
    });
  };

  // handle checklist makanan kesukaan
  const togglePreference = (id, isDisabled) => {
    if (isDisabled) return;
    let newPrefs = [...editFormData.preference_ids];
    if (newPrefs.includes(id)) newPrefs = newPrefs.filter((p) => p !== id);
    else newPrefs.push(id);
    setEditFormData({ ...editFormData, preference_ids: newPrefs });
  };

  // formatting titik rupiah + validasi ketikan di gaji
  const handleSalaryChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(`?!\d))/g, ".");
    setEditFormData({ ...editFormData, parent_salary: formattedValue });

    const numericValue = parseInt(rawValue, 10);
    if (rawValue && numericValue < 500000) {
      setSalaryError("Minimal pendapatan orang tua adalah Rp 500.000");
    } else {
      setSalaryError("");
    }
  };

  // cek ulang gaji pas mau di-save + hit api simpan data
  const handleSaveEdit = async () => {
    if (!editFormData.parent_salary) {
      alert("Pendapatan orang tua tidak boleh kosong.");
      return;
    }
    if (salaryError) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const cleanSalary = editFormData.parent_salary.replace(/\./g, "");

      const res = await fetch(
        `http://localhost:3000/api/children/${childData.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...editFormData,
            parent_salary: parseFloat(cleanSalary),
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setChildData(data.data);
        setShowEditModal(false);
      } else alert(data.message);
    } catch {
      alert("Terjadi kesalahan jaringan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3EFEA]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2020] border-t-transparent"></div>
      </div>
    );
  }

  if (!childData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F3EFEA] text-xl font-bold text-gray-500">
        Data anak tidak ditemukan.
      </div>
    );
  }

  const latestLog = childData.growth_logs?.[0] || {};
  const age = getAgeDetail(childData.dob);
  const activeMealPlan =
    childData.meal_plans?.find((p) => p.plan_type === "Bulanan") ||
    childData.meal_plans?.[0] ||
    null;

  const activeBulananPlan = childData.meal_plans?.find(
    (p) => p.plan_type === "Bulanan" || p.plan_type === "bulanan",
  );
  const costBulanan = activeBulananPlan
    ? parseFloat(activeBulananPlan.actual_total_cost)
    : 0;

  const costMingguan = costBulanan > 0 ? costBulanan / 4 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato'] relative animate-[fadeIn_0.5s_ease-out]">
      <NavbarDashboard />

      <main className="mx-auto w-full max-w-7xl flex-grow p-4 py-8 md:p-8 animate-[slideUp_0.5s_ease-out_forwards]">
        {/* bagian hero welcome banner */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-white p-6 shadow-sm md:p-10 relative flex items-center justify-between">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl font-bold text-[#8B2020] md:text-5xl uppercase leading-tight">
              Selamat Datang,
              <br />
              Ayah & Bunda!
            </h1>
            <p className="mt-4 text-base text-gray-600 md:text-lg">
              Saat ini si kecil,{" "}
              <span className="font-bold text-[#8B2020]">
                {childData.name},
              </span>{" "}
              kini berusia{" "}
              <span className="font-bold">
                {age.months} Bulan {age.days} Hari
              </span>
              . Status tumbuh kembangnya saat ini:{" "}
              <span className="rounded-md bg-yellow-100 px-2 py-1 font-bold text-yellow-700">
                {latestLog.global_status || "Belum ada data"}
              </span>
              .
            </p>
          </div>
          <img
            src={gambarDashboard}
            alt="dashboard illustration"
            className="hidden md:block w-48 object-contain opacity-90"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* box data info tinggi & berat anak */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">
                Perkembangan Terbaru Si Kecil
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-blue-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-blue-500">
                    Berat Si Kecil
                  </p>
                  <p className="text-2xl font-extrabold text-gray-800">
                    {latestLog.berat || "-"} <span className="text-sm">kg</span>
                  </p>
                </div>
                <div className="rounded-xl bg-green-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-green-500">
                    Tinggi Si Kecil
                  </p>
                  <p className="text-2xl font-extrabold text-gray-800">
                    {latestLog.tinggi || "-"}{" "}
                    <span className="text-sm">cm</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2.5 pt-2">
                <div className="rounded-xl bg-gray-50 p-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500">
                    Berat Sesuai Usia:
                  </span>
                  <span className="font-bold text-gray-800">
                    {latestLog.status_wfa || "-"}
                  </span>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500">
                    Tinggi Sesuai Usia:
                  </span>
                  <span className="font-bold text-gray-800">
                    {latestLog.status_hfa || "-"}
                  </span>
                </div>
                <div className="rounded-xl bg-red-50 p-3 flex justify-between items-center text-sm border border-red-100">
                  <span className="font-medium text-red-700">
                    Proporsi Berat & Tinggi:
                  </span>
                  <span className="font-bold text-[#8B2020]">
                    {latestLog.status_wfh || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">
                Target Nutrisi & Budget Si Kecil
              </h2>
              <div className="mb-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-red-50 p-3 text-center border border-red-100">
                  <p className="text-[10px] font-bold uppercase text-red-500">
                    Kalori
                  </p>
                  <p className="text-xl font-extrabold text-gray-800">
                    {latestLog.target_kalori
                      ? Math.round(latestLog.target_kalori)
                      : "-"}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500">kkal</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-center border border-blue-100">
                  <p className="text-[10px] font-bold uppercase text-blue-500">
                    Protein
                  </p>
                  <p className="text-xl font-extrabold text-gray-800">
                    {latestLog.target_protein
                      ? Math.round(latestLog.target_protein)
                      : "-"}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500">gram</p>
                </div>
                <div className="rounded-xl bg-yellow-50 p-3 text-center border border-yellow-100">
                  <p className="text-[10px] font-bold uppercase text-yellow-600">
                    Lemak
                  </p>
                  <p className="text-xl font-extrabold text-gray-800">
                    {latestLog.target_lemak
                      ? Math.round(latestLog.target_lemak)
                      : "-"}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500">gram</p>
                </div>
              </div>
              {activeBulananPlan ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#FFF8F0] p-4 border border-orange-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Kisaran Budget Mingguan
                    </p>
                    <p className="text-lg font-extrabold text-[#8B2020]">
                      {costMingguan > 0
                        ? `Rp ${Math.round(costMingguan).toLocaleString("id-ID")}`
                        : "Belum Tersusun"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FFF8F0] p-4 border border-orange-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Kisaran Budget Bulanan
                    </p>
                    <p className="text-lg font-extrabold text-[#8B2020]">
                      {costBulanan > 0
                        ? `Rp ${Math.round(costBulanan).toLocaleString("id-ID")}`
                        : "Belum Tersusun"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">
                  Belum memiliki perencanaan makan aktif.
                </p>
              )}
            </div>

            {/* ringkasan data profil anak */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col items-center">
              <h2 className="mb-4 text-lg font-bold text-[#8B2020] uppercase">
                Ringkasan Data
              </h2>
              <div className="w-full rounded-2xl bg-[#FFF8F0] border border-orange-100 p-4 mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  💰 Pendapatan Orang Tua
                </p>
                <p className="text-base font-extrabold text-[#8B2020]">
                  {childData.parent_salary ? (
                    `Rp ${Number(childData.parent_salary).toLocaleString("id-ID")}`
                  ) : (
                    <span className="text-gray-400 font-normal text-sm">
                      Belum diisi
                    </span>
                  )}
                </p>
              </div>
              <div className="w-full rounded-2xl border-2 border-red-200 bg-white p-4 shadow-inner mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  ⚠️ ALERGI/PANTANGAN
                </p>
                {childData.allergies?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {childData.allergies.map((a) => (
                      <span
                        key={a.allergy_category.id}
                        className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600"
                      >
                        {formatLabel(a.allergy_category.name)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Tidak ada alergi terdaftar
                  </p>
                )}
              </div>
              <div className="w-full mb-5">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">
                  🥦 KESUKAAN
                </p>
                <div className="flex flex-wrap gap-2">
                  {childData.preferences?.length > 0 ? (
                    childData.preferences.map((p) => (
                      <span
                        key={p.ingredient.id}
                        className="rounded-full bg-green-100 px-3 py-1 text-[14px] font-bold text-green-700"
                      >
                        {p.ingredient.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">
                      Belum ada preferensi
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="rounded-full bg-red-50 px-6 py-2.5 text-sm font-bold text-[#8B2020] transition-all duration-300 hover:bg-red-100 hover:scale-105 active:scale-95"
              >
                Edit Data Anak
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* menu makan harian */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col min-h-[350px]">
              <h2 className="text-2xl font-bold text-[#8B2020] mb-6 mt-4 text-center">
                Rekomendasi Menu Hari ini
              </h2>
              {todayMenu ? (
                <div className="w-full space-y-3">
                  {[
                    {
                      slot: "pagi",
                      label: "Sarapan",
                      time: "08:00",
                      icon: "☀️",
                      bg: "bg-amber-50 hover:bg-amber-100",
                      border: "border-amber-100",
                      textColor: "text-amber-700",
                    },
                    {
                      slot: "siang",
                      label: "Makan Siang",
                      time: "12:00",
                      icon: "🌤️",
                      bg: "bg-orange-50 hover:bg-orange-100",
                      border: "border-orange-100",
                      textColor: "text-orange-700",
                    },
                    {
                      slot: "malam",
                      label: "Makan Malam",
                      time: "19:00",
                      icon: "🌙",
                      bg: "bg-indigo-50 hover:bg-indigo-100",
                      border: "border-indigo-100",
                      textColor: "text-indigo-700",
                    },
                  ].map(
                    ({ slot, label, time, icon, bg, border, textColor }) => {
                      const menu = todayMenu[slot];
                      return (
                        <div
                          key={slot}
                          onClick={() => menu && setSelectedMenuDetail(menu)}
                          className={`flex items-center gap-4 rounded-2xl border ${border} ${bg} p-4 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md ${menu ? "cursor-pointer" : ""}`}
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm overflow-hidden">
                            {menu?.image_url ? (
                              <img
                                src={menu.image_url}
                                alt=""
                                className="w-12 h-12 object-cover"
                              />
                            ) : (
                              icon
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-bold uppercase tracking-wider ${textColor}`}
                            >
                              {label} · {time}
                            </p>
                            <p className="text-sm font-bold text-gray-800 truncate mt-0.5">
                              {menu?.name || "Menu tidak tersedia"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {menu?.calories ? `${menu.calories} kkal` : "-"}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs font-bold text-[#8B2020]">
                              {menu?.est_price
                                ? `Rp ${Number(menu.est_price).toLocaleString("id-ID")}`
                                : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-grow text-center opacity-60">
                  <img
                    src="https://www.svgrepo.com/show/440537/food.svg"
                    alt="Empty Food"
                    className="w-24 h-24 mb-4 grayscale"
                  />
                  <p className="text-lg font-bold text-gray-500">
                    Anda belum memiliki jadwal MPASI yang berjalan hari ini
                  </p>
                  <p className="text-sm text-gray-400 mt-2 max-w-sm">
                    Buat plan mingguan terlebih dahulu agar menu hari ini tampil
                    di sini.
                  </p>
                  <a
                    href="/features/weekly-plan"
                    className="mt-4 rounded-full bg-[#8B2020] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#6b1515] transition-colors"
                  >
                    Buat Plan Mingguan →
                  </a>
                </div>
              )}
            </div>

            {/* insight ai nutribot */}
            {activeMealPlan && (
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 text-left">
                <h3 className="font-bold text-lg text-black mb-3">
                  Catatan dari NutriBot:
                </h3>
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 italic border border-gray-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {activeMealPlan.ai_insight_text ? (
                    activeMealPlan.ai_insight_text
                      .split("\n\n")
                      .map((para, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {para}
                        </p>
                      ))
                  ) : (
                    <p className="text-gray-400 not-italic">
                      Catatan belum tersedia.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* daily tips section */}
            <div className="rounded-3xl bg-red-50 p-6 shadow-sm border border-red-100 text-center">
              <h3 className="font-bold text-[#8B2020] mb-2 uppercase text-sm">
                Tips Nutrisi Hari Ini
              </h3>
              {isInsightLoading ? (
                <div className="flex justify-center items-center py-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B2020] border-t-transparent"></div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 italic">
                  "
                  {dailyInsight ||
                    "Tambahkan sedikit minyak zaitun atau margarin pada bubur si kecil untuk memberikan tambahan lemak sehat yang esensial untuk perkembangan otaknya."}
                  "
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <FooterDashboard />

      {selectedMenuDetail && (
        <RecipeDetailPopup
          menu={selectedMenuDetail}
          onClose={() => setSelectedMenuDetail(null)}
        />
      )}

      <div
        className={`fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300 ${
          showEditModal
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => {
          setOpenDropdown(null);
          setShowEditModal(false);
        }}
      >
        <div
          className={`w-full max-w-[450px] rounded-[2rem] bg-white p-8 shadow-2xl transition-all duration-300 transform ${
            showEditModal ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold text-[#8B2020] mb-2">
            Edit Data Anak
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Ubah riwayat alergi, makanan, dan pendapatan.
          </p>
          <div className="flex flex-col gap-5">
            {/* input dropdown pilihan alergi  */}
            <div className="flex flex-col relative">
              <label className="mb-1 text-sm font-bold text-gray-700">
                Alergi (Bisa pilih lebih dari satu)
              </label>
              <div
                className="rounded-lg border border-gray-300 bg-white p-2.5 outline-none cursor-pointer flex justify-between items-center hover:border-gray-400 transition-colors"
                onClick={() =>
                  setOpenDropdown(openDropdown === "allergy" ? null : "allergy")
                }
              >
                <span className="truncate text-gray-700 text-sm">
                  {editFormData.allergy_ids.length > 0
                    ? editFormData.allergy_ids
                        .map((id) => {
                          const item = masterAllergies.find((a) => a.id == id);
                          return item
                            ? formatLabel(item.name)
                            : "ID Tidak Ditemukan";
                        })
                        .join(", ")
                    : "Pilih alergi..."}
                </span>
                <span
                  className={`text-gray-500 text-xs transition-transform duration-300 ${openDropdown === "allergy" ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </div>
              <div
                className={`absolute top-full left-0 right-0 z-[50] w-full bg-white rounded-xl mt-1 overflow-y-auto shadow-xl border border-gray-100 transition-all duration-300 ${
                  openDropdown === "allergy"
                    ? "max-h-48 opacity-100 p-2"
                    : "max-h-0 opacity-0 p-0 pointer-events-none"
                }`}
              >
                {masterAllergies.length === 0 ? (
                  <p className="p-3 text-sm text-center text-red-500">
                    Data Master Alergi kosong dari Database!
                  </p>
                ) : (
                  masterAllergies.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={editFormData.allergy_ids.includes(a.id)}
                        onChange={() => toggleAllergy(a.id)}
                        className="w-4 h-4 accent-[#8B2020]"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {formatLabel(a.name)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* input dropdown makanan favorit */}
            <div className="flex flex-col relative">
              <label className="mb-1 text-sm font-bold text-gray-700">
                Makanan favorit (Pilih lebih dari satu)
              </label>
              <div
                className="rounded-lg border border-gray-300 bg-white p-2.5 outline-none cursor-pointer flex justify-between items-center hover:border-gray-400 transition-colors"
                onClick={() =>
                  setOpenDropdown(
                    openDropdown === "preference" ? null : "preference",
                  )
                }
              >
                <span className="truncate text-gray-700 text-sm">
                  {editFormData.preference_ids.length > 0
                    ? editFormData.preference_ids
                        .map((id) => {
                          const item = masterIngredients.find(
                            (i) => i.id == id,
                          );
                          return item
                            ? formatLabel(item.name)
                            : "ID Tidak Ditemukan";
                        })
                        .join(", ")
                    : "Pilih makanan favorit..."}
                </span>
                <span
                  className={`text-gray-500 text-xs transition-transform duration-300 ${openDropdown === "preference" ? "rotate-180" : ""}`}
                >
                  ▼
                </span>
              </div>
              <div
                className={`absolute top-full left-0 right-0 z-[50] w-full bg-white rounded-xl mt-1 overflow-y-auto shadow-xl border border-gray-100 transition-all duration-300 ${
                  openDropdown === "preference"
                    ? "max-h-48 opacity-100 p-2"
                    : "max-h-0 opacity-0 p-0 pointer-events-none"
                }`}
              >
                {masterIngredients.length === 0 ? (
                  <p className="p-3 text-sm text-center text-red-500">
                    Data Master Makanan kosong dari Database!
                  </p>
                ) : (
                  masterIngredients.map((i) => {
                    const selectedCategories = masterAllergies.filter((a) =>
                      editFormData.allergy_ids.includes(a.id),
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
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${isDisabled ? "bg-red-50 opacity-60 cursor-not-allowed" : "hover:bg-green-50 cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.preference_ids.includes(i.id)}
                          onChange={() => togglePreference(i.id, isDisabled)}
                          disabled={isDisabled}
                          className={`w-4 h-4 ${isDisabled ? "accent-gray-400" : "accent-green-600"}`}
                        />
                        <span
                          className={`text-sm font-medium flex-1 ${isDisabled ? "text-red-700 line-through" : "text-gray-700"}`}
                        >
                          {formatLabel(i.name)}
                        </span>
                        {isDisabled && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">
                            Alergi
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* input text nominal gaji */}
            <div
              className="flex flex-col relative"
              onClick={() => setOpenDropdown(null)}
            >
              <label className="mb-1 text-sm font-bold text-gray-700">
                Pendapatan Orang Tua per Bulan (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                name="parent_salary"
                placeholder="Contoh: 5.000.000"
                value={editFormData.parent_salary}
                onChange={handleSalaryChange}
                className={`rounded-lg border bg-white p-2.5 text-sm outline-none transition-colors ${salaryError ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#8B2020]"}`}
              />
              {salaryError && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <span>⚠</span> {salaryError}
                </p>
              )}
            </div>
          </div>
          <div
            className="mt-8 flex justify-end gap-3"
            onClick={() => setOpenDropdown(null)}
          >
            <button
              onClick={() => setShowEditModal(false)}
              className="rounded-full px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all duration-200 active:scale-95"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              onClick={handleSaveEdit}
              className="rounded-full bg-[#8B2020] px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-red-800 transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-70 flex items-center justify-center min-w-[150px]"
              disabled={isSaving || !!salaryError}
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Simpan Perubahan"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
