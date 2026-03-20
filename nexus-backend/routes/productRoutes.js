/**
 * routes/productRoutes.js
 *
 * Public:
 *   GET /api/products/           — approved products only
 *   GET /api/products/:id        — single approved product
 *
 * Seller (approved sellers only):
 *   GET    /api/products/my      — own products (all statuses)
 *   POST   /api/products/        — create (status: pending)
 *   PUT    /api/products/:id     — edit own product (resets to pending)
 *   DELETE /api/products/:id     — delete own product
 *
 * Admin:
 *   GET /api/products/pending          — queue of products awaiting approval
 *   PUT /api/products/:id/approve      — approve
 *   PUT /api/products/:id/reject       — reject with reason
 *   DELETE /api/products/:id           — delete any product
 *
 * NOTE: Static segments (/my, /pending) must be registered BEFORE /:id
 */

import express from "express";
import {
  createProduct, updateProduct, deleteProduct,
  getProduct, getProducts, getMyProducts,
  getPendingProducts, approveProduct, rejectProduct,
} from "../controllers/productController.js";
import { protect, requireSeller, authorizeRoles } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get("/", getProducts);

// ── Seller ────────────────────────────────────────────────────────────────────
// /my MUST come before /:id
router.get("/my", protect, requireSeller, getMyProducts);
router.post("/", protect, requireSeller, upload.array("images", 5), createProduct);

// ── Admin ─────────────────────────────────────────────────────────────────────
// /pending MUST come before /:id
router.get("/pending", protect, authorizeRoles("admin"), getPendingProducts);

// ── Public single product ─────────────────────────────────────────────────────
router.get("/:id", getProduct);

// ── Seller/Admin: edit & delete (controller checks ownership) ─────────────────
router.put("/:id", protect, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, deleteProduct);

// ── Admin: approve / reject ───────────────────────────────────────────────────
router.put("/:id/approve", protect, authorizeRoles("admin"), approveProduct);
router.put("/:id/reject", protect, authorizeRoles("admin"), rejectProduct);

export default router;
