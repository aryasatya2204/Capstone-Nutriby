const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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
  console.log("Memulai proses sinkronisasi data...");

  const rawJsonData = fs.readFileSync("./allergy_mapping.json", "utf8");
  const allergyMapping = JSON.parse(rawJsonData);
  const allAllergyItems = [];

  // 1. Setup Master Data Alergi
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
        create: { item_name: childName, category_id: category.id },
      });
      allAllergyItems.push({ keyword: childName.toLowerCase(), categoryId: category.id });
    }
  }

  // 2. Proses CSV
  const resultsCSV = [];
  fs.createReadStream("./Resep_MPASI.csv")
    .pipe(csv({ separator: ";", mapHeaders: ({ header }) => header.trim() }))
    .on("data", (data) => resultsCSV.push(data))
    .on("end", async () => {
      try {
        for (const row of resultsCSV) {
          const name = row["Nama_Menu"];
          if (!name) continue;

          // scan potensi alergi
          const textToScan =
            `${row["Nama_Menu"] || ""} ${row["Deskripsi"] || ""} ${row["Bahan_Masakan"] || ""} ${row["Bahan_Utama"] || ""} ${row["Potensi_Alergi"] || ""}`.toLowerCase();
          const detectedCategoryIds = new Set();
          allAllergyItems.forEach((item) => {
            if (textToScan.includes(item.keyword)) detectedCategoryIds.add(item.categoryId);
          });

          const pivotAlergiData = Array.from(detectedCategoryIds).map((id) => ({
            allergy_category_id: id,
          }));

          const bahanUtamaArray = (row["Bahan_Utama"] || "")
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

          // 3. Update atau Create
          const existingRecipe = await prisma.recipe.findFirst({
            where: { name },
          });

          if (existingRecipe) {
            // hanya update image kalau masih kosong dan CSV punya URL baru
            if ((!existingRecipe.image_url || existingRecipe.image_url === "") && row["Image_URL"]) {
              await prisma.recipe.update({
                where: { id: existingRecipe.id },
                data: { image_url: row["Image_URL"] },
              });
              console.log(`✅ Gambar diperbarui: ${name}`);
            }
          } else {
            // simpan resep baru ke database
            await prisma.recipe.create({
              data: {
                name: row["Nama_Menu"],
                description: row["Deskripsi"] || "",
                bahan_masakan: row["Bahan_Masakan"] || "",
                instructions: row["Cara_Masak"] || "",
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
                allergies: { create: pivotAlergiData },
                ingredients: { create: pivotBahanUtamaData },
              },
            });
            console.log(`✨ Resep baru dibuat: ${name}`);
          }
        }
        console.log("🏁 Proses selesai.");
      } catch (error) {
        console.error("❌ Error:", error);
      } finally {
        await prisma.$disconnect();
      }
    });
}

main();
