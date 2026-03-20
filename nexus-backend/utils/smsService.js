/**
 * utils/smsService.js — Twilio SMS OTP service for NEXUS
 *
 * Requires in .env:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx   (your Twilio number)
 *
 * Get a free trial at https://www.twilio.com/try-twilio
 *
 * If any of the three env vars are missing, every function returns false
 * so the caller gracefully falls back to email.
 *
 * Install:  npm install twilio
 */

const isTwilioConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID &&
     process.env.TWILIO_AUTH_TOKEN &&
     process.env.TWILIO_PHONE_NUMBER);

/**
 * Send phone OTP via SMS.
 * Returns true  → SMS sent successfully.
 * Returns false → Twilio not configured; caller should send via email instead.
 * Throws        → Twilio IS configured but send failed (bad number, network, etc.).
 */
// Ensure phone is in E.164 format (+91xxxxxxxxxx for India)
const toE164 = (phone) => {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone;          // already E.164
  if (digits.length === 10) return `+91${digits}`;  // Indian 10-digit
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`; // 91xxxxxxxxxx
  return `+${digits}`;                              // best-effort
};

export const sendSmsOtp = async (user, otp) => {
  if (!isTwilioConfigured() || !user.phone) return false;

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const to = toE164(user.phone);
    await client.messages.create({
      body: `Your NEXUS verification code is: ${otp}. Expires in 10 minutes. Never share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[SMS] Phone OTP sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[SMS] Failed to send OTP to ${user.phone}:`, err.message);
    return false; // fall back to email — don't crash the request
  }
};

/**
 * Send password-reset OTP via SMS.
 * Same return semantics as sendSmsOtp.
 */
export const sendSmsPasswordResetOtp = async (user, otp) => {
  if (!isTwilioConfigured() || !user.phone) return false;

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const to = toE164(user.phone);
    await client.messages.create({
      body: `Your NEXUS password reset code is: ${otp}. Expires in 15 minutes. Never share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log(`[SMS] Password reset OTP sent to ${to}`);
    return true;
  } catch (err) {
    console.error(`[SMS] Failed to send reset OTP to ${user.phone}:`, err.message);
    return false;
  }
};
