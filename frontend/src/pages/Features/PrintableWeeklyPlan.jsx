import { forwardRef } from "react";

const formatRupiah = (angka) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

const PrintableWeeklyPlan = forwardRef(({ childData, weeklyMenu, totalMingguan, dynamicDays }, ref) => {
  return (
    <div 
      ref={ref} 
      style={{
        width: "800px",
        fontFamily: "Arial, sans-serif",
        color: "#1f2937",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ======================================= */}
      {/* HALAMAN 1: HEADER, PROFIL & MATRIKS     */}
      {/* ======================================= */}
      <div className="pdf-page" style={{ padding: "40px", boxSizing: "border-box", backgroundColor: "#ffffff", minHeight: "1120px" }}>
        
        {/* Header Banner */}
        <div style={{
          padding: "32px",
          textAlign: "center",
          marginBottom: "32px",
          backgroundColor: "#8B2020",
          color: "#ffffff",
          borderRadius: "16px"
        }}>
          <h1 style={{ fontSize: "24px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px 0" }}>
            Jadwal & Buku Panduan Resep MPASI
          </h1>
          <p style={{ fontSize: "14px", fontStyle: "italic", opacity: 0.9, margin: 0 }}>
            Dipersonalisasi Secara Medis & Finansial Oleh Sistem Kecerdasan Buatan NutriBot
          </p>
        </div>
        
        {/* Ringkasan Profil Klinis & Budget Aktual AI */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
          <div style={{
            flex: 1,
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #ffedd5",
            backgroundColor: "#fff7ed"
          }}>
            <p style={{ fontWeight: "800", fontSize: "14px", color: "#8B2020", borderBottom: "1px solid #ffedd5", paddingBottom: "8px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Profil Buah Hati
            </p>
            <p style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 4px 0" }}>
              Nama Anak: <span style={{ fontWeight: "bold", color: "#111827" }}>{childData?.name || "-"}</span>
            </p>
            <p style={{ fontSize: "14px", fontWeight: "500", margin: 0 }}>
              Status Gizi Global: <span style={{ fontWeight: "bold", color: "#111827" }}>{childData?.growth_logs?.[0]?.global_status || "Normal"}</span>
            </p>
          </div>

          <div style={{
            flex: 1,
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #dcfce7",
            backgroundColor: "#f0fdf4"
          }}>
            <p style={{ fontWeight: "800", fontSize: "14px", color: "#166534", borderBottom: "1px solid #dcfce7", paddingBottom: "8px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Alokasi Anggaran Belanja ML
            </p>
            <p style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 4px 0" }}>
              Total Biaya Eksekusi (7 Hari): <span style={{ fontWeight: "bold", color: "#15803d", fontSize: "16px" }}>{formatRupiah(totalMingguan)}</span>
            </p>
            <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "500", margin: 0 }}>
              Anggaran di atas dihitung murni berdasarkan optimalisasi harga aktual AI.
            </p>
          </div>
        </div>
        
        {/* BAGIAN 1: Matriks Jadwal Mingguan */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#8B2020", paddingLeft: "12px", marginBottom: "16px", borderLeft: "4px solid #8B2020", textTransform: "uppercase", letterSpacing: "1px" }}>
            Matriks Jadwal 7 Hari
          </h2>
          
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse", textAlign: "left", borderRadius: "12px", overflow: "hidden" }}>
            <thead>
              <tr style={{ backgroundColor: "#8B2020", color: "#ffffff" }}>
                <th style={{ padding: "12px", fontWeight: "bold", border: "1px solid #7f1d1d" }}>Hari</th>
                <th style={{ padding: "12px", fontWeight: "bold", border: "1px solid #7f1d1d" }}>Pagi (08:00)</th>
                <th style={{ padding: "12px", fontWeight: "bold", border: "1px solid #7f1d1d" }}>Siang (12:00)</th>
                <th style={{ padding: "12px", fontWeight: "bold", border: "1px solid #7f1d1d" }}>Malam (19:00)</th>
              </tr>
            </thead>
            <tbody>
              {dynamicDays && dynamicDays.map((hari, i) => (
                <tr key={hari} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                  <td style={{ padding: "12px", fontWeight: "800", border: "1px solid #e5e7eb", color: "#374151" }}>{hari}</td>
                  {["pagi", "siang", "malam"].map(waktu => {
                    const menu = weeklyMenu[i]?.[waktu];
                    return (
                      <td key={waktu} style={{ padding: "12px", border: "1px solid #e5e7eb" }}>
                        <p style={{ fontWeight: "bold", color: "#111827", margin: "0 0 4px 0", lineHeight: "1.2" }}>{menu?.name || "-"}</p>
                        <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                          {menu?.calories ? `${Math.round(menu.calories)} kkal` : "-"} · {menu?.est_price ? formatRupiah(menu.est_price) : "-"}
                        </p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================= */}
      {/* HALAMAN 2 DST: 1 HALAMAN UNTUK 1 HARI   */}
      {/* ======================================= */}
      {dynamicDays && dynamicDays.map((hari, dayIdx) => (
        <div key={`details-${hari}`} className="pdf-page" style={{ padding: "40px", boxSizing: "border-box", backgroundColor: "#ffffff", minHeight: "1120px" }}>
          
          <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#8B2020", paddingLeft: "12px", marginBottom: "24px", borderLeft: "4px solid #8B2020", textTransform: "uppercase", letterSpacing: "1px" }}>
            Detail Resep & Panduan Masak
          </h2>
          
          <div style={{ border: "1px solid #f3f4f6", borderRadius: "16px", padding: "24px", backgroundColor: "#ffffff" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#ffffff", backgroundColor: "#1f2937", padding: "8px 16px", borderRadius: "12px", marginBottom: "24px", letterSpacing: "1px", textTransform: "uppercase", display: "inline-block" }}>
              Menu Hari {hari}
            </h3>
            
            {["pagi", "siang", "malam"].map(waktu => {
              const menu = weeklyMenu[dayIdx]?.[waktu];
              if (!menu) return null;
              
              return (
                <div key={`${hari}-${waktu}`} style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: waktu !== "malam" ? "1px solid #f3f4f6" : "none" }}>
                  
                  {/* Header Menu Item */}
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ width: "80px", height: "80px", backgroundColor: "#f9fafb", borderRadius: "12px", border: "1px solid #f3f4f6", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                      {menu.image_url ? (
                        <img src={menu.image_url} alt={menu.name} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : "🍳"}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <span style={{ display: "inline-block", backgroundColor: "#fef2f2", color: "#8B2020", fontSize: "10px", fontWeight: "800", padding: "2px 10px", borderRadius: "9999px", textTransform: "uppercase", marginBottom: "4px" }}>
                        Sesi {waktu}
                      </span>
                      <h4 style={{ fontSize: "16px", fontWeight: "bold", color: "#111827", margin: "0 0 2px 0", lineHeight: "1.2" }}>{menu.name}</h4>
                      <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "600", margin: 0 }}>
                        Estimasi Biaya: <span style={{ color: "#8B2020", fontWeight: "bold" }}>{formatRupiah(menu.est_price)}</span> · Energi: {Math.round(menu.calories)} kkal
                      </p>
                    </div>
                  </div>

                  {/* Isi Detil */}
                  <div style={{ fontSize: "12px", paddingLeft: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Deskripsi */}
                    <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "12px", border: "1px solid #f3f4f6" }}>
                      <p style={{ fontWeight: "800", color: "#374151", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0", fontSize: "10px" }}>📖 Deskripsi Menu & Gizi:</p>
                      <p style={{ color: "#4b5563", lineHeight: "1.6", fontWeight: "500", fontStyle: "italic", margin: 0 }}>"{menu.description || "Tidak ada deskripsi tersedia."}"</p>
                    </div>
                    
                    <div style={{ display: "flex", gap: "12px" }}>
                      {/* Bahan */}
                      <div style={{ flex: 1, backgroundColor: "#fff7ed", padding: "12px", borderRadius: "12px", border: "1px solid #ffedd5" }}>
                        <p style={{ fontWeight: "800", color: "#9a3412", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0", fontSize: "10px" }}>🥦 Bahan-Bahan Masakan:</p>
                        <p style={{ color: "#374151", fontWeight: "500", whiteSpace: "pre-wrap", lineHeight: "1.6", margin: 0 }}>{menu.bahan_masakan || "-"}</p>
                      </div>
                      
                      {/* Instruksi */}
                      <div style={{ flex: 1, backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px", border: "1px solid #dbeafe" }}>
                        <p style={{ fontWeight: "800", color: "#1e40af", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0", fontSize: "10px" }}>👩‍🍳 Langkah & Cara Memasak:</p>
                        <p style={{ color: "#374151", fontWeight: "500", whiteSpace: "pre-wrap", lineHeight: "1.6", margin: 0 }}>{menu.instructions || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

PrintableWeeklyPlan.displayName = "PrintableWeeklyPlan";
export default PrintableWeeklyPlan;