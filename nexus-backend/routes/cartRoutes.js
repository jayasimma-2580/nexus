/**
 * routes/cartRoutes.js — Buyer only
 *
 *   GET    /api/cart/
 *   POST   /api/cart/
 *   PUT    /api/cart/item
 *   DELETE /api/cart/item/:productId
 *   DELETE /api/cart/clear
 */

import express from "express";
import { protect, requireBuyer } from "../middlewares/authMiddleware.js";
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from "../controllers/cartController.js";

const router = express.Router();
router.use(protect, requireBuyer);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/item", updateCartItem);
router.delete("/item/:productId", removeCartItem);
router.delete("/clear", clearCart);

export default router;
