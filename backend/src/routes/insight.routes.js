const express = require('express');
const { getDailyInsight } = require('../controllers/insight.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js'); 

const router = express.Router();

router.get('/daily/:childId', authMiddleware, getDailyInsight); 

module.exports = router;