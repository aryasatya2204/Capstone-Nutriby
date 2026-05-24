// Helper hitung umur
const hitungUmur = (birthDate) => {
  if (!birthDate) return "-";
  const birth = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months -= birth.getMonth();
  months += today.getMonth();
  return months > 0 ? `${months} Bulan` : "Baru Lahir";
};

// Helper format tanggal
const formatTanggal = (isoString) => {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Helper format jenis kelamin (p -> Perempuan, l -> Laki-laki)
const formatGender = (gender) => {
  if (!gender) return "-";
  const g = gender.toLowerCase();
  if (g === "l") return "Laki-laki";
  if (g === "p") return "Perempuan";
  return gender; // Fallback jika format tidak sesuai
};

export default function GrowthPDFTemplate({ childData, chartData, latestStatus }) {
  // Gabungkan dan susun data tabel
  const generateTableData = () => {
    let rows = [];
    const { weight_chart = [], height_chart = [] } = chartData || {};

    weight_chart.forEach((item, index) => {
      const prev = weight_chart[index - 1];
      const rate = prev ? (item.value - prev.value).toFixed(1) : 0;
      rows.push({
        date: item.date_label,
        type: "Berat Badan",
        value: `${item.value} kg`,
        rate: rate > 0 ? `+${rate} kg` : `${rate} kg`,
        status: item.status || "-",
      });
    });

    height_chart.forEach((item, index) => {
      const prev = height_chart[index - 1];
      const rate = prev ? (item.value - prev.value).toFixed(1) : 0;
      rows.push({
        date: item.date_label,
        type: "Tinggi Badan",
        value: `${item.value} cm`,
        rate: rate > 0 ? `+${rate} cm` : `${rate} cm`,
        status: item.status || "-",
      });
    });

    // Urutkan berdasarkan tanggal terbaru
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const tableData = generateTableData();

  return (
    <div
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
      }}
    >
      <div
        id="pdf-report-container"
        className="p-10 font-sans"
        style={{ width: "210mm", minHeight: "297mm", backgroundColor: "#ffffff", color: "#1f2937" }}
      >
        {/* HEADER */}
        <div className="border-b-4 border-[#8B2020] pb-6 mb-6">
          <h1 className="text-3xl font-black text-[#8B2020] uppercase tracking-wider">
            Laporan Pertumbuhan Anak
          </h1>
          <p className="mt-1" style={{ color: "#6b7280" }}>Smart Growth Tracker - {formatTanggal(new Date())}</p>
        </div>

        {/* DATA ANAK */}
        <div className="rounded-xl p-5 mb-8 border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
          <h2 className="text-lg font-bold mb-4 border-b pb-2" style={{ color: "#374151" }}>Informasi Profil Anak</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block mb-1" style={{ color: "#6b7280" }}>Nama Lengkap</span>
              <span className="font-bold text-base" style={{ color: "#111827" }}>{childData?.name || "Nama Tidak Tersedia"}</span>
            </div>
            <div>
              <span className="block mb-1" style={{ color: "#6b7280" }}>Umur Saat Ini</span>
              {/* PERBAIKAN 1: Menggunakan childData?.dob */}
              <span className="font-bold text-base" style={{ color: "#111827" }}>{hitungUmur(childData?.dob)}</span>
            </div>
            <div>
              <span className="block mb-1" style={{ color: "#6b7280" }}>Jenis Kelamin</span>
              {/* PERBAIKAN 2: Menggunakan helper formatGender */}
              <span className="font-bold text-base capitalize" style={{ color: "#111827" }}>{formatGender(childData?.gender)}</span>
            </div>
            <div>
              <span className="block mb-1" style={{ color: "#6b7280" }}>Status Gizi Terakhir</span>
              <span className="font-bold text-[#8B2020] px-3 py-1 rounded-full uppercase text-xs" style={{ backgroundColor: "#fef2f2" }}>
                {latestStatus || "Belum Ada Data"}
              </span>
            </div>
          </div>
        </div>

        {/* DATA TABEL PENGUKURAN */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: "#374151" }}>Riwayat Pengukuran</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#8B2020] text-white text-sm">
                <th className="p-3 font-bold rounded-tl-lg">Tanggal Diukur</th>
                <th className="p-3 font-bold">Jenis</th>
                <th className="p-3 font-bold">Ukuran</th>
                <th className="p-3 font-bold">Laju Pertumbuhan</th>
                <th className="p-3 font-bold rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tableData.length > 0 ? (
                tableData.map((row, i) => (
                  <tr key={i} className="border-b" style={{ backgroundColor: "#ffffff", borderColor: "#f3f4f6" }}>
                    <td className="p-3" style={{ color: "#4b5563" }}>{formatTanggal(row.date)}</td>
                    <td className="p-3 font-medium" style={{ color: "#1f2937" }}>{row.type}</td>
                    <td className="p-3 font-bold" style={{ color: "#111827" }}>{row.value}</td>
                    <td className="p-3 font-bold" style={{ color: row.rate.includes('+') ? '#16a34a' : '#6b7280' }}>
                      {row.rate}
                    </td>
                    <td className="p-3" style={{ color: "#1f2937" }}>{row.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-5" style={{ color: "#9ca3af" }}>Belum ada data pengukuran.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GRAFIK PENGUKURAN */}
        <div className="mb-8" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: "#374151" }}>Ringkasan Grafik</h2>
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
              <p className="text-sm font-bold mb-2" style={{ color: "#4b5563" }}>Tren Berat Badan</p>
              {chartData?.weight_chart?.length > 0 ? (
                <div className="text-2xl font-black text-[#8B2020]">
                  {chartData.weight_chart.slice(-1)[0].value} <span className="text-sm">kg (Terbaru)</span>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#9ca3af" }}>Tidak ada data</p>
              )}
            </div>
            <div className="flex-1 p-4 rounded-xl border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
              <p className="text-sm font-bold mb-2" style={{ color: "#4b5563" }}>Tren Tinggi Badan</p>
              {chartData?.height_chart?.length > 0 ? (
                <div className="text-2xl font-black text-[#8B2020]">
                  {chartData.height_chart.slice(-1)[0].value} <span className="text-sm">cm (Terbaru)</span>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#9ca3af" }}>Tidak ada data</p>
              )}
            </div>
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: "#9ca3af" }}>
            *Laporan ini di-generate secara otomatis oleh Smart Growth Tracker System.
          </p>
        </div>
      </div>
    </div>
  );
}