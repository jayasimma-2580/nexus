/**
 * routes/reviewRoutes.js
 *
 * Public:
 *   GET  /api/reviews/product/:productId  — reviews for a product
 *
 * Buyer:
 *   POST   /api/reviews/               — add or update review (must have purchased)
 *   GET    /api/reviews/my             — all reviews written by this buyer
 *   DELETE /api/reviews/:id            — delete own review
 *
 * Seller:
 *   GET    /api/reviews/seller         — reviews on all seller's products
 *   PUT    /api/reviews/:id/reply      — reply to a review
 *   DELETE /api/reviews/:id/reply      — remove own reply
 *
 * NOTE: specific paths (my, seller, product/:id) MUST come before /:id
 */

import express from "express";
import { protect, requireBuyer, requireSeller } from "../middlewares/authMiddleware.js";
import {
  addOrUpdateReview, getMyReviews, deleteReview,
  getSellerReviews, addSellerReply, deleteSellerReply,
  getProductReviews,
} from "../controllers/reviewController.js";

const router = express.Router();

// Public
router.get("/product/:productId", getProductReviews);

// Buyer
router.post("/",     protect, requireBuyer,  addOrUpdateReview);
router.get("/my",    protect, requireBuyer,  getMyReviews);
router.delete("/:id", protect, deleteReview);

// Seller
router.get("/seller",          protect, requireSeller, getSellerReviews);
router.put("/:id/reply",       protect, requireSeller, addSellerReply);
router.delete("/:id/reply",    protect, requireSeller, deleteSellerReply);

export default router;
