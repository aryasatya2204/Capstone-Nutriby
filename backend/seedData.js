const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ubah format desimal indonesia ke internasional
function parseIndonesianFloat(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const sanitized = value
    .toString()
    .replace(",", ".")
    .replace(/[^0-9.-]+/g, "");
  return parseFloat(sanitized) || 0;
}

async function main() {
  console.log(
    "Memulai proses pemetaan alergen, bahan utama, dan import data...",
  );

  const rawJsonData = fs.readFileSync("./allergy_mapping.json", "utf8");
  const allergyMapping = JSON.parse(rawJsonData);

  const allAllergyItems = [];

  console.log("Menyimpan master data Alergi...");
  for (const [parentName, childrenItems] of Object.entries(allergyMapping)) {
    const category = await prisma.allergyCategory.upsert({
      where: { name: parentName },
      update: {},
      create: { name: parentName },
    });

    for (const childName of childrenItems) {
      await prisma.allergyItem.upsert({
        where: { item_name: childName },
        update: {},
        create: {
          item_name: childName,
          category_id: category.id,
        },
      });
      allAllergyItems.push({
        keyword: childName.toLowerCase(),
        categoryId: category.id,
      });
    }
  }

  const resultsCSV = [];

  fs.createReadStream("./Resep_MPASI.csv")
    .pipe(csv({ separator: ";", mapHeaders: ({ header }) => header.trim() }))
    .on("data", (data) => resultsCSV.push(data))
    .on("end", async () => {
      console.log(`Menganalisis ${resultsCSV.length} resep MPASI...`);

      try {
        for (const row of resultsCSV) {
          // scan potensi alergi
          const textToScan =
            `${row["name"] || ""} ${row["description"] || ""} ${row["Bahan_Masakan"] || ""} ${row["Bahan_Utama"] || ""} ${row["Potensi_Alergi"] || ""}`.toLowerCase();
          const detectedCategoryIds = new Set();

          for (const item of allAllergyItems) {
            if (textToScan.includes(item.keyword)) {
              detectedCategoryIds.add(item.categoryId);
            }
          }

          const pivotAlergiData = Array.from(detectedCategoryIds).map((id) => ({
            allergy_category_id: id,
          }));

          // olah data bahan utama
          const bahanUtamaRaw = row["Bahan_Utama"] || "";
          const bahanUtamaArray = bahanUtamaRaw
            .split(",")
            .map((b) => b.trim())
            .filter((b) => b !== "");

          const pivotBahanUtamaData = bahanUtamaArray.map((bahan) => ({
            ingredient: {
              connectOrCreate: {
                where: { name: bahan },
                create: { name: bahan },
              },
            },
          }));

          // simpan data resep ke database
          await prisma.recipe.create({
            data: {
              name: row["name"],
              description: row["description"] || "",
              bahan_masakan: row["Bahan_Masakan"] || "",
              instructions: row["instructions"] || "",

              min_age_months: parseInt(row["Usia_Min"]) || 6,
              max_age_months: parseInt(row["Usia_Max"]) || 24,
              texture: row["Tekstur"] || "Halus",
              est_price: parseIndonesianFloat(row["Est_Harga"]),

              calories: parseIndonesianFloat(row["Kalori_(kkal)"]),
              protein: parseIndonesianFloat(row["Protein_(g)"]),
              fat: parseIndonesianFloat(row["Lemak_(g)"]),
              iron: parseIndonesianFloat(row["Zat_Besi_(mg)"]),
              zinc: parseIndonesianFloat(row["Seng_(mg)"]),

              tags: row["Tag_Makanan"] || null,
              image_url: row["Image_URL"] || null,

              allergies: {
                create: pivotAlergiData,
              },
              ingredients: {
                create: pivotBahanUtamaData,
              },
            },
          });
        }

        console.log(
          '✅ Berhasil! Semua data resep dan kolom baru "bahan_masakan" telah terisi.',
        );
      } catch (error) {
        console.error("❌ Terjadi kesalahan saat menyimpan data:", error);
      } finally {
        await prisma.$disconnect();
      }
    });
}

main();
