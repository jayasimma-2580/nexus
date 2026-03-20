/**
 * controllers/cartController.js
 *
 * Buyer-only cart. Sellers cannot add items to a cart.
 * Each cart item stores the seller ref so the order controller
 * can split by seller at checkout automatically.
 *
 * Only APPROVED products from APPROVED sellers can be added to cart.
 */

import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

const calcTotal = (items = []) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

// GET /api/cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ buyer: req.user._id }).populate(
    "items.product",
    "name price images stock status"
  );

  if (!cart) {
    return res.status(200).json({ success: true, data: { items: [], cartTotal: 0 } });
  }

  res.status(200).json({ success: true, data: cart });
});

// POST /api/cart
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId)
    return res.status(400).json({ success: false, message: "productId is required" });

  const qty = Math.max(1, parseInt(quantity, 10));
  if (isNaN(qty))
    return res.status(400).json({ success: false, message: "quantity must be a valid number" });

  // Only approved products from approved sellers can enter the cart
  const product = await Product.findOne({ _id: productId, status: "approved" })
    .populate({ path: "seller", select: "sellerStatus", match: { sellerStatus: "approved" } });

  if (!product || !product.seller)
    return res.status(404).json({ success: false, message: "Product not available" });

  if (product.stock < qty)
    return res.status(400).json({ success: false, message: `Only ${product.stock} units available` });

  let cart = await Cart.findOne({ buyer: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      buyer: req.user._id,
      items: [{
        product: product._id,
        seller: product.seller._id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.images?.[0]?.url || "",
      }],
    });
    return res.status(201).json({ success: true, data: cart });
  }

  const existingIndex = cart.items.findIndex((item) => item.product.equals(product._id));

  if (existingIndex > -1) {
    const newQty = cart.items[existingIndex].quantity + qty;
    if (product.stock < newQty)
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units available (${cart.items[existingIndex].quantity} already in cart)`,
      });
    cart.items[existingIndex].quantity = newQty;
  } else {
    cart.items.push({
      product: product._id,
      seller: product.seller._id,
      name: product.name,
      price: product.price,
      quantity: qty,
      image: product.images?.[0]?.url || "",
    });
  }

  cart.cartTotal = calcTotal(cart.items);
  await cart.save();

  res.status(200).json({ success: true, data: cart });
});

// PUT /api/cart/item
export const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity == null)
    return res.status(400).json({ success: false, message: "productId and quantity are required" });

  const qty = Math.max(1, parseInt(quantity, 10));

  const product = await Product.findById(productId).select("stock name status");
  if (!product || product.status !== "approved")
    return res.status(404).json({ success: false, message: "Product not available" });
  if (product.stock < qty)
    return res.status(400).json({ success: false, message: `Only ${product.stock} units available` });

  const cart = await Cart.findOne({ buyer: req.user._id });
  if (!cart)
    return res.status(404).json({ success: false, message: "Cart not found" });

  const idx = cart.items.findIndex((item) => item.product.equals(product._id));
  if (idx === -1)
    return res.status(404).json({ success: false, message: "Product not in cart" });

  cart.items[idx].quantity = qty;
  cart.cartTotal = calcTotal(cart.items);
  await cart.save();

  res.status(200).json({ success: true, data: cart });
});

// DELETE /api/cart/item/:productId
export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ buyer: req.user._id });
  if (!cart)
    return res.status(404).json({ success: false, message: "Cart not found" });

  const before = cart.items.length;
  cart.items = cart.items.filter((item) => !item.product.equals(req.params.productId));

  if (cart.items.length === before)
    return res.status(404).json({ success: false, message: "Product not found in cart" });

  cart.cartTotal = calcTotal(cart.items);
  await cart.save();

  res.status(200).json({ success: true, data: cart });
});

// DELETE /api/cart/clear
export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ buyer: req.user._id });
  if (!cart)
    return res.status(200).json({ success: true, data: { items: [], cartTotal: 0 } });

  cart.items = [];
  cart.cartTotal = 0;
  await cart.save();

  res.status(200).json({ success: true, data: cart });
});
