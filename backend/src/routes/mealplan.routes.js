const express = require('express');
const { generateRecommendationInsight } = require('../controllers/mealplan.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Gunakan middleware agar hanya user yang login yang bisa generate
router.use(authMiddleware); 

// Endpoint untuk generate insight
router.post('/generate-insight/:childId', generateRecommendationInsight);

module.exports = router;