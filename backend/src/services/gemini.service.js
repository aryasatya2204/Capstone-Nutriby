const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Service untuk menangani obrolan dengan Gemini
 * @param {string} systemInstruction - Aturan persona dan data personal
 * @param {Array} chatHistory - Histori pesan dari database
 * @param {string} newMessage - Pesan baru dari user
 */
const generateChatResponse = async (systemInstruction, chatHistory, newMessage) => {
  // Gunakan model yang mendukung systemInstruction (1.5-flash atau 2.5-flash)
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemInstruction,
  });

  // Format histori database menjadi format yang diterima SDK Gemini
  const formattedHistory = chatHistory.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.message }]
  }));

  // Mulai sesi obrolan dengan histori yang sudah ada
  const chat = model.startChat({
    history: formattedHistory,
  });

  // Kirim pesan baru
  const result = await chat.sendMessage(newMessage);
  return result.response.text();
};

module.exports = { generateChatResponse };