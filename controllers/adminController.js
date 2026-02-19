const User = require("../models/User");
const Scan = require("../models/Scan");
const ReportProof = require("../models/ReportProof");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

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
      totalProofs,
    ] = await Promise.all([
      User.countDocuments(),
      Scan.countDocuments(),
      Scan.countDocuments({ riskLevel: "High" }),
      Scan.countDocuments({ riskLevel: "Medium" }),
      Scan.countDocuments({ riskLevel: "Low" }),
      ReportProof.countDocuments(),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalScans,
        highRisk,
        mediumRisk,
        lowRisk,
        totalProofs,
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

exports.getUsersList = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = (req.query.search || "").trim();
    const role = (req.query.role || "").trim();
    const authProvider = (req.query.authProvider || "").trim();

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (authProvider) query.authProvider = authProvider;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email role authProvider createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch users list",
    });
  }
};

exports.getScansList = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const search = (req.query.search || "").trim();
    const riskLevel = (req.query.riskLevel || "").trim();
    const mediaType = (req.query.mediaType || "").trim();

    const baseMatch = {};
    if (riskLevel) baseMatch.riskLevel = riskLevel;
    if (mediaType) baseMatch.mediaType = mediaType;

    const searchMatch = search
      ? {
          $or: [
            { mediaUrl: { $regex: search, $options: "i" } },
            { "user.name": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [facet] = await Scan.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $match: searchMatch },
      {
        $facet: {
          rows: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                mediaUrl: 1,
                mediaType: 1,
                probability: 1,
                riskLevel: 1,
                aiVersion: 1,
                createdAt: 1,
                user: {
                  _id: "$user._id",
                  name: "$user.name",
                  email: "$user.email",
                  role: "$user.role",
                },
              },
            },
          ],
          meta: [{ $count: "total" }],
        },
      },
    ]);

    const total = facet?.meta?.[0]?.total || 0;
    const scans = (facet?.rows || []).map((scan) => ({
      ...scan,
      threatScore: Math.max(
        0,
        Math.min(100, Math.round(Number(scan.probability || 0) * 100)),
      ),
    }));

    return res.json({
      success: true,
      data: {
        scans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch scans list",
    });
  }
};

exports.getRiskTrend = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 3), 30);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const rows = await Scan.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            riskLevel: "$riskLevel",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const seriesMap = new Map();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      seriesMap.set(key, { date: key, High: 0, Medium: 0, Low: 0, total: 0 });
    }

    for (const row of rows) {
      const day = row?._id?.day;
      const risk = row?._id?.riskLevel;
      if (!seriesMap.has(day)) continue;
      if (!["High", "Medium", "Low"].includes(risk)) continue;
      const entry = seriesMap.get(day);
      entry[risk] += row.count;
      entry.total += row.count;
      seriesMap.set(day, entry);
    }

    return res.json({
      success: true,
      data: {
        days,
        series: Array.from(seriesMap.values()),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to fetch risk trend",
    });
  }
};
