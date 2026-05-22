import { useState, useEffect } from "react";
import Logo from "../assets/logo_nutriby.png";

function Navbar({ onLoginClick }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <nav
      className={`sticky top-0 z-[100] flex items-center justify-between transition-all duration-300 bg-white px-5 md:px-24 ${
        isScrolled ? "py-3 shadow-md" : "py-5 shadow-none"
      }`}
    >
      {/* Logo → scroll ke atas */}
      <div
        className="flex cursor-pointer items-center gap-2"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <img
          src={Logo}
          alt="Logo NutriBy"
          className="h-9 w-9 object-contain"
        />
        <span className="font-['Lato'] text-[20px] font-bold text-[#801A1A]">
          NutriBy
        </span>
      </div>

      {/* Desktop menu */}
      <div className="hidden items-center gap-10 text-[15px] font-semibold text-gray-700 md:flex">
        <button
          onClick={() => scrollTo("fitur")}
          className="transition-colors hover:text-[#801A1A]"
        >
          Fitur
        </button>
        <button
          onClick={() => scrollTo("cara-kerja")}
          className="transition-colors hover:text-[#801A1A]"
        >
          Cara Kerja
        </button>
        <button
          onClick={() => scrollTo("tentang")}
          className="transition-colors hover:text-[#801A1A]"
        >
          Tentang
        </button>
      </div>

      {/* Login/Daftar → AuthModal */}
      <button
        className="rounded-full bg-[#801A1A] px-5 py-2 text-[13px] font-bold text-white transition-all hover:bg-[#6b1515] hover:shadow-lg active:scale-95 md:px-7 md:py-2.5 md:text-[14px]"
        onClick={onLoginClick}
      >
        Masuk/Daftar
      </button>
    </nav>
  );
}

export default Navbar;
