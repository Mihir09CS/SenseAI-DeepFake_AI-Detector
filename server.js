require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { validateEnv } = require("./config/env");
const { errorHandler } = require("./middlewares/errorHandler");
const { checkAIServiceHealth } = require("./services/aiService");

const app = express();
validateEnv();

const corsOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  }),
);
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/scan", require("./routes/scan"));
app.use("/api/history", require("./routes/history"));
app.use("/api/chat", require("./routes/chat"));

app.get("/health", async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const aiHealth = await checkAIServiceHealth();
  const aiReachable = aiHealth.reachable;
  const isHealthy = dbConnected && aiReachable;

  const healthData = {
    status: isHealthy ? "OK" : "DEGRADED",
    database: dbConnected ? "connected" : "disconnected",
    aiService: aiReachable ? "reachable" : "unreachable",
    aiDetails: aiHealth.details,
    uptimeSeconds: Math.floor(process.uptime()),
  };

  if (!isHealthy) {
    return res.status(503).json({
      success: false,
      error: "Service degraded",
      data: healthData,
    });
  }

  return res.status(200).json({
    success: true,
    data: healthData,
  });
});

app.get("/", (req, res) => {
  return res.send("Deepfake Detection Backend Running");
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
