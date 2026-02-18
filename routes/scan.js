const express = require("express");
const multer = require("multer");
const {
  scanMedia,
  scanMediaFile,
  bulkScan,
  getScanHistory,
  getScanSummary,
} = require("../controllers/scanController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.post("/", protect, scanMedia);
router.post("/file", protect, upload.single("file"), scanMediaFile);
router.post("/bulk", protect, bulkScan);
router.get("/history", protect, getScanHistory);
router.get("/summary", protect, getScanSummary);

module.exports = router;
