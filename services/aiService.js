const axios = require("axios");

exports.analyzeMedia = async (mediaUrl) => {
  try {
    const response = await axios.post(
      process.env.AI_SERVICE_URL,
      { mediaUrl },
      { timeout: 20000 },
    );

    return response.data;
  } catch (error) {
    console.error("AI Service Error:", error.message);
    throw new Error("AI service unavailable");
  }
};
