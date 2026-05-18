const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Mengambil kandidat resep yang AMAN (Sesuai umur & Bebas Alergi)
 * lalu memformatnya agar sesuai dengan Pydantic Schema FastAPI.
 */
const getSafeCandidateRecipes = async (ageInMonths, allergyCategoryIds) => {
  // Query Prisma: Filter Deterministic
  const recipes = await prisma.recipe.findMany({
    where: {
      // 1. Filter Umur
      min_age_months: { lte: ageInMonths },
      max_age_months: { gte: ageInMonths },
      
      // 2. Filter Alergi (Hard Constraint)
      // JANGAN ambil resep yang berelasi dengan kategori alergi anak
      ...(allergyCategoryIds.length > 0 && {
        NOT: {
          allergies: {
            some: { allergy_category_id: { in: allergyCategoryIds } }
          }
        }
      })
    },
    include: {
      ingredients: { include: { ingredient: true } },
      allergies: { include: { allergy_category: true } }
    }
  });

  // Format menjadi JSON sesuai schema RecipeCandidate di Pydantic main.py
  const formattedCandidates = recipes.map(r => ({
    id: r.id,
    min_age_months: r.min_age_months,
    max_age_months: r.max_age_months,
    est_price: parseFloat(r.est_price),
    
    // Nutrisi
    calories: parseFloat(r.calories),
    protein: parseFloat(r.protein),
    fat: parseFloat(r.fat),
    iron: parseFloat(r.iron),
    zinc: parseFloat(r.zinc),
    
    // Relasi Array String (Dibutuhkan oleh MultiLabelBinarizer di FastAPI)
    ingredients: r.ingredients.map(i => i.ingredient.name),
    allergies: r.allergies.map(a => a.allergy_category.name)
  }));

  return {
    raw_count: recipes.length,
    candidates: formattedCandidates
  };
};

module.exports = { getSafeCandidateRecipes };