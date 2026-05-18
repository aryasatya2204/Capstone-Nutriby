const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Mengimpor fungsi pembantu dari growth.helper.js
const { 
  getAgeInMonths, 
  calculateLMS, 
  calculateDynamicBudget, 
  calculateWaterlowCalories,
  getStatusWFA, 
  getStatusHFA, 
  getStatusWFH, 
  getGlobalStatus
} = require('../utils/growth.helper');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createChild = async (req, res) => {
  try {
    const { 
      name, dob, gender, parent_salary, 
      tinggi, berat, 
      allergy_ids,     // Array angka, misal: [1, 2]
      preference_ids   // Array angka, misal: [5]
    } = req.body;
    
    const userId = req.user.id;
    const beratAktual = parseFloat(berat);
    const tinggiAktual = parseFloat(tinggi);

    // ==========================================
    // 1. VALIDASI ALERGI VS MAKANAN KESUKAAN
    // ==========================================
    if (allergy_ids && allergy_ids.length > 0 && preference_ids && preference_ids.length > 0) {
      const allergies = await prisma.allergyCategory.findMany({
        where: { id: { in: allergy_ids } }
      });
      
      const preferences = await prisma.ingredient.findMany({
        where: { id: { in: preference_ids } }
      });

      for (const pref of preferences) {
        const prefNameLower = pref.name.toLowerCase();
        const clash = allergies.find(al => prefNameLower.includes(al.name.toLowerCase()));
        
        if (clash) {
          return res.status(400).json({ 
            message: "Validasi Gagal: Data kontradiktif!", 
            details: `Anak alergi terhadap kategori '${clash.name}', sehingga bahan '${pref.name}' dilarang menjadi makanan kesukaan.`
          });
        }
      }
    }

    // ==========================================
    // 2. HITUNG UMUR & TARIK DATA MASTER (WHO & AKG)
    // ==========================================
    const ageInMonths = getAgeInMonths(dob);
    
    // Pembulatan tinggi ke kelipatan 0.5 terdekat untuk mencocokkan standar tabel WFH WHO
    const tinggiRounded = Math.round(tinggiAktual * 2) / 2;

    // Mengambil 4 data master sekaligus secara paralel agar cepat
    const [whoWFA, whoHFA, whoWFH, akgData] = await Promise.all([
      prisma.whoStandard.findFirst({ where: { indicator: 'WFA', gender, month_or_length: ageInMonths } }),
      prisma.whoStandard.findFirst({ where: { indicator: 'HFA', gender, month_or_length: ageInMonths } }),
      prisma.whoStandard.findFirst({ where: { indicator: 'WFH', gender, month_or_length: tinggiRounded } }),
      prisma.akgStandard.findFirst({ 
        where: { gender, min_age_months: { lte: ageInMonths }, max_age_months: { gte: ageInMonths } } 
      })
    ]);

    // Jika database master belum diisi data yang cocok, hentikan proses
    if (!whoWFA || !whoHFA || !whoWFH || !akgData) {
      return res.status(404).json({ 
        message: "Gagal mengkalkulasi. Data Standar WHO atau AKG untuk rentang umur/tinggi ini belum tersedia di database." 
      });
    }

    // ==========================================
    // 3. KALKULASI Z-SCORE, STATUS & BUDGET
    // ==========================================
    const idealWeight = parseFloat(whoWFH.m); // Nilai Median dari tabel WFH sebagai BBI
    
    // Hitung Z-Score LMS
    const zscoreWFA = calculateLMS(beratAktual, whoWFA.l, whoWFA.m, whoWFA.s);
    const zscoreHFA = calculateLMS(tinggiAktual, whoHFA.l, whoHFA.m, whoHFA.s);
    const zscoreWFH = calculateLMS(beratAktual, whoWFH.l, whoWFH.m, whoWFH.s);

    // Ambil Status
    const statusWFA = getStatusWFA(zscoreWFA);
    const statusHFA = getStatusHFA(zscoreHFA);
    const statusWFH = getStatusWFH(zscoreWFH);
    const globalStatus = getGlobalStatus(statusWFH, statusHFA);

    // Hitung Budget (Fuzzy Logic)
    const budgetInfo = calculateDynamicBudget(zscoreWFH, parent_salary);

    // ==========================================
    // 4. KALKULASI KEBUTUHAN GIZI (AKG, BBI & WATERLOW)
    // ==========================================
    const akgBaseWeight = parseFloat(akgData.base_weight_kg);

    // Kebutuhan dasar per Kg (diambil dari tabel AKG)
    const kkalPerKg = parseFloat(akgData.calories) / akgBaseWeight;
    const proteinPerKg = parseFloat(akgData.protein) / akgBaseWeight;
    const lemakPerKg = parseFloat(akgData.fat) / akgBaseWeight;

    // 1. Kalori (Menggunakan Waterlow Catch-up jika WFH < -2.0, jika normal pakai BBI)
    const targetKalori = calculateWaterlowCalories(zscoreWFH, beratAktual, idealWeight, kkalPerKg);

    // 2. Makro Nutrien (Protein & Lemak) dihitung menggunakan BBI secara keseluruhan
    const targetProtein = proteinPerKg * idealWeight;
    const targetLemak = lemakPerKg * idealWeight;

    // 3. Mikro Nutrien (Zinc & Iron) langsung mengambil nilai mutlak dari tabel AKG
    const targetZinc = parseFloat(akgData.zinc);
    const targetBesi = parseFloat(akgData.iron);

    // ==========================================
    // 5. SIMPAN KE DATABASE (TRANSACTION)
    // ==========================================
    const result = await prisma.$transaction(async (tx) => {
      const child = await tx.child.create({
        data: {
          user_id: userId,
          name,
          dob: new Date(dob),
          gender, 
          parent_salary: parseFloat(parent_salary),
          optimal_budget_cache: budgetInfo.optimal_budget, // Update cache budget
          
          preferences: { 
            create: preference_ids ? preference_ids.map(id => ({ ingredient_id: id })) : []
          },
          
          allergies: {
            create: allergy_ids ? allergy_ids.map(id => ({ allergy_category_id: id })) : []
          },

          growth_logs: {
            create: {
              record_date: new Date(),
              tinggi: tinggiAktual,
              berat: beratAktual,
              bbi_kg: idealWeight,
              
              // Status & Z-Score
              zscore_wfa: zscoreWFA, status_wfa: statusWFA,
              zscore_hfa: zscoreHFA, status_hfa: statusHFA,
              zscore_wfh: zscoreWFH, status_wfh: statusWFH,
              global_status: globalStatus,
              
              // Kebutuhan Gizi
              target_kalori: targetKalori,
              target_protein: targetProtein,
              target_lemak: targetLemak,
              target_zinc: targetZinc,
              target_besi: targetBesi
            }
          }
        },
        include: { 
          allergies: { include: { allergy_category: true } }, 
          preferences: { include: { ingredient: true } }, 
          growth_logs: true 
        }
      });
      return child;
    });

    res.status(201).json({ 
      message: "Data anak beserta status pertumbuhan & target gizi berhasil disimpan!",
      calculations: {
        persentase_gaji: `${budgetInfo.persentase_gaji}%`,
        budget_bulanan_rekomendasi: Math.round(budgetInfo.optimal_budget)
      },
      data: result 
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambah data anak", error: error.message });
  }
};

const getChildren = async (req, res) => {
  try {
    const children = await prisma.child.findMany({
      where: { user_id: req.user.id },
      include: { 
        growth_logs: {
          orderBy: { record_date: 'desc' },
          take: 1
        }, 
        allergies: { include: { allergy_category: true } }, 
        preferences: { include: { ingredient: true } } 
      }
    });
    res.status(200).json(children);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data anak", error: error.message });
  }
};

module.exports = { createChild, getChildren };