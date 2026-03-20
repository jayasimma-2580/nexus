/**
 * controllers/reviewController.js
 *
 * Buyers:
 *   POST   /api/reviews             — add or update a review (must have purchased)
 *   GET    /api/reviews/my          — all reviews written by this buyer
 *   DELETE /api/reviews/:id         — delete own review
 *
 * Sellers:
 *   GET    /api/reviews/seller      — all reviews on seller's products
 *   PUT    /api/reviews/:id/reply   — reply to a review on their product
 *   DELETE /api/reviews/:id/reply   — remove their reply
 *
 * Public:
 *   GET    /api/reviews/product/:productId — reviews for a product
 */

import Review  from "../models/Review.js";
import Product from "../models/Product.js";
import Order   from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";

// Recalculate and persist product rating + numReviews
const syncProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const avg = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  await Product.findByIdAndUpdate(productId, {
    rating:     Number(avg.toFixed(2)),
    numReviews: reviews.length,
  });
};

// ── POST /api/reviews  (buyer: add or update) ─────────────────────────────────
export const addOrUpdateReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;

  if (!productId)
    return res.status(400).json({ success: false, message: "productId is required" });
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ success: false, message: "rating must be between 1 and 5" });

  const product = await Product.findOne({ _id: productId, status: "approved" });
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  // Must have purchased and received/shipped the product
  const hasPurchased = await Order.findOne({
    buyer: req.user._id,
    "orderItems.product": productId,
    orderStatus: { $in: ["delivered", "shipped"] },
  });
  if (!hasPurchased)
    return res.status(403).json({ success: false,
      message: "You can only review products you have purchased and received" });

  let review = await Review.findOne({ product: productId, buyer: req.user._id });

  if (review) {
    review.rating  = rating;
    review.comment = comment;
    // Clear seller reply when buyer edits — the seller should re-read and re-reply
    review.sellerReply = undefined;
    await review.save();
  } else {
    review = await Review.create({ product: productId, buyer: req.user._id, rating, comment });
  }

  await syncProductRating(productId);
  res.status(200).json({ success: true, data: review });
});

// ── GET /api/reviews/my  (buyer: all my reviews) ──────────────────────────────
export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ buyer: req.user._id })
    .populate("product", "name images price status")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

// ── GET /api/reviews/seller  (seller: reviews on all their products) ──────────
export const getSellerReviews = asyncHandler(async (req, res) => {
  // Find all products owned by this seller
  const products = await Product.find({ seller: req.user._id }).select("_id");
  const productIds = products.map(p => p._id);

  const reviews = await Review.find({ product: { $in: productIds } })
    .populate("product", "name images price")
    .populate("buyer",   "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

// ── PUT /api/reviews/:id/reply  (seller: reply to a review) ──────────────────
export const addSellerReply = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  if (!comment || !comment.trim())
    return res.status(400).json({ success: false, message: "Reply comment is required" });

  const review = await Review.findById(req.params.id).populate("product", "seller");
  if (!review)
    return res.status(404).json({ success: false, message: "Review not found" });

  // Only the seller who owns the product can reply
  if (review.product.seller.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: "Not authorized" });

  review.sellerReply = { comment: comment.trim(), repliedAt: new Date() };
  await review.save();

  res.status(200).json({ success: true, data: review });
});

// ── DELETE /api/reviews/:id/reply  (seller: remove their reply) ──────────────
export const deleteSellerReply = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate("product", "seller");
  if (!review)
    return res.status(404).json({ success: false, message: "Review not found" });

  if (review.product.seller.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: "Not authorized" });

  review.sellerReply = undefined;
  await review.save();

  res.status(200).json({ success: true, message: "Reply removed" });
});

// ── DELETE /api/reviews/:id  (buyer: delete own review / admin: any) ─────────
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review)
    return res.status(404).json({ success: false, message: "Review not found" });

  if (review.buyer.toString() !== req.user._id.toString() && req.user.role !== "admin")
    return res.status(403).json({ success: false, message: "Not authorized" });

  const productId = review.product;
  await review.deleteOne();
  await syncProductRating(productId);

  res.status(200).json({ success: true, message: "Review deleted" });
});

// ── GET /api/reviews/product/:productId  (public) ────────────────────────────
export const getProductReviews = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId).select("_id");
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  const reviews = await Review.find({ product: req.params.productId })
    .populate("buyer", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});
