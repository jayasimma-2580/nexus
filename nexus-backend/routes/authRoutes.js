import express from "express";
import rateLimit from "express-rate-limit";
import {
  register, login, logout, getMe,
  verifyOtp, resendOtp,
  sendPhoneOtp, verifyPhoneOtp,
  forgotPassword, verifyResetOtp, resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 15,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
});
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 5,
  message: { success: false, message: "Too many OTP requests. Try again in 10 minutes." },
});

router.post("/register",           authLimiter, register);
router.post("/login",              authLimiter, login);
router.post("/logout",             logout);
router.get ("/me",                 protect, getMe);

// Email OTP
router.post("/verify-otp",         otpLimiter, verifyOtp);
router.post("/resend-otp",         otpLimiter, resendOtp);

// Phone OTP (requires JWT — user must be logged in / just verified email)
router.post("/send-phone-otp",     protect, otpLimiter, sendPhoneOtp);
router.post("/verify-phone-otp",   protect, otpLimiter, verifyPhoneOtp);

// Password reset (3-step OTP flow)
router.post("/forgot-password",    otpLimiter, forgotPassword);
router.post("/verify-reset-otp",   otpLimiter, verifyResetOtp);
router.post("/reset-password",     otpLimiter, resetPassword);

export default router;
