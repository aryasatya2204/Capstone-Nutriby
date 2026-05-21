const express = require('express');
const { createChild, getChildren, updateChild } = require('../controllers/child.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware); // Semua rute di file ini butuh login

router.post('/', createChild);
router.get('/', getChildren); // Baris 9 sekarang sudah aman karena getChildren sudah dibuat
router.put('/:id', updateChild);

module.exports = router;