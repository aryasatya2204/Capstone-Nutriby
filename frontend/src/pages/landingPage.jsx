import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // <--- PERBAIKAN IMPORT
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import heroImage from "../assets/header_fotoIbuAnak.jpeg";
import AuthModal from "./authentication/authModal";
import LoginForm from "./authentication/loginForm";
import RegisterStep1 from "./authentication/registerStep1";
import ChildRegistration from "./ChildRegistration";

// ... (Import gambar fitur & steps tetap sama) ...
import fitur1Img from "../assets/landingPage/fitur1Img.jpeg";
import fitur2Img from "../assets/landingPage/fitur2Img.jpeg";
import fitur3Img from "../assets/landingPage/fitur3Img.jpeg";
import fitur4Img from "../assets/landingPage/fitur4Img.jpeg";
import step1Img from "../assets/landingPage/step1Img.jpeg";
import step2Img from "../assets/landingPage/step2Img.jpeg";
import step3Img from "../assets/landingPage/step3Img.jpeg";
import step4Img from "../assets/landingPage/step4Img.jpeg";
import fotoKeluarga from "../assets/landingPage/fotoKeluarga.png";

const tantanganData = [
  {
    title: "Bingung menentukan menu MPASI?",
    desc: "Variasi makanan harian terasa terbatas dan berulang",
  },
  {
    title: "Khawatir nutrisi anak tidak terpenuhi?",
    desc: "Sulit memastikan kebutuhan gizi sesuai usia",
  },
  {
    title: "Tidak yakin dengan pertumbuhan anak?",
    desc: "Perkembangan anak sulit dipantau secara tepat",
  },
  {
    title: "Bingung menyesuaikan dengan budget keluarga?",
    desc: "Variasi makanan yang sesuai dengan kondisi ekonomi keluarga",
  },
];

const steps = [
  { img: step1Img, label: "Buat akun & profil anak", alt: "Buat akun" },
  { img: step2Img, label: "Pantau pertumbuhan anak", alt: "Pantau" },
  { img: step3Img, label: "Dapatkan rekomendasi MPASI", alt: "Rekomendasi" },
  { img: step4Img, label: "Konsultasi via NutriBot", alt: "NutriBot" },
];

const fiturData = [
  {
    img: fitur1Img,
    title: "Smart Growth Maker",
    desc: "Pantau perkembangan anak dengan mudah",
  },
  {
    img: fitur2Img,
    title: "Rekomendasi MPASI Mingguan",
    desc: "Menu terstruktur sesuai kebutuhan",
  },
  {
    img: fitur3Img,
    title: "Rekomendasi per Menu",
    desc: "Pilihan menu sehat & variatif",
  },
  { img: fitur4Img, title: "NutriBot", desc: "Konsultasi nutrisi kapan saja" },
];

function LandingPage() {
  const [modal, setModal] = useState(null);
  const location = useLocation(); // <--- PERBAIKAN: Menangkap trigger dari ProtectedRoute
  const [guardError, setGuardError] = useState("");

  // === PERBAIKAN: Efek penangkap tolakan dari Dashboard ===
  useEffect(() => {
    if (location.state?.fromGuard) {
      setTimeout(() => {
        setGuardError(location.state.message);
        setModal("childReg"); // Buka paksa modal anak
      }, 0);
      window.history.replaceState({}, document.title); // Bersihkan URL agar tidak looping
    }
  }, [location]);

  const closeModal = () => setModal(null);

  return (
    <div className="min-h-screen bg-[#F3EFEA] font-['Lato']">
      <Navbar onLoginClick={() => setModal("auth")} />

      {/* ── HERO SECTION ── */}
      <section className="mx-auto mt-5 max-w-6xl px-4 md:px-6">
        <div
          className="relative flex min-h-[340px] items-center overflow-hidden rounded-[1.5rem] bg-cover bg-top px-6 shadow-sm md:min-h-[420px] md:rounded-[2rem] md:px-16"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(243,239,234,0.95) 50%, rgba(243,239,234,0) 80%), url(${heroImage})`,
          }}
        >
          <div className="max-w-[320px] md:max-w-[420px]">
            <h1 className="mb-3 text-[24px] font-bold leading-[1.2] text-[#8B1E1E] md:mb-4 md:text-[32px]">
              Solusi Cerdas MPASI untuk Tumbuh Kembang Optimal
            </h1>
            <p className="mb-6 text-[13px] leading-relaxed text-[#8B1E1E] md:mb-8 md:text-[14px]">
              Temani setiap langkah tumbuh kembang anak dengan rekomendasi MPASI
              yang tepat.
            </p>
            <button
              className="rounded-full bg-[#8B1E1E] px-7 py-2.5 text-[13px] font-bold text-white transition-transform hover:scale-105 active:scale-95 md:px-8 md:py-3 md:text-[14.5px]"
              onClick={() => setModal("auth")}
            >
              Mulai Sekarang
            </button>
          </div>
        </div>
      </section>

      {/* ── TANTANGAN SECTION ── */}
      <section className="mt-12 md:mt-16">
        <h2 className="mb-6 px-4 text-center text-[16px] font-bold text-[#8B1E1E] md:mb-8 md:px-6 md:text-[18px]">
          Tantangan yang sering dihadapi orang tua
        </h2>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:hidden">
          <div className="w-2 shrink-0" aria-hidden="true" />
          {tantanganData.map((item, i) => (
            <div
              key={i}
              className="flex w-[230px] shrink-0 snap-center flex-col justify-start rounded-2xl bg-[#8B1E1E] p-5 shadow-lg"
            >
              <h3 className="mb-2 text-[13.5px] font-bold text-white">
                {item.title}
              </h3>
              <p className="text-[12px] text-white/90">{item.desc}</p>
            </div>
          ))}
          <div className="w-2 shrink-0" aria-hidden="true" />
        </div>
        <div className="hidden md:flex md:flex-wrap md:justify-center md:gap-5 md:px-6 md:pb-5">
          {tantanganData.map((item, i) => (
            <div
              key={i}
              className="flex w-[260px] flex-col justify-start rounded-2xl bg-[#8B1E1E] p-6 shadow-lg"
            >
              <h3 className="mb-3 text-[14.5px] font-bold text-white">
                {item.title}
              </h3>
              <p className="text-[12.5px] text-white/90">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CARA KERJA (STEPS) SECTION ── */}
      <section className="mx-auto mt-10 max-w-5xl px-4 md:mt-12 md:px-6">
        <h2 className="mb-1 text-center text-[18px] font-bold text-[#8B1E1E] md:text-[22px]">
          Temani Tumbuh Kembang Anak Anda, Dimulai dari Sini
        </h2>
        <p className="mb-10 text-center text-[13px] italic text-[#8B1E1E]/80 md:mb-14 md:text-[15px]">
          Nutriby dirancang agar mudah digunakan oleh setiap orang tua
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-x-4">
          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center">
              <div className="absolute -left-1 top-0 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[#8B1E1E] text-[11px] font-bold text-[#8B1E1E] md:h-6 md:w-6 md:text-[12px]">
                {i + 1}
              </div>
              <img
                src={step.img}
                alt={step.alt}
                className="h-[100px] w-auto object-contain md:h-[120px]"
              />
              <p className="mt-3 border-b-[1.5px] border-[#8B1E1E] pb-1 text-center text-[12px] font-bold text-[#8B1E1E] md:mt-4 md:text-[13px]">
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FITUR SECTION ── */}
      <section className="mx-auto mt-16 max-w-[700px] px-4 md:mt-20 md:px-6">
        <h2 className="mb-6 text-center text-[16px] font-bold text-[#8B1E1E] md:mb-8 md:text-[18px]">
          Nutriby hadir untuk membantu Anda
        </h2>
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {fiturData.map((fitur, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-sm md:p-8"
            >
              <img
                src={fitur.img}
                alt={fitur.title}
                className="mb-3 h-20 w-auto object-contain md:mb-4 md:h-24"
              />
              <h3 className="mb-1 text-[13px] font-bold text-[#8B1E1E] md:text-[15px]">
                {fitur.title}
              </h3>
              <p className="text-[11.5px] text-[#8B1E1E]/80 md:text-[13px]">
                {fitur.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section className="mx-auto mt-16 max-w-4xl px-4 md:mt-24 md:px-6">
        <h2 className="mb-8 text-center text-[16px] font-bold text-[#8B1E1E] md:mb-10 md:text-[18px]">
          Solusi Cerdas untuk Nutrisi dan Tumbuh Kembang Anak
        </h2>
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-16">
          <div className="w-full max-w-[340px] rounded-2xl bg-[#8B1E1E] p-6 text-center shadow-xl md:p-8 md:text-left">
            <p className="text-[13.5px] leading-[1.7] text-white md:text-[14.5px]">
              Nutriby adalah platform berbasis teknologi yang membantu orang tua
              dalam menyediakan MPASI yang sesuai dengan kebutuhan nutrisi anak
              serta memantau tumbuh kembangnya secara optimal.
            </p>
          </div>
          <div className="flex h-[160px] w-[160px] items-center justify-center rounded-xl bg-gray-200/50 md:h-[200px] md:w-[200px]">
            <img
              src={fotoKeluarga}
              alt="Animasi keluarga"
              className="mb-3 h-20 w-auto object-contain md:mb-4 md:h-24"
            />
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ── */}
      <section className="mt-16 px-4 text-center pb-32 md:mt-24 md:px-6">
        <h2 className="mx-auto mb-3 max-w-[600px] text-[22px] font-bold leading-snug text-[#8B1E1E] md:mb-4 md:text-[28px]">
          Mulai Langkah Terbaik untuk Tumbuh Kembang Anak Anda
        </h2>
        <p className="mb-6 text-[14px] italic text-[#8B1E1E]/80 md:mb-8 md:text-[16px]">
          Karena Setiap Anak Berhak Tumbuh dengan Optimal
        </p>
        <button
          className="rounded-full bg-[#8B1E1E] px-9 py-3 text-[14px] font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95 md:px-10 md:py-3.5 md:text-[15px]"
          onClick={() => setModal("auth")}
        >
          Mulai Sekarang
        </button>
      </section>

      <Footer />

      {/* MODALS */}
      {modal === "auth" && (
        <AuthModal
          onClose={closeModal}
          onShowLogin={() => setModal("login")}
          onShowRegister={() => setModal("reg1")}
        />
      )}
      {modal === "login" && (
        <LoginForm
          onClose={closeModal}
          onShowRegister={() => setModal("reg1")}
          onShowAuth={() => setModal("auth")}
        />
      )}

      {/* === PERBAIKAN: Ubah onNext agar mengubah modal ke childReg === */}
      {modal === "reg1" && (
        <RegisterStep1
          onNext={() => setModal("childReg")}
          onClose={closeModal}
          onShowLogin={() => setModal("login")}
        />
      )}

      {/* === PERBAIKAN: Kirimkan guardError ke dalam komponen ChildRegistration === */}
      {modal === "childReg" && (
        <ChildRegistration forcedError={guardError} onClose={closeModal} />
      )}
    </div>
  );
}

export default LandingPage;
