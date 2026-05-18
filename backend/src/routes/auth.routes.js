const express = require('express');
const { registerManual, loginManual, googleLogin } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerManual);
router.post('/login', loginManual);
router.post('/google', googleLogin); // Endpoint: /api/auth/google

module.exports = router;