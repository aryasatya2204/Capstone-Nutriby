import doctorImg from "../assets/doctorImg.png";
import logoImg from "../assets/logo_nutriby.png";

function Footer() {
  return (
    <footer className="relative w-full">
      {/* Elips cembung ke ATAS — SVG dengan path melengkung ke bawah dari kiri ke kanan */}
      <div className="w-full overflow-hidden leading-[0]">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="block w-full h-[80px] md:h-[120px]"
        >
          {/* Cembung ke atas: titik tengah bawah, tepi kiri-kanan atas */}
          <path d="M0,120 Q600,0 1200,120 L1200,120 L0,120 Z" fill="#8B1E1E" />
        </svg>
      </div>

      {/* Badan footer */}
      <div className="bg-[#8B1E1E] pb-10">
        <div className="relative mx-auto max-w-[1200px] px-6 md:px-14">
          {/* ===== LOGO + NAMA: di paling atas, tengah ===== */}
          <div className="flex flex-col items-center pt-2 pb-8">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="logo NutriBy"
                className="h-12 w-12 object-contain brightness-0 invert"
              />
              <span className="font-['Lato'] text-[32px] font-bold text-white">
                NutriBy
              </span>
            </div>
          </div>

          {/* ===== KONTEN TENGAH: Dokter + Bubble (kiri) | Nav links (kanan) ===== */}
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-end md:justify-between">
            {/* SISI KIRI: Bubble KIRI, Dokter KANAN */}
            <div className="flex items-end gap-3">
              {/* Speech Bubble */}
              <div className="relative mb-6 max-w-[200px] rounded-[24px] border-2 border-gray-200 bg-white px-5 py-3 text-[12px] font-bold leading-snug text-[#8B1E1E] shadow-md md:text-[13px]">
                Pantau tumbuh kembang anak. <br /> Ayo daftar sekarang!
                {/* Ekor bubble mengarah ke KANAN (ke arah dokter) */}
                <div
                  className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-0 h-0"
                  style={{
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderLeft: "10px solid white",
                  }}
                />
              </div>

              {/* Gambar Dokter — di sebelah KANAN bubble */}
              <img
                src={doctorImg}
                alt="dokter"
                className="h-[150px] object-contain drop-shadow-xl md:h-[180px] flex-shrink-0"
              />
            </div>

            {/* SISI KANAN: Nav Links */}
            <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-center text-[14px] font-bold text-white md:text-[15px] pb-4">
              <a
                href="#"
                className="hover:underline opacity-90 transition-opacity hover:opacity-100"
              >
                Tentang
              </a>
              <a
                href="#"
                className="hover:underline opacity-90 transition-opacity hover:opacity-100"
              >
                Fitur
              </a>
              <a
                href="#"
                className="hover:underline opacity-90 transition-opacity hover:opacity-100"
              >
                Cara Kerja
              </a>
              <a
                href="#"
                className="hover:underline opacity-90 transition-opacity hover:opacity-100"
              >
                Tentang kami
              </a>
            </div>
          </div>

          {/* ===== BAWAH: Email di atas, Copyright di bawah, keduanya di tengah ===== */}
          <div className="mt-10 border-t border-white/10 pt-5 flex flex-col items-center gap-2">
            <a
              href="mailto:support@nutriby.com"
              className="text-[22px] text-white hover:opacity-80 transition-opacity"
              aria-label="Email support"
            >
              ✉
            </a>
            <p className="text-[12px] text-white/80 md:text-[13px]">
              © 2026 Nutriby. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
