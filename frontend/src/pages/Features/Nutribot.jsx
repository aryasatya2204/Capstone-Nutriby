import { useState, useEffect, useRef } from "react";
import NavbarDashboard from "../../components/NavbarDashboard";
import FooterDashboard from "../../components/FooterDashboard";

export default function Nutribot() {
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

  // State untuk Mobile Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const chatEndRef = useRef(null);

  // 1. Auto-scroll ke pesan terbaru
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // 2. Fetch Profil Anak & Riwayat Sesi
  useEffect(() => {
    const initData = async () => {
      try {
        const token = localStorage.getItem("token");
        const resChild = await fetch("http://localhost:3000/api/children", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const childArr = await resChild.json();
        
        if (childArr && childArr.length > 0) {
          const child = childArr[0];
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

  const loadAllSessions = async (childId, token) => {
    try {
      const res = await fetch(`http://localhost:3000/api/bot/sessions/${childId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Pastikan backend mengembalikan array, bukan error message
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (error) {
      console.error("Gagal memuat riwayat", error);
    }
  };

  // 3. Memilih Sesi dan Memuat Pesannya
  const selectSession = async (session) => {
    setActiveSession(session);
    setActiveTab(session.mode);
    setIsSidebarOpen(false); // Tutup sidebar di HP saat sesi dipilih
    setIsHistoryLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/api/bot/session/${session.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.map(msg => ({
          sender: msg.sender,
          text: msg.message
        }));
        
        if (formattedMessages.length === 0) {
          setMessages([{ 
            sender: "bot", 
            text: `Halo! Saya NutriBot. Saat ini kita berada di mode **${session.mode === 'personal' ? 'Personal' : 'Reguler'}**. Ada yang bisa saya bantu terkait gizi atau tumbuh kembang si kecil?` 
          }]);
        } else {
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error("Gagal memuat isi pesan", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 4. Membuat Sesi Baru
  const handleCreateNewSession = async (selectedMode = activeTab) => {
    if (!childData) return;
    setIsHistoryLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/bot/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ child_id: childData.id, mode: selectedMode })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSessions(prev => [data.session, ...prev]);
        selectSession(data.session);
      } else {
        alert(data.message || "Gagal membuat sesi baru");
      }
    } catch (error) {
      alert("Gagal koneksi ke server.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // 5. Mengirim Pesan
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !activeSession || !activeSession.is_active) return;

    const userText = inputMessage;
    setInputMessage(""); 
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setIsSending(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3000/api/bot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: activeSession.id, message: userText })
      });
      
      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, { sender: "bot", text: data.reply }]);
        setActiveSession(prev => ({ 
          ...prev, 
          message_count: prev.message_count + 1,
          is_active: data.remaining_questions > 0
        }));
      } else {
        if (res.status === 403) {
          setActiveSession(prev => ({ ...prev, is_active: false }));
        }
        setMessages(prev => [...prev, { sender: "bot", text: data.message }]);
      }
      
      // Refresh list sesi di background untuk update judul percakapan dari kata pertama
      loadAllSessions(childData.id, token);

    } catch (error) {
      setMessages(prev => [...prev, { sender: "bot", text: "Gangguan koneksi. Silakan coba lagi." }]);
    } finally {
      setIsSending(false);
    }
  };

  // Formatter Teks Balasan AI agar rapi (Paragraf & Bold)
  const formatText = (text) => {
    if (!text) return { __html: "" };
    // Ubah **teks** jadi bold, dan \n jadi <br>
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
    return { __html: formatted };
  };

  // Filter Sesi berdasarkan Tab
  const filteredSessions = sessions.filter(s => s.mode === activeTab);
  const remainingQuestions = activeSession ? Math.max(0, 5 - activeSession.message_count) : 0;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4EFEB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2020] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F4EFEB] font-['Lato']">
      <NavbarDashboard />
      
      {/* Container utama dengan batas height agar tidak overlap dengan Footer */}
      <main className="flex-grow flex justify-center p-2 md:p-6 lg:p-8 h-[calc(100vh-80px)]">
        
        <div className="w-full max-w-[1400px] flex gap-0 md:gap-6 relative h-full">
          
          {/* ================= OVERLAY MOBILE ================= */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* ================= SIDEBAR (MOBILE & DESKTOP) ================= */}
          {/* MOBILE: Muncul dari kiri (fixed z-50), DESKTOP: Tetap di kiri (shrink-0) */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col h-full shadow-2xl transition-transform duration-300 ease-in-out transform
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0 md:flex md:w-[320px] md:shrink-0 md:rounded-3xl md:p-5 md:shadow-sm md:border md:border-gray-100
          `}>
            
            {/* Header Sidebar Mobile */}
            <div className="md:hidden flex justify-between items-center p-5 border-b border-gray-100 bg-white">
              <span className="font-bold text-[#8B2020] text-lg">Riwayat Percakapan</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-5 md:p-0 border-b border-gray-100 md:border-none pb-4">
              <button 
                onClick={() => handleCreateNewSession(activeTab)}
                className="w-full bg-[#C28C8C] text-white py-3.5 rounded-full font-bold shadow-md hover:bg-[#a67474] transition-all flex items-center justify-center gap-2 border-none outline-none active:scale-95"
              >
                <span>+</span> Sesi Baru
              </button>
            </div>

            {/* List Sesi yang bisa di-scroll */}
            <div className="flex-grow overflow-y-auto px-5 md:px-1 mt-2 flex flex-col gap-2 pb-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 shrink-0 hidden md:block">
                Riwayat Sesi {activeTab === 'reguler' ? 'Umum' : 'Personal'}
              </p>
              
              {filteredSessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 shrink-0 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Belum ada percakapan.
                </p>
              ) : (
                filteredSessions.map(sess => (
                  <button
                    key={sess.id}
                    onClick={() => selectSession(sess)}
                    className={`shrink-0 text-left p-3.5 rounded-2xl text-sm transition-all truncate border outline-none ${
                      activeSession?.id === sess.id 
                      ? 'bg-red-50 border-red-200 text-[#8B2020] font-bold shadow-sm' 
                      : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {sess.title || "Percakapan Baru..."}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ================= AREA CHAT UTAMA ================= */}
          <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full relative">
            
            {/* HEADER CHAT */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-5 border-b border-gray-100 gap-4">
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden bg-gray-100 p-2.5 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ☰
                </button>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl shrink-0">
                  🤖
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-[#8B2020] leading-tight">NutriBot</h1>
                  <p className="text-xs text-gray-500">Asisten Gizi Cerdas Anda</p>
                </div>
              </div>

              {/* TABS */}
              <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 p-1.5 w-full md:w-auto overflow-x-auto shrink-0">
                <button 
                  onClick={() => { setActiveTab("reguler"); setIsSidebarOpen(false); }}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-full text-[13px] md:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'reguler' ? 'bg-white border border-gray-300 text-[#8B2020] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Umum (Reguler)
                </button>
                <button 
                  onClick={() => { setActiveTab("personal"); setIsSidebarOpen(false); }}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-full text-[13px] md:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'personal' ? 'bg-[#F4EFEB] text-[#8B2020] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Personal ({childData?.name || 'Anak'})
                </button>
              </div>
            </div>

            {/* BODY CHAT */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#FAFAFA] scroll-smooth">
              {isHistoryLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#C28C8C]"></div>
                </div>
              ) : !activeSession ? (
                <div className="flex flex-col justify-center items-center h-full text-center opacity-60 px-4">
                  <div className="text-5xl mb-4">💬</div>
                  <p className="text-gray-500 mb-6 max-w-sm">Pilih percakapan dari riwayat atau buat sesi baru untuk berkonsultasi mengenai gizi si kecil.</p>
                  <button onClick={() => handleCreateNewSession(activeTab)} className="px-6 py-3 bg-[#C28C8C] text-white rounded-full font-bold shadow-md">Mulai Konsultasi Baru</button>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`mb-6 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[90%] md:max-w-[75%] p-4 rounded-3xl text-[14px] md:text-[15px] leading-relaxed shadow-sm break-words ${
                          msg.sender === 'user' 
                          ? 'bg-[#F4EFEB] text-gray-800 rounded-br-sm' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                        }`}
                        dangerouslySetInnerHTML={formatText(msg.text)}
                      />
                    </div>
                  ))}
                  
                  {isSending && (
                    <div className="flex justify-start mb-6">
                      <div className="bg-white border border-gray-200 text-gray-500 p-4 rounded-3xl rounded-bl-sm shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#C28C8C] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#C28C8C] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-[#C28C8C] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}

                  {/* Peringatan Limit 5 Token */}
                  {activeSession && !activeSession.is_active && (
                    <div className="mt-6 flex flex-col items-center p-5 bg-red-50 border border-red-100 rounded-2xl mx-auto max-w-sm text-center shadow-sm mb-4">
                      <p className="text-sm text-red-700 font-bold mb-3">Sesi ini telah mencapai batas maksimal (5 pertanyaan).</p>
                      <button onClick={() => handleCreateNewSession(activeTab)} className="px-6 py-2.5 bg-[#C28C8C] text-white rounded-full text-sm font-bold shadow-md hover:bg-[#a67474] transition-colors active:scale-95">
                        Buka Konsultasi Baru
                      </button>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* INPUT AREA */}
            <div className="p-4 md:p-5 border-t border-gray-100 bg-white shrink-0">
              {activeSession && (
                <p className="text-[11px] font-bold text-gray-400 mb-3 ml-2 uppercase tracking-wide">
                  SISA PERTANYAAN: <span className={remainingQuestions <= 1 ? "text-red-500" : "text-[#8B2020]"}>{remainingQuestions}/5</span>
                </p>
              )}
              
              <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Tanyakan sesuatu tentang gizi si kecil..."
                  disabled={!activeSession || !activeSession.is_active || isSending || isHistoryLoading}
                  className="flex-1 min-w-0 bg-[#F6F4F1] border border-transparent focus:border-gray-300 focus:bg-white transition-colors rounded-full px-5 py-3.5 md:py-4 text-sm md:text-base outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!activeSession || !activeSession.is_active || isSending || !inputMessage.trim() || isHistoryLoading}
                  className="bg-[#C28C8C] text-white px-5 md:px-8 py-3.5 md:py-4 rounded-full font-bold hover:bg-[#a67474] transition-all disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[70px] md:min-w-[110px] active:scale-95"
                >
                  {isSending ? (
                     <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <span className="hidden md:inline">Kirim</span>
                      <span className="inline md:hidden text-lg leading-none">➤</span>
                    </>
                  )}
                </button>
              </form>
            </div>
            
          </div>
        </div>
      </main>
      
      {/* Jika kamu ingin menyembunyikan Footer di halaman chat, kamu bisa hapus baris ini */}
      <FooterDashboard />
    </div>
  );
}