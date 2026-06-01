import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authContext";

export default function ProtectedRoute() {
  const { user, children_list, lastUpdated } = useAuth();
  const token = localStorage.getItem("token");

  // belum login sama sekali
  if (!user && !token) {
    return <Navigate to="/" replace />;
  }

  // masih loading, tunggu fetchChildren selesai
  if (lastUpdated === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#8B2020] text-white">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          <p>Memeriksa data...</p>
        </div>
      </div>
    );
  }

  // sudah selesai fetch tapi tidak punya data anak
  if (children_list.length === 0) {
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

  // lolos semua pengecekan, masuk dashboard
  return <Outlet />;
}
