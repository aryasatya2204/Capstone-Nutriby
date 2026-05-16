const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// INISIALISASI PRISMA 7 (Wajib pakai Adapter)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_nutriby_super_aman_123';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Coba verifikasi sebagai JWT Internal
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (jwtError) {
      // Lanjut cek ke Google jika bukan JWT internal
    }

    // 2. Coba verifikasi sebagai Google ID Token
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      const user = await prisma.user.findUnique({
        where: { email: payload.email }
      });

      if (!user) {
        return res.status(404).json({ message: "Akun Google valid, tapi belum terdaftar di Nutriby." });
      }

      req.user = { id: user.id, email: user.email, name: user.name };
      return next();
    } catch (googleError) {
      return res.status(403).json({ 
        message: "Token tidak valid.", 
        details: "Bukan Token JWT Nutriby maupun Token Google yang sah." 
      });
    }

  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error pada Middleware", error: error.message });
  }
};

module.exports = authMiddleware;