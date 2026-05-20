const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");

// IMPORT MIDDLEWARE YANG BENAR (Tanpa kurung kurawal)
const authMiddleware = require("../middlewares/auth.middleware");

// 1. Buat Sesi Baru (Reguler / Personal)
router.post("/session", authMiddleware, chatbotController.createSession);

// 2. Kirim Pesan ke Chatbot
router.post("/chat", authMiddleware, chatbotController.sendMessage);

// 3. Lihat Riwayat Sesi berdasarkan Profil Anak
router.get("/sessions/:child_id", authMiddleware, chatbotController.getSessions);
router.get("/session/:session_id/messages", authMiddleware, chatbotController.getSessionMessages);

module.exports = router;