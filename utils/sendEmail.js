const axios = require("axios");

function ensureMailConfig() {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  if (!process.env.SENDER_EMAIL) {
    throw new Error("SENDER_EMAIL is not configured");
  }
}

async function sendResetPasswordEmail({ toEmail, toName, resetUrl }) {
  ensureMailConfig();

  const senderEmail = process.env.SENDER_EMAIL;
  const appName = process.env.APP_NAME || "TrustLens";

  const payload = {
    sender: {
      email: senderEmail,
      name: appName,
    },
    to: [
      {
        email: toEmail,
        name: toName || "User",
      },
    ],
    subject: `${appName} Password Reset`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="margin-bottom: 12px;">Reset your password</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 16px; background: #0891b2; color: #fff; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
        </p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };

  await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    timeout: 10000,
  });
}

module.exports = {
  sendResetPasswordEmail,
};
