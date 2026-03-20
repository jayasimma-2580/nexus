import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendPhoneOtpEmail } from "../utils/emailService.js";

// GET /api/user/me
export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.status(200).json({ success: true, data: user });
});

// PUT /api/user/me
export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, shopName, shopDescription, shopAddress } = req.body;

  if (!name || name.trim().length === 0)
    return res.status(400).json({ success: false, message: "Name cannot be empty" });

  const updates = { name: name.trim() };

  // Phone — if changed, reset verification status
  if (phone !== undefined) {
    const cleaned = phone.trim();
    const current = req.user.phone || "";
    if (cleaned !== current) {
      updates.phone           = cleaned || undefined;
      updates.isPhoneVerified = false;   // must re-verify new number
      updates.phoneOtp        = undefined;
      updates.phoneOtpExpire  = undefined;
    }
  }

  // Address for all users
  if (address !== undefined) {
    updates.address = {
      street:     address.street?.trim()     || "",
      city:       address.city?.trim()       || "",
      state:      address.state?.trim()      || "",
      postalCode: address.postalCode?.trim() || "",
      country:    address.country?.trim()    || "",
    };
  }

  // Seller-only fields
  if (req.user.role === "seller") {
    if (shopName        !== undefined) updates.shopName        = shopName.trim();
    if (shopDescription !== undefined) updates.shopDescription = shopDescription.trim();
    if (shopAddress     !== undefined) {
      updates.shopAddress = {
        street:     shopAddress.street?.trim()     || "",
        city:       shopAddress.city?.trim()       || "",
        state:      shopAddress.state?.trim()      || "",
        postalCode: shopAddress.postalCode?.trim() || "",
        country:    shopAddress.country?.trim()    || "",
      };
    }
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id, updates, { new: true, runValidators: true }
  ).select("-password");

  res.status(200).json({ success: true, data: updated });
});

// PUT /api/user/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res.status(400).json({ success: false, message: "Both old and new passwords are required" });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
  if (oldPassword === newPassword)
    return res.status(400).json({ success: false, message: "New password must be different from the current one" });

  const user = await User.findById(req.user._id).select("+password");
  if (!await user.matchPassword(oldPassword))
    return res.status(400).json({ success: false, message: "Current password is incorrect" });

  user.password = newPassword;
  await user.save();
  res.status(200).json({ success: true, message: "Password updated successfully" });
});
