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
      <NavbarDashboard />

      <main className="mx-auto flex w-full max-w-6xl flex-grow flex-col px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-[#8B2020] uppercase tracking-wide">
            Layanan NutriBy
          </h1>
          <p className="mt-3 text-gray-600 text-lg">
            Pilih fitur di bawah ini untuk membantu perjalanan gizi si Kecil.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {features.map((feature) => (
            <Link
              key={feature.id}
              to={feature.link}
              className="group flex flex-col rounded-3xl bg-white p-6 shadow-sm border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="mb-4 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-red-50 p-4 transition-colors group-hover:bg-red-100 sm:mb-0">
                <img
                  src={feature.icon}
                  alt={feature.title}
                  className="h-full w-full object-contain opacity-80 group-hover:opacity-100"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 group-hover:text-[#8B2020] transition-colors">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
                <span className="mt-3 inline-block font-bold text-[#8B2020] text-sm group-hover:underline underline-offset-4">
                  Lihat Fitur →
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
