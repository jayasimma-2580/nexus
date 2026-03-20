/**
 * routes/wishlistRoutes.js — Buyer only
 *
 *   GET    /api/wishlist/
 *   POST   /api/wishlist/
 *   DELETE /api/wishlist/item/:productId
 *   DELETE /api/wishlist/
 */

import express from "express";
import { protect, requireBuyer } from "../middlewares/authMiddleware.js";
import { getWishlist, addToWishlist, removeFromWishlist, clearWishlist } from "../controllers/wishlistController.js";

const router = express.Router();
router.use(protect, requireBuyer);

router.get("/", getWishlist);
router.post("/", addToWishlist);
router.delete("/item/:productId", removeFromWishlist);
router.delete("/", clearWishlist);

export default router;
