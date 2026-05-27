# 👶 Nutriby: Smart Parenting & Child Nutrition Companion

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20Vite-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20Express-339933?logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)
![Python](https://img.shields.io/badge/AI_Engine-Python-3776AB?logo=python&logoColor=white)

Nutriby adalah aplikasi platform terpadu yang dirancang khusus untuk mendampingi orang tua dalam memantau rekam jejak pertumbuhan anak, merencanakan jadwal MPASI mingguan, dan memberikan konsultasi gizi cerdas berbasis AI. Dibangun untuk menyederhanakan perjalanan pengasuhan anak Anda dengan data dan teknologi.

---

## 📑 Table of Contents

- [About The Project](#-about-the-project)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage & Screenshots](#-usage--screenshots)
- [License](#-license)
- [Contact](#-contact)

---

## 📖 About The Project

Banyak orang tua modern kesulitan mencari panduan nutrisi yang terpercaya, disesuaikan dengan kondisi medis anak (seperti alergi), serta kesulitan melacak perkembangan fisik anak secara konsisten. **Nutriby** memecahkan masalah ini dengan menyatukan pelacakan pertumbuhan berstandar klinis, generasi rencana makan (Meal Planner), dan asisten AI (_Nutribot_) dalam satu aplikasi terpusat.

Aplikasi ini bertujuan untuk memberikan rasa aman dan kemudahan bagi orang tua dalam memastikan tumbuh kembang anak yang optimal dan terhindar dari _stunting_.

---

## 💻 Tech Stack

Proyek ini dibangun menggunakan arsitektur _microservices-lite_ dengan pemisahan antara Frontend, Backend, dan engine AI.

### Frontend

| Teknologi           | Keterangan                                                      |
| ------------------- | --------------------------------------------------------------- |
| **React.js (Vite)** | Framework utama untuk antarmuka pengguna yang reaktif dan cepat |
| **Tailwind CSS**    | _Utility-first_ CSS untuk gaya antarmuka                        |

### Backend

| Teknologi                | Keterangan                                                      |
| ------------------------ | --------------------------------------------------------------- |
| **Node.js & Express.js** | _Runtime_ dan _framework_ server utama untuk RESTful API        |
| **Prisma ORM**           | Manajemen basis data _type-safe_ dan pemodelan skema relasional |
| **Gemini AI API**        | Layanan integrasi LLM cerdas untuk fitur _Nutribot_             |

### AI & Data Processing

| Teknologi                 | Keterangan                                                       |
| ------------------------- | ---------------------------------------------------------------- |
| **Python**                | Lingkungan eksekusi _machine learning_                           |
| **Scikit-learn / Pickle** | Penyimpanan dan eksekusi model skalabilitas data (`scalers.pkl`) |

---

## ✨ Key Features

- 📈 **Growth Tracker** — Pantau tinggi dan berat badan anak dengan grafik perkembangan visual, lengkap dengan kemampuan ekspor laporan ke format PDF.
- 🤖 **Nutribot (AI Assistant)** — Konsultan gizi AI 24/7 yang dipersonalisasi menggunakan persona khusus pendamping orang tua.
- 🍲 **MPASI & Weekly Meal Planner** — Rekomendasi resep dan jadwal makan cerdas yang disesuaikan dengan usia dan pemetaan alergi anak (_Allergy Mapping_).
- 👦 **Child Profile Management** — Kelola beberapa profil anak sekaligus dengan metrik nutrisi yang terisolasi dan spesifik.
- 📊 **Insight Dashboard** — Dasbor analitik ringkas untuk melihat ringkasan status gizi harian.

---

## 🚀 Getting Started

Ikuti panduan di bawah ini untuk mengatur dan menjalankan proyek secara lokal di mesin pengembang Anda.

### Prerequisites

Pastikan perangkat Anda telah terinstal perangkat lunak berikut:

- [Node.js](https://nodejs.org/) (v18.x atau lebih baru)
- [Python](https://www.python.org/) (v3.9 atau lebih baru)
- [Git](https://git-scm.com/)
- Database SQL lokal (MySQL atau PostgreSQL)

### Installation

**1. Clone Repository**

```bash
git clone https://github.com/aryasatya2204/capstone-nutriby.git
cd capstone-nutriby
```

**2. Setup Backend (Node.js)**

```bash
# Pindah ke direktori backend
cd backend

# Instal semua dependensi
npm install

# Salin file environment
cp .env.example .env

# Jalankan migrasi Prisma dan generate client
npx prisma generate
npx prisma db push

# (Opsional) Lakukan seeding data awal
node seedData.js

# Jalankan server development
npm run dev
```

**3. Setup Engine AI (Python)**

```bash
# Pindah ke direktori AI
cd ai

# Instal library Python yang dibutuhkan
pip install -r requirment.txt

# Jalankan server AI
python app/main.py
```

**4. Setup Frontend (React/Vite)**

```bash
# Pindah ke direktori frontend
cd frontend

# Instal dependensi React
npm install

# Buat konfigurasi .env untuk endpoint API lokal
echo "VITE_API_URL=http://localhost:3000/api" > .env

# Jalankan development server
npm run dev
```

> Aplikasi dapat diakses melalui **http://localhost:5173** (port default Vite).

---

## 📸 Usage & Screenshots

> _(Ganti URL gambar di bawah dengan path screenshot aplikasi yang sebenarnya)_

| Dashboard Utama | Growth Tracker | AI Nutribot   |
| --------------- | -------------- | ------------- |
| ![Dashboard]()  | ![Tracker]()   | ![Nutribot]() |

**Cara Penggunaan:**

1. **Registrasi Anak** — Daftarkan profil anak di halaman `ChildRegistration`.
2. **Pemantauan** — Masukkan data harian anak di menu `Features > GrowthTracker`.
3. **Eksplorasi** — Temukan jadwal MPASI di `Features > WeeklyPlan` atau tanyakan kendala spesifik pada Nutribot.

---

## 📜 License

Didistribusikan di bawah **Lisensi MIT**. Lihat file [`LICENSE`](LICENSE) untuk informasi lebih lanjut.

---

## 📬 Contact

**Tim Pengembang Nutriby**

- 🔗 Repository: [github.com/aryasatya2204/capstone-nutriby](https://github.com/aryasatya2204/capstone-nutriby)
- 🐛 Laporan Bug & Fitur: [Issues Tracker](https://github.com/aryasatya2204/capstone-nutriby/issues)
