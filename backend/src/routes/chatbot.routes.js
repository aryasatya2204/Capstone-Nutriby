const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// route buat manajemen sesi dan kirim pesan chatbot
router.post("/session", authMiddleware, chatbotController.createSession);
router.post("/chat", authMiddleware, chatbotController.sendMessage);

// route buat ambil riwayat chat dan sesi anak
router.get(
  "/sessions/:child_id",
  authMiddleware,
  chatbotController.getSessions,
);
router.get(
  "/session/:session_id/messages",
  authMiddleware,
  chatbotController.getSessionMessages,
);

module.exports = router;
