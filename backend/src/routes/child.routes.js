const express = require("express");
const {
  createChild,
  getChildren,
  updateChild,
} = require("../controllers/child.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// semua rute wajib login dulu
router.use(authMiddleware);

router.post("/", createChild);
router.get("/", getChildren);
router.put("/:id", updateChild);

module.exports = router;
