/**
 * models/Cart.js
 *
 * Buyer's shopping cart. One cart per buyer (unique index on buyer).
 * Products from multiple sellers can coexist in one cart.
 * Each item stores the seller ref so we can split by seller at checkout.
 */
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
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
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    image: { type: String },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    cartTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-recalculate cartTotal before every save
cartSchema.pre("save", function (next) {
  this.cartTotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  next();
});

export default mongoose.model("Cart", cartSchema);
