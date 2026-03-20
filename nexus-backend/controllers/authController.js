/**
 * controllers/authController.js
 *
 * Full auth flow with OTP for:
 *   - Email verification (register)
 *   - Phone verification (after email verified, if phone provided)
 *   - Password reset (OTP to email, no links)
 *   - Change password (requires old password, for logged-in users — in userController)
 */

import crypto from "crypto";
import jwt    from "jsonwebtoken";
import User   from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendOtpEmail,
  sendPhoneOtpEmail,
  sendPasswordResetOtpEmail,
  sendWelcomeEmail,
} from "../utils/emailService.js";
import { sendSmsOtp } from "../utils/smsService.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp.trim()).digest("hex");

// What we expose to the frontend — never include sensitive fields
const safeUser = (user, token) => ({
  id:              user._id,
  name:            user.name,
  email:           user.email,
  role:            user.role,
  phone:           user.phone            || null,
  isPhoneVerified: user.isPhoneVerified  || false,
  address:         user.address          || null,
  isEmailVerified: user.isEmailVerified,
  sellerStatus:    user.sellerStatus,
  shopName:        user.shopName         || null,
  shopDescription: user.shopDescription  || null,
  shopAddress:     user.shopAddress      || null,
  token,
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "buyer", shopName, shopDescription, phone } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  if (role === "admin")
    return res.status(403).json({ success: false, message: "Admin accounts cannot be self-registered" });
  if (!["buyer", "seller"].includes(role))
    return res.status(400).json({ success: false, message: "Role must be buyer or seller" });
  if (role === "seller" && (!shopName || !shopName.trim()))
    return res.status(400).json({ success: false, message: "Shop name is required for sellers" });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists)
    return res.status(409).json({ success: false, message: "Email already registered" });

  const user = new User({
    name:            name.trim(),
    email:           email.toLowerCase().trim(),
    password,
    role,
    phone:           phone?.trim() || undefined,
    isPhoneVerified: false,
    sellerStatus:    role === "seller" ? "pending" : "none",
    shopName:        role === "seller" ? shopName.trim()        : undefined,
    shopDescription: role === "seller" ? shopDescription?.trim(): undefined,
  });

  const otp = user.getEmailOtp();
  await user.save();

  try { await sendOtpEmail(user, otp); }
  catch (err) { console.error("[Register] OTP email failed:", err.message); }

  res.status(201).json({
    success: true,
    message: "Account created. Enter the OTP sent to your email.",
    data: {
      id: user._id, name: user.name, email: user.email, role: user.role,
      phone: user.phone || null,
      isEmailVerified: false, isPhoneVerified: false,
      sellerStatus: user.sellerStatus, shopName: user.shopName,
    },
  });
});

// ── POST /api/auth/verify-otp  (email OTP) ───────────────────────────────────
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ success: false, message: "Email and OTP are required" });

  const user = await User.findOne({
    email:          email.toLowerCase(),
    emailOtp:       hashOtp(otp),
    emailOtpExpire: { $gt: Date.now() },
  }).select("+emailOtp +emailOtpExpire");

  if (!user)
    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

  user.isEmailVerified = true;
  user.emailOtp        = undefined;
  user.emailOtpExpire  = undefined;

  // If user registered with a phone number, immediately send phone OTP
  let needsPhoneVerification = false;
  if (user.phone && !user.isPhoneVerified) {
    const phoneOtp = user.getPhoneOtp();
    needsPhoneVerification = true;
    // Try SMS first, fall back to email if Twilio not configured
    try {
      const smsSent = await sendSmsOtp(user, phoneOtp);
      if (!smsSent) await sendPhoneOtpEmail(user, phoneOtp);
    } catch (err) {
      console.error("[VerifyOtp] Phone OTP failed:", err.message);
    }
  }

  await user.save();

  // Send welcome email if no phone verification needed (account fully ready)
  if (!needsPhoneVerification) {
    try { await sendWelcomeEmail(user); }
    catch (err) { console.error("[VerifyOtp] Welcome email failed:", err.message); }
  }

  res.status(200).json({
    success: true,
    message: needsPhoneVerification
      ? "Email verified! Now verify your phone number."
      : "Email verified! Welcome to NEXUS.",
    data: {
      ...safeUser(user, generateToken(user._id)),
      needsPhoneVerification,
    },
  });
});

// ── POST /api/auth/resend-otp  (email OTP) ───────────────────────────────────
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: "Email is required" });

  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+emailOtp +emailOtpExpire");

  if (!user)
    return res.status(404).json({ success: false, message: "No account with this email" });
  if (user.isEmailVerified)
    return res.status(400).json({ success: false, message: "Email is already verified" });

  const otp = user.getEmailOtp();
  await user.save();

  try { await sendOtpEmail(user, otp); }
  catch { return res.status(500).json({ success: false, message: "Failed to send OTP. Try again." }); }

  res.status(200).json({ success: true, message: "OTP resent to your email." });
});

// ── POST /api/auth/send-phone-otp  (send phone OTP — requires auth) ──────────
export const sendPhoneOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+phoneOtp +phoneOtpExpire");

  if (!user.phone)
    return res.status(400).json({ success: false, message: "No phone number on your account. Add one in Profile first." });
  if (user.isPhoneVerified)
    return res.status(400).json({ success: false, message: "Phone is already verified" });

  const otp = user.getPhoneOtp();
  await user.save();

  let smsSent = false;
  try {
    smsSent = await sendSmsOtp(user, otp);
    if (!smsSent) await sendPhoneOtpEmail(user, otp);
  } catch {
    return res.status(500).json({ success: false, message: "Failed to send OTP. Try again." });
  }

  res.status(200).json({
    success: true,
    message: smsSent
      ? `OTP sent via SMS to ${user.phone}.`
      : `OTP sent to your email (${user.email}).`,
    via: smsSent ? "sms" : "email",
  });
});

// ── POST /api/auth/verify-phone-otp ──────────────────────────────────────────
export const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp)
    return res.status(400).json({ success: false, message: "OTP is required" });

  const user = await User.findOne({
    _id:            req.user._id,
    phoneOtp:       hashOtp(otp),
    phoneOtpExpire: { $gt: Date.now() },
  }).select("+phoneOtp +phoneOtpExpire");

  if (!user)
    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

  user.isPhoneVerified = true;
  user.phoneOtp        = undefined;
  user.phoneOtpExpire  = undefined;
  await user.save();

  // Account is now fully verified — send welcome email
  try { await sendWelcomeEmail(user); }
  catch (err) { console.error("[VerifyPhoneOtp] Welcome email failed:", err.message); }

  res.status(200).json({
    success: true,
    message: "Phone number verified! Welcome to NEXUS.",
    data: safeUser(user, generateToken(user._id)),
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, message: "Invalid credentials" });

  if (!user.isEmailVerified)
    return res.status(403).json({
      success: false,
      message: "Please verify your email before logging in.",
      requiresVerification: true,
      email: user.email,
    });

  res.status(200).json({ success: true, data: safeUser(user, generateToken(user._id)) });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = asyncHandler(async (_req, res) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const u = req.user;
  res.status(200).json({
    success: true,
    data: {
      id: u._id, name: u.name, email: u.email, role: u.role,
      phone: u.phone || null, isPhoneVerified: u.isPhoneVerified || false,
      address: u.address || null,
      isEmailVerified: u.isEmailVerified,
      sellerStatus: u.sellerStatus, shopName: u.shopName,
      shopDescription: u.shopDescription, shopAddress: u.shopAddress || null,
    },
  });
});

// ── POST /api/auth/forgot-password  (step 1: send OTP) ───────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.status(400).json({ success: false, message: "Email is required" });

  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+passwordResetOtp +passwordResetExpire");

  // Always 200 to prevent email enumeration
  if (!user)
    return res.status(200).json({ success: true,
      message: "If an account exists for that email, a reset OTP has been sent." });

  const otp = user.getPasswordResetOtp();
  await user.save();

  try { await sendPasswordResetOtpEmail(user, otp); }
  catch (err) {
    user.passwordResetOtp    = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
    return res.status(500).json({ success: false, message: "Failed to send OTP. Try again." });
  }

  res.status(200).json({ success: true,
    message: "A 6-digit OTP has been sent to your email. It expires in 15 minutes." });
});

// ── POST /api/auth/verify-reset-otp  (step 2: verify OTP, get reset token) ───
export const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ success: false, message: "Email and OTP are required" });

  const user = await User.findOne({
    email:               email.toLowerCase(),
    passwordResetOtp:    hashOtp(otp),
    passwordResetExpire: { $gt: Date.now() },
  }).select("+passwordResetOtp +passwordResetExpire");

  if (!user)
    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

  // Issue a short-lived reset token (10 min) — reuse the OTP slot to store it
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetOtp    = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  res.status(200).json({ success: true, message: "OTP verified.", data: { resetToken } });
});

// ── POST /api/auth/reset-password  (step 3: set new password) ────────────────
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, email, password } = req.body;

  if (!resetToken || !email || !password)
    return res.status(400).json({ success: false, message: "resetToken, email and password are required" });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const user = await User.findOne({
    email:               email.toLowerCase(),
    passwordResetOtp:    hashedToken,
    passwordResetExpire: { $gt: Date.now() },
  }).select("+passwordResetOtp +passwordResetExpire");

  if (!user)
    return res.status(400).json({ success: false, message: "Reset session expired. Please start again." });

  user.password            = password;
  user.passwordResetOtp    = undefined;
  user.passwordResetExpire = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Password reset successfully. Please log in.",
    data: safeUser(user, generateToken(user._id)) });
});
