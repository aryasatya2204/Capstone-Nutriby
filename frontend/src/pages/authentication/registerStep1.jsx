import { useState } from "react";
import { useAuth } from "../../context/authContext"; 
import { GoogleLogin } from '@react-oauth/google';

// Tambahkan onNext pada parameter props
function RegisterStep1({ onClose, onShowLogin, onNext }) {
  const { login } = useAuth(); 

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); 
  };

  // Integrasi API Registrasi Manual
  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) {
      setError("Semua field wajib diisi");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError("Password minimal 8 karakter, mengandung minimal 1 huruf besar dan 1 angka.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.username, 
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        // Tampilkan pop-up "Akun Terdaftar!"
        setShowSuccess(true);
        
        // SIMPAN TOKEN & UPDATE CONTEXT (Sangat penting agar auto-trigger mengenali user)
        localStorage.setItem("token", data.token); 
        login(data.user); 

        // Tunggu 2.5 detik agar user melihat pesan sukses, lalu panggil onNext()
        setTimeout(() => {
          setShowSuccess(false);
          if (onNext) onNext(); // Membuka modal Form Anak di Landing Page
        }, 2500);

      } else {
        setError(data.message || "Registrasi gagal. Silakan coba lagi.");
      }
    } catch (err) {
      setError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  // Integrasi Google SSO untuk Register
  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowSuccess(true);
        localStorage.setItem("token", data.token);
        login(data.user);
        
        setTimeout(() => {
          setShowSuccess(false);
          if (onNext) onNext(); 
        }, 2500);
      } else {
        setError(data.message || "Google Register gagal.");
      }
    } catch (err) {
      setError("Gagal terhubung ke server auth Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity" onClick={onClose}>
      
      {/* Pop-up Sukses */}
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white/90 px-12 py-16 text-center shadow-2xl backdrop-blur-md">
          <img 
            src="https://www.svgrepo.com/show/511342/verified-shield.svg" 
            alt="Verified" 
            className="mb-4 h-24 w-24 object-contain text-blue-500 drop-shadow-md" 
          />
          <h2 className="text-3xl font-bold text-[#8B2020]">Akun Terdaftar!</h2>
          <p className="mt-2 text-lg font-medium text-[#8B2020]">Welcome to NutryBy.</p>
        </div>
      ) : (
        /* Form Registrasi */
        <div className="w-full max-w-[400px] rounded-[2.5rem] bg-[#8B2020] px-8 py-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-6 text-center text-white">
            <h2 className="font-['Lato'] text-[32px] font-bold">NutriBy</h2>
            <p className="mt-1 text-[14px]">Isi data anda di bawah ini</p>
          </div>

          {error && <p className="mb-4 text-center text-sm font-semibold text-red-300">{error}</p>}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-white">Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="rounded-lg border-b-2 border-white bg-transparent px-2 py-2 text-white outline-none focus:border-gray-300"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-white">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="rounded-lg border-b-2 border-white bg-transparent px-2 py-2 text-white outline-none focus:border-gray-300"
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-white">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="rounded-lg border-b-2 border-white bg-transparent px-2 py-2 text-white outline-none focus:border-gray-300"
              />
            </div>
          </div>

          <button 
            className="mt-8 w-full rounded-full bg-white py-4 text-[16px] font-bold text-[#8B2020] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70" 
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? "Memproses..." : "Daftar"}
          </button>

          {/* Divider */}
          <div className="my-7 flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-white/60"></div>
            <span className="text-[15px] text-white/90">Atau daftar dengan</span>
            <div className="h-px w-20 bg-white/60"></div>
          </div>

          {/* Tombol Google Terintegrasi */}
          <div className="w-full flex justify-center bg-white rounded-full overflow-hidden py-1">
             <GoogleLogin 
               onSuccess={handleGoogleSuccess} 
               onError={() => setError("Registrasi Google Gagal")} 
               theme="outline" 
               size="large"
               width="340px"
               text="signup_with" 
             />
          </div>

          {/* Teks Footer */}
          <p className="mt-8 text-center text-[15px] text-white/90">
            Sudah punya akun?{" "}
            <button 
              className="font-bold text-white underline decoration-white underline-offset-4 hover:text-gray-200" 
              onClick={onShowLogin}
            >
              Masuk
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

export default RegisterStep1;