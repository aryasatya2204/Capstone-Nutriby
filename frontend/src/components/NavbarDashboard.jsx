import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";
import Logo from "../assets/logo_nutriby.png";

export default function NavbarDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State hamburger menu

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const navLinks = [
    { name: "Beranda", path: "/dashboard" },
    { name: "Informasi", path: "/information" },
    { name: "Fitur", path: "/features" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white px-4 py-4 shadow-sm backdrop-blur-md bg-white/90 md:px-10 transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Kiri: Logo Resmi & Nama */}
        <Link 
          to="/dashboard" 
          className="group flex items-center gap-2 focus:outline-none"
        >
          <img
            src={Logo}
            alt="NutriBy Logo"
            className="h-9 w-9 object-contain transition-transform duration-500 ease-out group-hover:rotate-[10deg] group-hover:scale-105"
          />
          <span className="text-2xl font-extrabold text-[#8B2020] tracking-tight transition-colors duration-300 group-hover:text-[#a02828]">
            NutriBy
          </span>
        </Link>

        {/* Kanan: Menu Navigasi & Profil (Tampilan Desktop) */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`relative text-sm font-bold tracking-wider py-1 transition-colors duration-300 ease-out focus:outline-none ${
                  isActive ? "text-[#8B2020]" : "text-gray-500 hover:text-[#8B2020]"
                }`}
              >
                {link.name.toUpperCase()}
                {/* Efek Garis Bawah yang Meluncur Halus */}
                <span 
                  className={`absolute bottom-0 left-0 h-[2px] bg-[#8B2020] transition-all duration-300 ease-out ${
                    isActive ? "w-full" : "w-0 hover:w-full"
                  }`} 
                />
              </Link>
            );
          })}

          {/* Profile Icon Desktop */}
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-[#8B2020] shadow-sm ring-2 ring-transparent transition-all duration-300 ease-out hover:scale-110 hover:bg-gray-200 hover:ring-red-100 hover:shadow-md active:scale-95"
          >
            {getInitials(user?.name)}
          </Link>
        </div>

        {/* Hamburger Menu Trigger (Tampilan Mobile) */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Profile Icon Mobile */}
          <Link
            to="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-[#8B2020] shadow-sm transition-transform duration-200 active:scale-95"
          >
            {getInitials(user?.name)}
          </Link>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-[#8B2020] p-1.5 rounded-lg hover:bg-red-50 focus:outline-none transition-colors duration-300"
            aria-label="Toggle Menu"
          >
            <svg 
              className={`h-6 w-6 fill-current transition-transform duration-300 ease-in-out ${isMenuOpen ? "rotate-90" : "rotate-0"}`} 
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M18.278 16.864a1 1 0 01-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 01-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 011.414-1.414l4.828 4.828 4.829-4.828a1 1 0 111.414 1.414l-4.828 4.828 4.828 4.829z"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M4 5h16a1 1 0 010 2H4a1 1 0 110-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2zm0 6h16a1 1 0 010 2H4a1 1 0 010-2z"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown Menu Hamburger Mobile dengan Animasi Membuka Lembut */}
      <div 
        className={`grid transition-all duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "grid-rows-[1fr] opacity-100 mt-4 border-t pt-3" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden flex flex-col gap-1.5">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`text-sm font-bold p-3 rounded-xl transition-all duration-200 ease-out active:scale-[0.99] ${
                  isActive
                    ? "bg-red-50 text-[#8B2020] translate-x-1"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[#8B2020] hover:translate-x-1"
                }`}
              >
                {link.name.toUpperCase()}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}