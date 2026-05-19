import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom"; // <-- PERBAIKAN 1: Tambahkan useLocation di sini
import { useAuth } from "../context/authContext";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const [hasChild, setHasChild] = useState(null);

  useEffect(() => {
    const checkChildData = async () => {
      const token = localStorage.getItem("token");
      
      // Jika sejak awal tidak ada token dan user, tidak perlu fetch ke backend
      if (!user && !token) {
        setHasChild(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/children", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Cek apakah data array anak ada dan isinya lebih dari 0
        setHasChild(data && data.length > 0);
      } catch (error) {
        setHasChild(false);
      }
    };
    
    checkChildData();
  }, [user]);

  // ==========================================
  // AREA RETURN / PENGKONDISIAN (Boleh menggunakan return di sini)
  // ==========================================
  
  // 1. Tunggu proses pengecekan selesai agar tidak salah lempar
  if (hasChild === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#8B2020] text-white">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          <p>Memeriksa data...</p>
        </div>
      </div>
    );
  }

  // 2. Cek apakah user benar-benar tidak login
  const token = localStorage.getItem("token");
  if (!user && !token) {
    return <Navigate to="/" replace />;
  }

  // 3. JIKA BELUM PUNYA ANAK -> Tendang ke halaman utama dengan pesan error
  if (!hasChild) {
    return (
      <Navigate
        to="/"
        state={{
          fromGuard: true,
          message:
            "Akses Ditolak: Anda wajib mengisi data profil anak terlebih dahulu sebelum masuk ke Dashboard!",
        }}
        replace
      />
    );
  }

  // 4. Jika user sudah login DAN sudah punya anak -> Lolos ke Dashboard
  return <Outlet />;
}