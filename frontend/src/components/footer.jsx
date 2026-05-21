import doctorImg from '../assets/doctorImg.png';
import logoImg from '../assets/logo_nutriby.png';

function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-[#8B1E1E] pt-14">
      {/* White curved top edge */}
      <div className="absolute -top-[50px] left-1/2 h-[100px] w-[150%] -translate-x-1/2 rounded-[100%] bg-[#F0EAE6]" />

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-8 pt-6 md:px-14">
        {/* Main footer row */}
        <div className="flex flex-col items-center justify-between gap-10 md:flex-row md:items-end">

          {/* Left: Doctor + Bubble */}
          <div className="relative flex items-end" style={{ minHeight: '160px' }}>
            {/* Speech Bubble */}
            <div className="absolute -top-4 left-[90px] w-[200px] rounded-full border-2 border-gray-300 bg-white px-4 py-3 text-[12px] font-bold leading-snug text-[#8B1E1E] shadow-md md:w-[220px] md:text-[13px]">
              Pantau tumbuh kembang anak. <br /> Ayo daftar sekarang!
              <div className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-gray-300 bg-white" />
            </div>
            <img
              src={doctorImg}
              alt="dokter"
              className="h-[160px] object-contain drop-shadow-xl md:h-[180px]"
            />
          </div>

          {/* Right: Logo + Nav Links */}
          <div className="flex flex-col items-center gap-6 md:items-end">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="logo NutriBy"
                className="h-10 w-10 object-contain brightness-0 invert"
              />
              <span className="font-['Lato'] text-[28px] font-bold text-white md:text-[32px]">NutriBy</span>
            </div>

            <div className="flex gap-12 text-[14px] font-bold text-white md:gap-16 md:text-[15px]">
              <div className="flex flex-col gap-3 text-right">
                <a href="#" className="hover:underline">Tentang</a>
                <a href="#" className="hover:underline">Cara Kerja</a>
              </div>
              <div className="flex flex-col gap-3 text-right">
                <a href="#" className="hover:underline">Fitur</a>
                <a href="#" className="hover:underline">Tentang kami</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/20 px-6 py-4 md:px-14">
        <span className="text-[20px] text-white">✉</span>
        <p className="w-full text-center text-[12px] text-white/90 md:text-[13px]">
          © 2026 Nutriby. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;