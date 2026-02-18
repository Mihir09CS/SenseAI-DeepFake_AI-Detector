const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getStats,
  getDistribution,
  getUsersList,
  getScansList,
  getRiskTrend,
} = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middlewares/authMiddleware");

router.post("/login", adminLogin);
router.get("/stats", protect, requireAdmin, getStats);
router.get("/distribution", protect, requireAdmin, getDistribution);
router.get("/users", protect, requireAdmin, getUsersList);
router.get("/scans", protect, requireAdmin, getScansList);
router.get("/trends", protect, requireAdmin, getRiskTrend);

module.exports = router;
