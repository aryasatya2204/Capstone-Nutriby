import dotenv from 'dotenv';
dotenv.config();

export default {
  datasource: {
    url: process.env.DATABASE_URL, // Pastikan nama ini sama dengan di file .env
  },
};