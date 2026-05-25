import { useState, useEffect } from "react";
import doctorImg from "../assets/doctorImg.png";
import logoImg from "../assets/logoFooter.png";

function Footer({ onLoginClick }) {
  const [isScrolled, setIsScrolled] = useState(false);

  // deteksi scroll efek navbar
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // scroll smooth ke id section
  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const offsetPosition =
        element.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative w-full">
      {/* elips cembung ke atas */}
      <div className="w-full overflow-hidden leading-[0]">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="block w-full h-[80px] md:h-[120px]"
        >
          <path d="M0,120 Q600,0 1200,120 L1200,120 L0,120 Z" fill="#8B1E1E" />
        </svg>
      </div>

      {/* badan footer */}
      <div className="bg-[#8B1E1E] pb-10">
        <div className="relative mx-auto max-w-[1200px] px-6 md:px-14">
          {/* logo dan nama */}
          <div className="flex flex-col items-center pt-2 pb-8">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <img
                  src={logoImg}
                  alt="logo NutriBy"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <span className="font-['Lato'] text-[32px] font-bold text-white">
                NutriBy
              </span>
            </div>
          </div>

          {/* konten tengah */}
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-end md:justify-between">
            {/* sisi kiri desktop */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-end gap-3">
                {/* bubble text */}
                <div className="relative mb-6 max-w-[200px] rounded-[24px] border-2 border-gray-200 bg-white px-5 py-3 text-[12px] font-bold leading-snug text-[#8B1E1E] shadow-md md:text-[13px]">
                  Pantau tumbuh kembang anak. <br /> Ayo daftar sekarang!
                  <div
                    className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-0 h-0"
                    style={{
                      borderTop: "8px solid transparent",
                      borderBottom: "8px solid transparent",
                      borderLeft: "10px solid white",
                    }}
                  />
                </div>

                <img
                  src={doctorImg}
                  alt="dokter"
                  className="h-[150px] object-contain drop-shadow-xl md:h-[180px] flex-shrink-0"
                />
              </div>

              {/* email desktop */}
              <a
                href="mailto:nutribyadmin@gmail.com"
                className="hidden md:block text-[12px] text-white/80 hover:text-white transition-colors pl-2"
                aria-label="Email support"
              >
                ✉ nutribyadmin@gmail.com
              </a>
            </div>

            {/* sisi kanan links */}
            <div className="flex flex-col items-center gap-6">
              <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-center text-[14px] font-bold text-white md:text-[15px] pb-4">
                <a
                  href="#tentang"
                  className="hover:underline opacity-90 transition-opacity hover:opacity-100"
                >
                  Tentang
                </a>
                <a
                  href="#fitur"
                  className="hover:underline opacity-90 transition-opacity hover:opacity-100"
                >
                  Fitur
                </a>
                <a
                  href="#cara-kerja"
                  className="hover:underline opacity-90 transition-opacity hover:opacity-100"
                >
                  Cara Kerja
                </a>
                <button
                  onClick={onLoginClick}
                  className="text-center font-bold text-white hover:underline opacity-90 transition-opacity hover:opacity-100"
                >
                  Beranda
                </button>
              </div>

              {/* email mobile */}
              <a
                href="mailto:nutribyadmin@gmail.com"
                className="block md:hidden text-[12px] text-white/80 hover:text-white transition-colors"
                aria-label="Email support"
              >
                ✉ nutribyadmin@gmail.com
              </a>
            </div>
          </div>

          {/* copyright */}
          <div className="mt-10 border-t border-white/10 pt-5 flex flex-col items-center gap-2">
            <p className="text-[12px] text-white/80 md:text-[13px]">
              © 2026 Nutriby. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
