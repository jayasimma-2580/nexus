/**
 * routes/adminAnalyticsRoutes.js — Admin analytics, all protected
 *
 *   GET /api/admin/analytics/overview
 *   GET /api/admin/analytics/sales/monthly
 *   GET /api/admin/analytics/top-sellers
 *   GET /api/admin/analytics/top-products
 *   GET /api/admin/analytics/low-stock
 *   GET /api/admin/analytics/recent-orders
 */

import express from "express";
import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  getAdminOverview, getMonthlySales, getTopSellers,
  getTopProducts, getLowStockProducts, getRecentOrders,
} from "../controllers/adminAnalyticsController.js";

const router = express.Router();
router.use(protect, authorizeRoles("admin"));

router.get("/overview", getAdminOverview);
router.get("/sales/monthly", getMonthlySales);
router.get("/top-sellers", getTopSellers);
router.get("/top-products", getTopProducts);
router.get("/low-stock", getLowStockProducts);
router.get("/recent-orders", getRecentOrders);

export default router;
