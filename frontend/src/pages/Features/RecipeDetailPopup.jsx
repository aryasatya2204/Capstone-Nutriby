import { useEffect } from "react";

const formatRupiah = (angka) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

export default function RecipeDetailPopup({ menu, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!menu) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* GAMBAR HERO UTAMA HIDANGAN */}
        <div className="relative h-56 bg-gray-100 w-full flex-shrink-0">
          {menu.image_url ? (
            <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-20 bg-gradient-to-br from-red-50 to-orange-50">🍳</div>
          )}
          
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/80 backdrop-blur text-gray-800 rounded-full flex items-center justify-center font-bold shadow-md hover:bg-white">✕</button>
          
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-4 py-1.5 rounded-full shadow border text-xs font-black text-[#8B2020]">
            Estimasi Hidangan: {formatRupiah(menu.est_price)}
          </div>
        </div>

        {/* HEADER INFORMASI UTAMA */}
        <div className="bg-[#8B2020] p-5 text-white flex-shrink-0">
          <span className="bg-white/20 text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full inline-block mb-1.5">
            Rekomendasi Ahli Gizi AI
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-wide uppercase leading-tight">{menu.name}</h2>
          <p className="text-[11px] opacity-90 italic font-medium mt-0.5">
            Tekstur: {menu.texture || "Saring Lumat"} · Kategori Usia {menu.min_age_months || 6}-{menu.max_age_months || 11} Bulan
          </p>
        </div>
        
        {/* KONTEN RINCIAN DETAIL (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Teks Deskripsi Menu */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
             <p className="text-xs text-gray-600 font-medium leading-relaxed italic">
               "{menu.description || "Menu ini kaya akan kandungan nutrisi esensial alami yang diformulasikan khusus untuk merangsang nafsu makan dan menjaga kekebalan imunitas metabolisme pertumbuhan tubuh balita."}"
             </p>
          </div>

          {/* Grid Informasi Makronutrisi */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 p-3 rounded-2xl text-center border border-red-100">
              <p className="text-[9px] uppercase font-black text-red-500 tracking-wider">Kalori</p>
              <p className="text-base font-black text-gray-800">{menu.calories || "-"}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase">kkal</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl text-center border border-blue-100">
              <p className="text-[9px] uppercase font-black text-blue-500 tracking-wider">Protein</p>
              <p className="text-base font-black text-gray-800">{menu.protein || "-"}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase">gram</p>
            </div>
            <div className="bg-green-50 p-3 rounded-2xl text-center border border-green-100">
              <p className="text-[9px] uppercase font-black text-green-700 tracking-wider">Lemak</p>
              <p className="text-base font-black text-gray-800">{menu.fat || "-"}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase">gram</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Sektor Bahan Baku Komposisi */}
            <div>
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                <span>🥦</span> Bahan Komposisi
              </h3>
              <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 p-4 rounded-xl leading-relaxed whitespace-pre-wrap font-medium h-full">
                {menu.bahan_masakan || "Data bahan komposisi belum tersedia."}
              </div>
            </div>

            {/* Sektor Instruksi Cara Pembuatan */}
            <div>
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                <span>🍳</span> Cara Pengolahan
              </h3>
              <div className="text-xs text-gray-600 bg-[#FFF8F0] border border-orange-100/50 p-4 rounded-xl leading-relaxed whitespace-pre-wrap font-medium h-full">
                {menu.instructions || "Data langkah pembuatan masakan belum ditambahkan."}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Tombol Tutup */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-end flex-shrink-0">
          <button onClick={onClose} className="rounded-full bg-[#8B2020] px-5 py-2 Regal text-xs font-bold text-white shadow-md hover:bg-red-800 transition-colors">
            Kembali ke Jadwal
          </button>
        </div>
      </div>
    </div>
  );
}