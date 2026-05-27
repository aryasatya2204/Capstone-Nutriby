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
          const name = row["name"];
          if (!name) continue;

          // Siapkan data relasi
          const textToScan = `${name} ${row["description"] || ""} ${row["Bahan_Masakan"] || ""} ${row["Bahan_Utama"] || ""}`.toLowerCase();
          const detectedCategoryIds = new Set();
          allAllergyItems.forEach(item => { if (textToScan.includes(item.keyword)) detectedCategoryIds.add(item.categoryId); });

          const pivotAlergiData = Array.from(detectedCategoryIds).map((id) => ({ allergy_category_id: id }));
          const bahanUtamaArray = (row["Bahan_Utama"] || "").split(",").map((b) => b.trim()).filter((b) => b !== "");
          const pivotBahanUtamaData = bahanUtamaArray.map((bahan) => ({
            ingredient: { connectOrCreate: { where: { name: bahan }, create: { name: bahan } } }
          }));

          // 3. Update atau Create dengan logika gambar
          const existingRecipe = await prisma.recipe.findFirst({ 
  where: { name: name } 
});

          if (existingRecipe) {
            // Hanya update jika image_url saat ini null/kosong dan ada URL baru di CSV
            if ((!existingRecipe.image_url || existingRecipe.image_url === "") && row["Image_URL"]) {
              await prisma.recipe.update({
                where: { id: existingRecipe.id },
                data: { image_url: row["Image_URL"] }
              });
              console.log(`✅ Gambar diperbarui untuk: ${name}`);
            }
          } else {
            // Create baru
            await prisma.recipe.create({
              data: {
                name: name,
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