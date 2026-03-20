/**
 * routes/orderRoutes.js
 *
 * Buyer:
 *   POST /api/orders/          — place order
 *   GET  /api/orders/my        — own orders (BEFORE /:id)
 *   GET  /api/orders/:id       — single order
 *
 * Seller:
 *   GET /api/orders/seller                 — their sub-orders (BEFORE /:id)
 *   PUT /api/orders/:orderId/seller-status — update fulfillment status
 *
 * Admin:
 *   GET /api/orders/           — view all orders (read-only)
 *
 * NOTE: Admin status update route intentionally removed.
 * Sellers control fulfillment. Admin views only.
 */

import express from "express";
import {
  createOrder, getMyOrders, getOrderById,
  getSellerOrders, updateSellerSubOrderStatus,
  getAllOrders, cancelOrder, getCheckoutConfig,
} from "../controllers/orderController.js";
import { protect, requireBuyer, requireSeller, authorizeRoles } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin: view all orders
router.get("/", protect, authorizeRoles("admin"), getAllOrders);

// Buyer: get tax/shipping config for checkout preview
router.get("/checkout-config", protect, requireBuyer, getCheckoutConfig);

// Buyer: place order
router.post("/", protect, requireBuyer, createOrder);

// Buyer: own orders — MUST be before /:id
router.get("/my", protect, requireBuyer, getMyOrders);

// Seller: their sub-orders — MUST be before /:id
router.get("/seller", protect, requireSeller, getSellerOrders);

// Shared: single order by ID
router.get("/:id", protect, getOrderById);

// Seller: update sub-order fulfillment status
router.put("/:orderId/seller-status", protect, requireSeller, updateSellerSubOrderStatus);

// Buyer: cancel own order (only when pending)
router.put("/:id/cancel", protect, requireBuyer, cancelOrder);

export default router;