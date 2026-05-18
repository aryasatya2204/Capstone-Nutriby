const express = require('express');
const { generateSingleMenu, generateWeeklyPlan } = require('../controllers/mpasi.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Semua generator MPASI wajib login
router.use(authMiddleware); 

// 1. Endpoint untuk MPASI Per Menu
router.post('/generate-menu/:childId', generateSingleMenu);

// 2. Endpoint untuk MPASI Mingguan (21 Menu)
router.post('/generate-weekly/:childId', generateWeeklyPlan);

module.exports = router;