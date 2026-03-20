/**
 * controllers/orderController.js
 *
 * Issue 2A fix: Seller controls fulfillment flow, admin can override.
 * Issue 3B fix: Block product deletion if active orders exist.
 *              Active = pending / processing / shipped (not delivered/cancelled)
 *
 * Status transitions:
 *   Seller sub-order: pending → processing → shipped → delivered | cancelled
 *   Admin order:      can move to any valid next status (override for disputes)
 *   Terminal states (delivered / cancelled) are locked for everyone.
 */

import mongoose from "mongoose";
import Order    from "../models/Order.js";
import Product  from "../models/Product.js";
import Cart     from "../models/Cart.js";
import User     from "../models/User.js";
import Config   from "../models/Config.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendOrderConfirmationEmail } from "../utils/emailService.js";

// ── Price breakdown ────────────────────────────────────────────────────────────
const computePrices = (items, config) => {
  const itemsPrice      = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxPrice        = Number((itemsPrice * (config.taxRate / 100)).toFixed(2));
  const shippingPrice   = itemsPrice >= config.freeShippingThreshold ? 0 : config.shippingCost;
  const totalPrice      = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2));
  const totalCommission = items.reduce((s, i) => s + i.commissionAmount, 0);
  return { itemsPrice, taxPrice, shippingPrice, totalPrice, totalCommission };
};

// ── Status transition rules ────────────────────────────────────────────────────
// Seller controls their sub-order fulfillment
const SELLER_TRANSITIONS = {
  pending:    ["processing", "cancelled"],
  processing: ["shipped",    "cancelled"],
  shipped:    ["delivered",  "cancelled"],
  delivered:  [],   // terminal — locked
  cancelled:  [],   // terminal — locked
};

// Admin can override to any valid next status (for disputes, corrections)
const ADMIN_TRANSITIONS = {
  pending:           ["processing", "cancelled"],
  processing:        ["shipped", "partially_shipped", "cancelled"],
  partially_shipped: ["shipped", "delivered", "cancelled"],
  shipped:           ["delivered", "cancelled"],
  delivered:         [],   // terminal — locked for everyone
  cancelled:         [],   // terminal — locked for everyone
};

// ── BUYER: place order ─────────────────────────────────────────────────────────
export const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const buyerId = req.user._id;
    let { orderItems, shippingInfo, paymentInfo } = req.body;

    if (!shippingInfo?.address || !shippingInfo?.city || !shippingInfo?.postalCode || !shippingInfo?.country)
      throw Object.assign(new Error("Complete shippingInfo required"), { status: 400 });
    if (!paymentInfo?.method)
      throw Object.assign(new Error("paymentInfo.method is required"), { status: 400 });

    // Pull from cart if no items sent directly
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      const cart = await Cart.findOne({ buyer: buyerId }).populate("items.product").session(session);
      if (!cart || cart.items.length === 0)
        throw Object.assign(new Error("Cart is empty"), { status: 400 });
      orderItems = cart.items.map(it => ({
        product:  it.product._id,
        seller:   it.seller,
        name:     it.name,
        price:    it.price,
        quantity: it.quantity,
        image:    it.image,
      }));
    }

    const config = await Config.getConfig();
    const enrichedItems = [];

    for (const item of orderItems) {
      // Atomic stock decrement — fails if insufficient stock
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, status: "approved", stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session }
      );
      if (!updatedProduct) {
        const prod = await Product.findById(item.product).session(session);
        const msg = !prod
          ? `Product "${item.name}" is no longer available`
          : prod.status !== "approved"
          ? `"${prod.name}" is not available for purchase`
          : `Only ${prod.stock} units of "${prod.name}" available`;
        throw Object.assign(new Error(msg), { status: 400 });
      }

      const seller = await User.findById(item.seller).select("commissionRate sellerStatus").session(session);
      if (!seller || seller.sellerStatus !== "approved")
        throw Object.assign(new Error(`Seller for "${item.name}" is no longer active`), { status: 400 });

      const rate             = seller.commissionRate !== null ? seller.commissionRate : config.commissionRate;
      const grossAmount      = item.price * item.quantity;
      const commissionAmount = Number((grossAmount * (rate / 100)).toFixed(2));
      const sellerEarnings   = Number((grossAmount - commissionAmount).toFixed(2));

      enrichedItems.push({
        product: item.product, seller: item.seller,
        name: item.name, price: item.price, quantity: item.quantity,
        image: item.image || "",
        commissionRate: rate, commissionAmount, sellerEarnings,
      });
    }

    const { itemsPrice, taxPrice, shippingPrice, totalPrice, totalCommission } =
      computePrices(enrichedItems, config);
    const isCOD = paymentInfo.method === "COD";

    // Create the order first so Mongoose assigns _id to every orderItem subdoc
    const [order] = await Order.create([{
      buyer: buyerId, orderItems: enrichedItems, sellerSubOrders: [],
      shippingInfo, paymentInfo, itemsPrice, taxPrice, shippingPrice, totalPrice,
      totalCommission: Number(totalCommission.toFixed(2)),
      orderStatus: isCOD ? "pending" : "processing",
      isPaid: !isCOD, paidAt: isCOD ? undefined : new Date(),
    }], { session });

    // Now group by seller using the real _id Mongoose just assigned to each orderItem
    const sellerMap = new Map();
    order.orderItems.forEach((item) => {
      const sid = item.seller.toString();
      if (!sellerMap.has(sid))
        sellerMap.set(sid, { seller: item.seller, itemIds: [], gross: 0, commission: 0, net: 0 });
      const s = sellerMap.get(sid);
      s.itemIds.push(item._id);   // ← real ObjectId, not an array index
      const enriched = enrichedItems.find(e => e.product.toString() === item.product.toString() && e.seller.toString() === sid);
      s.gross      += item.price * item.quantity;
      s.commission += enriched?.commissionAmount || 0;
      s.net        += enriched?.sellerEarnings   || 0;
    });

    order.sellerSubOrders = [...sellerMap.values()].map(s => ({
      seller:           s.seller,
      items:            s.itemIds,          // ← ObjectIds ✓
      status:           "pending",
      grossAmount:      Number(s.gross.toFixed(2)),
      commissionAmount: Number(s.commission.toFixed(2)),
      netEarnings:      Number(s.net.toFixed(2)),
    }));

    await order.save({ session });

    await Cart.findOneAndDelete({ buyer: buyerId }).session(session);
    await session.commitTransaction();
    session.endSession();

    // Send order confirmation email (non-blocking)
    try {
      const buyer = await User.findById(buyerId).select("name email");
      if (buyer) await sendOrderConfirmationEmail(buyer, order);
    } catch (emailErr) {
      console.error("[Order] Confirmation email failed:", emailErr.message);
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// ── BUYER: get own orders ──────────────────────────────────────────────────────
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: "orderItems.seller", select: "shopName" });
  res.status(200).json({ success: true, data: orders });
});

// ── BUYER / ADMIN: get single order ───────────────────────────────────────────
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("buyer", "name email")
    .populate({ path: "orderItems.seller",  select: "shopName name" })
    .populate({ path: "orderItems.product", select: "name images status", options: { strictPopulate: false } });

  if (!order)
    return res.status(404).json({ success: false, message: "Order not found" });

  if (req.user.role === "buyer" && order.buyer._id.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: "Not authorized" });

  res.status(200).json({ success: true, data: order });
});

// ── SELLER: get their orders ───────────────────────────────────────────────────
export const getSellerOrders = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const orders = await Order.find({ "sellerSubOrders.seller": sellerId })
    .sort({ createdAt: -1 })
    .populate("buyer", "name email");

  const sellerView = orders.map(order => {
    const subOrder       = order.sellerSubOrders.find(s => s.seller.toString() === sellerId.toString());
    const sellerItemIds  = new Set((subOrder?.items || []).map(id => id.toString()));
    const myItems        = order.orderItems.filter(it => sellerItemIds.has(it._id.toString()));
    return {
      orderId:      order._id,
      createdAt:    order.createdAt,
      buyer:        order.buyer,
      shippingInfo: order.shippingInfo,
      myItems,
      subOrder,
    };
  });

  res.status(200).json({ success: true, data: sellerView });
});

// ── SELLER: update their sub-order fulfillment status ─────────────────────────
// Seller moves through: pending → processing → shipped → delivered (or → cancelled)
// Once delivered or cancelled, locked for everyone.
export const updateSellerSubOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.orderId);
  if (!order)
    return res.status(404).json({ success: false, message: "Order not found" });

  const subOrder = order.sellerSubOrders.find(
    s => s.seller.toString() === req.user._id.toString()
  );
  if (!subOrder)
    return res.status(403).json({ success: false, message: "No sub-order found for your store" });

  // Validate transition
  const allowed = SELLER_TRANSITIONS[subOrder.status] || [];
  if (!allowed.includes(status)) {
    if (allowed.length === 0)
      return res.status(400).json({
        success: false,
        message: `This order is already ${subOrder.status} — no further changes are allowed.`,
      });
    return res.status(400).json({
      success: false,
      message: `Cannot move from "${subOrder.status}" to "${status}". Allowed next: ${allowed.join(", ")}.`,
    });
  }

  subOrder.status = status;
  if (status === "shipped")   subOrder.shippedAt   = new Date();
  if (status === "delivered") subOrder.deliveredAt = new Date();

  // Derive overall order status from all sub-orders
  const allStatuses = order.sellerSubOrders.map(s => s.status);
  if      (allStatuses.every(s => s === "delivered"))  order.orderStatus = "delivered";
  else if (allStatuses.every(s => s === "cancelled"))  order.orderStatus = "cancelled";
  else if (allStatuses.some(s  => s === "shipped"))    order.orderStatus = "partially_shipped";
  else if (allStatuses.some(s  => s === "processing")) order.orderStatus = "processing";

  if (order.orderStatus === "delivered") order.deliveredAt = new Date();

  await order.save();
  res.status(200).json({ success: true, data: order });
});

// ── ADMIN: get all orders ──────────────────────────────────────────────────────
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { orderStatus: status } : {};
  const total  = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate("buyer", "name email")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const rev = await Order.aggregate([
    { $group: { _id: null, revenue: { $sum: "$totalPrice" }, commission: { $sum: "$totalCommission" } } },
  ]);

  res.status(200).json({
    success: true,
    meta: {
      total,
      page:            Number(page),
      pages:           Math.ceil(total / Number(limit)),
      totalRevenue:    rev[0]?.revenue    || 0,
      totalCommission: rev[0]?.commission || 0,
    },
    data: orders,
  });
});

// ── BUYER: get config for checkout preview (tax rate, shipping cost, threshold) ─
export const getCheckoutConfig = asyncHandler(async (req, res) => {
  const config = await Config.getConfig();
  res.status(200).json({
    success: true,
    data: {
      taxRate:               config.taxRate,
      shippingCost:          config.shippingCost,
      freeShippingThreshold: config.freeShippingThreshold,
    },
  });
});

// ── BUYER: cancel own order ────────────────────────────────────────────────────
// Only allowed when orderStatus is "pending" — once processing/shipped it's too late
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order)
    return res.status(404).json({ success: false, message: "Order not found" });

  // Only the buyer who placed the order can cancel it
  if (order.buyer.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: "Not authorized" });

  if (order.orderStatus !== "pending")
    return res.status(400).json({
      success: false,
      message: `Cannot cancel an order that is already "${order.orderStatus}". Only pending orders can be cancelled.`,
    });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Restore stock for every item
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    // Mark order and all sub-orders as cancelled
    order.orderStatus = "cancelled";
    order.sellerSubOrders.forEach(sub => { sub.status = "cancelled"; });
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// ── ADMIN: override order status ───────────────────────────────────────────────// Admin can move to any valid next status for disputes/corrections.
// Terminal states (delivered/cancelled) are locked for everyone — even admin.
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order)
    return res.status(404).json({ success: false, message: "Order not found" });

  const allowed = ADMIN_TRANSITIONS[order.orderStatus] || [];
  if (!allowed.includes(status)) {
    if (allowed.length === 0)
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.orderStatus} — no further changes are allowed.`,
      });
    return res.status(400).json({
      success: false,
      message: `Cannot move from "${order.orderStatus}" to "${status}". Allowed next: ${allowed.join(", ")}.`,
    });
  }

  order.orderStatus = status;
  if (status === "delivered") order.deliveredAt = new Date();
  await order.save();
  res.status(200).json({ success: true, data: order });
});