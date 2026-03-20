import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const addressSchema = new mongoose.Schema({
  street:     { type: String, trim: true, default: "" },
  city:       { type: String, trim: true, default: "" },
  state:      { type: String, trim: true, default: "" },
  postalCode: { type: String, trim: true, default: "" },
  country:    { type: String, trim: true, default: "" },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, maxlength: 50 },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role:     { type: String, enum: ["buyer", "seller", "admin"], default: "buyer" },

    // ── Contact info (all users) ──────────────────────────────────────────────
    phone:           { type: String, trim: true, maxlength: 20 },
    isPhoneVerified: { type: Boolean, default: false },
    address:         { type: addressSchema },

    // ── OTP: email verification ───────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailOtp:        { type: String, select: false },
    emailOtpExpire:  { type: Date,   select: false },

    // ── OTP: phone verification ───────────────────────────────────────────────
    phoneOtp:        { type: String, select: false },
    phoneOtpExpire:  { type: Date,   select: false },

    // ── OTP: password reset ───────────────────────────────────────────────────
    passwordResetOtp:    { type: String, select: false },
    passwordResetExpire: { type: Date,   select: false },

    // ── Seller fields ─────────────────────────────────────────────────────────
    sellerStatus:    { type: String, enum: ["none","pending","approved","suspended","banned"], default: "none" },
    shopName:        { type: String, trim: true, maxlength: 100 },
    shopDescription: { type: String, trim: true, maxlength: 500 },
    shopAddress:     { type: addressSchema },
    commissionRate:  { type: Number, min: 0, max: 100, default: null },
    adminNote:       { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// 6-digit OTP helper — generates, hashes & stores; returns raw OTP
const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

userSchema.methods.getEmailOtp = function () {
  const otp = makeOtp();
  this.emailOtp       = hashOtp(otp);
  this.emailOtpExpire = Date.now() + 10 * 60 * 1000;  // 10 min
  return otp;
};

userSchema.methods.getPhoneOtp = function () {
  const otp = makeOtp();
  this.phoneOtp       = hashOtp(otp);
  this.phoneOtpExpire = Date.now() + 10 * 60 * 1000;  // 10 min
  return otp;
};

userSchema.methods.getPasswordResetOtp = function () {
  const otp = makeOtp();
  this.passwordResetOtp    = hashOtp(otp);
  this.passwordResetExpire = Date.now() + 15 * 60 * 1000;  // 15 min
  return otp;
};

export default mongoose.model("User", userSchema);
