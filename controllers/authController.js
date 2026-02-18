const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
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
