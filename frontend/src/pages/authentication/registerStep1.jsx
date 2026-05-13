import { useState } from "react";

function RegisterStep1({ onNext, onClose, onShowLogin, onShowAuth }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGoogleSSO = () => {
    alert("Google SSO akan disambungkan ke backend");
  };

  const handleNext = () => {
    if (!form.username || !form.email || !form.password) {
      setError("Semua field wajib diisi");
      return;
    }
    onNext({ step1: form });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-logo">
          <h2>NutriBy</h2>
          <p>Isi data anda di bawah ini</p>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <button className="btn-modal-primary" onClick={handleNext}>
          Daftar
        </button>

        <div className="divider">
          <span>Atau daftar dengan</span>
        </div>

        <button className="btn-google" onClick={handleGoogleSSO}>
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            width="18"
          />
          Google
        </button>

        <p className="form-footer">
          Sudah punya akun?{" "}
          <span className="form-link" onClick={onShowLogin}>
            Masuk
          </span>
        </p>
      </div>
    </div>
  );
}

export default RegisterStep1;
