import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { apiFetch } from "../config/api"; // ✅ Import apiFetch

export default function ChildRegistration({ onClose, forcedError }) {
  const navigate = useNavigate();
  const [error, setError] = useState(forcedError || "");
  const { user, fetchChildren } = useAuth();

  // States
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Master Data States
  const [masterAllergies, setMasterAllergies] = useState([]);
  const [masterIngredients, setMasterIngredients] = useState([]);

  // Dropdown States
  const [openDropdown, setOpenDropdown] = useState(null); // 'allergy' atau 'preference'

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    tinggi: "",
    berat: "",
    parent_salary: "",
    allergy_ids: [],
    preference_ids: [],
  });

  // Insight Data (Hasil dari Step 3)
  const [insightData, setInsightData] = useState(null);
  const [childGlobalStatus, setChildGlobalStatus] = useState("");

  // Hitung batasan tanggal kalender (min 24 bulan lalu, max 6 bulan lalu)
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear(),
    today.getMonth() - 6,
    today.getDate(),
  )
    .toISOString()
    .split("T")[0];
  const minDate = new Date(
    today.getFullYear(),
    today.getMonth() - 24,
    today.getDate(),
  )
    .toISOString()
    .split("T")[0];

  // Fetch Master Data saat komponen di-mount
  useEffect(() => {
    const fetchMasterData = async () => {
      const token = localStorage.getItem("token");
      try {
        // ✅ PERBAIKAN: Pakai apiFetch, bukan fetch ke localhost
        const [resAllergy, resIngred] = await Promise.all([
          apiFetch("/master/allergies", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiFetch("/master/ingredients", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setMasterAllergies(await resAllergy.json());
        setMasterIngredients(await resIngred.json());
      } catch (err) {
        console.error("Gagal mengambil master data", err);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // rubah format string
  const formatLabel = (str) => {
    if (!str) return "";
    return str
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Handler Input Text Biasa
  const handleChange = (e) => {
    if (e.target.name === "name" && /\d/.test(e.target.value)) {
      setError("Nama anak tidak boleh mengandung angka.");
      return;
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  // Handler Khusus Input Angka (TB & BB) - Validasi Maksimal 1 Koma (Desimal)
  const handleNumberChange = (e) => {
    let val = e.target.value;
    val = val.replace(",", "."); // Ubah koma jadi titik agar seragam

    if (val === "" || /^\d*\.?\d{0,1}$/.test(val)) {
      setFormData({ ...formData, [e.target.name]: val });
      setError("");
    }
  };

  const handleSalaryChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    setFormData({ ...formData, parent_salary: formattedValue });
    setError("");
  };

  // Toggle Checkbox Alergi
  const toggleAllergy = (id) => {
    let newAllergies = [...formData.allergy_ids];
    if (newAllergies.includes(id)) {
      newAllergies = newAllergies.filter((a) => a !== id);
    } else {
      newAllergies.push(id);
    }

    const selectedCategories = masterAllergies.filter((a) =>
      newAllergies.includes(a.id),
    );

    // Logika Pemblokiran yang Diperbaiki
    const safePreferences = formData.preference_ids.filter((prefId) => {
      const prefObj = masterIngredients.find((i) => i.id === prefId);
      if (!prefObj) return false;

      const isBlocked = selectedCategories.some((cat) => {
        // 1. Cek apakah nama makanan mengandung kata dari Kategori Induk (misal: "Jamur")
        const matchCategory = prefObj.name
          .toLowerCase()
          .includes(cat.name.toLowerCase());

        // 2. Cek apakah nama makanan cocok dengan salah satu Turunan di database
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

    setFormData({
      ...formData,
      allergy_ids: newAllergies,
      preference_ids: safePreferences,
    });
  };

  const togglePreference = (id, isDisabled) => {
    if (isDisabled) return;
    let newPrefs = [...formData.preference_ids];
    if (newPrefs.includes(id)) {
      newPrefs = newPrefs.filter((p) => p !== id);
    } else {
      newPrefs.push(id);
    }
    setFormData({ ...formData, preference_ids: newPrefs });
  };

  // Validasi Umur (6 - 24 Bulan)
  const validateAge = (dobString) => {
    const birthDate = new Date(dobString);
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }

    if (months < 6 || months > 24) {
      return false;
    }
    return true;
  };

  // Lanjut ke Step 2
  const handleNextStep = () => {
    if (!formData.name || !formData.dob || !formData.gender) {
      setError("Semua field di form pertama wajib diisi!");
      return;
    }
    if (/\d/.test(formData.name)) {
      setError("Nama anak tidak boleh mengandung angka.");
      return;
    }
    if (!validateAge(formData.dob)) {
      setError(
        "Sistem saat ini hanya berlaku untuk anak usia 6 hingga 24 bulan.",
      );
      return;
    }
    setError("");
    setStep(2);
  };

  // Submit Step 2 -> Loading -> Step 3
  const handleSubmitFinal = async () => {
    if (!formData.tinggi || !formData.berat || !formData.parent_salary) {
      setError("Tinggi, berat, dan pendapatan wajib diisi!");
      return;
    }

    const tinggiVal = parseFloat(formData.tinggi);
    if (tinggiVal < 70 || tinggiVal > 110) {
      setError("Tinggi badan harus di antara 70 cm hingga 110 cm.");
      return;
    }

    const cleanSalaryCheck = formData.parent_salary.replace(/\./g, "");
    if (parseInt(cleanSalaryCheck) < 500000) {
      setError("Pendapatan tidak boleh di bawah Rp 500.000.");
      return;
    }

    setIsLoading(true);
    setError("");
    setOpenDropdown(null); // Tutup dropdown jika ada

    const token = localStorage.getItem("token");

    try {
      // Hapus titik dari string gaji sebelum dikirim ke backend
      const cleanSalary = formData.parent_salary.replace(/\./g, "");

      // ✅ PERBAIKAN: Pakai apiFetch, bukan fetch ke localhost
      const childRes = await apiFetch("/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tinggi: parseFloat(formData.tinggi),
          berat: parseFloat(formData.berat),
          parent_salary: parseFloat(cleanSalary),
        }),
      });
      const childData = await childRes.json();

      if (!childRes.ok) {
        throw new Error(childData.message || "Gagal menyimpan data anak.");
      }

      const newChildId = childData.data.id;
      setChildGlobalStatus(childData.data.growth_logs[0].global_status);

      // ✅ PERBAIKAN: Pakai apiFetch, bukan fetch ke localhost
      const insightRes = await apiFetch(
        `/mealplan/generate-insight/${newChildId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const insightPayload = await insightRes.json();

      if (!insightRes.ok) {
        throw new Error(
          insightPayload.message || "Gagal men-generate AI Insight.",
        );
      }

      setInsightData(insightPayload.insight);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* Modal Overlay dengan Backdrop Blur yang menempel di LandingPage */
    <div
      className="fixed inset-0 z-[300] overflow-y-auto bg-black/60 backdrop-blur-sm font-['Lato'] transition-all"
      onClick={() => {
        if (onClose && step !== 3 && !isLoading) onClose();
      }}
    >
      {/* ====== TAMBAHKAN DIV PEMBUNGKUS TENGAH INI ====== */}
      <div className="flex min-h-full items-center justify-center p-4 py-12">
        {/* ========================================== */}
        {/* LOADING OVERLAY (Tampil saat hit 2 API)    */}
        {/* ========================================== */}
        {isLoading && (
          <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-[#8B2020] text-white">
            <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
            <h2 className="text-2xl font-bold">
              Menganalisis Gizi {formData.name}...
            </h2>
            <p className="mt-2 text-sm opacity-80">
              AI kami sedang menyusun rekomendasi terbaik untuk si Kecil.
            </p>
          </div>
        )}

        {/* ========================================== */}
        {/* STEP 1: NAMA, DOB, GENDER                  */}
        {/* ========================================== */}
        {step === 1 && !isLoading && (
          <div
            className="w-full max-w-[420px] rounded-[2.5rem] bg-[#8B2020] px-8 py-10 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center text-[36px] font-bold mb-1">NutriBy</h2>
            <p className="text-center text-[15px] mb-8 opacity-90">
              Isi data anak anda di bawah ini
            </p>

            {error && (
              <p className="mb-4 text-center text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <div className="space-y-6">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-semibold">Nama anak</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="border-b-2 border-white bg-transparent py-2 outline-none focus:border-gray-300"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-sm font-semibold">
                  Tanggal lahir bayi
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  min={minDate}
                  max={maxDate}
                  className="border-b-2 border-white bg-transparent py-2 outline-none focus:border-gray-300 [&::-webkit-calendar-picker-indicator]:invert"
                />
                <span className="text-xs opacity-70 mt-1">
                  Sistem kami optimal untuk usia 6 - 24 bulan
                </span>
              </div>

              <div className="flex flex-col">
                <label className="mb-4 text-sm font-semibold">
                  Apa jenis kelamin anak anda
                </label>
                <div className="flex justify-center gap-6">
                  <div
                    onClick={() => {
                      setFormData({ ...formData, gender: "L" });
                      setError("");
                    }}
                    className={`cursor-pointer rounded-2xl p-4 transition-all ${formData.gender === "L" ? "bg-white text-[#8B2020] scale-105" : "bg-cyan-200 hover:scale-105"}`}
                  >
                    <div className="h-16 w-16 text-4xl flex justify-center items-center">
                      👦🏼
                    </div>
                    <p
                      className={`mt-2 text-center text-xs font-bold ${formData.gender === "L" ? "text-[#8B2020]" : "text-black"}`}
                    >
                      Laki-laki
                    </p>
                  </div>
                  <div
                    onClick={() => {
                      setFormData({ ...formData, gender: "P" });
                      setError("");
                    }}
                    className={`cursor-pointer rounded-2xl p-4 transition-all ${formData.gender === "P" ? "bg-white text-[#8B2020] scale-105" : "bg-pink-300 hover:scale-105"}`}
                  >
                    <div className="h-16 w-16 text-4xl flex justify-center items-center">
                      👧🏻
                    </div>
                    <p
                      className={`mt-2 text-center text-xs font-bold ${formData.gender === "P" ? "text-[#8B2020]" : "text-black"}`}
                    >
                      Perempuan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleNextStep}
                className="font-bold text-lg hover:underline decoration-2 underline-offset-4"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* STEP 2: TB, BB, ALERGI, FAVORIT, GAJI      */}
        {/* ========================================== */}
        {step === 2 && !isLoading && (
          <div
            className="w-full max-w-[420px] rounded-[2.5rem] bg-[#8B2020] px-8 py-10 shadow-2xl text-white"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(null);
            }}
          >
            <h2 className="text-center text-[36px] font-bold mb-1">NutriBy</h2>
            <p className="text-center text-[15px] mb-8 opacity-90">
              Lengkapi metrik dan preferensi anak
            </p>

            {error && (
              <p className="mb-4 text-center text-sm font-semibold text-red-200 bg-red-900/30 py-2 rounded">
                {error}
              </p>
            )}

            <div className="space-y-6">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-semibold">
                  Tinggi badan (dalam cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="tinggi"
                  placeholder="Contoh: 70.5"
                  value={formData.tinggi}
                  onChange={handleNumberChange}
                  className="border-b-2 border-white bg-transparent py-2 outline-none focus:border-gray-300 placeholder-white/50"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-sm font-semibold">
                  Berat badan (dalam kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="berat"
                  placeholder="Contoh: 8.2"
                  value={formData.berat}
                  onChange={handleNumberChange}
                  className="border-b-2 border-white bg-transparent py-2 outline-none focus:border-gray-300 placeholder-white/50"
                />
              </div>

              {/* Dropdown Alergi Custom */}
              <div
                className="flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="mb-1 text-sm font-semibold">
                  Alergi{" "}
                  <span className="font-normal opacity-70 text-xs">
                    (lewati jika tidak ada)
                  </span>
                </label>
                <div
                  className="border-b-2 border-white bg-transparent py-2 outline-none cursor-pointer flex justify-between items-center"
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "allergy" ? null : "allergy",
                    )
                  }
                >
                  <span className="truncate text-white/90">
                    {formData.allergy_ids.length > 0
                      ? formData.allergy_ids
                          .map((id) =>
                            formatLabel(
                              masterAllergies.find((a) => a.id === id)?.name,
                            ),
                          )
                          .join(", ")
                      : "Pilih alergi..."}
                  </span>
                  <span>{openDropdown === "allergy" ? "▲" : "▼"}</span>
                </div>

                {openDropdown === "allergy" && (
                  <div className="absolute top-[100%] left-0 right-0 z-10 w-full max-h-40 overflow-y-auto bg-white rounded-xl mt-1 p-2 shadow-xl text-black">
                    {masterAllergies.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.allergy_ids.includes(a.id)}
                          onChange={() => toggleAllergy(a.id)}
                          className="w-4 h-4 accent-[#8B2020]"
                        />
                        <span className="text-sm font-medium">
                          {formatLabel(a.name)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown Makanan Kesukaan + Blokir Logika Alergi dari Database */}
              <div
                className="flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="mb-1 text-sm font-semibold">
                  Makanan favorit (Pilih lebih dari satu)
                </label>
                <div
                  className="border-b-2 border-white bg-transparent py-2 outline-none cursor-pointer flex justify-between items-center"
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "preference" ? null : "preference",
                    )
                  }
                >
                  <span className="truncate text-white/90">
                    {formData.preference_ids.length > 0
                      ? formData.preference_ids
                          .map((id) =>
                            formatLabel(
                              masterIngredients.find((i) => i.id === id)?.name,
                            ),
                          )
                          .join(", ")
                      : "Pilih makanan favorit..."}
                  </span>
                  <span>{openDropdown === "preference" ? "▲" : "▼"}</span>
                </div>

                {openDropdown === "preference" && (
                  <div className="absolute top-[100%] left-0 right-0 z-10 w-full max-h-40 overflow-y-auto bg-white rounded-xl mt-1 p-2 shadow-xl text-black">
                    {masterIngredients.map((i) => {
                      // Logika Cek Blokir Relasi DB
                      const selectedCategories = masterAllergies.filter((a) =>
                        formData.allergy_ids.includes(a.id),
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
                          className={`flex items-center gap-3 p-2 rounded transition-colors ${isDisabled ? "bg-red-50 opacity-60 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.preference_ids.includes(i.id)}
                            onChange={() => togglePreference(i.id, isDisabled)}
                            disabled={isDisabled}
                            className="w-4 h-4 accent-[#8B2020]"
                          />
                          <span
                            className={`text-sm font-medium ${isDisabled ? "text-red-700 line-through" : "text-black"}`}
                          >
                            {formatLabel(i.name)}
                          </span>
                          {isDisabled && (
                            <span className="text-[10px] text-red-600 font-bold ml-auto bg-red-100 px-2 py-1 rounded-full">
                              Alergi
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-sm font-semibold">
                  Pendapatan Orang Tua per Bulan (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="parent_salary"
                  placeholder="Contoh: 5.000.000"
                  value={formData.parent_salary}
                  onChange={handleSalaryChange}
                  className="border-b-2 border-white bg-transparent py-2 outline-none focus:border-gray-300 placeholder-white/50"
                />
                <span className="text-xs opacity-60 mt-1">
                  Minimal pendapatan Rp 500.000
                </span>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="font-bold hover:underline underline-offset-4"
              >
                Kembali
              </button>
              <button
                onClick={handleSubmitFinal}
                className="rounded-full bg-white px-8 py-2 text-[16px] font-bold text-[#8B2020] hover:bg-gray-100 transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* STEP 3: WELCOME POPUP & AI INSIGHT         */}
        {/* ========================================== */}
        {step === 3 && !isLoading && insightData && (
          <div
            className="w-full max-w-[480px] rounded-[2rem] bg-white px-8 py-10 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800">
              {formData.gender === "L" ? "Sang pangeran, " : "Sang putri, "}
              <span className="text-[#8B2020]">{formData.name}</span> telah
              tiba!
            </h2>
            <p className="text-sm font-semibold text-gray-600 mt-1">
              Analisis Gizi {formData.name}
            </p>

            <hr className="my-6 border-t-2 border-gray-200" />

            <div className="text-left">
              <h3 className="font-bold text-lg text-black mb-3">
                Informasi Umum:
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-700 mb-6 space-y-2">
                <li>
                  Status Gizi Terkini:{" "}
                  <span className="font-bold text-[#8B2020]">
                    {childGlobalStatus}
                  </span>
                </li>
                <li>
                  Saran Budget MPASI / Bulan:{" "}
                  <span className="font-bold text-green-600">
                    Rp{" "}
                    {Number(insightData.max_budget_limit).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </li>
                <li>
                  Estimasi Budget Aktual AI:{" "}
                  <span className="font-bold text-blue-600">
                    Rp{" "}
                    {Number(insightData.actual_total_cost).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </li>
              </ul>

              <h3 className="font-bold text-lg text-black mb-2">
                Catatan dari NutriBot:
              </h3>
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 italic border border-gray-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                {insightData?.ai_insight_text ? (
                  insightData.ai_insight_text.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-400 not-italic">
                    Catatan tidak tersedia.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={async () => {
                await fetchChildren();
                if (onClose) onClose();
                navigate("/dashboard");
              }}
              className="mt-8 w-full rounded-full bg-[#8B2020] py-4 text-[16px] font-bold text-white hover:bg-[#6b1515] transition-transform active:scale-95 shadow-md"
            >
              Mulai Jelajahi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
