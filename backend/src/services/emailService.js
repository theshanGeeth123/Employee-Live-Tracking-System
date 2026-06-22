const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transporter = createTransporter();

  const appName = "Employee Live Tracking System";

  await transporter.sendMail({
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:30px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:16px; padding:30px; border:1px solid #e2e8f0;">
          <h2 style="color:#0f172a;">Password Reset Request</h2>
          <p style="color:#475569;">Hi ${name || "User"},</p>
          <p style="color:#475569;">
            We received a request to reset your password for the Employee Live Tracking System.
          </p>
          <p style="color:#475569;">
            Click the button below to reset your password. This link will expire in 15 minutes.
          </p>
          <a href="${resetUrl}" style="display:inline-block; margin:20px 0; background:#2563eb; color:white; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:bold;">
            Reset Password
          </a>
          <p style="color:#64748b; font-size:13px;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetEmail,
};