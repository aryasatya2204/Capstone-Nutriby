const express = require('express');
const { getAllergies, getIngredients } = require('../controllers/master.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware); // Proteksi route

router.get('/allergies', getAllergies);
router.get('/ingredients', getIngredients);

module.exports = router;