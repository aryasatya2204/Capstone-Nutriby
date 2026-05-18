import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";

function LoginForm({ onClose, onShowRegister, onShowAuth }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.username || !form.password) {
      setError("Username dan password wajib diisi");
      return;
    }
    login({ username: form.username, name: "Bunda" });
    onClose();
    navigate("/dashboard");
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
            placeholder="Masukkan username"
            value={form.username}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Masukkan password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div className="form-row-between">
          <span className="form-link">Lupa password?</span>
          <button
            className="btn-modal-primary btn-small"
            onClick={handleSubmit}
          >
            Masuk
          </button>
        </div>

        <p className="form-footer">
          Belum punya akun?{" "}
          <span className="form-link" onClick={onShowRegister}>
            Daftar
          </span>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
// LoginForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";

function LoginForm({ onClose, onShowRegister, onShowAuth }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.username || !form.password) {
      setError("Username dan password wajib diisi");
      return;
    }
    login({ username: form.username, name: "Bunda" });
    onClose();
    navigate("/dashboard");
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
            placeholder="Masukkan username"
            value={form.username}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Masukkan password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div className="form-row-between">
          <span className="form-link">Lupa password?</span>
          <button
            className="btn-modal-primary btn-small"
            onClick={handleSubmit}
          >
            Masuk
          </button>
        </div>

        <p className="form-footer">
          Belum punya akun?{" "}
          <span className="form-link" onClick={onShowRegister}>
            Daftar
          </span>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
