const axios = require("axios");
const FormData = require("form-data");

const getBaseUrl = () => {
  const raw = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  return raw
    .replace(/\/analyze\/?$/, "")
    .replace(/\/scan\/url\/?$/, "")
    .replace(/\/scan\/upload\/?$/, "")
    .replace(/\/+$/, "");
};

const mapRiskFromScore = (score = 0) => {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
};

const normalizeAiResult = (payload) => {
  // Legacy AI format support.
  if (
    payload &&
    typeof payload.mediaType === "string" &&
    typeof payload.probability === "number" &&
    typeof payload.risk === "string"
  ) {
    return payload;
  }

  // New FastAPI format support.
  const mediaType = payload?.media_type;
  const riskScore = Number(payload?.risk_score);
  const confidence = Number(payload?.classification?.confidence);
  const predictedLabel = payload?.classification?.predicted_label;

  if (!mediaType || Number.isNaN(riskScore) || Number.isNaN(confidence)) {
    throw new Error("Invalid AI response payload");
  }

  const probability =
    predictedLabel === "synthetic"
      ? confidence
      : Math.max(0, Math.min(1, 1 - confidence));

  return {
    mediaType,
    probability,
    risk: mapRiskFromScore(riskScore),
    raw: payload,
  };
};

const getErrorMessage = (error) => {
  const detailError = error?.response?.data?.detail?.error;
  const detailString =
    typeof error?.response?.data?.detail === "string"
      ? error.response.data.detail
      : null;
  const topError = error?.response?.data?.error;
  return detailError || detailString || topError || error.message;
};

exports.analyzeMedia = async (mediaUrl) => {
  const baseUrl = getBaseUrl();
  const primaryUrl = `${baseUrl}/scan/url`;
  const legacyUrl = `${baseUrl}/analyze`;

  try {
    const response = await axios.post(primaryUrl, { mediaUrl }, { timeout: 25000 });
    if (response?.data?.error) {
      throw new Error(response.data.error);
    }
    return normalizeAiResult(response.data);
  } catch (error) {
    // Fallback to legacy /analyze contract.
    if (error?.response?.status === 404) {
      try {
        const legacy = await axios.post(legacyUrl, { mediaUrl }, { timeout: 25000 });
        return normalizeAiResult(legacy.data);
      } catch (legacyError) {
        const message = getErrorMessage(legacyError);
        console.error("AI Service Error:", message);
        if (
          legacyError.code === "ECONNREFUSED" ||
          legacyError.code === "ENOTFOUND"
        ) {
          throw new Error("AI service unavailable");
        }
        throw new Error(message || "AI service unavailable");
      }
    }

    const message = getErrorMessage(error);
    console.error("AI Service Error:", message);
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error("AI service unavailable");
    }

    throw new Error(message || "AI service unavailable");
  }
};

exports.analyzeMediaFile = async (file) => {
  const baseUrl = getBaseUrl();
  const primaryUrl = `${baseUrl}/scan/upload`;
  const legacyUrl = `${baseUrl}/analyze-file`;

  const callPrimary = async () => {
    const form = new FormData();
    form.append("files", file.buffer, {
      filename: file.originalname || "upload.bin",
      contentType: file.mimetype || "application/octet-stream",
    });
    const response = await axios.post(primaryUrl, form, {
      headers: form.getHeaders(),
      timeout: 45000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    const first = Array.isArray(response.data) ? response.data[0] : response.data;
    if (first?.error) {
      throw new Error(first.error);
    }
    return normalizeAiResult(first);
  };

  const callLegacy = async () => {
    const form = new FormData();
    form.append("file", file.buffer, {
      filename: file.originalname || "upload.bin",
      contentType: file.mimetype || "application/octet-stream",
    });
    const response = await axios.post(legacyUrl, form, {
      headers: form.getHeaders(),
      timeout: 45000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return normalizeAiResult(response.data);
  };

  try {
    return await callPrimary();
  } catch (error) {
    // Fallback to legacy /analyze-file contract.
    if (error?.response?.status === 404) {
      try {
        return await callLegacy();
      } catch (legacyError) {
        const message = getErrorMessage(legacyError);
        console.error("AI File Service Error:", message);
        if (
          legacyError.code === "ECONNREFUSED" ||
          legacyError.code === "ENOTFOUND"
        ) {
          throw new Error("AI service unavailable");
        }
        throw new Error(message || "AI service unavailable");
      }
    }

    const message = getErrorMessage(error);
    console.error("AI File Service Error:", message);
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error("AI service unavailable");
    }

    throw new Error(message || "AI service unavailable");
  }
};

exports.checkAIServiceHealth = async () => {
  try {
    const baseUrl = getBaseUrl();
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
