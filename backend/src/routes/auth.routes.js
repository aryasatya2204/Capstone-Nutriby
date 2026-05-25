const express = require("express");
const {
  registerManual,
  loginManual,
  googleLogin,
} = require("../controllers/auth.controller");

const router = express.Router();

// rute buat pendaftaran dan login akun
router.post("/register", registerManual);
router.post("/login", loginManual);
router.post("/google", googleLogin);

module.exports = router;
