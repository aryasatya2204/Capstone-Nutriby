import Logo from "../assets/logo_nutriby.png";

function Navbar({ onLoginClick }) {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <img src={Logo} alt="Logo NutriBy" className="logo-img" />
        <span className="logo-text">NutriBy</span>
      </div>

      <div className="navbar-search">
        <input
          type="text"
          placeholder="Cari resep makanan..."
          className="search-input"
        />
      </div>

      <div className="navbar-menu">
        <a href="#">Fitur ▾</a>
        <a href="#">Cara Kerja</a>
        <a href="#">Tentang</a>
        <button className="btn-primary" onClick={onLoginClick}>
          Masuk/Daftar
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
