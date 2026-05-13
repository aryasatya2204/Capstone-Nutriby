import { useState } from 'react';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import heroImage from '../assets/header_fotoIbuAnak.jpeg';
import AuthModal from './authentication/authModal';
import LoginForm from './authentication/loginForm';
import RegisterStep1 from './authentication/registerStep1';
import fitur1Img from '../assets/landingPage/fitur1Img.jpeg';
import fitur2Img from '../assets/landingPage/fitur2Img.jpeg';
import fitur3Img from '../assets/landingPage/fitur3Img.jpeg';
import fitur4Img from '../assets/landingPage/fitur4Img.jpeg';
import step1Img from '../assets/landingPage/step1Img.jpeg';
import step2Img from '../assets/landingPage/step2Img.jpeg';
import step3Img from '../assets/landingPage/step3Img.jpeg';
import step4Img from '../assets/landingPage/step4Img.jpeg';

function LandingPage() {
  const [modal, setModal] = useState(null);
  const [regData, setRegData] = useState({});

  const closeModal = () => setModal(null);

  const handleRegNext = (data) => {
    const newData = { ...regData, ...data };
    setRegData(newData);
  };

  return (
    <div className="page-wrapper">
      <Navbar onLoginClick={() => setModal('auth')} />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-content">
          <h1>Solusi Cerdas MPASI untuk Tumbuh Kembang Optimal</h1>
          <p>Temani setiap langkah tumbuh kembang anak dengan rekomendasi MPASI yang tepat.</p>
          <button className="btn-hero" onClick={() => setModal('auth')}>Mulai Sekarang</button>
        </div>
      </section>

      {/* ── TANTANGAN ── */}
      <section className="section tantangan-section">
        <h2 className="section-title">Tantangan yang sering dihadapi orang tua</h2>
        <div className="tantangan-scroll-wrapper">
          <div className="tantangan-cards">
            <div className="card-dark">
              <h3>Bingung menentukan menu MPASI?</h3>
              <p>Variasi makanan harian terbatas dan berulang</p>
            </div>
            <div className="card-dark">
              <h3>Khawatir nutrisi anak tidak terpenuhi?</h3>
              <p>Sulit menyesuaikan kebutuhan gizi sesuai usia</p>
            </div>
            <div className="card-dark">
              <h3>Tidak yakin dengan pertumbuhan anak?</h3>
              <p>Perkembangan anak sulit dipantau secara tepat</p>
            </div>
            <div className="card-dark">
              <h3>Bingung menyesuaikan dengan budget keluarga?</h3>
              <p>Variasi makanan yang sesuai dengan kondisi ekonomi keluarga</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="section steps-section">
        <h2 className="section-title">Temani Tumbuh Kembang Anak Anda, Dimulai dari Sini</h2>
        <p className="section-subtitle">Nutriby dirancang agar mudah digunakan oleh setiap orang tua</p>
        <div className="steps-grid">
          <div className="step-item">
            <div className="step-img-wrapper">
              {step1Img ? <img src={step1Img} alt="Buat akun" className="step-img" /> : <div className="step-placeholder">1</div>}
            </div>
            <div className="step-label"><p>Buat akun &amp; profil anak</p></div>
          </div>
          <div className="step-item">
            <div className="step-img-wrapper">
              {step2Img ? <img src={step2Img} alt="Isi data anak" className="step-img" /> : <div className="step-placeholder">2</div>}
            </div>
            <div className="step-label"><p>Pantau pertumbuhan anak</p></div>
          </div>
          <div className="step-item">
            <div className="step-img-wrapper">
              {step3Img ? <img src={step3Img} alt="Rekomendasi MPASI" className="step-img" /> : <div className="step-placeholder">3</div>}
            </div>
            <div className="step-label"><p>Dapatkan rekomendasi MPASI</p></div>
          </div>
          <div className="step-item">
            <div className="step-img-wrapper">
              {step4Img ? <img src={step4Img} alt="Pantau perkembangan" className="step-img" /> : <div className="step-placeholder">4</div>}
            </div>
            <div className="step-label"><p>Konsultasi via NutriBot</p></div>
          </div>
        </div>
      </section>

      {/* ── FITUR ── */}
      <section className="section fitur-section">
        <h2 className="section-title">Nutriby hadir untuk membantu Anda</h2>
        <div className="fitur-container">
          <div className="fitur-grid-wrap">
            <div className="fitur-card">
              <div className="fitur-img-wrapper">
                {fitur1Img ? <img src={fitur1Img} alt="Smart Growth Maker" className="fitur-img" /> : <div className="fitur-placeholder">Fitur 1</div>}
              </div>
              <h3>Smart Growth Maker</h3>
              <p>Pantau perkembangan anak dengan mudah</p>
            </div>
            <div className="fitur-card">
              <div className="fitur-img-wrapper">
                {fitur2Img ? <img src={fitur2Img} alt="Rekomendasi MPASI Mingguan" className="fitur-img" /> : <div className="fitur-placeholder">Fitur 2</div>}
              </div>
              <h3>Rekomendasi MPASI Mingguan</h3>
              <p>Menu terstruktur sesuai kebutuhan</p>
            </div>
            <div className="fitur-card">
              <div className="fitur-img-wrapper">
                {fitur3Img ? <img src={fitur3Img} alt="Rekomendasi per Menu" className="fitur-img" /> : <div className="fitur-placeholder">Fitur 3</div>}
              </div>
              <h3>Rekomendasi per Menu</h3>
              <p>Pilihan menu sehat &amp; variatif</p>
            </div>
            <div className="fitur-card">
              <div className="fitur-img-wrapper">
                {fitur4Img ? <img src={fitur4Img} alt="NutriBot" className="fitur-img" /> : <div className="fitur-placeholder">Fitur 4</div>}
              </div>
              <h3>NutriBot</h3>
              <p>Konsultasi nutrisi kapan saja</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HERO 2 / ABOUT ── */}
      <section className="section hero2-section">
        <h2 className="section-title">Solusi Cerdas untuk Nutrisi dan Tumbuh Kembang Anak</h2>
        <div className="hero2-inner">
          <div className="hero2-card">
            <p>
              Nutriby adalah platform berbasis teknologi yang membantu orang tua dalam menyediakan MPASI yang sesuai dengan kebutuhan nutrisi anak serta memantau tumbuh kembangnya secara optimal.
            </p>
          </div>
          <div className="hero2-image">
            {/* Ganti dengan img asset keluarga jika tersedia */}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <h2>Mulai Langkah Terbaik untuk Tumbuh Kembang Anak Anda</h2>
        <p>Karena Setiap Anak Berhak Tumbuh dengan Optimal</p>
        <button className="btn-primary" onClick={() => setModal('auth')}>Mulai Sekarang</button>
      </section>

      <Footer />

      {modal === 'auth' && (
        <AuthModal onClose={closeModal} onShowLogin={() => setModal('login')} onShowRegister={() => setModal('reg1')} />
      )}
      {modal === 'login' && (
        <LoginForm onClose={closeModal} onShowRegister={() => setModal('reg1')} onShowAuth={() => setModal('auth')} />
      )}
      {modal === 'reg1' && (
        <RegisterStep1 onNext={handleRegNext} onClose={closeModal} onShowLogin={() => setModal('login')} onShowAuth={() => setModal('auth')} />
      )}
    </div>
  );
}

export default LandingPage;
