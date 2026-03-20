/**
 * controllers/wishlistController.js — Buyer wishlist only
 */

import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ buyer: req.user._id }).populate("products");
  res.status(200).json({ success: true, data: wishlist || { buyer: req.user._id, products: [] } });
});

// POST /api/wishlist
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId)
    return res.status(400).json({ success: false, message: "productId is required" });

  const product = await Product.findOne({ _id: productId, status: "approved" });
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  let wishlist = await Wishlist.findOne({ buyer: req.user._id });

  if (!wishlist) {
    wishlist = await Wishlist.create({ buyer: req.user._id, products: [productId] });
  } else {
    // FIX: use .some() + .toString() — not .includes() which fails on ObjectId comparison
    if (wishlist.products.some((id) => id.toString() === productId))
      return res.status(400).json({ success: false, message: "Product already in wishlist" });
    wishlist.products.push(productId);
    await wishlist.save();
  }

  res.status(200).json({ success: true, data: wishlist });
});

// DELETE /api/wishlist/item/:productId
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ buyer: req.user._id });
  if (!wishlist)
    return res.status(404).json({ success: false, message: "Wishlist not found" });

  wishlist.products = wishlist.products.filter((id) => id.toString() !== req.params.productId);
  await wishlist.save();

  res.status(200).json({ success: true, data: wishlist });
});

// DELETE /api/wishlist
export const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ buyer: req.user._id });
  if (!wishlist)
    return res.status(404).json({ success: false, message: "Wishlist not found" });

  wishlist.products = [];
  await wishlist.save();
  res.status(200).json({ success: true, message: "Wishlist cleared" });
});
