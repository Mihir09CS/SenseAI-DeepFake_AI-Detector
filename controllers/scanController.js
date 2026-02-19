

const Scan = require("../models/Scan");
const mongoose = require("mongoose");
const { analyzeMedia, analyzeMediaFile } = require("../services/aiService");
const { resolveScanUrl } = require("../utils/urlResolver");

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
    const resolvedMediaUrl = await resolveScanUrl(mediaUrl);
    const aiResult = await analyzeMedia(resolvedMediaUrl);

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
      data: {
        ...buildScanPayload(aiResult, scan.createdAt),
        sourceUrl: mediaUrl,
        analyzedUrl: resolvedMediaUrl,
      },
    });
  } catch (error) {
    const message = error?.message || "Failed to scan URL";
    const lowered = message.toLowerCase();

    const isClientError =
      /unsupported media type|indirect link|valid http\/https url|invalid google token|file too large|fetch timed out|failed to fetch media url|url/i.test(
        lowered,
      ) && !lowered.includes("service unavailable");

    return res.status(isClientError ? 400 : 500).json({
      success: false,
      error: message,
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
    const message = error?.message || "Failed to scan URL";
    const isClientError =
      /valid http\/https url|unsupported media type|invalid google token|url/i.test(
        message.toLowerCase(),
      ) && !message.toLowerCase().includes("service unavailable");

    if (isClientError) {
      return res.status(400).json({
        success: false,
        error: message,
      });
    }

    return res.status(500).json({
      success: false,
      error: message,
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
  const perUrlResults = await Promise.all(
    limitedUrls.map(async (url) => {
      try {
        const resolvedMediaUrl = await resolveScanUrl(url);
        const aiResult = await analyzeMedia(resolvedMediaUrl);

        await Scan.create({
          userId: req.user.id,
          mediaUrl: url,
          mediaType: aiResult.mediaType,
          probability: aiResult.probability,
          riskLevel: aiResult.risk,
          aiVersion: "v1.0-bulk",
        });

        return {
          url,
          analyzedUrl: resolvedMediaUrl,
          status: "success",
          risk: aiResult.risk,
          mediaType: aiResult.mediaType,
          probability: aiResult.probability,
          threatScore: getThreatScore(aiResult.probability),
        };
      } catch (error) {
        return {
          url,
          status: "failed",
          error: error?.message || "Bulk scan failed",
        };
      }
    }),
  );

  let high = 0;
  let medium = 0;
  let low = 0;
  let failed = 0;

  for (const item of perUrlResults) {
    if (item.status !== "success") {
      failed++;
      continue;
    }

    if (item.risk === "High") high++;
    else if (item.risk === "Medium") medium++;
    else low++;
  }

  const successful = high + medium + low;
  let overall = "Unknown";
  if (successful > 0) {
    overall = "Low";
    if (high > 0) overall = "High";
    else if (medium > 0) overall = "Medium";
  }

  return res.json({
    success: true,
    data: {
      high,
      medium,
      low,
      overall,
      scanned: limitedUrls.length,
      failed,
      successful,
      results: perUrlResults,
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

exports.getScanSummary = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const [summaryRows, topTypeRow, latestScan] = await Promise.all([
      Scan.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalScans: { $sum: 1 },
            highRisk: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "High"] }, 1, 0] },
            },
            mediumRisk: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "Medium"] }, 1, 0] },
            },
            lowRisk: {
              $sum: { $cond: [{ $eq: ["$riskLevel", "Low"] }, 1, 0] },
            },
            avgProbability: { $avg: "$probability" },
          },
        },
      ]),
      Scan.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: "$mediaType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      Scan.findOne({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .select("mediaType riskLevel probability createdAt")
        .lean(),
    ]);

    const summary = summaryRows[0] || {
      totalScans: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      avgProbability: 0,
    };

    return res.json({
      success: true,
      data: {
        totalScans: summary.totalScans || 0,
        highRisk: summary.highRisk || 0,
        mediumRisk: summary.mediumRisk || 0,
        lowRisk: summary.lowRisk || 0,
        averageThreatScore: getThreatScore(summary.avgProbability || 0),
        topMediaType: topTypeRow[0]?._id || null,
        latestScan: latestScan
          ? {
              ...latestScan,
              threatScore: getThreatScore(latestScan.probability || 0),
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scan summary",
    });
  }
};
