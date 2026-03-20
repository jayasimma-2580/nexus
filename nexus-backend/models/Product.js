/**
 * models/Product.js
 *
 * Every product belongs to a seller.
 * Admin must approve a product before buyers can see it.
 *
 * status lifecycle:
 *   pending  → seller just created/updated, waiting for admin review
 *   approved → visible to buyers, can be purchased
 *   rejected → admin rejected with a reason; seller can edit and resubmit
 *
 * Buyers only ever see products where:
 *   status === "approved" AND seller.sellerStatus === "approved"
 */

import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    images: [
      {
        url: { type: String },
        alt: { type: String, default: "" },
      },
    ],
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Seller ownership ─────────────────────────────────────────────────────
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"],
    },

    // ── Admin approval workflow ───────────────────────────────────────────────
    // pending → approved / rejected
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Admin's reason when rejecting (shown to seller so they can fix and resubmit)
    rejectionReason: {
      type: String,
      trim: true,
    },

    // ── Ratings (auto-updated by review controller) ───────────────────────────
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Full-text search index on name + description
productSchema.index({ name: "text", description: "text" });

export default mongoose.model("Product", productSchema);
