const express = require('express');
const { generateSingleMenu, generateWeeklyPlan, searchMenuByIngredient, getAlternativeRecipes, deleteWeeklyPlan,  swapMealPlanItem} = require('../controllers/mpasi.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Semua generator MPASI wajib login
router.use(authMiddleware); 

// 1. Endpoint untuk MPASI Per Menu
router.post('/generate-menu/:childId', generateSingleMenu);

// 2. Endpoint untuk MPASI Mingguan (21 Menu)
router.post('/generate-weekly/:childId', generateWeeklyPlan);
router.post('/search-menu/:childId', searchMenuByIngredient);
router.delete('/weekly/:childId', deleteWeeklyPlan);
router.get('/alternatives/:childId/:mealPlanItemId', getAlternativeRecipes);
router.put('/mealplan/swap/:mealPlanItemId', swapMealPlanItem);

module.exports = router;