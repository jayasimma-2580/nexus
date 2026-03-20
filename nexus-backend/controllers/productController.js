import Product  from "../models/Product.js";
import Category from "../models/Category.js";
import Order    from "../models/Order.js";
import slugify  from "slugify";
import asyncHandler from "../utils/asyncHandler.js";

const PUBLIC_FILTER = { status: "approved" };
const escapeRegex   = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── SELLER: create product ────────────────────────────────────────────────────
export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category: categoryId, stock } = req.body;

  if (!name || !description || price == null || !categoryId)
    return res.status(400).json({ success: false, message: "name, description, price and category are required" });

  if (isNaN(Number(price)) || Number(price) <= 0)
    return res.status(400).json({ success: false, message: "Price must be greater than 0" });

  if (stock == null || isNaN(Number(stock)) || Number(stock) <= 0)
    return res.status(400).json({ success: false, message: "Stock must be greater than 0" });

  const category = await Category.findById(categoryId);
  if (!category)
    return res.status(400).json({ success: false, message: "Invalid category" });

  // Block duplicate: same seller + same name (case-insensitive)
  const duplicate = await Product.findOne({
    seller: req.user._id,
    name:   { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
  });
  if (duplicate)
    return res.status(409).json({
      success: false,
      message: `You already have a product named "${name.trim()}". Use a different name or edit the existing one.`,
    });

  const images = (req.files || []).map(f => ({ url: f.path, alt: f.originalname }));

  const product = await Product.create({
    name:        name.trim(),
    slug:        slugify(name.trim(), { lower: true, strict: true }),
    description: description.trim(),
    price:       Number(price),
    category:    categoryId,
    images,
    stock:       Number(stock),
    seller:      req.user._id,
    status:      "pending",
  });

  res.status(201).json({ success: true, message: "Product submitted for admin approval.", data: product });
});

// ── SELLER: update product ────────────────────────────────────────────────────
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  if (req.user.role === "seller" && product.seller.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: "Not authorized to edit this product" });

  const { name, description, price, category, stock } = req.body;

  if (price != null && (isNaN(Number(price)) || Number(price) <= 0))
    return res.status(400).json({ success: false, message: "Price must be greater than 0" });

  if (stock != null && (isNaN(Number(stock)) || Number(stock) <= 0))
    return res.status(400).json({ success: false, message: "Stock must be greater than 0" });

  // Duplicate name check only when name is actually changing
  if (name && name.trim().toLowerCase() !== product.name.toLowerCase()) {
    const duplicate = await Product.findOne({
      seller: product.seller,
      name:   { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") },
      _id:    { $ne: product._id },
    });
    if (duplicate)
      return res.status(409).json({
        success: false,
        message: `You already have a product named "${name.trim()}". Use a different name.`,
      });
  }

  if (name)        { product.name = name.trim(); product.slug = slugify(name.trim(), { lower: true, strict: true }); }
  if (description)   product.description = description.trim();
  if (price != null) product.price = Number(price);
  if (category)      product.category = category;
  if (stock != null) product.stock = Number(stock);

  // Image handling
  const keepImages = req.body.keepImages
    ? (Array.isArray(req.body.keepImages) ? req.body.keepImages : [req.body.keepImages])
    : null;
  if (keepImages !== null)
    product.images = product.images.filter(img => keepImages.includes(img.url));

  const newImages = (req.files || []).map(f => ({ url: f.path, alt: f.originalname }));  // ✅ fixed variable name
  product.images = [...product.images, ...newImages].slice(0, 5);

  // Seller resubmit — reset to pending and clear stale rejection reason
  if (req.user.role === "seller") {
    product.status = "pending";
    product.rejectionReason = undefined;
  }

  await product.save();
  res.status(200).json({ success: true, message: "Product updated. Pending re-approval.", data: product });
});

// ── SELLER / ADMIN: delete product ────────────────────────────────────────────
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  if (req.user.role === "seller" && product.seller.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: "Not authorized to delete this product" });

  const activeOrder = await Order.findOne({
    "orderItems.product": product._id,
    orderStatus: { $in: ["pending", "processing", "partially_shipped", "shipped"] },
  }).select("_id orderStatus");

  if (activeOrder)
    return res.status(400).json({
      success: false,
      message: `Cannot delete "${product.name}" — it has an active order (${activeOrder.orderStatus}). Wait for it to be delivered or cancelled first.`,
    });

  await product.deleteOne();
  res.status(200).json({ success: true, message: `"${product.name}" deleted. Order history is preserved.` });
});

// ── SELLER: get own products ──────────────────────────────────────────────────
export const getMyProducts = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { seller: req.user._id };
  if (status) filter.status = status;

  const total    = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    meta: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    data: products,
  });
});

// ── ADMIN: list pending products ──────────────────────────────────────────────
export const getPendingProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ status: "pending" })
    .populate("seller",   "name email shopName")
    .populate("category", "name")
    .sort({ createdAt: 1 });
  res.status(200).json({ success: true, count: products.length, data: products });
});

// ── ADMIN: approve product ────────────────────────────────────────────────────
export const approveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      $set:   { status: "approved" },
      $unset: { rejectionReason: "" },
    },
    { new: true }
  );
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  res.status(200).json({ success: true, message: "Product approved and visible to buyers.", data: product });
});

// ── ADMIN: reject product ─────────────────────────────────────────────────────
export const rejectProduct = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim())
    return res.status(400).json({ success: false, message: "A rejection reason is required" });

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "rejected", rejectionReason: reason.trim() } },
    { new: true }
  );
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  res.status(200).json({ success: true, message: "Product rejected. Seller will see the reason.", data: product });
});

// ── PUBLIC: all approved products ─────────────────────────────────────────────
export const getProducts = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, sort, seller, page = 1, limit = 12 } = req.query;

  const filter = { status: "approved" };
  if (q)        filter.$text    = { $search: q };
  if (category) filter.category = category;
  if (seller)   filter.seller   = seller;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const sortMap  = { price_asc: { price: 1 }, price_desc: { price: -1 }, rating: { rating: -1 } };
  const sortQuery = sortMap[sort] || { createdAt: -1 };

  const all = await Product.find(filter)
    .populate({ path: "seller", select: "shopName sellerStatus", match: { sellerStatus: "approved" } })
    .populate("category", "name")
    .sort(sortQuery)
    .lean();

  const visible   = all.filter(p => p.seller !== null);
  const total     = visible.length;
  const pages     = Math.ceil(total / limitNum) || 1;
  const paginated = visible.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.status(200).json({
    success: true,
    meta: { total, page: pageNum, limit: limitNum, pages },
    data: paginated,
  });
});

// ── PUBLIC: single product ────────────────────────────────────────────────────
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, status: "approved" })
    .populate({ path: "seller", select: "shopName sellerStatus name", match: { sellerStatus: "approved" } })
    .populate("category", "name description");

  if (!product || !product.seller)
    return res.status(404).json({ success: false, message: "Product not found" });

  res.status(200).json({ success: true, data: product });
});