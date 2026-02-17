// ================= CHATBOT =================
exports.chat = async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({
      success: false,
      error: "Question is required",
    });
  }

  const faq = {
    "what is deepfake":
      "Deepfake is synthetic manipulation of face or voice using deep learning models.",

    "how does detection work":
      "Our system uses CNN-based spatial analysis combined with frequency-domain forensic features to detect deepfake artifacts.",

    "is this 100 percent accurate":
      "No AI system is 100% accurate. Results depend on model training data and media quality.",

    "how does video detection work":
      "Video detection is performed by sampling multiple frames and aggregating deepfake probability scores.",

    "what does high risk mean":
      "High risk indicates a strong probability that the media is synthetically manipulated.",
  };

  const normalized = question.toLowerCase().trim();

  const answer =
    faq[normalized] ||
    "This platform specializes in detecting deepfake-based facial and voice manipulation.";

  return res.json({
    success: true,
    answer,
  });
};
