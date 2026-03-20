/**
 * seed.js — Fresh seed for Nexus E-Commerce Platform
 *
 * Creates:
 *   - 1 Admin
 *   - 3 Sellers  (TechZone, StyleVault, FreshRoots)
 *   - 3 Buyers   (Arjun, Priya, Rahul)
 *   - 10 Categories
 *   - 30 Products (3 per seller per category spread, all approved)
 *   - Carts       (each buyer has 3–4 items)
 *   - Wishlists   (each buyer has 4–5 saved products)
 *   - Orders      (2 delivered + 1 pending per buyer)
 *   - Reviews     (on delivered order items, with seller replies)
 *   - Config      (platform commission/tax/shipping settings)
 *
 * WARNING: Drops ALL existing data before seeding.
 *
 * Usage:
 *   node seed.js
 */

import { fileURLToPath } from "url";
import { dirname, join }  from "path";
import dotenv             from "dotenv";
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

import mongoose from "mongoose";
import bcrypt   from "bcryptjs";
import slugify  from "slugify";

import User     from "./models/User.js";
import Category from "./models/Category.js";
import Product  from "./models/Product.js";
import Order    from "./models/Order.js";
import Review   from "./models/Review.js";
import Cart     from "./models/Cart.js";
import Wishlist from "./models/Wishlist.js";
import Config   from "./models/Config.js";

// ── connect ───────────────────────────────────────────────────────────────────
async function connect() {
  if (!process.env.MONGO_URI) { console.error("❌  MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  MongoDB connected\n");
}

// ── wipe all collections ──────────────────────────────────────────────────────
async function wipe() {
  console.log("🗑️   Wiping existing data...");
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Config.deleteMany({}),
  ]);
  console.log("✅  All collections cleared\n");
}

// ── helpers ───────────────────────────────────────────────────────────────────
const hash  = (pw) => bcrypt.hash(pw, 10);
const fmt   = (n)  => parseFloat(n.toFixed(2));
const pct   = (n, r) => fmt(n * r / 100);
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Real Unsplash image URLs (direct stable links via picsum / unsplash source)
const img = (url, alt) => ({ url, alt });

// ── 1. CONFIG ─────────────────────────────────────────────────────────────────
async function seedConfig() {
  console.log("⚙️   Seeding config...");
  await Config.create({
    commissionRate:        10,
    taxRate:               5,
    shippingCost:          50,
    freeShippingThreshold: 1000,
  });
  console.log("✅  Config created\n");
}

// ── 2. USERS ──────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("👤  Seeding users...");

  const password = await hash("Password@123");

  // Admin
  const admin = await User.create({
    name:            "Super Admin",
    email:           "admin@nexus.com",
    password,
    role:            "admin",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000001",
    address: { street: "12 Admin Lane", city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "India" },
  });

  // Sellers
  const seller1 = await User.create({
    name:            "Vikram Tech",
    email:           "seller1@nexus.com",
    password,
    role:            "seller",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000002",
    sellerStatus:    "approved",
    shopName:        "TechZone",
    shopDescription: "Premium electronics and gadgets for modern living.",
    commissionRate:  10,
    address: { street: "45 Electronics Hub", city: "Bengaluru", state: "Karnataka", postalCode: "560034", country: "India" },
    shopAddress: { street: "45 Electronics Hub", city: "Bengaluru", state: "Karnataka", postalCode: "560034", country: "India" },
  });

  const seller2 = await User.create({
    name:            "Ananya Fashion",
    email:           "seller2@nexus.com",
    password,
    role:            "seller",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000003",
    sellerStatus:    "approved",
    shopName:        "StyleVault",
    shopDescription: "Trendy fashion and accessories for every occasion.",
    commissionRate:  10,
    address: { street: "22 Fashion Street", city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India" },
    shopAddress: { street: "22 Fashion Street", city: "Mumbai", state: "Maharashtra", postalCode: "400001", country: "India" },
  });

  const seller3 = await User.create({
    name:            "Ravi Organics",
    email:           "seller3@nexus.com",
    password,
    role:            "seller",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000004",
    sellerStatus:    "approved",
    shopName:        "FreshRoots",
    shopDescription: "100% organic food and natural wellness products.",
    commissionRate:  10,
    address: { street: "8 Green Valley", city: "Pune", state: "Maharashtra", postalCode: "411001", country: "India" },
    shopAddress: { street: "8 Green Valley", city: "Pune", state: "Maharashtra", postalCode: "411001", country: "India" },
  });

  // Buyers
  const buyer1 = await User.create({
    name:            "Arjun Sharma",
    email:           "buyer1@nexus.com",
    password,
    role:            "buyer",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000005",
    address: { street: "101 Residency Road", city: "Bengaluru", state: "Karnataka", postalCode: "560025", country: "India" },
  });

  const buyer2 = await User.create({
    name:            "Priya Nair",
    email:           "buyer2@nexus.com",
    password,
    role:            "buyer",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000006",
    address: { street: "55 Marine Drive", city: "Mumbai", state: "Maharashtra", postalCode: "400020", country: "India" },
  });

  const buyer3 = await User.create({
    name:            "Rahul Mehta",
    email:           "buyer3@nexus.com",
    password,
    role:            "buyer",
    isEmailVerified: true,
    isPhoneVerified: true,
    phone:           "+91 9000000007",
    address: { street: "77 Park Avenue", city: "Delhi", state: "Delhi", postalCode: "110001", country: "India" },
  });

  console.log("✅  Users created (1 admin, 3 sellers, 3 buyers)\n");
  return { admin, seller1, seller2, seller3, buyer1, buyer2, buyer3 };
}

// ── 3. CATEGORIES ─────────────────────────────────────────────────────────────
async function seedCategories() {
  console.log("📂  Seeding categories...");

  const cats = await Category.insertMany([
    { name: "Smartphones",    description: "Latest smartphones and mobile devices" },
    { name: "Laptops",        description: "Laptops and portable computers" },
    { name: "Audio",          description: "Headphones, speakers and audio gear" },
    { name: "Cameras",        description: "DSLR, mirrorless and action cameras" },
    { name: "Men's Clothing", description: "Shirts, trousers, ethnic wear and more" },
    { name: "Women's Clothing", description: "Kurtas, dresses, sarees and more" },
    { name: "Footwear",       description: "Shoes, sandals and sneakers" },
    { name: "Organic Food",   description: "Fresh organic grains, spices and pulses" },
    { name: "Superfoods",     description: "Nutrition-rich superfoods and seeds" },
    { name: "Skincare",       description: "Natural and organic skincare products" },
  ]);

  console.log(`✅  ${cats.length} categories created\n`);
  return cats;
}

// ── 4. PRODUCTS ───────────────────────────────────────────────────────────────
async function seedProducts(sellers, categories) {
  console.log("📦  Seeding products...");

  const { seller1, seller2, seller3 } = sellers;

  const catMap = {};
  categories.forEach(c => { catMap[c.name] = c._id; });

  const products = await Product.insertMany([

    // ── TechZone (seller1) ── Smartphones ──────────────────────────────────────
    {
      name: "Samsung Galaxy S24 Ultra",
      slug: slugify("Samsung Galaxy S24 Ultra", { lower: true, strict: true }),
      description: "200MP camera, Snapdragon 8 Gen 3, 5000mAh battery, built-in S Pen. The ultimate Android flagship with stunning AMOLED display and AI-powered photography.",
      price: 124999,
      category: catMap["Smartphones"],
      seller: seller1._id,
      status: "approved",
      stock: 45,
      rating: 4.8,
      numReviews: 3,
      images: [
        img("https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80", "Samsung Galaxy S24 Ultra"),
        img("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80", "Smartphone rear view"),
      ],
    },
    {
      name: "iPhone 15 Pro Max",
      slug: slugify("iPhone 15 Pro Max", { lower: true, strict: true }),
      description: "A17 Pro chip, titanium design, 48MP main camera with 5x optical zoom, Dynamic Island and USB-C. Apple's best iPhone ever.",
      price: 159900,
      category: catMap["Smartphones"],
      seller: seller1._id,
      status: "approved",
      stock: 30,
      rating: 4.9,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80", "iPhone 15 Pro Max"),
        img("https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80", "iPhone side view"),
      ],
    },
    {
      name: "OnePlus 12",
      slug: slugify("OnePlus 12", { lower: true, strict: true }),
      description: "Snapdragon 8 Gen 3, Hasselblad camera, 100W SUPERVOOC charging. Blazing fast performance at an unbeatable price.",
      price: 64999,
      category: catMap["Smartphones"],
      seller: seller1._id,
      status: "approved",
      stock: 60,
      rating: 4.6,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80", "OnePlus 12"),
      ],
    },

    // ── TechZone (seller1) ── Laptops ──────────────────────────────────────────
    {
      name: "MacBook Pro 14 M3",
      slug: slugify("MacBook Pro 14 M3", { lower: true, strict: true }),
      description: "Apple M3 chip, 16GB RAM, 512GB SSD, Liquid Retina XDR display. Unleash pro-level performance for developers and creators.",
      price: 168900,
      category: catMap["Laptops"],
      seller: seller1._id,
      status: "approved",
      stock: 20,
      rating: 4.9,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80", "MacBook Pro"),
        img("https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80", "MacBook open"),
      ],
    },
    {
      name: "Dell XPS 15",
      slug: slugify("Dell XPS 15", { lower: true, strict: true }),
      description: "Intel Core i9, 32GB RAM, RTX 4070, 4K OLED display. A powerhouse laptop for professionals who demand the best.",
      price: 189999,
      category: catMap["Laptops"],
      seller: seller1._id,
      status: "approved",
      stock: 15,
      rating: 4.7,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80", "Dell XPS 15"),
      ],
    },

    // ── TechZone (seller1) ── Audio ────────────────────────────────────────────
    {
      name: "Sony WH-1000XM5",
      slug: slugify("Sony WH-1000XM5", { lower: true, strict: true }),
      description: "Industry-leading noise cancellation, 30-hour battery life, Multipoint connection, crystal-clear hands-free calling. The gold standard in wireless headphones.",
      price: 29990,
      category: catMap["Audio"],
      seller: seller1._id,
      status: "approved",
      stock: 80,
      rating: 4.8,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80", "Sony WH-1000XM5"),
        img("https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&q=80", "Headphones lifestyle"),
      ],
    },
    {
      name: "JBL Flip 6 Speaker",
      slug: slugify("JBL Flip 6 Speaker", { lower: true, strict: true }),
      description: "IP67 waterproof, 12-hour playtime, powerful JBL Original Pro Sound with punchy bass. Perfect for outdoor adventures.",
      price: 9999,
      category: catMap["Audio"],
      seller: seller1._id,
      status: "approved",
      stock: 100,
      rating: 4.5,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80", "JBL Speaker"),
      ],
    },

    // ── TechZone (seller1) ── Cameras ──────────────────────────────────────────
    {
      name: "Sony Alpha A7 IV",
      slug: slugify("Sony Alpha A7 IV", { lower: true, strict: true }),
      description: "33MP full-frame sensor, 4K 60fps video, 759 phase-detect AF points. Professional mirrorless camera for photographers and videographers.",
      price: 259990,
      category: catMap["Cameras"],
      seller: seller1._id,
      status: "approved",
      stock: 10,
      rating: 4.9,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80", "Sony Alpha Camera"),
        img("https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80", "Camera lens"),
      ],
    },

    // ── StyleVault (seller2) ── Men's Clothing ─────────────────────────────────
    {
      name: "Premium Cotton Kurta Set",
      slug: slugify("Premium Cotton Kurta Set", { lower: true, strict: true }),
      description: "Pure cotton kurta with matching pajama. Hand-block printed, breathable fabric, perfect for festive occasions and casual wear.",
      price: 1899,
      category: catMap["Men's Clothing"],
      seller: seller2._id,
      status: "approved",
      stock: 150,
      rating: 4.6,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&q=80", "Kurta Set"),
        img("https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80", "Men ethnic wear"),
      ],
    },
    {
      name: "Slim Fit Formal Shirt",
      slug: slugify("Slim Fit Formal Shirt", { lower: true, strict: true }),
      description: "Premium wrinkle-free cotton-blend fabric, slim fit cut, available in 8 colours. Perfect for office and formal occasions.",
      price: 1299,
      category: catMap["Men's Clothing"],
      seller: seller2._id,
      status: "approved",
      stock: 200,
      rating: 4.4,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80", "Formal Shirt"),
      ],
    },
    {
      name: "Jogger Track Pants",
      slug: slugify("Jogger Track Pants", { lower: true, strict: true }),
      description: "4-way stretch fabric, zippered pockets, elastic waistband. Ideal for gym, running and casual everyday wear.",
      price: 999,
      category: catMap["Men's Clothing"],
      seller: seller2._id,
      status: "approved",
      stock: 300,
      rating: 4.3,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", "Track Pants"),
      ],
    },

    // ── StyleVault (seller2) ── Women's Clothing ───────────────────────────────
    {
      name: "Embroidered Anarkali Kurta",
      slug: slugify("Embroidered Anarkali Kurta", { lower: true, strict: true }),
      description: "Intricate floral embroidery on premium georgette fabric. Floor-length Anarkali silhouette with matching dupatta — perfect for festivities.",
      price: 2799,
      category: catMap["Women's Clothing"],
      seller: seller2._id,
      status: "approved",
      stock: 120,
      rating: 4.7,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=600&q=80", "Anarkali Kurta"),
        img("https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", "Women ethnic fashion"),
      ],
    },
    {
      name: "Floral Wrap Maxi Dress",
      slug: slugify("Floral Wrap Maxi Dress", { lower: true, strict: true }),
      description: "Lightweight chiffon fabric with vibrant floral print. V-neckline, wrap style, flowy maxi length. Perfect for beach outings and summer parties.",
      price: 1599,
      category: catMap["Women's Clothing"],
      seller: seller2._id,
      status: "approved",
      stock: 90,
      rating: 4.5,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80", "Maxi Dress"),
      ],
    },
    {
      name: "Classic Silk Saree",
      slug: slugify("Classic Silk Saree", { lower: true, strict: true }),
      description: "Handwoven Banarasi silk saree with zari border. Rich texture, elegant drape, comes with matching blouse piece. A timeless heirloom piece.",
      price: 7499,
      category: catMap["Women's Clothing"],
      seller: seller2._id,
      status: "approved",
      stock: 40,
      rating: 4.8,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", "Silk Saree"),
      ],
    },

    // ── StyleVault (seller2) ── Footwear ───────────────────────────────────────
    {
      name: "Nike Air Max 270",
      slug: slugify("Nike Air Max 270", { lower: true, strict: true }),
      description: "Max Air heel unit for all-day cushioning, breathable mesh upper, foam midsole. Iconic street style meets exceptional comfort.",
      price: 10995,
      category: catMap["Footwear"],
      seller: seller2._id,
      status: "approved",
      stock: 75,
      rating: 4.7,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", "Nike Air Max"),
        img("https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80", "Sneakers pair"),
      ],
    },
    {
      name: "Woodland Trekking Boots",
      slug: slugify("Woodland Trekking Boots", { lower: true, strict: true }),
      description: "Full-grain leather upper, waterproof membrane, deep lug outsole for superior grip. Built for serious trekkers and outdoor enthusiasts.",
      price: 3999,
      category: catMap["Footwear"],
      seller: seller2._id,
      status: "approved",
      stock: 55,
      rating: 4.6,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&q=80", "Trekking Boots"),
      ],
    },

    // ── FreshRoots (seller3) ── Organic Food ───────────────────────────────────
    {
      name: "Organic Basmati Rice 5kg",
      slug: slugify("Organic Basmati Rice 5kg", { lower: true, strict: true }),
      description: "Aged 2-year Himalayan basmati rice. Naturally grown without pesticides, long grain, aromatic and perfect for biryani and pulao.",
      price: 699,
      category: catMap["Organic Food"],
      seller: seller3._id,
      status: "approved",
      stock: 500,
      rating: 4.8,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80", "Basmati Rice"),
        img("https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=600&q=80", "Rice grains"),
      ],
    },
    {
      name: "Cold Pressed Coconut Oil 1L",
      slug: slugify("Cold Pressed Coconut Oil 1L", { lower: true, strict: true }),
      description: "Traditional wood-pressed virgin coconut oil. Retains natural nutrients and aroma. Ideal for cooking, hair care and skin moisturizing.",
      price: 449,
      category: catMap["Organic Food"],
      seller: seller3._id,
      status: "approved",
      stock: 300,
      rating: 4.7,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80", "Coconut Oil"),
      ],
    },
    {
      name: "Organic Masoor Dal 1kg",
      slug: slugify("Organic Masoor Dal 1kg", { lower: true, strict: true }),
      description: "Stone-milled organic red lentils from certified farms. Rich in protein and iron, cooks quickly, ideal for daily meals.",
      price: 199,
      category: catMap["Organic Food"],
      seller: seller3._id,
      status: "approved",
      stock: 600,
      rating: 4.5,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80", "Masoor Dal"),
      ],
    },
    {
      name: "Wild Forest Honey 500g",
      slug: slugify("Wild Forest Honey 500g", { lower: true, strict: true }),
      description: "Raw, unfiltered, unheated honey harvested from wild forest beehives. Naturally antibacterial, rich in enzymes and antioxidants.",
      price: 599,
      category: catMap["Organic Food"],
      seller: seller3._id,
      status: "approved",
      stock: 200,
      rating: 4.9,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80", "Wild Honey"),
        img("https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80", "Honey jar"),
      ],
    },

    // ── FreshRoots (seller3) ── Superfoods ────────────────────────────────────
    {
      name: "Chia Seeds 250g",
      slug: slugify("Chia Seeds 250g", { lower: true, strict: true }),
      description: "Premium organic chia seeds loaded with omega-3, fibre and protein. Perfect for smoothies, puddings and energy bars.",
      price: 349,
      category: catMap["Superfoods"],
      seller: seller3._id,
      status: "approved",
      stock: 400,
      rating: 4.7,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1541714373895-f7cad7e58888?w=600&q=80", "Chia Seeds"),
      ],
    },
    {
      name: "Moringa Leaf Powder 200g",
      slug: slugify("Moringa Leaf Powder 200g", { lower: true, strict: true }),
      description: "Sun-dried and stone-ground moringa leaves. Rich in vitamins A, C and E, iron and calcium. Add to smoothies, soups or capsules.",
      price: 299,
      category: catMap["Superfoods"],
      seller: seller3._id,
      status: "approved",
      stock: 350,
      rating: 4.6,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", "Moringa Powder"),
      ],
    },
    {
      name: "Quinoa 500g",
      slug: slugify("Quinoa 500g", { lower: true, strict: true }),
      description: "Certified organic white quinoa from the Andes. Complete protein with all essential amino acids, gluten-free and easy to cook.",
      price: 399,
      category: catMap["Superfoods"],
      seller: seller3._id,
      status: "approved",
      stock: 250,
      rating: 4.5,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80", "Quinoa"),
      ],
    },

    // ── FreshRoots (seller3) ── Skincare ───────────────────────────────────────
    {
      name: "Rose Hip Face Serum 30ml",
      slug: slugify("Rose Hip Face Serum 30ml", { lower: true, strict: true }),
      description: "100% natural rosehip seed oil serum rich in vitamin C and retinol. Reduces dark spots, fine lines and improves skin elasticity.",
      price: 799,
      category: catMap["Skincare"],
      seller: seller3._id,
      status: "approved",
      stock: 180,
      rating: 4.8,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&q=80", "Face Serum"),
        img("https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80", "Skincare product"),
      ],
    },
    {
      name: "Neem Tulsi Face Wash 100ml",
      slug: slugify("Neem Tulsi Face Wash 100ml", { lower: true, strict: true }),
      description: "Ayurvedic formula with neem, tulsi and aloe vera. Deeply cleanses pores, controls acne and gives a fresh radiant glow.",
      price: 249,
      category: catMap["Skincare"],
      seller: seller3._id,
      status: "approved",
      stock: 400,
      rating: 4.5,
      numReviews: 2,
      images: [
        img("https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80", "Face Wash"),
      ],
    },
    {
      name: "Shea Butter Body Lotion 200ml",
      slug: slugify("Shea Butter Body Lotion 200ml", { lower: true, strict: true }),
      description: "Deep moisturizing lotion with raw shea butter, almond oil and vitamin E. Repairs dry skin, absorbs quickly, fragrance-free.",
      price: 449,
      category: catMap["Skincare"],
      seller: seller3._id,
      status: "approved",
      stock: 220,
      rating: 4.6,
      numReviews: 1,
      images: [
        img("https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80", "Body Lotion"),
      ],
    },
  ]);

  console.log(`✅  ${products.length} products created\n`);
  return products;
}

// ── 5. ORDERS ─────────────────────────────────────────────────────────────────
async function seedOrders(users, products, config) {
  console.log("🛒  Seeding orders...");

  const { buyer1, buyer2, buyer3, seller1, seller2, seller3 } = users;
  const commRate = 10;

  const makeItem = (product, quantity) => {
    const gross      = fmt(product.price * quantity);
    const commission = pct(gross, commRate);
    const earnings   = fmt(gross - commission);
    return {
      product:          product._id,
      seller:           product.seller,
      name:             product.name,
      price:            product.price,
      quantity,
      image:            product.images[0]?.url || "",
      commissionRate:   commRate,
      commissionAmount: commission,
      sellerEarnings:   earnings,
    };
  };

  const makeOrder = async (buyer, itemDefs, status, daysAgo) => {
    const orderItems = itemDefs.map(([p, q]) => makeItem(p, q));

    // Group items by seller for sub-orders
    const sellerMap = {};
    orderItems.forEach(item => {
      const sid = item.seller.toString();
      if (!sellerMap[sid]) sellerMap[sid] = { seller: item.seller, items: [], gross: 0, commission: 0, net: 0 };
      sellerMap[sid].items.push(item);
      sellerMap[sid].gross      = fmt(sellerMap[sid].gross + item.price * item.quantity);
      sellerMap[sid].commission = fmt(sellerMap[sid].commission + item.commissionAmount);
      sellerMap[sid].net        = fmt(sellerMap[sid].net + item.sellerEarnings);
    });

    const sellerSubOrders = Object.values(sellerMap).map(s => ({
      seller:           s.seller,
      items:            s.items.map((_, i) => new mongoose.Types.ObjectId()),
      status,
      grossAmount:      s.gross,
      commissionAmount: s.commission,
      netEarnings:      s.net,
      ...(status === "delivered" ? { shippedAt: new Date(Date.now() - (daysAgo - 2) * 86400000), deliveredAt: new Date(Date.now() - daysAgo * 86400000) } : {}),
    }));

    const itemsPrice    = fmt(orderItems.reduce((s, i) => s + i.price * i.quantity, 0));
    const taxPrice      = pct(itemsPrice, 5);
    const shippingPrice = itemsPrice >= 1000 ? 0 : 50;
    const totalPrice    = fmt(itemsPrice + taxPrice + shippingPrice);
    const totalCommission = fmt(orderItems.reduce((s, i) => s + i.commissionAmount, 0));

    const createdAt = new Date(Date.now() - daysAgo * 86400000);

    return Order.create({
      buyer:           buyer._id,
      orderItems,
      sellerSubOrders,
      shippingInfo: {
        address:    buyer.address.street,
        city:       buyer.address.city,
        postalCode: buyer.address.postalCode,
        country:    buyer.address.country,
        phone:      buyer.phone,
      },
      paymentInfo: { method: "COD" },
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      totalCommission,
      orderStatus:  status,
      isPaid:       status === "delivered",
      paidAt:       status === "delivered" ? new Date(Date.now() - (daysAgo + 1) * 86400000) : undefined,
      deliveredAt:  status === "delivered" ? new Date(Date.now() - daysAgo * 86400000) : undefined,
      createdAt,
    });
  };

  // Find products by name for easy reference
  const p = (name) => products.find(x => x.name === name);

  // Buyer 1 — Arjun
  const order1 = await makeOrder(buyer1, [
    [p("Samsung Galaxy S24 Ultra"), 1],
    [p("Sony WH-1000XM5"), 1],
  ], "delivered", 20);

  const order2 = await makeOrder(buyer1, [
    [p("Organic Basmati Rice 5kg"), 2],
    [p("Wild Forest Honey 500g"), 1],
    [p("Chia Seeds 250g"), 1],
  ], "delivered", 10);

  const order3 = await makeOrder(buyer1, [
    [p("MacBook Pro 14 M3"), 1],
  ], "pending", 2);

  // Buyer 2 — Priya
  const order4 = await makeOrder(buyer2, [
    [p("Embroidered Anarkali Kurta"), 1],
    [p("Nike Air Max 270"), 1],
  ], "delivered", 25);

  const order5 = await makeOrder(buyer2, [
    [p("Rose Hip Face Serum 30ml"), 2],
    [p("Neem Tulsi Face Wash 100ml"), 1],
    [p("Shea Butter Body Lotion 200ml"), 1],
  ], "delivered", 8);

  const order6 = await makeOrder(buyer2, [
    [p("Classic Silk Saree"), 1],
    [p("Floral Wrap Maxi Dress"), 1],
  ], "processing", 1);

  // Buyer 3 — Rahul
  const order7 = await makeOrder(buyer3, [
    [p("Dell XPS 15"), 1],
    [p("JBL Flip 6 Speaker"), 1],
  ], "delivered", 15);

  const order8 = await makeOrder(buyer3, [
    [p("Cold Pressed Coconut Oil 1L"), 2],
    [p("Moringa Leaf Powder 200g"), 1],
    [p("Quinoa 500g"), 2],
  ], "delivered", 5);

  const order9 = await makeOrder(buyer3, [
    [p("Slim Fit Formal Shirt"), 2],
    [p("Jogger Track Pants"), 1],
  ], "shipped", 3);

  console.log("✅  9 orders created (6 delivered, 1 pending, 1 processing, 1 shipped)\n");
  return { order1, order2, order3, order4, order5, order6, order7, order8, order9 };
}

// ── 6. REVIEWS ────────────────────────────────────────────────────────────────
async function seedReviews(users, products, orders) {
  console.log("⭐  Seeding reviews...");

  const { buyer1, buyer2, buyer3, seller1, seller2, seller3 } = users;
  const p = (name) => products.find(x => x.name === name);

  const reviews = await Review.insertMany([

    // Buyer1 reviews from order1 (Samsung + Sony)
    {
      product:  p("Samsung Galaxy S24 Ultra")._id,
      buyer:    buyer1._id,
      rating:   5,
      comment:  "Absolutely blown away by this phone! The camera is insane — night mode photos look like DSLR shots. S Pen is super useful for quick notes. Battery easily lasts a full day. Best Android phone money can buy.",
      sellerReply: {
        comment:   "Thank you so much, Arjun! We're thrilled you're loving the Galaxy S24 Ultra. The S Pen and camera are truly game-changers. Do check out our other flagship models too!",
        repliedAt: new Date(Date.now() - 18 * 86400000),
      },
      createdAt: new Date(Date.now() - 19 * 86400000),
    },
    {
      product:  p("Sony WH-1000XM5")._id,
      buyer:    buyer1._id,
      rating:   5,
      comment:  "These headphones have completely changed how I work from home. The noise cancellation is supernatural — I can't hear anything around me. Sound quality is warm and detailed. Highly recommended for anyone working in a noisy environment.",
      sellerReply: {
        comment:   "So happy to hear that, Arjun! The XM5's noise cancellation truly is industry-leading. Perfect for focused work sessions. Thank you for your wonderful review!",
        repliedAt: new Date(Date.now() - 17 * 86400000),
      },
      createdAt: new Date(Date.now() - 18 * 86400000),
    },

    // Buyer1 reviews from order2 (Rice + Honey + Chia)
    {
      product:  p("Organic Basmati Rice 5kg")._id,
      buyer:    buyer1._id,
      rating:   5,
      comment:  "The aroma when cooking this rice is extraordinary. Every grain comes out perfectly separated. You can really taste the difference with organic — no chemical aftertaste at all. Will definitely order again.",
      sellerReply: {
        comment:   "Thank you, Arjun! Our Himalayan basmati is aged for 2 full years to develop that signature aroma. We're glad you could taste the difference. Your health is our priority!",
        repliedAt: new Date(Date.now() - 8 * 86400000),
      },
      createdAt: new Date(Date.now() - 9 * 86400000),
    },
    {
      product:  p("Wild Forest Honey 500g")._id,
      buyer:    buyer1._id,
      rating:   5,
      comment:  "This honey is unlike anything I've had before. Rich, complex flavour with floral notes. I use it in my morning tea and it's helped with my seasonal allergies. The raw unfiltered quality is evident — you can see the natural pollen.",
      sellerReply: {
        comment:   "What a lovely review, Arjun! Wild forest honey has incredible medicinal properties that processed honey simply can't match. So happy it's helping with your allergies. Stay healthy!",
        repliedAt: new Date(Date.now() - 7 * 86400000),
      },
      createdAt: new Date(Date.now() - 8 * 86400000),
    },

    // Buyer2 reviews from order4 (Kurta + Shoes)
    {
      product:  p("Embroidered Anarkali Kurta")._id,
      buyer:    buyer2._id,
      rating:   5,
      comment:  "Wore this to a family wedding and received so many compliments! The embroidery is intricate and beautifully done. The georgette fabric feels luxurious and the dupatta drapes perfectly. Sizing was accurate and delivery was quick.",
      sellerReply: {
        comment:   "You must have looked absolutely stunning, Priya! Our artisans put weeks of work into each embroidery piece. Thank you for sharing this — it means everything to us. Do explore our new festive collection!",
        repliedAt: new Date(Date.now() - 23 * 86400000),
      },
      createdAt: new Date(Date.now() - 24 * 86400000),
    },
    {
      product:  p("Nike Air Max 270")._id,
      buyer:    buyer2._id,
      rating:   4,
      comment:  "Very comfortable for all-day wear — the Air Max cushioning is noticeable from the first step. Stylish design that goes with almost anything. Runs slightly large so I'd suggest going half a size down. Overall very happy with the purchase.",
      sellerReply: {
        comment:   "Great feedback, Priya! Thanks for the sizing tip — we'll add that to the product description to help future buyers. Really glad the cushioning is working well for you!",
        repliedAt: new Date(Date.now() - 22 * 86400000),
      },
      createdAt: new Date(Date.now() - 23 * 86400000),
    },

    // Buyer2 reviews from order5 (Serum + Face wash + Lotion)
    {
      product:  p("Rose Hip Face Serum 30ml")._id,
      buyer:    buyer2._id,
      rating:   5,
      comment:  "Been using this for 3 weeks and my skin is visibly brighter. Dark spots from old acne scars have faded significantly. The texture is lightweight and absorbs quickly without feeling greasy. Natural ingredients are a huge plus for me.",
      sellerReply: {
        comment:   "Priya, your skin transformation story is exactly why we do what we do! Rosehip is truly nature's vitamin C powerhouse. Keep using it consistently for even better results. Thank you!",
        repliedAt: new Date(Date.now() - 6 * 86400000),
      },
      createdAt: new Date(Date.now() - 7 * 86400000),
    },
    {
      product:  p("Neem Tulsi Face Wash 100ml")._id,
      buyer:    buyer2._id,
      rating:   4,
      comment:  "Good gentle cleanser that doesn't strip the skin. My oily T-zone is much better controlled. The neem scent is quite strong initially but you get used to it. Noticed fewer breakouts after 2 weeks of use.",
      sellerReply: {
        comment:   "Happy it's helping with your skin, Priya! The neem fragrance is completely natural — it actually indicates the high concentration of active neem extract. Your skin will thank you long-term!",
        repliedAt: new Date(Date.now() - 5 * 86400000),
      },
      createdAt: new Date(Date.now() - 6 * 86400000),
    },

    // Buyer3 reviews from order7 (Dell + JBL)
    {
      product:  p("Dell XPS 15")._id,
      buyer:    buyer3._id,
      rating:   5,
      comment:  "As a software developer this laptop is a dream. The 4K OLED display is jaw-droppingly beautiful — colours are vivid and blacks are deep. Compiles code blazingly fast with the i9 processor. Only minor complaint is the fan gets loud under heavy load.",
      sellerReply: {
        comment:   "That's great to hear, Rahul! The XPS 15 is truly built for power users like developers. The fan noise under load is expected with the i9 — a cooling pad can help if needed. Happy coding!",
        repliedAt: new Date(Date.now() - 13 * 86400000),
      },
      createdAt: new Date(Date.now() - 14 * 86400000),
    },
    {
      product:  p("JBL Flip 6 Speaker")._id,
      buyer:    buyer3._id,
      rating:   4,
      comment:  "Surprisingly loud for its size! Took it on a camping trip and it handled the outdoors perfectly — even a light rain shower didn't affect it. Bass is punchy and clear. Battery lasted about 10 hours which is close to the claimed 12.",
      sellerReply: {
        comment:   "Love that you tested it in the wild, Rahul! The IP67 rating means it can handle more than just light rain. Battery life can vary with volume — at moderate levels you should get closer to 12 hours.",
        repliedAt: new Date(Date.now() - 12 * 86400000),
      },
      createdAt: new Date(Date.now() - 13 * 86400000),
    },

    // Buyer3 reviews from order8 (Coconut Oil + Moringa + Quinoa)
    {
      product:  p("Cold Pressed Coconut Oil 1L")._id,
      buyer:    buyer3._id,
      rating:   5,
      comment:  "The aroma of this coconut oil instantly takes you to Kerala! Used it for cooking and the flavour it adds to food is incredible. Also using it on my hair and the results are amazing — hair is noticeably softer and shinier after just 2 weeks.",
      sellerReply: {
        comment:   "What a fantastic review, Rahul! Our wood-pressed coconut oil is made exactly as our grandparents did it — slow and cold to retain every nutrient. Great to hear it's working beautifully for both cooking and hair care!",
        repliedAt: new Date(Date.now() - 3 * 86400000),
      },
      createdAt: new Date(Date.now() - 4 * 86400000),
    },
    {
      product:  p("Quinoa 500g")._id,
      buyer:    buyer3._id,
      rating:   4,
      comment:  "Started my fitness journey and quinoa has been a game changer. High protein, easy to cook and surprisingly filling. This particular batch had great texture — not mushy at all. Will definitely reorder.",
      sellerReply: {
        comment:   "Awesome to be part of your fitness journey, Rahul! Quinoa is truly a superfood — complete protein with all amino acids. Try cooking it in vegetable broth instead of water for even better flavour!",
        repliedAt: new Date(Date.now() - 2 * 86400000),
      },
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  ]);

  console.log(`✅  ${reviews.length} reviews created with seller replies\n`);
  return reviews;
}

// ── 7. CARTS ──────────────────────────────────────────────────────────────────
async function seedCarts(users, products) {
  console.log("🛍️   Seeding carts...");

  const { buyer1, buyer2, buyer3 } = users;
  const p = (name) => products.find(x => x.name === name);

  const makeCartItem = (product, quantity) => ({
    product:  product._id,
    seller:   product.seller,
    name:     product.name,
    price:    product.price,
    quantity,
    image:    product.images[0]?.url || "",
  });

  await Cart.insertMany([
    {
      buyer: buyer1._id,
      items: [
        makeCartItem(p("iPhone 15 Pro Max"), 1),
        makeCartItem(p("Sony WH-1000XM5"), 1),
        makeCartItem(p("Chia Seeds 250g"), 2),
        makeCartItem(p("Wild Forest Honey 500g"), 1),
      ],
    },
    {
      buyer: buyer2._id,
      items: [
        makeCartItem(p("Classic Silk Saree"), 1),
        makeCartItem(p("Rose Hip Face Serum 30ml"), 1),
        makeCartItem(p("Nike Air Max 270"), 1),
      ],
    },
    {
      buyer: buyer3._id,
      items: [
        makeCartItem(p("OnePlus 12"), 1),
        makeCartItem(p("Slim Fit Formal Shirt"), 2),
        makeCartItem(p("Moringa Leaf Powder 200g"), 2),
        makeCartItem(p("Shea Butter Body Lotion 200ml"), 1),
      ],
    },
  ]);

  console.log("✅  3 carts created\n");
}

// ── 8. WISHLISTS ──────────────────────────────────────────────────────────────
async function seedWishlists(users, products) {
  console.log("❤️   Seeding wishlists...");

  const { buyer1, buyer2, buyer3 } = users;
  const p = (name) => products.find(x => x.name === name);

  await Wishlist.insertMany([
    {
      buyer: buyer1._id,
      products: [
        p("MacBook Pro 14 M3")._id,
        p("Sony Alpha A7 IV")._id,
        p("Nike Air Max 270")._id,
        p("Organic Basmati Rice 5kg")._id,
        p("Moringa Leaf Powder 200g")._id,
      ],
    },
    {
      buyer: buyer2._id,
      products: [
        p("iPhone 15 Pro Max")._id,
        p("Embroidered Anarkali Kurta")._id,
        p("Rose Hip Face Serum 30ml")._id,
        p("Wild Forest Honey 500g")._id,
        p("Chia Seeds 250g")._id,
      ],
    },
    {
      buyer: buyer3._id,
      products: [
        p("Samsung Galaxy S24 Ultra")._id,
        p("Dell XPS 15")._id,
        p("Woodland Trekking Boots")._id,
        p("Cold Pressed Coconut Oil 1L")._id,
        p("Neem Tulsi Face Wash 100ml")._id,
      ],
    },
  ]);

  console.log("✅  3 wishlists created\n");
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await connect();
    await wipe();
    await seedConfig();

    const users      = await seedUsers();
    const categories = await seedCategories();
    const products   = await seedProducts(users, categories);
    const orders     = await seedOrders(users, products);
    await seedReviews(users, products, orders);
    await seedCarts(users, products);
    await seedWishlists(users, products);

    console.log("🎉  Seeding complete!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Login credentials (password for all: Password@123)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Admin   → admin@nexus.com");
    console.log("  Seller1 → seller1@nexus.com  (TechZone)");
    console.log("  Seller2 → seller2@nexus.com  (StyleVault)");
    console.log("  Seller3 → seller3@nexus.com  (FreshRoots)");
    console.log("  Buyer1  → buyer1@nexus.com   (Arjun Sharma)");
    console.log("  Buyer2  → buyer2@nexus.com   (Priya Nair)");
    console.log("  Buyer3  → buyer3@nexus.com   (Rahul Mehta)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌  Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();