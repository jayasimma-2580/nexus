/**
 * models/Review.js
 *
 * Buyers review products they purchased.
 * Sellers can reply once to each review on their products.
 * One review per buyer per product (unique index).
 */
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    buyer:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    rating:  { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1000 },

    // Seller reply
    sellerReply: {
      comment:    { type: String, trim: true, maxlength: 500 },
      repliedAt:  { type: Date },
    },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });
// For fast lookup of all reviews by a buyer (buyer's review management page)
reviewSchema.index({ buyer: 1, createdAt: -1 });
// For fast lookup of all reviews for a seller's products
reviewSchema.index({ product: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
