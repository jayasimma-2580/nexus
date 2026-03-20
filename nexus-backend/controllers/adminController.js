import { sendSellerApprovedEmail, sendSellerRejectedEmail } from "../utils/emailService.js";
/**
 * controllers/adminController.js
 *
 * Admin manages:
 *   - Seller applications (approve / reject)
 *   - Seller accounts (suspend / ban / reactivate)
 *   - Platform configuration (commission rate, tax, shipping)
 *   - Full user list
 */

import User from "../models/User.js";
import Product from "../models/Product.js";
import Config from "../models/Config.js";
import asyncHandler from "../utils/asyncHandler.js";

// ── GET /api/admin/sellers?status=pending|approved|suspended|banned ───────────
// List sellers filtered by status
export const getSellers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { role: "seller" };
  if (status) filter.sellerStatus = status;

  const sellers = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: sellers.length, data: sellers });
});

// ── PUT /api/admin/sellers/:id/approve ───────────────────────────────────────
// Approve a pending seller — they can now list products
export const approveSeller = asyncHandler(async (req, res) => {
  const seller = await User.findOne({ _id: req.params.id, role: "seller" });
  if (!seller)
    return res.status(404).json({ success: false, message: "Seller not found" });
  if (seller.sellerStatus === "approved")
    return res.status(400).json({ success: false, message: "Seller is already approved" });

  seller.sellerStatus = "approved";
  seller.adminNote = undefined;
  await seller.save();

  try { await sendSellerApprovedEmail(seller); } catch(e) { console.error("Email failed:", e.message); }
  res.status(200).json({ success: true, message: `Seller "${seller.shopName}" approved.`, data: seller });
});

// ── PUT /api/admin/sellers/:id/reject ────────────────────────────────────────
// Reject a pending seller application (sets status back to none so they can re-apply)
export const rejectSeller = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length === 0)
    return res.status(400).json({ success: false, message: "A rejection reason is required" });

  const seller = await User.findOne({ _id: req.params.id, role: "seller" });
  if (!seller)
    return res.status(404).json({ success: false, message: "Seller not found" });

  seller.sellerStatus = "none";
  seller.adminNote = reason.trim();
  await seller.save();

  try { await sendSellerRejectedEmail(seller, reason.trim()); } catch(e) { console.error("Rejection email failed:", e.message); }
  res.status(200).json({ success: true, message: "Seller application rejected.", data: seller });
});

// ── PUT /api/admin/sellers/:id/suspend ───────────────────────────────────────
// Temporarily suspend: hides all their products, blocks new listings
export const suspendSeller = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length === 0)
    return res.status(400).json({ success: false, message: "A suspension reason is required" });

  const seller = await User.findOne({ _id: req.params.id, role: "seller" });
  if (!seller)
    return res.status(404).json({ success: false, message: "Seller not found" });

  seller.sellerStatus = "suspended";
  seller.adminNote = reason.trim();
  await seller.save();

  // Hide all their approved products immediately
  await Product.updateMany(
    { seller: seller._id, status: "approved" },
    { $set: { status: "pending" } } // back to pending so admin can re-approve after reinstatement
  );

  res.status(200).json({ success: true, message: `Seller "${seller.shopName}" suspended. Their products are now hidden.` });
});

// ── PUT /api/admin/sellers/:id/ban ────────────────────────────────────────────
// Permanently ban: hides products, cannot be reinstated via normal flow
export const banSeller = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length === 0)
    return res.status(400).json({ success: false, message: "A ban reason is required" });

  const seller = await User.findOne({ _id: req.params.id, role: "seller" });
  if (!seller)
    return res.status(404).json({ success: false, message: "Seller not found" });

  seller.sellerStatus = "banned";
  seller.adminNote = reason.trim();
  await seller.save();

  // Remove all their products from the store permanently
  await Product.updateMany({ seller: seller._id }, { $set: { status: "rejected", rejectionReason: "Seller account banned" } });

  res.status(200).json({ success: true, message: `Seller "${seller.shopName}" has been banned.` });
});

// ── PUT /api/admin/sellers/:id/reinstate ─────────────────────────────────────
// Reinstate a suspended seller (not banned — banned requires manual review)
export const reinstateSeller = asyncHandler(async (req, res) => {
  const seller = await User.findOne({ _id: req.params.id, role: "seller" });
  if (!seller)
    return res.status(404).json({ success: false, message: "Seller not found" });
  if (seller.sellerStatus === "banned")
    return res.status(400).json({ success: false, message: "Banned sellers cannot be reinstated via this endpoint. Contact support." });
  if (seller.sellerStatus === "approved")
    return res.status(400).json({ success: false, message: "Seller is already active" });

  seller.sellerStatus = "approved";
  seller.adminNote = undefined;
  await seller.save();

  res.status(200).json({ success: true, message: `Seller "${seller.shopName}" reinstated.`, data: seller });
});

// ── PUT /api/admin/sellers/:id/commission ────────────────────────────────────
// Set a custom commission rate for a specific seller
export const setSellerCommission = asyncHandler(async (req, res) => {
  const { commissionRate } = req.body;
  if (commissionRate == null || commissionRate < 0 || commissionRate > 100)
    return res.status(400).json({ success: false, message: "commissionRate must be between 0 and 100" });

  const seller = await User.findOneAndUpdate(
    { _id: req.params.id, role: "seller" },
    { commissionRate: Number(commissionRate) },
    { new: true }
  ).select("-password");

  if (!seller)
    return res.status(404).json({ success: false, message: "Seller not found" });

  res.status(200).json({
    success: true,
    message: `Commission for "${seller.shopName}" set to ${commissionRate}%`,
    data: seller,
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// List all platform users (buyers + sellers + admins)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: users.length, data: users });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  if (user.role === "admin")
    return res.status(403).json({ success: false, message: "Admin accounts cannot be deleted via API" });

  await user.deleteOne();
  res.status(200).json({ success: true, message: "User deleted" });
});

// ── GET /api/admin/config ─────────────────────────────────────────────────────
export const getConfig = asyncHandler(async (req, res) => {
  const config = await Config.getConfig();
  res.status(200).json({ success: true, data: config });
});

// ── PUT /api/admin/config ─────────────────────────────────────────────────────
// Update platform-wide settings
export const updateConfig = asyncHandler(async (req, res) => {
  const { commissionRate, taxRate, shippingCost, freeShippingThreshold } = req.body;

  const config = await Config.getConfig();
  if (commissionRate != null) config.commissionRate = Number(commissionRate);
  if (taxRate != null) config.taxRate = Number(taxRate);
  if (shippingCost != null) config.shippingCost = Number(shippingCost);
  if (freeShippingThreshold != null) config.freeShippingThreshold = Number(freeShippingThreshold);
  await config.save();

  res.status(200).json({ success: true, message: "Platform config updated.", data: config });
});