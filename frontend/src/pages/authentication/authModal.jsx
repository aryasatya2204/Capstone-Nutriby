function AuthModal({ onClose, onShowLogin, onShowRegister }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-logo">
          <h2>NutriBy</h2>
          <p>Solusi pantau perkembangan anak</p>
        </div>
        <button className="btn-modal-primary" onClick={onShowRegister}>
          sign up
        </button>
        <button className="btn-modal-secondary" onClick={onShowLogin}>
          log in
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
