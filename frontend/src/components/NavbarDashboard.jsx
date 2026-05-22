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
    <nav className="sticky top-0 z-50 w-full bg-white px-4 py-4 shadow-sm md:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Kiri: Logo Resmi & Nama */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src={Logo}
            alt="NutriBy Logo"
            className="h-9 w-9 object-contain"
          />
          <span className="text-2xl font-extrabold text-[#8B2020]">
            NutriBy
          </span>
        </Link>

        {/* Kanan: Menu Navigasi & Profil (Tampilan Desktop) */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-bold transition-colors hover:text-[#8B2020] ${
                location.pathname === link.path
                  ? "text-[#8B2020] border-b-2 border-[#8B2020] pb-1"
                  : "text-gray-500"
              }`}
            >
              {link.name.toUpperCase()}
            </Link>
          ))}

          {/* Profile Icon */}
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-[#8B2020] transition-transform hover:scale-105 hover:bg-gray-300"
          >
            {getInitials(user?.name)}
          </Link>
        </div>

        {/* Hamburger Menu Trigger (Tampilan Mobile) */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            to="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-[#8B2020]"
          >
            {getInitials(user?.name)}
          </Link>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-[#8B2020] focus:outline-none"
          >
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
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

      {/* Dropdown Menu Hamburger Mobile */}
      {isMenuOpen && (
        <div className="mt-4 flex flex-col gap-3 border-t pt-3 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsMenuOpen(false)}
              className={`text-sm font-bold p-2 rounded-lg transition-colors ${
                location.pathname === link.path
                  ? "bg-red-50 text-[#8B2020]"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {link.name.toUpperCase()}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
