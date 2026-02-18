const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { getScanHistory } = require("../controllers/scanController");

const router = express.Router();

router.get("/", protect, getScanHistory);

module.exports = router;
