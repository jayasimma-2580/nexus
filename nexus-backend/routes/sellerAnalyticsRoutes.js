/**
 * routes/sellerAnalyticsRoutes.js — Seller's own analytics, approved sellers only
 *
 *   GET /api/seller/analytics/overview
 *   GET /api/seller/analytics/monthly
 *   GET /api/seller/analytics/top-products
 *   GET /api/seller/analytics/low-stock
 */

import express from "express";
import { protect, requireSeller } from "../middlewares/authMiddleware.js";
import {
  getSellerOverview, getSellerMonthlySales,
  getSellerTopProducts, getSellerLowStock,
} from "../controllers/sellerAnalyticsController.js";

const router = express.Router();
router.use(protect, requireSeller);

router.get("/overview", getSellerOverview);
router.get("/monthly", getSellerMonthlySales);
router.get("/top-products", getSellerTopProducts);
router.get("/low-stock", getSellerLowStock);

export default router;
