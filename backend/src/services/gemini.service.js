const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// fungsi buat nyambungin obrolan ke gemini ai
const generateChatResponse = async (
  systemInstruction,
  chatHistory,
  newMessage,
) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemInstruction,
  });

  // samain format histori database ke format gemini sdk
  const formattedHistory = chatHistory.map((msg) => ({
    role: msg.sender === "user" ? "user" : "model",
    parts: [{ text: msg.message }],
  }));

  // mulai sesi chat pakai histori lama
  const chat = model.startChat({
    history: formattedHistory,
  });

  // kirim pesan baru dan ambil balesannya
  const result = await chat.sendMessage(newMessage);
  return result.response.text();
};

module.exports = { generateChatResponse };
