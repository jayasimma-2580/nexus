/**
 * models/Order.js
 *
 * One order = one buyer checkout with potentially many sellers' products.
 *
 * Structure:
 *   Order
 *   └── orderItems[]          ← each item tracks its seller + earnings
 *   └── sellerSubOrders[]     ← one entry per unique seller in this order
 *                                seller sees their sub-order; buyer sees the full order
 *
 * Commission flow (per item):
 *   grossAmount  = price × quantity
 *   commission   = grossAmount × commissionRate (at time of order)
 *   sellerEarns  = grossAmount − commission
 *
 * sellerSubOrder.status lifecycle (per seller):
 *   pending → processing → shipped → delivered | cancelled
 *
 * Overall order status is derived from sub-orders but stored for quick queries.
 */

import mongoose from "mongoose";

// ── Per-item schema ───────────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },      // price at time of purchase
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },

  // Commission tracked per item
  commissionRate: { type: Number, required: true },  // % applied at order time
  commissionAmount: { type: Number, required: true }, // platform's cut in currency
  sellerEarnings: { type: Number, required: true },   // seller's net for this item
});

// ── Per-seller sub-order ──────────────────────────────────────────────────────
// Allows each seller to manage & track their portion of a mixed-seller order
const sellerSubOrderSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId, // references orderItem._id
    },
  ],
  // Seller's fulfillment status (independent per seller)
  status: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  // Financial summary for this seller in this order
  grossAmount: { type: Number, required: true },   // total before commission
  commissionAmount: { type: Number, required: true }, // platform takes this
  netEarnings: { type: Number, required: true },   // seller receives this

  shippedAt: { type: Date },
  deliveredAt: { type: Date },
});

// ── Shipping info ─────────────────────────────────────────────────────────────
const shippingSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String },
});

// ── Payment info ──────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  method: { type: String, required: true },   // "COD", "Card", "UPI", etc.
  result: { type: Object },                   // payment gateway response
});

// ── Main order schema ─────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [orderItemSchema],
    sellerSubOrders: [sellerSubOrderSchema],

    shippingInfo: shippingSchema,
    paymentInfo: paymentSchema,

    // Price breakdown
    itemsPrice: { type: Number, required: true, default: 0 },
    taxPrice: { type: Number, required: true, default: 0 },
    shippingPrice: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true, default: 0 },

    // Total commission the platform earns from this order
    totalCommission: { type: Number, default: 0 },

    // Overall order status (updated when all sub-orders reach a terminal state)
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "partially_shipped", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
