import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const [hasChild, setHasChild] = useState(null);

  useEffect(() => {
    const checkChildData = async () => {
      const token = localStorage.getItem("token");

      // jika tidak ada token dan user
      if (!user && !token) {
        setHasChild(false);
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/children", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // cek data anak
        setHasChild(data && data.length > 0);
      } catch (error) {
        setHasChild(false);
      }
    };

    checkChildData();
  }, [user]);

  // loading saat cek data anak
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

  // cek login user
  const token = localStorage.getItem("token");
  if (!user && !token) {
    return <Navigate to="/" replace />;
  }

  // jika belum punya anak
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

  // lolos ke dashboard
  return <Outlet />;
}
