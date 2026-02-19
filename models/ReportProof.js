const mongoose = require("mongoose");

const reportProofSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: "Scan", default: null },
    reportType: {
      type: String,
      enum: ["single", "bulk", "history"],
      required: true,
    },
    contentHash: { type: String, required: true },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "report_proofs",
  },
);

reportProofSchema.index({ userId: 1, createdAt: -1 });
reportProofSchema.index({ scanId: 1 });
reportProofSchema.index({ contentHash: 1 });

module.exports = mongoose.model("ReportProof", reportProofSchema);
