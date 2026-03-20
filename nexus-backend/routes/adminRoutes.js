/**
 * routes/adminRoutes.js
 *
 * All routes: admin only
 *
 * Seller management:
 *   GET  /api/admin/sellers?status=pending|approved|suspended|banned
 *   PUT  /api/admin/sellers/:id/approve
 *   PUT  /api/admin/sellers/:id/reject
 *   PUT  /api/admin/sellers/:id/suspend
 *   PUT  /api/admin/sellers/:id/ban
 *   PUT  /api/admin/sellers/:id/reinstate
 *   PUT  /api/admin/sellers/:id/commission
 *
 * User management:
 *   GET    /api/admin/users
 *   DELETE /api/admin/users/:id
 *
 * Platform config:
 *   GET /api/admin/config
 *   PUT /api/admin/config
 */

import express from "express";
import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  getSellers, approveSeller, rejectSeller,
  suspendSeller, banSeller, reinstateSeller, setSellerCommission,
  getAllUsers, deleteUser,
  getConfig, updateConfig,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

// Seller management
router.get("/sellers", getSellers);
router.put("/sellers/:id/approve", approveSeller);
router.put("/sellers/:id/reject", rejectSeller);
router.put("/sellers/:id/suspend", suspendSeller);
router.put("/sellers/:id/ban", banSeller);
router.put("/sellers/:id/reinstate", reinstateSeller);
router.put("/sellers/:id/commission", setSellerCommission);

// User management
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);

// Platform config
router.get("/config", getConfig);
router.put("/config", updateConfig);

export default router;
