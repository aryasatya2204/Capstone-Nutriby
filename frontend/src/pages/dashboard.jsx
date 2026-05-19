import { useState, useEffect } from "react";
import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";

export default function Dashboard() {
  const [childData, setChildData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [masterAllergies, setMasterAllergies] = useState([]);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Menambahkan parent_salary ke state form
  const [editFormData, setEditFormData] = useState({ allergy_ids: [], preference_ids: [], parent_salary: "" });

  const [dailyInsight, setDailyInsight] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/api/children", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data && data.length > 0) {
          setChildData(data[0]); 
        }
      } catch (error) {
        console.error("Gagal memuat data dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchDailyInsight = async () => {
      if (!childData?.id) return; 
      
      setIsInsightLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:3000/api/insight/daily/${childData.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
          setDailyInsight(data.insight);
        }
      } catch (err) {
        console.error("Gagal mengambil insight harian:", err);
      } finally {
        setIsInsightLoading(false);
      }
    };

    fetchDailyInsight();
  }, [childData?.id]);

  useEffect(() => {
    const fetchMaster = async () => {
      const token = localStorage.getItem("token");
      try {
        const [resAllergy, resIngred] = await Promise.all([
          fetch("http://localhost:3000/api/master/allergies", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("http://localhost:3000/api/master/ingredients", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setMasterAllergies(await resAllergy.json());
        setMasterIngredients(await resIngred.json());
      } catch (err) { console.error("Gagal mengambil master data", err); }
    };
    fetchMaster();
  }, []);

  // Isi data modal otomatis
  useEffect(() => {
    if (showEditModal && childData) {
      setEditFormData({
        allergy_ids: childData.allergies?.map(a => a.allergy_category_id) || [],
        preference_ids: childData.preferences?.map(p => p.ingredient_id) || [],
        // Format gaji ke tipe string dengan ribuan (Misal: "5.000.000")
        parent_salary: childData.parent_salary ? Number(childData.parent_salary).toLocaleString("id-ID") : ""
      });
    }
  }, [showEditModal, childData]);

  const formatLabel = (str) => {
    if (!str) return "";
    return str.replace(/_/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
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

  const toggleAllergy = (id) => {
    let newAllergies = [...editFormData.allergy_ids];
    if (newAllergies.includes(id)) newAllergies = newAllergies.filter((a) => a !== id);
    else newAllergies.push(id);

    const selectedCategories = masterAllergies.filter(a => newAllergies.includes(a.id));
    
    const safePreferences = editFormData.preference_ids.filter(prefId => {
      const prefObj = masterIngredients.find(i => i.id === prefId);
      if (!prefObj) return false;
      const isBlocked = selectedCategories.some(cat => {
        const matchCategory = prefObj.name.toLowerCase().includes(cat.name.toLowerCase());
        const matchItem = cat.items && cat.items.some(item => 
          prefObj.name.toLowerCase().includes(item.item_name.toLowerCase()) || item.item_name.toLowerCase().includes(prefObj.name.toLowerCase())
        );
        return matchCategory || matchItem;
      });
      return !isBlocked;
    });

    setEditFormData({ ...editFormData, allergy_ids: newAllergies, preference_ids: safePreferences });
  };

  const togglePreference = (id, isDisabled) => {
    if (isDisabled) return;
    let newPrefs = [...editFormData.preference_ids];
    if (newPrefs.includes(id)) newPrefs = newPrefs.filter((p) => p !== id);
    else newPrefs.push(id);
    setEditFormData({ ...editFormData, preference_ids: newPrefs });
  };

  // Handler Khusus Gaji
  const handleSalaryChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setEditFormData({ ...editFormData, parent_salary: formattedValue });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.parent_salary) {
      alert("Pendapatan orang tua tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      // Bersihkan titik sebelum dikirim ke backend
      const cleanSalary = editFormData.parent_salary.replace(/\./g, "");

      const res = await fetch(`http://localhost:3000/api/children/${childData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editFormData,
          parent_salary: parseFloat(cleanSalary)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChildData(data.data); 
        setShowEditModal(false);
      } else alert(data.message);
    } catch (err) {
      alert("Terjadi kesalahan jaringan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#F3EFEA]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2020] border-t-transparent"></div></div>;
  }

  if (!childData) {
    return <div className="flex h-screen items-center justify-center bg-[#F3EFEA] text-xl font-bold text-gray-500">Data anak tidak ditemukan.</div>;
  }

  const latestLog = childData.growth_logs?.[0] || {};
  const age = getAgeDetail(childData.dob);
  const activeMealPlan = childData.meal_plans?.[0] || null;

  const limitBulanan = activeMealPlan ? parseFloat(activeMealPlan.max_budget_limit) : 0;
  const costBulanan = activeMealPlan ? parseFloat(activeMealPlan.actual_total_cost) : 0;
  const hematBulanan = limitBulanan - costBulanan;

  const limitMingguan = limitBulanan / 4;
  const costMingguan = costBulanan / 4;
  const hematMingguan = limitMingguan - costMingguan;

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato'] relative">
      <NavbarDashboard />

      <main className="mx-auto w-full max-w-7xl flex-grow p-4 py-8 md:p-8">
        
        {/* BANNER WELCOME */}
        <div className="mb-8 overflow-hidden rounded-3xl bg-white p-6 shadow-sm md:p-10 relative">
          <div className="relative z-10 w-full md:w-2/3">
            <h1 className="text-3xl font-extrabold text-[#8B2020] md:text-5xl uppercase leading-tight">
              Welcome Back,<br />Mommy!
            </h1>
            <p className="mt-4 text-base text-gray-600 md:text-lg">
              Saat ini sang buah hati, <span className="font-bold text-[#8B2020]">{childData.name}</span> berusia <span className="font-bold">{age.months} Bulan {age.days} Hari</span>. 
              Status gizi global saat ini adalah <span className="rounded-md bg-yellow-100 px-2 py-1 font-bold text-yellow-700">{latestLog.global_status || "Belum ada data"}</span>.
            </p>
          </div>
        </div>

        {/* GRID UTAMA DASHBOARD */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">Metrik Pertumbuhan Terkini</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-blue-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-blue-500">Berat Badan</p>
                  <p className="text-2xl font-extrabold text-gray-800">{latestLog.berat || "-"} <span className="text-sm">kg</span></p>
                </div>
                <div className="rounded-xl bg-green-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase text-green-500">Tinggi Badan</p>
                  <p className="text-2xl font-extrabold text-gray-800">{latestLog.tinggi || "-"} <span className="text-sm">cm</span></p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="rounded-xl bg-gray-50 p-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500">Berat / Umur (WFA):</span>
                  <span className="font-bold text-gray-800">{latestLog.status_wfa || "-"}</span>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500">Tinggi / Umur (HFA):</span>
                  <span className="font-bold text-gray-800">{latestLog.status_hfa || "-"}</span>
                </div>
                <div className="rounded-xl bg-red-50 p-3 flex justify-between items-center text-sm border border-red-100">
                  <span className="font-medium text-red-700">Berat / Tinggi (WFH):</span>
                  <span className="font-bold text-[#8B2020]">{latestLog.status_wfh || "-"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-lg font-bold text-gray-800 border-b pb-2">Estimasi Anggaran Belanja MPASI</h2>
              {activeMealPlan ? (
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase">Mingguan</p>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Batas Maksimal:</span>
                      <span className="font-semibold text-gray-700">Rp {Math.round(limitMingguan).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Biaya Riil AI:</span>
                      <span className="font-bold text-blue-600">Rp {Math.round(costMingguan).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1 bg-green-50 p-1 rounded text-green-700 font-bold">
                      <span>Hemat Belanja:</span>
                      <span>Rp {Math.round(hematMingguan).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Bulanan</p>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Batas Maksimal:</span>
                      <span className="font-semibold text-gray-700">Rp {Math.round(limitBulanan).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Biaya Riil AI:</span>
                      <span className="font-bold text-blue-600">Rp {Math.round(costBulanan).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1 bg-green-100 p-1 rounded text-green-800 font-bold">
                      <span>Hemat Belanja:</span>
                      <span>Rp {Math.round(hematBulanan).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Belum memiliki perencanaan makan aktif.</p>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col items-center">
              <h2 className="mb-4 text-lg font-bold text-[#8B2020] uppercase">Allergy Alert</h2>
              <div className="w-full rounded-2xl border-2 border-red-200 bg-white p-4 shadow-inner mb-4">
                {childData.allergies?.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {childData.allergies.map(a => (
                      <span key={a.allergy_category.id} className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
                        {a.allergy_category.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-400">Tidak ada alergi terdaftar</p>
                )}
              </div>

              <div className="w-full mt-2 mb-6 text-center">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Makanan Favorit:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                   {childData.preferences?.length > 0 ? (
                    childData.preferences.map(p => (
                      <span key={p.ingredient.id} className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {p.ingredient.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">Belum ada preferensi</p>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setShowEditModal(true)} 
                className="rounded-full bg-red-50 px-6 py-2.5 text-sm font-bold text-[#8B2020] transition-colors hover:bg-red-100"
              >
                Kelola Alergi & Sensitivitas
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-2">
            
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col items-center min-h-[350px]">
              <h2 className="text-2xl font-bold text-[#8B2020] mb-6 mt-4">Rekomendasi Menu Hari ini</h2>
              {activeMealPlan ? (
                <div className="w-full text-center">
                  <p className="text-gray-500">Perencanaan MPASI bulanan berhasil disinkronisasi.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-grow text-center opacity-60">
                  <img src="https://www.svgrepo.com/show/440537/food.svg" alt="Empty Food" className="w-24 h-24 mb-4 grayscale" />
                  <p className="text-lg font-bold text-gray-500">Anda belum membuat perencanaan MPASI</p>
                  <p className="text-sm text-gray-400 mt-2 max-w-sm">Daftar makanan harian akan otomatis tertata setelah Anda membuat perencanaan gizi.</p>
                </div>
              )}
            </div>

            {activeMealPlan && (
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 text-left">
                <h3 className="font-bold text-lg text-black mb-3">Catatan dari NutriBot:</h3>
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 italic border border-gray-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                  "{activeMealPlan.ai_insight_text}"
                </div>
              </div>
            )}

            <div className="rounded-3xl bg-red-50 p-6 shadow-sm border border-red-100 text-center">
              <h3 className="font-bold text-[#8B2020] mb-2 uppercase text-sm">Tips Nutrisi Hari Ini</h3>
              {isInsightLoading ? (
                <div className="flex justify-center items-center py-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#8B2020] border-t-transparent"></div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 italic">
                  "{dailyInsight || "Tambahkan sedikit minyak zaitun atau margarin pada bubur si kecil untuk memberikan tambahan lemak sehat yang esensial untuk perkembangan otaknya."}"
                </p>
              )}
            </div>

          </div>
        </div>
      </main>

      <FooterDashboard />

      {showEditModal && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity" 
          onClick={() => { setOpenDropdown(null); setShowEditModal(false); }}
        >
          {/* Modal Container */}
          <div className="w-full max-w-[450px] rounded-[2rem] bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-[#8B2020] mb-2">Edit Data Anak</h2>
            <p className="text-sm text-gray-500 mb-6">Ubah riwayat alergi, makanan, dan pendapatan.</p>
            
            <div className="flex flex-col gap-5">
              
              {/* Dropdown Alergi */}
              <div className="flex flex-col relative">
                <label className="mb-1 text-sm font-bold text-gray-700">Alergi (Bisa pilih lebih dari satu)</label>
                <div
                  className="rounded-lg border border-gray-300 bg-white p-2.5 outline-none cursor-pointer flex justify-between items-center hover:border-gray-400 transition-colors"
                  onClick={() => setOpenDropdown(openDropdown === 'allergy' ? null : 'allergy')}
                >
                  <span className="truncate text-gray-700 text-sm">
                    {editFormData.allergy_ids.length > 0
                      ? editFormData.allergy_ids.map(id => {
                          const item = masterAllergies.find(a => a.id == id); // Loose equality ==
                          return item ? formatLabel(item.name) : "ID Tidak Ditemukan";
                        }).join(', ')
                      : "Pilih alergi..."}
                  </span>
                  <span className="text-gray-500 text-xs">{openDropdown === 'allergy' ? '▲' : '▼'}</span>
                </div>

                {openDropdown === 'allergy' && (
                  <div className="absolute top-full left-0 right-0 z-[50] w-full max-h-48 overflow-y-auto bg-white rounded-xl mt-1 p-2 shadow-xl border border-gray-100">
                    {masterAllergies.length === 0 ? (
                      <p className="p-3 text-sm text-center text-red-500">Data Master Alergi kosong dari Database!</p>
                    ) : (
                      masterAllergies.map(a => (
                        <label key={a.id} className="flex items-center gap-3 p-2.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={editFormData.allergy_ids.includes(a.id)}
                            onChange={() => toggleAllergy(a.id)}
                            className="w-4 h-4 accent-[#8B2020]"
                          />
                          <span className="text-sm font-medium text-gray-700">{formatLabel(a.name)}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Dropdown Makanan Kesukaan */}
              <div className="flex flex-col relative">
                <label className="mb-1 text-sm font-bold text-gray-700">Makanan favorit (Pilih lebih dari satu)</label>
                <div
                  className="rounded-lg border border-gray-300 bg-white p-2.5 outline-none cursor-pointer flex justify-between items-center hover:border-gray-400 transition-colors"
                  onClick={() => setOpenDropdown(openDropdown === 'preference' ? null : 'preference')}
                >
                  <span className="truncate text-gray-700 text-sm">
                    {editFormData.preference_ids.length > 0
                      ? editFormData.preference_ids.map(id => {
                          const item = masterIngredients.find(i => i.id == id); // Loose equality ==
                          return item ? formatLabel(item.name) : "ID Tidak Ditemukan";
                        }).join(', ')
                      : "Pilih makanan favorit..."}
                  </span>
                  <span className="text-gray-500 text-xs">{openDropdown === 'preference' ? '▲' : '▼'}</span>
                </div>

                {openDropdown === 'preference' && (
                  <div className="absolute top-full left-0 right-0 z-[50] w-full max-h-48 overflow-y-auto bg-white rounded-xl mt-1 p-2 shadow-xl border border-gray-100">
                    {masterIngredients.length === 0 ? (
                      <p className="p-3 text-sm text-center text-red-500">Data Master Makanan kosong dari Database!</p>
                    ) : (
                      masterIngredients.map(i => {
                        const selectedCategories = masterAllergies.filter(a => editFormData.allergy_ids.includes(a.id));
                        const isDisabled = selectedCategories.some(cat => {
                          const matchCategory = i.name.toLowerCase().includes(cat.name.toLowerCase());
                          const matchItem = cat.items && cat.items.some(item => 
                            i.name.toLowerCase().includes(item.item_name.toLowerCase()) || item.item_name.toLowerCase().includes(i.name.toLowerCase())
                          );
                          return matchCategory || matchItem;
                        });

                        return (
                          <label 
                            key={i.id} 
                            className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${isDisabled ? 'bg-red-50 opacity-60 cursor-not-allowed' : 'hover:bg-green-50 cursor-pointer'}`}
                          >
                            <input
                              type="checkbox"
                              checked={editFormData.preference_ids.includes(i.id)}
                              onChange={() => togglePreference(i.id, isDisabled)}
                              disabled={isDisabled}
                              className={`w-4 h-4 ${isDisabled ? 'accent-gray-400' : 'accent-green-600'}`}
                            />
                            <span className={`text-sm font-medium flex-1 ${isDisabled ? 'text-red-700 line-through' : 'text-gray-700'}`}>
                              {formatLabel(i.name)}
                            </span>
                            {isDisabled && <span className="text-[10px] text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full">Alergi</span>}
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Input Update Gaji Baru */}
              <div className="flex flex-col relative" onClick={() => setOpenDropdown(null)}>
                <label className="mb-1 text-sm font-bold text-gray-700">Pendapatan Orang Tua per Bulan (Rp)</label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  name="parent_salary" 
                  placeholder="Contoh: 5.000.000" 
                  value={editFormData.parent_salary} 
                  onChange={handleSalaryChange} 
                  className="rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none focus:border-[#8B2020] transition-colors" 
                />
              </div>

            </div>

            <div className="mt-8 flex justify-end gap-3" onClick={() => setOpenDropdown(null)}>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="rounded-full px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                disabled={isSaving}
              >
                Batal
              </button>
              <button 
                onClick={handleSaveEdit} 
                className="rounded-full bg-[#8B2020] px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-red-800 transition-colors disabled:opacity-70 flex items-center justify-center min-w-[150px]"
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}