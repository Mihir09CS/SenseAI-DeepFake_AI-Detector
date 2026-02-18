

const Scan = require("../models/Scan");
const { analyzeMedia, analyzeMediaFile } = require("../services/aiService");

const getThreatScore = (probability = 0) => {
  const rawScore = Number(probability) * 100;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
};

const getExplanation = (probability = 0) => {
  if (probability >= 0.75) {
    return "Probability exceeds 0.75 threshold indicating high likelihood of synthetic manipulation.";
  }
  if (probability >= 0.45) {
    return "Probability is in the medium-risk band (0.45 to 0.74), suggesting possible manipulation.";
  }
  return "Probability is below 0.45 threshold, indicating lower likelihood of manipulation.";
};

const buildScanPayload = (aiResult, createdAt) => ({
  mediaType: aiResult.mediaType,
  probability: aiResult.probability,
  riskLevel: aiResult.risk,
  threatScore: getThreatScore(aiResult.probability),
  explanation: getExplanation(aiResult.probability),
  timestamp: createdAt,
});

exports.scanMedia = async (req, res) => {
  const { mediaUrl } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({
      success: false,
      error: "Media URL is required",
    });
  }

  try {
    const aiResult = await analyzeMedia(mediaUrl);

    const scan = await Scan.create({
      userId: req.user.id,
      mediaUrl,
      mediaType: aiResult.mediaType,
      probability: aiResult.probability,
      riskLevel: aiResult.risk,
      aiVersion: "v1.0-audio-image",
    });

    return res.json({
      success: true,
      data: buildScanPayload(aiResult, scan.createdAt),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.scanMediaFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "File is required",
    });
  }

  try {
    const aiResult = await analyzeMediaFile(req.file);
    const scan = await Scan.create({
      userId: req.user.id,
      mediaUrl: `uploaded:${req.file.originalname || "file"}`,
      mediaType: aiResult.mediaType,
      probability: aiResult.probability,
      riskLevel: aiResult.risk,
      aiVersion: "v1.0-audio-image-video",
    });

    return res.json({
      success: true,
      data: buildScanPayload(aiResult, scan.createdAt),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.bulkScan = async (req, res) => {
  const { mediaUrls } = req.body;

  if (!mediaUrls || !Array.isArray(mediaUrls)) {
    return res.status(400).json({
      success: false,
      error: "mediaUrls array required",
    });
  }

  const limitedUrls = mediaUrls.slice(0, 5);

  const settledResults = await Promise.allSettled(
    limitedUrls.map((url) => analyzeMedia(url)),
  );

  let high = 0;
  let medium = 0;
  let low = 0;
  let failed = 0;

  for (const item of settledResults) {
    if (item.status !== "fulfilled") {
      failed++;
      continue;
    }

    const result = item.value;
    if (result.risk === "High") high++;
    else if (result.risk === "Medium") medium++;
    else low++;
  }

  let overall = "Low";
  if (high > 0) overall = "High";
  else if (medium > 0) overall = "Medium";

  return res.json({
    success: true,
    data: {
      high,
      medium,
      low,
      overall,
      scanned: limitedUrls.length,
      failed,
    },
  });
};

exports.getScanHistory = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      Scan.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("mediaUrl mediaType probability riskLevel createdAt")
      .lean(),
      Scan.countDocuments({ userId: req.user.id }),
    ]);

    const scansWithThreatScore = scans.map((scan) => ({
      ...scan,
      threatScore: getThreatScore(scan.probability),
    }));

    return res.json({
      success: true,
      data: {
        count: scansWithThreatScore.length,
        total,
        page,
        limit,
        scans: scansWithThreatScore,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scan history",
    });
  }
};
