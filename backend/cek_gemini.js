const axios = require('axios');

// Ganti string di bawah ini secara manual sementara dengan API Key Anda yang ada di .env
// (Hanya untuk testing 1 menit, setelah itu file ini bisa dihapus)
const API_KEY = "AIzaSyCCE6v7X7J1FIcUg4tuKBXNsymdDHugGcg"; 

async function checkAvailableModels() {
  try {
    console.log("Mencari model Gemini yang tersedia...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await axios.get(url);
    
    // Filter hanya model yang bisa digunakan untuk generate teks (generateContent)
    const availableModels = response.data.models
      .filter(m => m.supportedGenerationMethods.includes("generateContent"))
      .map(m => m.name.replace('models/', '')); // Membersihkan prefix 'models/'
      
    console.log("\n✅ BERHASIL! Gunakan salah satu dari string model di bawah ini:");
    console.log(availableModels);
    
  } catch (error) {
    console.error("❌ Gagal menghubungi Google:", error.response?.data || error.message);
  }
}

checkAvailableModels();