import doctorImg from '../assets/doctorImg.png';
import logoImg from '../assets/logo_nutriby.png';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-arc">
        <div className="footer-inner">
          <div className="footer-doctor-wrapper">
            {doctorImg ? (
              <img src={doctorImg} alt="" className="footer-doctor-img" />
            ) : (
              <div className="footer-doctor-img"></div>
            )}
          </div>

          <div className="footer-content">
            <div className="footer-logo">
              <img
                src={logoImg}
                alt="logo Nutriby"
                className="footer-logo-img"
              />
              <span className="footter-logo-text"> NutriBy</span>
            </div>
            <div footer-nav>
              <div className="footer-nav-col">
                <a href="#">Tentang</a>
                <a href="#">Cara Kerja</a>
                <a href="#">Fitur</a>
                <a href="#">Tentang Kami</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-email-icon"></span>
        <p className="footer-copy">© 2026 Nutriby. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
