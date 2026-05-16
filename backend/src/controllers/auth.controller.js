const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_nutriby_super_aman_123';

// --- LOGIN VIA GOOGLE ---
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body; // Token dari Frontend

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: provider_id } = payload;

    // Cari atau Buat User Baru (Upsert)
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          auth_provider: "google",
          provider_id,
        }
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      message: "Login Google Berhasil!",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(400).json({ message: "Google Login Gagal", error: error.message });
  }
};

// ==========================================
// 1. REGISTRASI MANUAL
// ==========================================
const registerManual = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        auth_provider: "manual"
      }
    });

    res.status(201).json({
      message: "Registrasi berhasil!",
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    });
  } catch (error) {
    res.status(500).json({ message: "Error saat registrasi", error: error.message });
  }
};

// ==========================================
// 2. LOGIN MANUAL
// ==========================================
const loginManual = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Akun tidak ditemukan!" });
    }

    if (user.auth_provider === 'google' && !user.password) {
      return res.status(400).json({ message: "Akun ini terdaftar dengan Google. Silakan Login via Google." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah!" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login berhasil!",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: "Error saat login", error: error.message });
  }
};

// BAGIAN INI YANG KEMUNGKINAN HILANG SEBELUMNYA 👇
module.exports = { registerManual, loginManual, googleLogin };