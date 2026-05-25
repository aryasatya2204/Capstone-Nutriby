const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { generateSystemInstruction } = require("../prompts/nutribot.persona");
const { generateChatResponse } = require("../services/gemini.service");
const { getAgeInMonths } = require("../utils/growth.helper");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// bikin sesi baru buat obrolan bot harian
const createSession = async (req, res) => {
  try {
    const { child_id, mode } = req.body;
    const userId = req.user.id;

    const child = await prisma.child.findFirst({
      where: { id: child_id, user_id: userId },
    });

    if (!child) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Data profil tidak ditemukan." });
    }

    const session = await prisma.botSession.create({
      data: {
        child_id,
        mode,
        message_count: 0,
        is_active: true,
      },
    });

    res
      .status(201)
      .json({ message: "Sesi chatbot baru berhasil dibuat", session });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal membuat sesi", error: error.message });
  }
};

// proses kirim chat user ke gemini dan validasi limit kuota
const sendMessage = async (req, res) => {
  try {
    const { session_id, message } = req.body;
    const userId = req.user.id;

    const session = await prisma.botSession.findUnique({
      where: { id: session_id },
      include: { child: true },
    });

    if (!session || session.child.user_id !== userId) {
      return res
        .status(404)
        .json({ message: "Sesi tidak ditemukan atau akses ditolak." });
    }

    if (session.message_count >= 5 || !session.is_active) {
      if (session.is_active) {
        await prisma.botSession.update({
          where: { id: session_id },
          data: { is_active: false },
        });
      }
      return res
        .status(403)
        .json({
          message:
            "Sesi ini telah mencapai batas 5 pertanyaan. Silakan buka sesi baru.",
        });
    }

    let sessionTitle = session.title;
    if (session.message_count === 0) {
      sessionTitle = message.split(" ").slice(0, 5).join(" ") + "...";
    }

    let childData = null;
    if (session.mode === "personal") {
      const fullChildProfile = await prisma.child.findUnique({
        where: { id: session.child_id },
        include: {
          growth_logs: { orderBy: { record_date: "desc" }, take: 1 },
          allergies: { include: { allergy_category: true } },
          preferences: { include: { ingredient: true } },
        },
      });

      if (fullChildProfile && fullChildProfile.growth_logs.length > 0) {
        childData = {
          name: fullChildProfile.name,
          gender: fullChildProfile.gender,
          ageInMonths: getAgeInMonths(fullChildProfile.dob),
          latestLog: fullChildProfile.growth_logs[0],
          allergies: fullChildProfile.allergies.map(
            (a) => a.allergy_category.name,
          ),
          preferences: fullChildProfile.preferences.map(
            (p) => p.ingredient.name,
          ),
        };
      }
    }

    const systemInstruction = generateSystemInstruction(
      session.mode,
      childData,
    );
    const chatHistory = await prisma.botMessage.findMany({
      where: { session_id },
      orderBy: { created_at: "asc" },
    });

    await prisma.$transaction([
      prisma.botMessage.create({
        data: { session_id, sender: "user", message },
      }),
      prisma.botSession.update({
        where: { id: session_id },
        data: {
          title: sessionTitle,
          message_count: { increment: 1 },
        },
      }),
    ]);

    const aiResponse = await generateChatResponse(
      systemInstruction,
      chatHistory,
      message,
    );

    const savedBotMessage = await prisma.botMessage.create({
      data: { session_id, sender: "bot", message: aiResponse },
    });

    res.status(200).json({
      reply: savedBotMessage.message,
      remaining_questions: 5 - (session.message_count + 1),
    });
  } catch (error) {
    console.error("Chatbot Error:", error);
    res
      .status(500)
      .json({ message: "Gagal memproses pesan", error: error.message });
  }
};

// ambil semua riwayat daftar obrolan konsultasi anak
const getSessions = async (req, res) => {
  try {
    const { child_id } = req.params;
    const sessions = await prisma.botSession.findMany({
      where: { child_id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        mode: true,
        is_active: true,
        message_count: true,
        created_at: true,
      },
    });
    res.status(200).json(sessions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mengambil riwayat", error: error.message });
  }
};

// tarik isi teks chat lengkap di dalam satu sesi
const getSessionMessages = async (req, res) => {
  try {
    const { session_id } = req.params;
    const messages = await prisma.botMessage.findMany({
      where: { session_id },
      orderBy: { created_at: "asc" },
    });
    res.status(200).json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal memuat pesan", error: error.message });
  }
};

module.exports = {
  createSession,
  sendMessage,
  getSessions,
  getSessionMessages,
};
