require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function run() {
  const emailArg = (process.argv[2] || "").trim();
  if (!emailArg) {
    console.error("Usage: npm run seed:admin -- <email>");
    process.exit(1);
  }

  try {
    await connectDB();

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(emailArg)}$`, "i") },
    });

    if (!user) {
      console.error(`User not found for email: ${emailArg}`);
      process.exitCode = 1;
      return;
    }

    user.role = "admin";
    await user.save();

    console.log(`Admin role granted to: ${user.email}`);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
