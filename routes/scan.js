const express = require("express");
const { scanMedia } = require("../controllers/scanController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", protect, scanMedia);

module.exports = router;
