import { Link } from "react-router-dom";
import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";
import fitur1 from "../assets/landingPage/fitur1Img.jpeg";
import fitur2 from "../assets/landingPage/fitur2Img.jpeg";
import fitur3 from "../assets/landingPage/fitur3Img.jpeg";
import fitur4 from "../assets/landingPage/fitur4Img.jpeg";

export default function Features() {
  const features = [
    {
      id: "weekly-plan",
      title: "Plan Mingguan",
      desc: "Rekomendasi jadwal makan MPASI si Kecil selama satu minggu penuh, diatur cerdas oleh AI.",
      icon: fitur1,
      link: "/features/weekly-plan",
    },
    {
      id: "search-menu",
      title: "Cari Menu",
      desc: "Eksplorasi ratusan resep MPASI sehat yang sudah disaring sesuai umur dan alergi anak Anda.",
      icon: fitur2,
      link: "/features/search-menu",
    },
    {
      id: "nutribot",
      title: "Nutribot",
      desc: "Asisten AI pribadi Anda. Tanyakan apa saja seputar nutrisi dan kesehatan si Kecil kapan pun.",
      icon: fitur3,
      link: "/features/nutribot",
    },
    {
      id: "growth-tracker",
      title: "Smart Growth Tracker",
      desc: "Pantau tumbuh kembang anak Anda dengan grafik interaktif dan analisis Z-Score WHO.",
      icon: fitur4,
      link: "/features/growth-tracker",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato']">
      {/* --- INI BAGIAN YANG BIKIN GERAK DIKIT --- */}
      <style>{`
        @keyframes slideFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-entrance {
          animation: slideFadeUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .stagger-1 { animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation-delay: 0.3s; opacity: 0; }
        .stagger-4 { animation-delay: 0.4s; opacity: 0; }
      `}</style>

      <NavbarDashboard />

      {/* Main container dikasih class entrance biar judulnya gerak duluan */}
      <main className="mx-auto flex w-full max-w-6xl flex-grow flex-col px-6 py-10 animate-entrance">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-[#8B2020] uppercase tracking-wide">
            Yuk Jelajahi Nutriby!
          </h1>
          <p className="mt-3 text-gray-600 text-lg">
            Pilih fitur di bawah ini untuk membantu perjalanan gizi si Kecil.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {features.map((feature, index) => (
            <Link
              key={feature.id}
              to={feature.link}
              // Setiap kartu dikasih class stagger berdasarkan index biar munculnya gantian (smooth)
              className={`group animate-entrance stagger-${index + 1} flex flex-col rounded-3xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 cubic-bezier(0.25, 1, 0.5, 1) hover:-translate-y-1.5 hover:shadow-xl hover:border-red-100 sm:flex-row sm:items-center sm:gap-6`}
            >
              {/* Wadah Icon dengan scale lembut */}
              <div className="mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-red-50 p-4 transition-all duration-300 group-hover:bg-red-100/60 group-hover:scale-[1.03] sm:mb-0">
                <img
                  src={feature.icon}
                  alt={feature.title}
                  className="h-full w-full object-contain opacity-80 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110"
                />
              </div>

              <div className="flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 transition-colors duration-300 group-hover:text-[#8B2020]">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>

                {/* Micro-interaction pada tanda panah */}
                <span className="mt-3 inline-flex items-center font-bold text-[#8B2020] text-sm transition-all duration-300">
                  <span className="relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#8B2020] after:transition-all after:duration-300 group-hover:after:w-full">
                    Mulai Sekarang
                  </span>
                  <span className="ml-1 transform transition-transform duration-300 group-hover:translate-x-1.5">
                    →
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <FooterDashboard />
    </div>
  );
}
