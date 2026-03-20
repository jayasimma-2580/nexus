/**
 * middlewares/authMiddleware.js
 *
 * protect          — verifies JWT, attaches req.user
 * authorizeRoles   — restricts route to specific roles
 * requireSeller    — shorthand: seller role + approved status
 * requireBuyer     — shorthand: buyer role only (sellers cannot buy)
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ── protect: verify JWT and attach user ──────────────────────────────────────
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error); // JsonWebTokenError / TokenExpiredError → global handler
  }
};

// ── authorizeRoles: allow only specific roles ─────────────────────────────────
export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not authorized for this action`,
    });
  }
  next();
};

// ── requireSeller: must be an APPROVED seller ────────────────────────────────
// Sellers who are pending/suspended/banned cannot access seller routes
export const requireSeller = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({ success: false, message: "Seller account required" });
  }
  if (req.user.sellerStatus !== "approved") {
    const messages = {
      pending: "Your seller account is pending admin approval",
      suspended: "Your seller account has been suspended",
      banned: "Your seller account has been banned",
      none: "Seller account not set up",
    };
    return res.status(403).json({
      success: false,
      message: messages[req.user.sellerStatus] || "Seller account not active",
    });
  }
  next();
};

// ── requireBuyer: buyers only — sellers cannot place orders ──────────────────
export const requireBuyer = (req, res, next) => {
  if (req.user.role !== "buyer") {
    return res.status(403).json({
      success: false,
      message: "Only buyers can perform this action. Sellers have a separate account.",
    });
  }
  next();
};
