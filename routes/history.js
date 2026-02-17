const express = require("express");
const Scan = require("../models/Scan");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, scans });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

module.exports = router;
