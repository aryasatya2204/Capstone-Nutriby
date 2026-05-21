import Logo from "../../assets/logo_nutriby.png"; // Pastikan path ini mengarah ke file logo Anda

function AuthModal({ onClose, onShowLogin, onShowRegister }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      {/* Modal Box */}
      <div
        className="relative flex w-full max-w-[400px] flex-col items-center rounded-[2.5rem] bg-[#8B2020] px-10 py-16 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Logo */}
        <div className="mb-10 flex flex-col items-center">
          {/* CLASS brightness-0 invert DIHAPUS DARI SINI */}
          <img
            src={Logo}
            alt="NutriBy Logo"
            className="mb-3 h-20 w-20 object-contain"
          />
          <h2 className="text-[40px] font-bold text-white leading-tight">
            NutriBy
          </h2>
          <p className="mt-1 text-[16px] text-white/90">
            Solusi pantau perkembangan anak
          </p>
        </div>

        {/* Buttons */}
        <div className="flex w-full flex-col gap-5">
          <button
            className="w-full rounded-full bg-white py-4 text-[18px] font-bold text-[#8B2020] transition-transform hover:scale-105 active:scale-95 shadow-md"
            onClick={onShowRegister}
          >
            sign up
          </button>

          <button
            className="w-full rounded-full border-[1.5px] border-white bg-transparent py-4 text-[18px] font-bold text-white transition-transform hover:bg-white/10 active:scale-95"
            onClick={onShowLogin}
          >
            log in
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
