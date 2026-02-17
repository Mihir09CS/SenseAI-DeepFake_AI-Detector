// const Scan = require("../models/Scan");
// const { analyzeMedia } = require("../services/aiService");

// // ================= SCAN MEDIA =================
// exports.scanMedia = async (req, res) => {
//   const { mediaUrl } = req.body;

//   if (!mediaUrl) {
//     return res.status(400).json({
//       success: false,
//       error: "Media URL is required",
//     });
//   }

//   try {
//     // Call AI service
//     const aiResult = await analyzeMedia(mediaUrl);

//     // Save scan in database
//     const scan = await Scan.create({
//       userId: req.user.id,
//       mediaUrl,
//       mediaType: aiResult.mediaType,
//       probability: aiResult.probability,
//       riskLevel: aiResult.risk,
//       aiVersion: "v1",
//     });

//     return res.json({
//       success: true,
//       mediaType: aiResult.mediaType,
//       probability: aiResult.probability,
//       riskLevel: aiResult.risk,
//       timestamp: scan.createdAt,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: error.message || "Scan failed",
//     });
//   }
// };


const Scan = require("../models/Scan");
const { analyzeMedia } = require("../services/aiService");

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
      mediaType: aiResult.mediaType,
      probability: aiResult.probability,
      riskLevel: aiResult.risk,
      timestamp: scan.createdAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
