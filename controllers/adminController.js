const User = require("../models/User");
const Scan = require("../models/Scan");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || user.authProvider !== "local" || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    return res.json({
      success: true,
      data: {
        token: generateToken(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Admin login failed",
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalScans,
      highRisk,
      mediumRisk,
      lowRisk,
    ] = await Promise.all([
      User.countDocuments(),
      Scan.countDocuments(),
      Scan.countDocuments({ riskLevel: "High" }),
      Scan.countDocuments({ riskLevel: "Medium" }),
      Scan.countDocuments({ riskLevel: "Low" }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalScans,
        highRisk,
        mediumRisk,
        lowRisk,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch stats",
    });
  }
};

exports.getDistribution = async (req, res) => {
  try {
    const grouped = await Scan.aggregate([
      {
        $match: {
          mediaType: { $in: ["image", "audio", "video"] },
          riskLevel: { $in: ["High", "Medium", "Low"] },
        },
      },
      {
        $group: {
          _id: {
            mediaType: "$mediaType",
            riskLevel: "$riskLevel",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const distribution = {
      image: { High: 0, Medium: 0, Low: 0 },
      audio: { High: 0, Medium: 0, Low: 0 },
      video: { High: 0, Medium: 0, Low: 0 },
    };

    for (const row of grouped) {
      distribution[row._id.mediaType][row._id.riskLevel] = row.count;
    }

    return res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch distribution",
    });
  }
};
