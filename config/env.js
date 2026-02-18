const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "AI_SERVICE_URL",
  "GOOGLE_CLIENT_ID",
];

function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

module.exports = {
  validateEnv,
};
