// const express = require("express");
// const router = express.Router();

// router.post("/", (req, res) => {
//   const { question } = req.body;

//   const faq = {
//     "what is deepfake":
//       "Deepfake is synthetic facial or voice manipulation using deep learning.",
//     "how does detection work":
//       "We combine CNN and frequency-based forensic analysis.",
//     "is this system accurate":
//       "This is a prototype system and accuracy depends on dataset diversity.",
//   };

//   const answer =
//     faq[question?.toLowerCase()] ||
//     "This system focuses on detecting deepfake facial and voice manipulation.";

//   res.json({ answer });
// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/chatController");

router.post("/", chat);

module.exports = router;
