/**
 * controllers/sellerAnalyticsController.js
 *
 * Seller-specific dashboard analytics.
 * All data is scoped to req.user._id — sellers only ever see their own numbers.
 */

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/seller/analytics/overview
// Total earnings, commission paid, orders count, products count
export const getSellerOverview = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  const [productsCount, earningsAgg] = await Promise.all([
    Product.countDocuments({ seller: sellerId }),
    Order.aggregate([
      { $unwind: "$sellerSubOrders" },
      { $match: { "sellerSubOrders.seller": sellerId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalGross: { $sum: "$sellerSubOrders.grossAmount" },
          totalCommission: { $sum: "$sellerSubOrders.commissionAmount" },
          totalNet: { $sum: "$sellerSubOrders.netEarnings" },
        },
      },
    ]),
  ]);

  const stats = earningsAgg[0] || { totalOrders: 0, totalGross: 0, totalCommission: 0, totalNet: 0 };

  res.status(200).json({
    success: true,
    data: {
      totalProducts: productsCount,
      totalOrders: stats.totalOrders,
      totalGrossRevenue: Number(stats.totalGross.toFixed(2)),
      totalCommissionPaid: Number(stats.totalCommission.toFixed(2)),
      totalNetEarnings: Number(stats.totalNet.toFixed(2)),
    },
  });
});

// GET /api/seller/analytics/monthly
// Monthly net earnings for this seller
export const getSellerMonthlySales = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const year = Number(req.query.year) || new Date().getFullYear();

  const data = await Order.aggregate([
    {
      $match: {
        "sellerSubOrders.seller": sellerId,
        createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59`) },
      },
    },
    { $unwind: "$sellerSubOrders" },
    { $match: { "sellerSubOrders.seller": sellerId } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        grossAmount: { $sum: "$sellerSubOrders.grossAmount" },
        commission: { $sum: "$sellerSubOrders.commissionAmount" },
        netEarnings: { $sum: "$sellerSubOrders.netEarnings" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: "$_id",
        grossAmount: { $round: ["$grossAmount", 2] },
        commission: { $round: ["$commission", 2] },
        netEarnings: { $round: ["$netEarnings", 2] },
        orderCount: 1,
      },
    },
  ]);

  res.status(200).json({ success: true, year, data });
});

// GET /api/seller/analytics/top-products
// This seller's best-selling products by quantity sold
export const getSellerTopProducts = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  const data = await Order.aggregate([
    { $unwind: "$orderItems" },
    { $match: { "orderItems.seller": sellerId } },
    {
      $group: {
        _id: "$orderItems.product",
        name: { $first: "$orderItems.name" },
        totalSold: { $sum: "$orderItems.quantity" },
        totalRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
        totalEarnings: { $sum: "$orderItems.sellerEarnings" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $project: {
        name: 1,
        totalSold: 1,
        totalRevenue: { $round: ["$totalRevenue", 2] },
        totalEarnings: { $round: ["$totalEarnings", 2] },
      },
    },
  ]);

  res.status(200).json({ success: true, data });
});

// GET /api/seller/analytics/low-stock
// This seller's products with low stock
export const getSellerLowStock = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || 5;
  const products = await Product.find({ seller: req.user._id, stock: { $lte: threshold } })
    .select("name stock status images")
    .sort({ stock: 1 });

  res.status(200).json({ success: true, threshold, count: products.length, data: products });
});
