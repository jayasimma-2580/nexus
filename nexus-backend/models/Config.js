/**
 * models/Config.js
 *
 * Singleton document that stores platform-wide configuration set by the admin.
 *
 * Fields:
 *   commissionRate   — percentage the platform takes from every seller sale (default 10%)
 *   freeShippingThreshold — order value above which shipping is free
 *   shippingCost     — flat shipping fee when below threshold
 *   taxRate          — tax percentage applied to all orders
 *
 * There is always exactly ONE config document. Use Config.getConfig() to fetch it.
 * Admin can update it via PUT /api/admin/config.
 */

import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    // Platform takes this % from every seller's sale
    commissionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 10, // 10%
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 10, // 10%
    },
    shippingCost: {
      type: Number,
      min: 0,
      default: 50,
    },
    freeShippingThreshold: {
      type: Number,
      min: 0,
      default: 1000,
    },
  },
  { timestamps: true }
);

// ── Static: always return the single config doc, create if missing ────────────
configSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

export default mongoose.model("Config", configSchema);
