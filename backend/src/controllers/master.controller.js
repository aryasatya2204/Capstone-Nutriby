const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const getAllergies = async (req, res) => {
  try {
    const allergies = await prisma.allergyCategory.findMany({
      include: { items: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(allergies);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Gagal mengambil data alergi", error: error.message });
  }
};

const getIngredients = async (req, res) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: "asc" },
    });
    res.status(200).json(ingredients);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Gagal mengambil data bahan makanan",
        error: error.message,
      });
  }
};

module.exports = { getAllergies, getIngredients };
