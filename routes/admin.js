const express = require("express");
const router = express.Router();
const { adminLogin, getStats, getDistribution } = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/login", adminLogin);
router.get("/stats", protect, requireAdmin, getStats);
router.get("/distribution", protect, requireAdmin, getDistribution);

module.exports = router;
