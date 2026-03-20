/**
 * routes/userRoutes.js
 *   GET  /api/user/me              — view own profile
 *   PUT  /api/user/me              — update profile
 *   PUT  /api/user/change-password — change password
 */

import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { getMyProfile, updateMyProfile, changePassword } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);
router.put("/change-password", protect, changePassword);

export default router;