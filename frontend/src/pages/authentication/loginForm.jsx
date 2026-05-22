import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { GoogleLogin } from "@react-oauth/google";
import verified from "../../assets/verified.png";

function LoginForm({ onClose, onShowRegister, onShowAuth }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [emailError, setEmailError] = useState(""); // validasi email inline

  const isGmail = (email) => /^[^\s@]+@gmail\.com$/.test(email);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError("");

    // Validasi email real-time: hanya tampil kalau user sudah ngetik @
    if (name === "email") {
      if (value.includes("@") && !isGmail(value)) {
        setEmailError("Email harus menggunakan @gmail.com");
      } else {
        setEmailError("");
      }
    }
  };

  // Tombol Masuk hanya aktif jika email valid gmail
  const isFormValid = isGmail(form.email) && form.password.length > 0;

  const handleManualLogin = async () => {
    if (!form.email || !form.password) {
      setError("Email dan Password wajib diisi!");
      return;
    }
    if (!isGmail(form.email)) {
      setEmailError("Email harus menggunakan @gmail.com");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        login(data.user);

        setShowSuccess(true);
        setTimeout(() => {
          onClose();
          navigate("/dashboard");
        }, 2000);
      } else {
        setError(
          data.message || "Gagal login, periksa kembali email/password Anda.",
        );
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch("http://localhost:3000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        login(data.user);

        setShowSuccess(true);
        setTimeout(() => {
          onClose();
          navigate("/dashboard");
        }, 2000);
      } else {
        setError(data.message || "Login Google gagal.");
      }
    } catch (err) {
      setError("Server Error.");
    }
  };

  // ── POPUP SUKSES ──
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-12 py-16 text-center shadow-2xl">
          <img
            src={verified}
            alt="Verified"
            className="mb-4 h-24 w-24 object-contain drop-shadow-md"
          />
          <h2 className="text-3xl font-bold text-[#8B2020]">Login Berhasil!</h2>
          <p className="mt-2 text-lg font-medium text-[#8B2020]">
            Selamat datang di NutriBy.
          </p>
          <p className="mt-1 text-sm text-gray-400">Mengalihkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  // ── FORM LOGIN ──
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-[2.5rem] bg-[#8B2020] px-10 py-14 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-center text-[36px] font-bold mb-2">NutriBy</h2>
        <p className="text-center text-[15px] mb-8 opacity-90">
          Isi data anda di bawah ini
        </p>

        {error && (
          <p className="mb-4 text-center text-sm font-bold text-red-200 bg-red-900/30 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="space-y-6">
          {/* EMAIL */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 uppercase opacity-90">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="contoh@gmail.com"
              className={`w-full bg-transparent border-b-2 py-2 outline-none transition-colors placeholder:opacity-40
                ${emailError ? "border-red-300" : "border-white/50 focus:border-white"}`}
            />
            {/* Pesan validasi email muncul real-time */}
            {emailError && (
              <p className="mt-1.5 flex items-center gap-1 text-[12px] text-red-300">
                <span>⚠</span> {emailError}
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 uppercase opacity-90">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-transparent border-b-2 border-white/50 py-2 outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Tombol disabled kalau email bukan gmail atau password kosong */}
        <button
          onClick={handleManualLogin}
          disabled={isLoading || !isFormValid}
          title={!isFormValid ? "Lengkapi email @gmail.com dan password terlebih dahulu" : ""}
          className={`mt-10 w-full rounded-full py-3.5 text-[18px] font-bold transition-all
            ${isFormValid && !isLoading
              ? "bg-white text-[#8B2020] hover:bg-gray-100 cursor-pointer"
              : "bg-white/40 text-white/60 cursor-not-allowed"
            }`}
        >
          {isLoading ? "Memproses..." : "Masuk"}
        </button>

        <div className="relative my-7 flex items-center justify-center">
          <div className="absolute w-full border-t border-white/30"></div>
          <span className="relative bg-[#8B2020] px-4 text-sm opacity-90 italic">
            Atau lanjutkan dengan
          </span>
        </div>

        <div className="w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google Login Failed")}
            theme="outline"
            size="large"
            width="100%"
            text="continue_with"
          />
        </div>

        <p className="mt-8 text-center text-[14px] text-white/90">
          Belum punya akun?{" "}
          <button
            onClick={onShowRegister}
            className="font-bold underline underline-offset-4 hover:text-gray-200"
          >
            Daftar
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
