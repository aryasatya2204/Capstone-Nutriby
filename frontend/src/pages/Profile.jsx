import { useState, useRef, useEffect } from "react";
import NavbarDashboard from "../components/NavbarDashboard";
import FooterDashboard from "../components/FooterDashboard";
import ChildRegistration from "./ChildRegistration";
import { useAuth } from "../context/authContext";
import { useNavigate } from "react-router-dom";

// fungsi buat hitung umur otomatis dari tgl lahir biar jd teks singkat kayak 5 bln atau 2thn
const getAgeLabel = (dob) => {
  if (!dob) return "";
  const months = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
  if (months < 12) return `${months} bln`;
  const y = Math.floor(months / 12),
    m = months % 12;
  return m > 0 ? `${y}thn ${m}bln` : `${y} thn`;
};

// fungsi buat ngambil data perkembangan anak yang paling baru
const getLatestLog = (child) => {
  const logs = child.growth_logs || [];
  return logs.length > 0 ? logs[0] : null;
};

// fungsi buat nentuin warna status gizi anak (hijau baik, kuning kurang, merah buruk)
const getStatusStyle = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("baik") || s.includes("normal"))
    return { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" };
  if (s.includes("kurang") || s.includes("ringan"))
    return { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" };
  if (s.includes("buruk") || s.includes("berat") || s.includes("lebih"))
    return { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" };
  return { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };
};

const getInitial = (name) => (name ? name[0].toUpperCase() : "?");

const GENDER_LABEL = { L: "Laki-laki", P: "Perempuan" };

const AVATAR_COLORS = ["#8B2020", "#1a6b8a", "#7b4ea0", "#d35400", "#1e7a50"];

// KUMPULAN ICON UNTUK PROFILE
const IconX = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconLogout = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconUser = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconMail = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconChild = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
  </svg>
);
const IconChevronDown = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconCheck = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

//LOGOUT
//pop up konfirmasi logout
function LogoutConfirmModal({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center px-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(15,5,5,0.45)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: "fadeUp 0.2s ease both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#FEF2F2", color: "#DC2626" }}
          >
            <IconLogout />
          </div>
          <p className="text-base font-black text-gray-800">
            Yakin mau keluar?
          </p>
          <p className="text-xs text-gray-400 mt-1.5">
            Kamu perlu login lagi untuk mengakses NutriBy
          </p>
        </div>
        <div className="flex border-t" style={{ borderColor: "#FEE2E2" }}>
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <div style={{ width: 1, background: "#FEE2E2" }} />
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

//profile si kecil
function ChildSection({ children_list, activeChild, onSelect, onAdd }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="fade-up-2 bg-white rounded-2xl mb-4 overflow-hidden"
      style={{
        border: "1px solid #E8E2DB",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
        style={{
          borderBottom: open ? "1px solid #F0EBE5" : "none",
          background: open ? "#FDFBF9" : "white",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
            style={{ background: "#8B2020" }}
          >
            <IconChild />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-gray-900">Profil Si Kecil</p>
            <p className="text-[10px] text-gray-400">
              {children_list.length} profil terdaftar
            </p>
          </div>
        </div>
        <div
          className="transition-transform duration-200"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: "#8B2020",
          }}
        >
          <IconChevronDown />
        </div>
      </button>

      {open && (
        <div style={{ animation: "dropIn 0.15s ease forwards" }}>
          {children_list.length === 0 ? (
            <div
              className="mx-4 my-4 text-center py-8 rounded-xl"
              style={{ background: "#FDFBF9", border: "2px dashed #EDE9E3" }}
            >
              <p className="text-3xl mb-2">👶</p>
              <p className="text-sm font-bold text-gray-700">
                Belum ada profil anak
              </p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Tambahkan profil untuk mulai menggunakan fitur NutriBy
              </p>
            </div>
          ) : (
            children_list.map((child, idx) => {
              const cLog = getLatestLog(child);
              const cStatus = cLog?.global_status;
              const cStyle = getStatusStyle(cStatus);
              const cColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const isActive = child.id === activeChild?.id;

              return (
                <button
                  key={child.id}
                  onClick={() => onSelect(child.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left"
                  style={{
                    background: isActive ? "#FFF8F5" : "transparent",
                    borderBottom: "1px solid #F5F0EB",
                  }}
                  onMouseEnter={(e) =>
                    !isActive && (e.currentTarget.style.background = "#FDFBF9")
                  }
                  onMouseLeave={(e) =>
                    !isActive &&
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0"
                    style={{ background: cColor }}
                  >
                    {getInitial(child.name)}
                  </div>

                  {/* data si anak */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate leading-tight">
                      {child.name}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                      {getAgeLabel(child.dob)}
                      {child.gender
                        ? ` · ${GENDER_LABEL[child.gender] || child.gender}`
                        : ""}
                    </p>
                    {cStatus && (
                      <div className="flex items-center gap-1 mt-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: cStyle.dot }}
                        />
                        <span
                          className="text-[9px] font-bold"
                          style={{ color: cStyle.text }}
                        >
                          {cStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* status profilenya aktif atau tidak */}
                  {isActive ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                        style={{ animation: "pulseDot 1.5s infinite" }}
                      />
                      <span className="text-[10px] font-bold text-emerald-600">
                        Aktif
                      </span>
                    </div>
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: "#E5E0DA" }}
                    />
                  )}
                </button>
              );
            })
          )}

          {/* buat nambah profil baru */}
          <button
            onClick={onAdd}
            className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FDFBF9")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "#FFF0E8",
                color: "#8B2020",
                border: "1.5px dashed #FDDBC7",
              }}
            >
              <IconPlus />
            </div>
            <p className="text-sm font-bold" style={{ color: "#8B2020" }}>
              Tambah Akun
            </p>
          </button>
        </div>
      )}
    </div>
  );
}

// halaman utama profil
export default function Profile() {
  const {
    user,
    logout,
    activeChild,
    setActiveChild,
    children_list,
    fetchChildren,
  } = useAuth();
  const navigate = useNavigate();

  // state buat backup data user dari local storage browser kalo di context kosong
  const [localUser, setLocalUser] = useState(() => {
    try {
      const s = localStorage.getItem("user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const displayUser = user || localUser;

  // kumpulan state
  const [showChildModal, setShowChildModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingName, setSwitchingName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // fungsi pas user klik ganti profil anak yang mau dipantau
  const handleSelectChild = (childId) => {
    if (childId === activeChild?.id) return;
    const child = children_list.find((c) => c.id === childId);
    if (child) {
      setSwitchingName(child.name);
      setIsSwitching(true);
      setActiveChild(childId);
      setTimeout(() => setIsSwitching(false), 1200);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: "#F5F0EB",
        ffontFamily: "'Lato', sans-serif",
      }}
    >
      {/* css internal khusus buat animasi transisi pas web dibuka */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .fade-up-1 { animation: fadeUp 0.28s 0.04s ease both; }
        .fade-up-2 { animation: fadeUp 0.28s 0.1s ease both; }
        .fade-up-3 { animation: fadeUp 0.28s 0.16s ease both; }
      `}</style>

      <NavbarDashboard />

      {/* navigasi kecil */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-5 pb-12">
        <div
          className="flex items-center gap-1.5 text-xs text-gray-400 mb-5 font-medium"
          style={{ animation: "fadeUp 0.25s ease both" }}
        >
          <a
            href="/dashboard"
            className="hover:text-[#8B2020] transition-colors"
          >
            Beranda
          </a>
          <span>›</span>
          <span className="font-bold" style={{ color: "#8B2020" }}>
            Pengaturan Akun
          </span>
        </div>

        {/*informasi akun org tua*/}
        <div
          className="fade-up-1 bg-white rounded-2xl mb-4 overflow-hidden"
          style={{
            border: "1px solid #E8E2DB",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: "#F0EBE5" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                style={{ background: "#8B2020" }}
              >
                <IconUser />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">
                  Informasi Akun
                </p>
                <p className="text-[10px] text-gray-400">
                  Data dasar akun anda
                </p>
              </div>
            </div>
          </div>

          {/* detail data user*/}
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="relative flex-shrink-0">
              <div
                className="w-[58px] h-[58px] rounded-[18px] flex items-center justify-center text-white font-black text-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #8B2020 0%, #c0392b 100%)",
                  boxShadow: "0 4px 14px rgba(139,32,32,0.28)",
                }}
              >
                {getInitial(displayUser?.name)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-base leading-tight truncate">
                {displayUser?.name || "Pengguna"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-gray-300">
                  <IconMail />
                </span>
                <p className="text-[11px] text-gray-400 truncate">
                  {displayUser?.email || "-"}
                </p>
              </div>
              {activeChild && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                    style={{ animation: "pulseDot 1.5s infinite" }}
                  />
                  <p className="text-[11px] text-gray-500 font-medium">
                    Aktif:{" "}
                    <span className="font-black text-gray-800">
                      {activeChild.name}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <ChildSection
          children_list={children_list}
          activeChild={activeChild}
          onSelect={handleSelectChild}
          onAdd={() => setShowChildModal(true)}
        />

        <div className="fade-up-3">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FECACA",
            }}
          >
            <IconLogout />
            Keluar dari Akun
          </button>
        </div>
      </main>

      <FooterDashboard />

      {/* modal pop up buat ngisi form pendaftaran anak baru */}
      {showChildModal && (
        <ChildRegistration
          onClose={() => {
            setShowChildModal(false);
            fetchChildren();
          }}
        />
      )}

      {/* loading screen spinner pas sistem lagi proses beralih akun anak */}
      {isSwitching && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center"
          style={{
            backdropFilter: "blur(6px)",
            background: "rgba(15,5,5,0.4)",
          }}
        >
          <div
            className="flex flex-col items-center gap-4 bg-white rounded-3xl px-10 py-8 shadow-2xl"
            style={{ animation: "fadeUp 0.2s ease both" }}
          >
            <div className="w-10 h-10 rounded-full border-4 border-[#8B2020] border-t-transparent animate-spin" />
            <p className="text-sm font-black text-gray-800">
              Beralih ke {switchingName}...
            </p>
          </div>
        </div>
      )}

      {/* memanggil modal konfirmasi pas user beneran klik logout */}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
