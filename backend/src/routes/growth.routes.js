const express = require('express');
const { getGrowthChartData, addWeeklyGrowthLog } = require('../controllers/growth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Endpoint 1: Mengambil data untuk grafik (Sudah ada)
router.get('/:childId/chart', getGrowthChartData);

// Endpoint 2: Menerima input mingguan dari user
router.post('/:childId/log', addWeeklyGrowthLog);

module.exports = router;