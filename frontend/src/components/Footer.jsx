import doctorImg from '../assets/doctorImg.png';
import logoImg from '../assets/logo_nutriby.png';

function Footer() {
  return (
    <footer className="footer">
      {/* Arc putih melengkung di atas footer */}
      <div className="footer-arc"></div>

      <div className="footer-inner">
        {/* Gambar dokter + speech bubble */}
        <div className="footer-doctor-wrapper">
          <div className="footer-bubble">
            Pantau tumbuh kembang anak. Ayo daftar sekarang!
          </div>
          {doctorImg && (
            <img src={doctorImg} alt="dokter" className="footer-doctor-img" />
          )}
        </div>

        {/* Kanan: Logo + Nav */}
        <div className="footer-content">
          <div className="footer-logo">
            <img src={logoImg} alt="logo NutriBy" className="footer-logo-img" />
            <span className="footer-logo-text">NutriBy</span>
          </div>
          <div className="footer-nav">
            <div className="footer-nav-column">
              <a href="#">Tentang</a>
              <a href="#">Cara Kerja</a>
            </div>
            <div className="footer-nav-column">
              <a href="#">Fitur</a>
              <a href="#">Tentang kami</a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <span className="footer-email-icon">✉</span>
        <p className="footer-copy">© 2026 Nutriby. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
