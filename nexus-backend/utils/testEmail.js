// Run with: node utils/testEmail.js
import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

const pass = (process.env.SMTP_PASS || "").replace(/\s/g, "");

console.log("Testing SMTP...");
console.log("  Host:", process.env.SMTP_HOST);
console.log("  User:", process.env.SMTP_USER);
console.log("  Pass:", pass ? `${pass.slice(0, 4)}****` : "NOT SET");

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: { user: process.env.SMTP_USER, pass },
});

t.verify((err) => {
  if (err) {
    console.error("\n❌ FAILED:", err.message);
    console.log("\nFixes:");
    console.log("  1. Gmail 2FA must be ON");
    console.log("  2. Use App Password — myaccount.google.com → Security → App Passwords");
    console.log("  3. Generate for 'Mail', paste into SMTP_PASS");
    process.exit(1);
  }
  console.log("\n✅ Connected! Sending test email...");
  t.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.SMTP_USER,
    subject: "NEXUS Email Test ✅",
    text: "SMTP is working correctly!",
  }, (err2, info) => {
    if (err2) console.error("❌ Send failed:", err2.message);
    else console.log("✅ Email sent! Check inbox.\n   ID:", info.messageId);
    process.exit(0);
  });
});