import { useState } from "react";
import { useAuth } from "../../context/authContext";
import { GoogleLogin } from "@react-oauth/google";
import verified from "../../assets/verified.png";

function RegisterStep1({ onClose, onShowLogin, onNext }) {
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Validasi inline per field
  const [emailError, setEmailError] = useState("");

  const isGmail = (email) => /^[^\s@]+@gmail\.com$/.test(email);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validasi email real-time: tampil setelah user ngetik @
    if (name === "email") {
      if (value.includes("@") && !isGmail(value)) {
        setEmailError("Email harus menggunakan @gmail.com");
      } else {
        setEmailError("");
      }
    }

    setForm({ ...form, [name]: value });
    setError("");
  };

  // Form valid jika: username tidak kosong & tidak ada angka, email gmail, password tidak kosong
  const isFormValid =
    form.username.trim().length > 0 &&
    isGmail(form.email) &&
    form.password.length > 0;

  const handleRegister = async () => {
    // Double-check validasi sebelum submit
    if (!form.username || !form.email || !form.password) {
      setError("Semua field wajib diisi");
      return;
    }
    if (!isGmail(form.email)) {
      setEmailError("Email harus menggunakan @gmail.com");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        setShowSuccess(true);
        localStorage.setItem("token", data.token);
        login(data.user);

        setTimeout(() => {
          setShowSuccess(false);
          if (onNext) onNext();
        }, 2500);
      } else {
        setError(data.message || "Registrasi gagal. Silakan coba lagi.");
      }
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3000/api/auth/google", { // fix: https → http
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
    } catch {
      setError("Gagal terhubung ke server auth Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      {/* Pop-up Sukses */}
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white/90 px-12 py-16 text-center shadow-2xl backdrop-blur-md">
          <img
            src={verified}
            alt="Verified"
            className="mb-4 h-24 w-24 object-contain drop-shadow-md"
          />
          <h2 className="text-3xl font-bold text-[#8B2020]">Akun Terdaftar!</h2>
          <p className="mt-2 text-lg font-medium text-[#8B2020]">
            Welcome to NutriBy.
          </p>
        </div>
      ) : (
        /* Form Registrasi */
        <div
          className="w-full max-w-[400px] rounded-[2.5rem] bg-[#8B2020] px-8 py-10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 text-center text-white">
            <h2 className="font-['Lato'] text-[32px] font-bold">NutriBy</h2>
            <p className="mt-1 text-[14px]">Isi data anda di bawah ini</p>
          </div>

          {error && (
            <p className="mb-4 text-center text-sm font-semibold text-red-300 bg-red-900/30 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-5">
            {/* USERNAME */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-white uppercase opacity-90">
                Username
              </label>
              <input
  type="text"
  name="username"
  value={form.username}
  onChange={handleChange}
  className="rounded-lg border-b-2 border-white bg-transparent px-2 py-2 text-white outline-none focus:border-gray-300"
/>
            </div>

            {/* EMAIL */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-white uppercase opacity-90">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="contoh@gmail.com"
                className={`rounded-lg border-b-2 bg-transparent px-2 py-2 text-white outline-none transition-colors placeholder:opacity-30
                  ${emailError ? "border-red-300" : "border-white focus:border-gray-300"}`}
              />
              {/* Pesan error email muncul real-time */}
              {emailError && (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-red-300">
                  <span>⚠</span> {emailError}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-white uppercase opacity-90">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 karakter, 1 huruf besar, 1 angka"
                className="rounded-lg border-b-2 border-white bg-transparent px-2 py-2 text-white outline-none transition-colors placeholder:opacity-30 focus:border-gray-300"
              />
            </div>
          </div>

          {/* Tombol Daftar — disable kalau form belum valid */}
          <button
            onClick={handleRegister}
            disabled={isLoading || !isFormValid}
            title={!isFormValid ? "Lengkapi semua field dengan benar" : ""}
            className={`mt-8 w-full rounded-full py-4 text-[16px] font-bold transition-all
              ${isFormValid && !isLoading
                ? "bg-white text-[#8B2020] hover:bg-gray-100 cursor-pointer"
                : "bg-white/40 text-white/60 cursor-not-allowed"
              }`}
          >
            {isLoading ? "Memproses..." : "Daftar"}
          </button>

          {/* Divider */}
          <div className="my-7 flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-white/60"></div>
            <span className="text-[15px] text-white/90 italic">Atau daftar dengan</span>
            <div className="h-px w-20 bg-white/60"></div>
          </div>

          <div className="w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Registrasi Google Gagal")}
              theme="outline"
              size="large"
              width="340px"
              text="signup_with"
            />
          </div>

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
