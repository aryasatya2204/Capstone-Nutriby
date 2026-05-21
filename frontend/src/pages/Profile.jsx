import { useState } from "react";
import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";
import ChildRegistration from "./ChildRegistration";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showChildModal, setShowChildModal] = useState(false);
  
  // SOLUSI: Menggunakan Lazy State Initialization
  // React hanya akan menjalankan fungsi ini sekali pada render pertama
  const [localUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Gagal membaca data user dari storage", e);
      return null;
    }
  });

  // Prioritaskan user dari Context, jika tidak ada pakai localUser dari localStorage
  const displayUser = user || localUser;

  const handleLogout = () => {
    logout();
    // Opsional: Hapus localStorage saat logout agar bersih
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F3EFEA] font-['Lato'] relative">
      <NavbarDashboard />
      
      <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col items-center justify-center p-6 text-center">
        
        <div className="h-32 w-32 rounded-full bg-gray-300 flex items-center justify-center text-4xl font-bold text-gray-600 mb-6 shadow-md uppercase">
          {displayUser?.name ? displayUser.name[0] : "U"}
        </div>
        
        {/* DATA AKUN DINAMIS */}
        <h1 className="text-3xl font-bold text-[#8B2020]">{displayUser?.name || "Nama Pengguna"}</h1>
        <p className="text-gray-600 mt-2 text-lg">{displayUser?.email || "email@domain.com"}</p>
        
        <div className="mt-10 rounded-2xl bg-white p-8 shadow-sm w-full max-w-md space-y-4">
          <button 
            onClick={() => setShowChildModal(true)}
            className="w-full rounded-full bg-[#8B2020] py-3.5 font-bold text-white shadow-md hover:bg-red-800 transition-transform active:scale-95"
          >
            👶 Tambah Profil Anak Baru
          </button>

          <button 
            onClick={handleLogout}
            className="w-full rounded-full bg-red-50 py-3.5 font-bold text-red-600 hover:bg-red-100 transition-colors"
          >
            Keluar (Logout)
          </button>
        </div>
      </main>

      <FooterDashboard />

      {showChildModal && (
        <ChildRegistration onClose={() => setShowChildModal(false)} />
      )}
    </div>
  );
}