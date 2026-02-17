const mongoose = require("mongoose");

const ScanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  mediaUrl: String,
  mediaType: String,
  probability: Number,
  riskLevel: String,
  aiVersion: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Scan", ScanSchema);
