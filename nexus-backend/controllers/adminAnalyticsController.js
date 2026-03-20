/**
 * controllers/adminAnalyticsController.js
 *
 * Platform-wide analytics visible only to admin.
 * Covers: overview, monthly revenue, commission earned,
 *         top sellers, top products, low stock, recent orders.
 */

import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/admin/analytics/overview
export const getAdminOverview = asyncHandler(async (req, res) => {
  const [totalBuyers, totalSellers, totalProducts, totalOrders, revenueAgg] = await Promise.all([
    User.countDocuments({ role: "buyer" }),
    User.countDocuments({ role: "seller", sellerStatus: "approved" }),
    Product.countDocuments({ status: "approved" }),
    Order.countDocuments(),
    Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalCommission: { $sum: "$totalCommission" },
        },
      },
    ]),
  ]);

  const rev = revenueAgg[0] || { totalRevenue: 0, totalCommission: 0 };

  res.status(200).json({
    success: true,
    data: {
      totalBuyers,
      totalSellers,
      totalProducts,
      totalOrders,
      totalRevenue: Number(rev.totalRevenue.toFixed(2)),
      totalCommission: Number(rev.totalCommission.toFixed(2)),
      pendingSellers: await User.countDocuments({ role: "seller", sellerStatus: "pending" }),
      pendingProducts: await Product.countDocuments({ status: "pending" }),
    },
  });
});

// GET /api/admin/analytics/sales/monthly?year=2024
export const getMonthlySales = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const data = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31T23:59:59`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        totalSales: { $sum: "$totalPrice" },
        totalCommission: { $sum: "$totalCommission" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: "$_id",
        totalSales: { $round: ["$totalSales", 2] },
        totalCommission: { $round: ["$totalCommission", 2] },
        orderCount: 1,
      },
    },
  ]);

  res.status(200).json({ success: true, year, data });
});

// GET /api/admin/analytics/top-sellers
// Top 10 sellers by net earnings
export const getTopSellers = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $unwind: "$sellerSubOrders" },
    {
      $group: {
        _id: "$sellerSubOrders.seller",
        totalOrders: { $sum: 1 },
        totalGross: { $sum: "$sellerSubOrders.grossAmount" },
        totalCommission: { $sum: "$sellerSubOrders.commissionAmount" },
        totalNet: { $sum: "$sellerSubOrders.netEarnings" },
      },
    },
    { $sort: { totalNet: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "seller",
      },
    },
    { $unwind: "$seller" },
    {
      $project: {
        shopName: "$seller.shopName",
        name: "$seller.name",
        email: "$seller.email",
        totalOrders: 1,
        totalGross: { $round: ["$totalGross", 2] },
        totalCommission: { $round: ["$totalCommission", 2] },
        totalNet: { $round: ["$totalNet", 2] },
      },
    },
  ]);

  res.status(200).json({ success: true, data });
});

// GET /api/admin/analytics/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
  const data = await Order.aggregate([
    { $unwind: "$orderItems" },
    {
      $group: {
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        totalSold: { $sum: "$orderItems.quantity" },
        totalRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $project: {
        name: 1,
        totalSold: 1,
        totalRevenue: { $round: ["$totalRevenue", 2] },
      },
    },
  ]);

  res.status(200).json({ success: true, data });
});

// GET /api/admin/analytics/low-stock?threshold=5
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || 5;
  const products = await Product.find({ status: "approved", stock: { $lte: threshold } })
    .select("name stock images seller category")
    .populate("seller", "shopName")
    .populate("category", "name")
    .sort({ stock: 1 });

  res.status(200).json({ success: true, threshold, count: products.length, data: products });
});

// GET /api/admin/analytics/recent-orders?limit=10
export const getRecentOrders = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("buyer", "name email");

  res.status(200).json({ success: true, data: orders });
});
