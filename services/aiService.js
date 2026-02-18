const axios = require("axios");
const FormData = require("form-data");

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

exports.analyzeMediaFile = async (file) => {
  try {
    const baseUrl = process.env.AI_SERVICE_URL.replace(/\/analyze\/?$/, "");
    const form = new FormData();
    form.append("file", file.buffer, {
      filename: file.originalname || "upload.bin",
      contentType: file.mimetype || "application/octet-stream",
    });

    const response = await axios.post(`${baseUrl}/analyze-file`, form, {
      headers: form.getHeaders(),
      timeout: 40000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    return response.data;
  } catch (error) {
    console.error("AI File Service Error:", error.message);
    throw new Error("AI service unavailable");
  }
};

exports.checkAIServiceHealth = async () => {
  try {
    const baseUrl = process.env.AI_SERVICE_URL.replace(/\/analyze\/?$/, "");
    const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    return {
      reachable: response.status >= 200 && response.status < 300,
      details: response.data,
    };
  } catch (error) {
    return {
      reachable: false,
      details: {
        error: error.message,
      },
    };
  }
};
