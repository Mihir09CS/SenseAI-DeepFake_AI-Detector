const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
    return connection;
  } catch (error) {
    console.error("Database connection failed", error);
    throw error;
  }
};

module.exports = connectDB;
