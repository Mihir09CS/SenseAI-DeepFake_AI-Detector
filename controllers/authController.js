const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendResetPasswordEmail } = require("../utils/sendEmail");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getFrontendBaseUrl() {
  const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return frontendUrls[0] || "http://localhost:5173";
}

// ================= REGISTER =================
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "local",
    });

    const token = generateToken(user);

    return res.json({
      success: true,
      data: { token },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Registration failed" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.authProvider !== "local")
      return res
        .status(400)
        .json({ success: false, error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, error: "Invalid credentials" });

    const token = generateToken(user);

    return res.json({
      success: true,
      data: { token },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Login failed" });
  }
};

// ================= GOOGLE LOGIN =================
exports.googleAuth = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: "Google token is required",
    });
  }

  try {
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!profileRes.ok) {
        throw new Error("Invalid Google token");
      }

      payload = await profileRes.json();
    }

    if (!payload?.email) {
      return res.status(400).json({
        success: false,
        error: "Google profile email not available",
      });
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub || payload.id,
        authProvider: "google",
      });
    }

    const jwtToken = generateToken(user);

    return res.json({
      success: true,
      data: { token: jwtToken },
    });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: "Google authentication failed" });
  }
};

// ================= GET CURRENT USER =================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    return res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
};

// ================= FORGOT PASSWORD =================
// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "Email is required",
    });
  }

  try {
    const user = await User.findOne({ email });

    // Don't reveal whether account exists.
    if (!user || user.authProvider !== "local") {
      return res.json({
        success: true,
        data: {
          message: "If the account exists, a password reset link has been generated.",
        },
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const frontendUrl = getFrontendBaseUrl();
    const resetUrl = `${frontendUrl.replace(/\/+$/, "")}/reset-password/${resetToken}`;

    try {
      await sendResetPasswordEmail({
        toEmail: user.email,
        toName: user.name,
        resetUrl,
      });
    } catch (mailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        error: "Failed to send reset email",
      });
    }

    return res.json({
      success: true,
      data: {
        message: "If the account exists, a password reset email has been sent.",
        ...(process.env.NODE_ENV !== "production" && { resetUrl }),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Forgot password request failed",
    });
  }
};

// ================= RESET PASSWORD =================
// POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      error: "Token and new password are required",
    });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.authProvider = "local";
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.json({
      success: true,
      data: {
        message: "Password reset successful",
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Reset password failed",
    });
  }
};
