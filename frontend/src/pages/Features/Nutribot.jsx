import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2"; // Impor SweetAlert2
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";
import { useAuth } from "../../context/authContext";
import { apiFetch } from "../../config/api";

// DATA PREFERENSI PERTANYAAN (SUGGESTIONS)
const SUGGESTIONS = {
  reguler: [
    "Berapa porsi dan tekstur makan ideal untuk usia 8 bulan?",
    "Apa saja sumber zat besi alami yang murah untuk MPASI?",
    "Kapan bayi boleh mulai minum air putih, dan seberapa banyak?",
    "Bagaimana cara mengatasi anak yang sedang GTM (Gerakan Tutup Mulut)?",
  ],
  personal: [
    "Apakah target kalori anakku hari ini sudah terpenuhi dengan baik?",
    "Buatkan ide menu hari ini yang murni 100% aman dari pantangan alergi anakku.",
    "Berdasarkan nilai Z-Score WFA anakku, apakah tren pertumbuhannya normal?",
    "Bahan makanan apa yang paling ampuh untuk mengejar ketertinggalan BB anakku?",
  ],
};

// KOMPONEN TYPEWRITER EFEK MENGETIK
const TypewriterText = ({ text, onTyping }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    let currentText = "";

    const timer = setInterval(() => {
      currentText = text.slice(0, i);
      setDisplayed(currentText);
      i++;
      if (onTyping) onTyping();
      if (i > text.length) {
        clearInterval(timer);
      }
    }, 5); // Kecepatan ketik

    return () => {
      clearInterval(timer);
      setDisplayed("");
    };
  }, [text]);

  const formatText = (rawText) => {
    if (!rawText) return { __html: "" };
    const formatted = rawText
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  return <div dangerouslySetInnerHTML={formatText(displayed)} />;
};

export default function Nutribot() {
  const { activeChild } = useAuth();
  const [childData, setChildData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // States Sesi & Pesan
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);

  const [activeTab, setActiveTab] = useState("reguler");
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // State Mobile Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll helper
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load Sessions
  const loadAllSessions = async (childId, token) => {
    try {
      const res = await apiFetch(`/bot/sessions/${childId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch (error) {
      console.error("Gagal memuat riwayat", error);
    }
  };

  // Inisiasi Fetch Data
  useEffect(() => {
    const initData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (activeChild) {
          const child = activeChild;
          setChildData(child);
          await loadAllSessions(child.id, token);
        }
      } catch (error) {
        console.error("Gagal inisiasi data", error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // Handle Pindah Tab (Mode)
  const handleTabChange = (mode) => {
    if (activeTab === mode || isSending) return; // Kunci tab jika sedang mengirim
    setActiveTab(mode);
    setActiveSession(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  // Memilih Sesi dan Memuat Pesannya
  const selectSession = async (session) => {
    if (isSending) return showSpamWarning(); // Cegah pindah sesi saat AI memproses

    setActiveSession(session);
    setActiveTab(session.mode);
    setIsSidebarOpen(false);
    setIsHistoryLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/bot/session/${session.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.map((msg) => ({
          sender: msg.sender,
          text: msg.message,
          isNew: false,
        }));

        if (formattedMessages.length === 0) {
          setMessages([
            {
              sender: "bot",
              text: `Halo Bunda/Ayah! Saya NutriBot. Saat ini kita berada di mode **${session.mode === "personal" ? "Personal" : "Reguler"}**. Ada yang bisa saya bantu terkait gizi atau tumbuh kembang si kecil?`,
              isNew: false,
            },
          ]);
        } else {
          setMessages(formattedMessages);
        }
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Gagal memuat isi pesan. Periksa koneksi Anda.",
      });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Membuat Sesi Baru
  const handleCreateNewSession = async (
    selectedMode = activeTab,
    autoSelect = true
  ) => {
    if (!childData) return;
    setIsHistoryLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/bot/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ child_id: childData.id, mode: selectedMode }),
      });

      const data = await res.json();
      if (res.ok) {
        setSessions((prev) => [data.session, ...prev]);
        if (autoSelect) selectSession(data.session);
        return data.session;
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: data.message });
      }
    } catch {
      Swal.fire({ icon: "error", title: "Koneksi Terputus", text: "Gagal terhubung ke server." });
    } finally {
      setIsHistoryLoading(false);
    }
    return null;
  };

  // Alert Modern untuk mencegah Spam
  const showSpamWarning = () => {
    Swal.fire({
      icon: "warning",
      title: "Sabar ya...",
      text: "NutriBot sedang mengetik jawaban. Harap tunggu sebentar!",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  // Core Fungsi Kirim Pesan ke AI
  const submitMessage = async (textToSubmit, sessionTarget) => {
    if (!textToSubmit.trim() || !sessionTarget || !sessionTarget.is_active) return;
    if (isSending) {
      showSpamWarning();
      return;
    }

    setInputMessage("");
    setIsSending(true); // Kunci state segera
    
    // Tambahkan pesan user ke UI
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: textToSubmit, isNew: false },
    ]);

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch("/bot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionTarget.id,
          message: textToSubmit,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.reply, isNew: true },
        ]);
        setActiveSession((prev) => ({
          ...prev,
          message_count: prev.message_count + 1,
          is_active: data.remaining_questions > 0,
        }));
      } else {
        // Tangkap error limit dari backend (403)
        if (res.status === 403) {
          setActiveSession((prev) => ({ ...prev, is_active: false }));
          Swal.fire({
            icon: "info",
            title: "Batas Sesi Tercapai",
            text: data.message,
            confirmButtonColor: "#8B2020",
          });
        } else {
          Swal.fire({ icon: "error", title: "Terjadi Kesalahan", text: data.message });
        }
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.message, isNew: true },
        ]);
      }

      loadAllSessions(childData.id, token);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Gangguan koneksi atau AI sedang sibuk. Silakan coba lagi.",
          isNew: true,
        },
      ]);
    } finally {
      setIsSending(false); // Buka kunci state
    }
  };

  const handleFormSubmit = async (e) => { 
    e.preventDefault();
    if (isSending) {
      showSpamWarning();
      return;
    }
    
    if (!inputMessage.trim()) return;

    let targetSession = activeSession;

    if (!targetSession) {
      // Buat sesi baru ke Backend
      targetSession = await handleCreateNewSession(activeTab, false);
      setActiveSession(targetSession);
      
      // Munculkan sapaan bot pertama kali agar UI rapi
      setMessages([
        {
          sender: "bot",
          text: `Halo Bunda/Ayah! Saya NutriBot. Saat ini kita berada di mode **${activeTab === "personal" ? "Personal" : "Reguler"}**. Ada yang bisa saya bantu terkait gizi atau tumbuh kembang si kecil?`,
          isNew: false,
        },
      ]);
    }

    // Setelah sesi dipastikan ada, baru kirim pesan inputannya
    if (targetSession) {
      submitMessage(inputMessage, targetSession);
    }
  };

  // Handler Klik Pertanyaan Rekomendasi
  const handleSuggestionClick = async (text) => {
    if (isSending) {
      showSpamWarning();
      return;
    }
    let targetSession = activeSession;

    if (!targetSession) {
      targetSession = await handleCreateNewSession(activeTab, false);
      setActiveSession(targetSession);
      setMessages([
        {
          sender: "bot",
          text: `Halo Bunda/Ayah! Saya NutriBot. Saat ini kita berada di mode **${activeTab === "personal" ? "Personal" : "Reguler"}**. Ada yang bisa saya bantu terkait gizi atau tumbuh kembang si kecil?`,
          isNew: false,
        },
      ]);
    }

    if (targetSession) {
      submitMessage(text, targetSession);
    }
  };

  const formatText = (text) => {
    if (!text) return { __html: "" };
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br />");
    return { __html: formatted };
  };

  const filteredSessions = sessions.filter((s) => s.mode === activeTab);
  const remainingQuestions = activeSession
    ? Math.max(0, 5 - activeSession.message_count)
    : 0;

  // Kondisi apakah input dan tombol harus didisable
  const isInputDisabled = (activeSession && !activeSession.is_active) || isSending || isHistoryLoading;
  const isButtonDisabled = isInputDisabled || !inputMessage.trim();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4EFEB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2020] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-['Lato'] overflow-hidden">
      <NavbarDashboard />

      {/* HEADER HALAMAN */}
      <div className="mb-6 md:px-10 py-3 mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <a href="/features" className="hover:text-[#8B2020] transition-colors font-medium">
            Fitur
          </a>
          <span className="text-gray-300">›</span>
          <span className="text-[#8B2020] font-semibold">Nutribot</span>
        </div>
      </div>

      <main className="flex-1 flex justify-center w-full md:px-6 md:pb-6 lg:px-10 lg:pb-8 md:pt-2 overflow-hidden">
        <div className="w-full max-w-[1400px] flex flex-col md:flex-row relative h-full bg-white md:rounded-[2rem] md:shadow-xl md:border border-gray-100 overflow-hidden">
          
          {/* OVERLAY MOBILE */}
          {isSidebarOpen && (
            <div
              className="absolute inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* SIDEBAR */}
          <div
            className={`absolute md:relative inset-y-0 left-0 z-40 w-4/5 max-w-sm md:w-[320px] bg-[#FAF8F5] flex flex-col h-full shadow-2xl md:shadow-none border-r border-gray-200 transition-transform duration-300 ease-in-out transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
          >
            <div className="flex md:hidden justify-between items-center px-5 py-4 border-b border-gray-200 bg-white shrink-0">
              <span className="font-black text-[#8B2020] text-lg">Riwayat Chat</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 text-3xl leading-none">
                &times;
              </button>
            </div>

            <div className="p-5 border-b border-gray-200 shrink-0 bg-[#FAF8F5]">
              <button
                onClick={() => handleCreateNewSession(activeTab)}
                disabled={isSending}
                className="w-full bg-[#C28C8C] text-white py-3.5 rounded-2xl font-black shadow-md hover:bg-[#a67474] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>+</span> Konsultasi Baru
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 scrollbar-hide">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-1 shrink-0">
                Riwayat {activeTab === "reguler" ? "Umum" : "Personal"}
              </p>

              {filteredSessions.length === 0 ? (
                <div className="text-center py-10 px-4 bg-white/50 rounded-2xl border border-dashed border-gray-200 mt-2 shrink-0">
                  <p className="text-xs font-bold text-gray-400">Belum ada riwayat percakapan di mode ini.</p>
                </div>
              ) : (
                filteredSessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => selectSession(sess)}
                    className={`text-left px-4 py-3.5 rounded-2xl text-sm transition-all truncate border outline-none shrink-0 ${
                      activeSession?.id === sess.id
                        ? "bg-white border-red-200 text-[#8B2020] font-black shadow-sm"
                        : "bg-transparent border-transparent text-gray-600 hover:bg-white hover:border-gray-200 font-medium"
                    }`}
                  >
                    {sess.title || "Percakapan Baru..."}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* AREA CHAT UTAMA */}
          <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 border-b border-gray-100 gap-4 shrink-0 bg-white z-10">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden bg-gray-100 p-2.5 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </button>
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl shrink-0">🤖</div>
                <div>
                  <h1 className="text-lg font-black text-[#8B2020] leading-tight">NutriBot AI</h1>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Klinik Gizi Digital</p>
                </div>
              </div>

              <div className="flex items-center bg-gray-100 rounded-xl p-1 w-full sm:w-auto shrink-0 shadow-inner">
                <button
                  onClick={() => handleTabChange("reguler")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                    activeTab === "reguler" ? "bg-white text-[#8B2020] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Umum
                </button>
                <button
                  onClick={() => handleTabChange("personal")}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                    activeTab === "personal" ? "bg-white text-[#8B2020] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Personal ({childData?.name || "Anak"})
                </button>
              </div>
            </div>

            {/* Body Chat */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto scroll-smooth bg-gray-50/50">
              {isHistoryLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#C28C8C]"></div>
                </div>
              ) : !activeSession ? (
                <div className="flex flex-col justify-center items-center h-full text-center px-4 animate-fade-in">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center text-4xl mb-6">✨</div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-2">Tanya Seputar Gizi Anak</h2>
                  <p className="text-sm text-gray-500 mb-8 max-w-md">
                    Anda berada di mode <span className="font-bold text-[#8B2020]">{activeTab === "reguler" ? "Umum" : "Personal Klinis"}</span>. 
                    Pilih salah satu pertanyaan di bawah ini untuk memulai atau ketik sendiri di kolom chat.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                    {SUGGESTIONS[activeTab].map((suggestText, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestText)}
                        className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#C28C8C] hover:shadow-md transition-all group flex items-start gap-3 active:scale-95 text-left"
                      >
                        <span className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">💬</span>
                        <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900 leading-relaxed">{suggestText}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] md:max-w-[75%] p-4 md:p-5 rounded-[1.5rem] text-[14px] leading-relaxed shadow-sm break-words ${
                          msg.sender === "user"
                            ? "bg-[#F4EFEB] text-gray-800 rounded-br-md"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                        }`}
                      >
                        {msg.sender === "bot" && msg.isNew ? (
                          <TypewriterText text={msg.text} onTyping={scrollToBottom} />
                        ) : (
                          <div dangerouslySetInnerHTML={formatText(msg.text)} />
                        )}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 text-gray-500 p-5 rounded-[1.5rem] rounded-bl-md shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#C28C8C] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#C28C8C] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 bg-[#C28C8C] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
                  )}

                  {activeSession && !activeSession.is_active && (
                    <div className="mt-8 flex flex-col items-center p-5 bg-red-50 border border-red-100 rounded-3xl mx-auto max-w-sm text-center shadow-sm">
                      <p className="text-xs text-red-700 font-black mb-3 uppercase tracking-wide">Sesi Konsultasi Berakhir</p>
                      <p className="text-sm text-gray-600 mb-4 font-medium">Batas maksimal 5 pertanyaan tercapai untuk menjaga konteks obrolan AI.</p>
                      <button
                        onClick={() => handleCreateNewSession(activeTab)}
                        className="px-6 py-2.5 bg-[#C28C8C] text-white rounded-xl text-sm font-black shadow-md hover:bg-[#a67474] transition-colors active:scale-95"
                      >
                        Buka Konsultasi Baru
                      </button>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input Chat Area */}
            <div className="p-3 md:p-5 bg-white border-t border-gray-100 shrink-0 z-10">
              {activeSession && activeSession.is_active && (
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Mode: <span className="text-[#8B2020]">{activeTab}</span>
                  </p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Limit: <span className={remainingQuestions <= 1 ? "text-red-500" : "text-[#8B2020]"}>{remainingQuestions}/5</span>
                  </p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ketik konsultasi gizi..."
                  disabled={isInputDisabled}
                  className="flex-1 w-full bg-gray-50 border border-gray-200 focus:border-[#C28C8C] focus:bg-white transition-colors rounded-2xl px-5 py-3.5 text-sm outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
                
                {/* Tombol Send dengan UI Dinamis (Terang/Pucat) */}
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className={`px-5 md:px-8 py-3.5 rounded-2xl font-black transition-all shrink-0 flex items-center justify-center min-w-[60px] md:min-w-[110px] ${
                    isButtonDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                      : "bg-[#C28C8C] text-white hover:bg-[#a67474] active:scale-95 shadow-md"
                  }`}
                  onClick={(e) => {
                    if (isSending) {
                      e.preventDefault();
                      showSpamWarning();
                    }
                  }}
                >
                  {isSending ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></div>
                  ) : (
                    <>
                      <span className="hidden md:inline">Kirim</span>
                      <svg className="w-5 h-5 inline md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <FooterDashboard />
    </div>
  );
}