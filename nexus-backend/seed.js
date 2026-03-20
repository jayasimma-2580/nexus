/**
 * seedExtra.js — Adds 3 sellers + 3 buyers + categories + products + carts + wishlists + orders + reviews
 *
 * SAFE TO RUN: checks for existing emails before creating — will NEVER overwrite
 * or delete anything already in the database. Run as many times as you want.
 *
 * Usage:
 *   node seedExtra.js
 *
 * What it creates (skipping if already present):
 *   Users      → 3 sellers (TechZone, StyleVault, FreshRoots) + 3 buyers
 *   Categories → 15 categories (skips existing ones by name)
 *   Products   → 5 per category = 75 products, one per seller spread evenly
 *   Cart       → 1 per buyer with 3–4 items
 *   Wishlist   → 1 per buyer with 4–5 saved products
 *   Orders     → 2 delivered orders per buyer (so reviews are valid)
 *                + 1 pending order per buyer
 *   Reviews    → only on delivered order items (as the real app enforces)
 *
 * Photos: uses Unsplash Source (stable, free, no key needed)
 *   https://source.unsplash.com/400x400/?{keyword}
 */

import { fileURLToPath } from "url";
import { dirname, join }  from "path";
import dotenv             from "dotenv";
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), ".env") });

import mongoose from "mongoose";
import slugify  from "slugify";
import User     from "./models/User.js";
import Category from "./models/Category.js";
import Product  from "./models/Product.js";
import Order    from "./models/Order.js";
import Review   from "./models/Review.js";
import Cart     from "./models/Cart.js";
import Wishlist from "./models/Wishlist.js";
import Config   from "./models/Config.js";

// ── helpers ───────────────────────────────────────────────────────────────────
const oid  = () => new mongoose.Types.ObjectId();
const pct  = (n, r) => parseFloat((n * r / 100).toFixed(2));
const fmt  = (n)    => parseFloat(n.toFixed(2));

// Unsplash Source — stable free image URLs, no API key needed
const img = (kw, w = 400, h = 400) =>
  ({ url: `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(kw)}`, alt: kw });

// ── connect ───────────────────────────────────────────────────────────────────
async function connect() {
  if (!process.env.MONGO_URI) { console.error("❌  MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  MongoDB connected\n");
}

// ── upsert users ──────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("👤  Seeding users...");

  const sellerDefs = [
    {
      name: "Kiran Mehta",         email: "seller2@nexus.com", password: "Seller@123",
      shopName: "TechZone India",
      shopDescription: "India's go-to shop for the latest gadgets, laptops, accessories and smart home devices. Trusted by 12,000+ customers.",
      phone: "+91 98100 11111",
    },
    {
      name: "Divya Krishnan",      email: "seller3@nexus.com", password: "Seller@123",
      shopName: "StyleVault",
      shopDescription: "Curated fashion for modern India — ethnic, western, fusion. New collections every fortnight.",
      phone: "+91 98100 22222",
    },
    {
      name: "Aryan Bose",          email: "seller4@nexus.com", password: "Seller@123",
      shopName: "FreshRoots Organics",
      shopDescription: "Farm-to-doorstep organic produce, superfoods, natural personal care. Zero chemicals, 100% trust.",
      phone: "+91 98100 33333",
    },
  ];

  const buyerDefs = [
    { name: "Sneha Reddy",   email: "buyer2@nexus.com", password: "Buyer@123", phone: "+91 90001 11111" },
    { name: "Rahul Verma",   email: "buyer3@nexus.com", password: "Buyer@123", phone: "+91 90001 22222" },
    { name: "Pooja Nambiar", email: "buyer4@nexus.com", password: "Buyer@123", phone: "+91 90001 33333" },
  ];

  const sellers = [];
  for (const d of sellerDefs) {
    let u = await User.findOne({ email: d.email });
    if (u) { console.log(`   ⏭️  ${d.email} already exists`); }
    else {
      u = await User.create({
        name: d.name, email: d.email, password: d.password,
        role: "seller", phone: d.phone,
        isEmailVerified: true, isPhoneVerified: true,
        sellerStatus: "approved",
        shopName: d.shopName, shopDescription: d.shopDescription,
        commissionRate: null,
      });
      console.log(`   ✅  Seller: ${d.email}  (${d.shopName})`);
    }
    sellers.push(u);
  }

  const buyers = [];
  for (const d of buyerDefs) {
    let u = await User.findOne({ email: d.email });
    if (u) { console.log(`   ⏭️  ${d.email} already exists`); }
    else {
      u = await User.create({
        name: d.name, email: d.email, password: d.password,
        role: "buyer", phone: d.phone,
        isEmailVerified: true, isPhoneVerified: true,
        sellerStatus: "none",
        address: { street: "12 Park Street", city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "India" },
      });
      console.log(`   ✅  Buyer:  ${d.email}  (${d.name})`);
    }
    buyers.push(u);
  }

  return { sellers, buyers };
}

// ── upsert categories ─────────────────────────────────────────────────────────
async function seedCategories() {
  console.log("\n🏷️  Seeding categories...");

  const defs = [
    { name: "Electronics",        description: "Phones, laptops, tablets, cameras, audio & accessories" },
    { name: "Clothing",           description: "Men & women fashion — casual, ethnic, formal" },
    { name: "Home & Kitchen",     description: "Appliances, cookware, decor, storage" },
    { name: "Books",              description: "Fiction, non-fiction, self-help, textbooks, children's" },
    { name: "Sports & Fitness",   description: "Gym gear, outdoor sports, yoga, cycling" },
    { name: "Beauty & Health",    description: "Skincare, haircare, supplements, wellness" },
    { name: "Toys & Games",       description: "Toys for kids, board games, puzzles, hobby kits" },
    { name: "Organic & Natural",  description: "Certified organic food, eco products, superfoods" },
    { name: "Accessories",        description: "Bags, wallets, belts, watches, jewellery, sunglasses" },
    { name: "Stationery & Office",description: "Notebooks, pens, art supplies, office essentials" },
    { name: "Food & Beverages",   description: "Packaged food, snacks, beverages, spices, dry fruits" },
    { name: "Baby & Kids",        description: "Baby care, clothing, feeding, nursery, educational toys" },
    { name: "Pet Supplies",       description: "Food, accessories, grooming for cats, dogs and more" },
    { name: "Automotive",         description: "Car accessories, bike gear, tools, care products" },
    { name: "Garden & Outdoors",  description: "Plants, pots, garden tools, seeds, outdoor furniture" },
  ];

  const result = {};
  for (const d of defs) {
    let cat = await Category.findOne({ name: d.name });
    if (!cat) {
      cat = await Category.create(d);
      console.log(`   ✅  ${cat.name}`);
    } else {
      console.log(`   ⏭️  ${cat.name} already exists`);
    }
    result[d.name] = cat;
  }
  return result;
}

// ── product definitions ───────────────────────────────────────────────────────
function buildProductDefs(sellers, cats) {
  const [s1, s2, s3] = sellers; // TechZone, StyleVault, FreshRoots

  return [
    // ══════════════════════════════════════════════════════════════════════════
    //  ELECTRONICS  (TechZone)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Sony WH-1000XM5 Wireless Headphones", price: 24999, stock: 30, seller: s1,
      category: cats["Electronics"],
      description: "Industry-leading noise cancellation with 30-hour battery. Multi-point Bluetooth connection, speak-to-chat feature, and foldable design. Crystal-clear calls with 4-mic array.",
      images: [img("sony headphones wireless"), img("headphones noise cancellation")],
      rating: 4.8, numReviews: 0,
    },
    {
      name: "Logitech MX Master 3 Wireless Mouse", price: 7495, stock: 55, seller: s1,
      category: cats["Electronics"],
      description: "Advanced ergonomic wireless mouse with MagSpeed scrolling, 8000 DPI tracking, USB-C charging, and 70-day battery. Works on any surface including glass.",
      images: [img("logitech wireless mouse"), img("ergonomic computer mouse")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Samsung 27-inch 4K IPS Monitor", price: 32999, stock: 18, seller: s1,
      category: cats["Electronics"],
      description: "27-inch UHD 4K IPS monitor with 99% sRGB, HDR10, HDMI 2.0 & DP 1.4, built-in speakers, and Eye Saver mode. Perfect for creative professionals and gamers.",
      images: [img("samsung 4k monitor desk"), img("ultrawide computer monitor")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "JBL Flip 6 Portable Bluetooth Speaker", price: 11999, stock: 42, seller: s1,
      category: cats["Electronics"],
      description: "Bold 30W stereo sound with deep bass, IP67 waterproof and dustproof rating, 12-hour playtime, and PartyBoost for pairing multiple speakers. USB-C charging.",
      images: [img("JBL portable bluetooth speaker"), img("waterproof outdoor speaker")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Anker 65W USB-C GaN Charger", price: 2999, stock: 120, seller: s1,
      category: cats["Electronics"],
      description: "Compact 65W GaN charger with 3 ports (2x USB-C + 1x USB-A). Simultaneously charge laptop, phone, and earbuds. Foldable prongs, travel-friendly.",
      images: [img("USB-C GaN charger compact"), img("fast charging adapter")],
      rating: 4.4, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  CLOTHING  (StyleVault)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Men's Linen Kurta Set", price: 1799, stock: 80, seller: s2,
      category: cats["Clothing"],
      description: "Premium linen kurta with matching pyjama. Breathable, lightweight fabric ideal for Indian summers. Available in S–3XL. Machine washable.",
      images: [img("men linen kurta ethnic indian"), img("kurta pyjama set white")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Women's Silk Saree with Blouse", price: 4499, stock: 35, seller: s2,
      category: cats["Clothing"],
      description: "Pure Kanjivaram-inspired silk saree with rich zari border and matching blouse piece. 6.5 metres. Ideal for weddings and festive occasions.",
      images: [img("silk saree indian wedding"), img("kanjivaram saree zari border")],
      rating: 4.9, numReviews: 0,
    },
    {
      name: "Women's Casual Denim Jacket", price: 1299, stock: 60, seller: s2,
      category: cats["Clothing"],
      description: "Classic washed denim jacket with button closure, two chest pockets, and relaxed fit. Pairs with jeans, skirts, and dresses. Sizes XS–XL.",
      images: [img("women denim jacket casual"), img("blue denim jacket fashion")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Men's Cotton Formal Shirt", price: 899, stock: 150, seller: s2,
      category: cats["Clothing"],
      description: "100% cotton formal shirt with wrinkle-resistant finish, buttoned collar, and tailored slim fit. Available in 6 classic colors. Office to evening ready.",
      images: [img("men formal cotton shirt office"), img("formal white shirt business")],
      rating: 4.2, numReviews: 0,
    },
    {
      name: "Kids Cartoon Printed Tee Pack of 3", price: 699, stock: 200, seller: s2,
      category: cats["Clothing"],
      description: "Soft 100% cotton round-neck tees for kids aged 2–12 years. Set of 3 with vibrant cartoon prints. Pre-shrunk, colorfast, machine washable.",
      images: [img("kids cartoon tshirt colorful"), img("children printed tshirt pack")],
      rating: 4.5, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  HOME & KITCHEN  (FreshRoots)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Prestige Induction Cooktop 2000W", price: 3299, stock: 40, seller: s3,
      category: cats["Home & Kitchen"],
      description: "2000W induction cooktop with push-button controls, auto-off, and 7 cooking modes. Feather-touch panel, compatible with all induction-ready cookware.",
      images: [img("induction cooktop kitchen prestige"), img("induction stove cooking")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Milton Thermosteel Flask 1 Litre", price: 699, stock: 90, seller: s3,
      category: cats["Home & Kitchen"],
      description: "100% food-grade stainless steel vacuum insulated flask. Keeps beverages hot for 24 hours and cold for 48 hours. Leak-proof screw cap with inner cup.",
      images: [img("milton steel flask thermos"), img("vacuum insulated bottle hot cold")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Pigeon Electric Kettle 1.7L", price: 849, stock: 75, seller: s3,
      category: cats["Home & Kitchen"],
      description: "1500W electric kettle with auto shut-off, boil-dry protection, and 360° cordless base. Food-safe stainless steel interior. Boils 1.7L in under 5 minutes.",
      images: [img("electric kettle stainless steel kitchen"), img("pigeon kettle boiling")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Wonderchef Granite Non-Stick Tawa 28cm", price: 1199, stock: 50, seller: s3,
      category: cats["Home & Kitchen"],
      description: "PFOA-free granite non-stick tawa with hard-anodized body. Suitable for all cooktops including induction. Even heat distribution. 5-year warranty.",
      images: [img("granite non stick tawa cookware"), img("non stick pan indian cooking")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Borosil Glass Food Storage Set of 5", price: 1799, stock: 35, seller: s3,
      category: cats["Home & Kitchen"],
      description: "Borosilicate glass containers with airtight lids. Microwave, oven, and dishwasher safe. Set of 5 sizes (250ml to 1.5L). BPA-free, odor-resistant.",
      images: [img("glass food storage container set"), img("borosil airtight container kitchen")],
      rating: 4.4, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  BOOKS  (FreshRoots — literary arm)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Ikigai — Héctor García & Francesc Miralles", price: 299, stock: 200, seller: s3,
      category: cats["Books"],
      description: "Japanese secret to a long and happy life. Discover your reason for being, find flow, and cultivate the habits of the world's longest-living people. Bestseller in 50+ countries.",
      images: [img("ikigai book japanese lifestyle"), img("self help books bestseller")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "The Alchemist — Paulo Coelho", price: 249, stock: 300, seller: s3,
      category: cats["Books"],
      description: "A timeless allegorical novel about following your dreams and listening to your heart. Over 65 million copies sold worldwide. A life-changing read.",
      images: [img("the alchemist paulo coelho book"), img("fiction novel bestseller")],
      rating: 4.8, numReviews: 0,
    },
    {
      name: "Zero to One — Peter Thiel", price: 399, stock: 120, seller: s3,
      category: cats["Books"],
      description: "Startup bible by PayPal co-founder. Essential insights on innovation, monopoly vs. competition, and building companies that create new things, not just iterate.",
      images: [img("zero to one peter thiel startup book"), img("business startup book")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Sapiens — Yuval Noah Harari", price: 499, stock: 80, seller: s3,
      category: cats["Books"],
      description: "A sweeping narrative of humanity's creation and evolution. Covers the cognitive, agricultural, and scientific revolutions. One of the most important books of our time.",
      images: [img("sapiens yuval harari book history"), img("history humanity book paperback")],
      rating: 4.9, numReviews: 0,
    },
    {
      name: "Rich Dad Poor Dad — Robert Kiyosaki", price: 349, stock: 250, seller: s3,
      category: cats["Books"],
      description: "The No. 1 personal finance book of all time. Teaches financial literacy, investing, and the difference between assets and liabilities. Changed millions of lives.",
      images: [img("rich dad poor dad finance book"), img("personal finance investing book")],
      rating: 4.5, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  SPORTS & FITNESS  (TechZone — fitness tech)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Decathlon Domyos Adjustable Dumbbell 20kg", price: 3499, stock: 25, seller: s1,
      category: cats["Sports & Fitness"],
      description: "Adjustable hex dumbbell with quick-lock mechanism. Replaces 6 pairs of dumbbells. Ideal for home gym — chest, back, arms, shoulder workouts. Rubber-coated plates.",
      images: [img("adjustable dumbbell home gym fitness"), img("dumbbell weight training")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Boldfit Pull-Up Bar Doorframe", price: 899, stock: 60, seller: s1,
      category: cats["Sports & Fitness"],
      description: "Heavy-duty doorframe pull-up bar. No screws or drilling needed. Supports up to 150kg. Non-slip foam grips. Folds flat for storage. Multiple grip positions.",
      images: [img("doorframe pull up bar exercise"), img("chin up bar home workout")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Nivia Football Size 5 — Match Pro", price: 699, stock: 80, seller: s1,
      category: cats["Sports & Fitness"],
      description: "Official size 5 match football with 32-panel design. Durable PU outer cover, butyl bladder for consistent air retention. Suitable for grass and artificial turf.",
      images: [img("nivia football soccer ball"), img("football soccer match")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Strauss Skipping Rope — Anti-Tangle", price: 399, stock: 150, seller: s1,
      category: cats["Sports & Fitness"],
      description: "Ball-bearing jump rope with anti-tangle PVC cable, foam ergonomic handles, and adjustable length up to 3m. Ideal for cardio, CrossFit, and weight loss.",
      images: [img("skipping rope jump cardio exercise"), img("jump rope fitness workout")],
      rating: 4.2, numReviews: 0,
    },
    {
      name: "Boldfit Gym Gloves with Wrist Support", price: 499, stock: 100, seller: s1,
      category: cats["Sports & Fitness"],
      description: "Anti-slip full-finger gym gloves with built-in wrist wrap support. Breathable mesh back, silicone palm grip, unisex. Available in S/M/L/XL.",
      images: [img("gym gloves wrist support fitness"), img("workout gloves weight lifting")],
      rating: 4.1, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  BEAUTY & HEALTH  (FreshRoots)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Mamaearth Vitamin C Face Wash 100ml", price: 299, stock: 200, seller: s3,
      category: cats["Beauty & Health"],
      description: "Brightening face wash with Vitamin C and turmeric. Reduces dark spots, evens skin tone, and deeply cleanses without stripping natural moisture. Dermatologist tested.",
      images: [img("vitamin c face wash skincare"), img("mamaearth brightening cleanser")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "WOW Skin Science Apple Cider Vinegar Shampoo", price: 399, stock: 150, seller: s3,
      category: cats["Beauty & Health"],
      description: "Sulphate-free shampoo with raw apple cider vinegar, sweet almond oil, and argan oil. Controls dandruff, balances scalp pH, and adds shine. 300ml.",
      images: [img("apple cider vinegar shampoo hair"), img("wow shampoo natural hair care")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Himalaya Neem Face Pack 75g", price: 149, stock: 300, seller: s3,
      category: cats["Beauty & Health"],
      description: "Purifying neem and turmeric face pack. Reduces acne-causing bacteria, controls excess oil, and leaves skin feeling fresh. 100% natural formulation.",
      images: [img("neem face pack turmeric skincare"), img("himalaya face mask natural")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Oziva Protein & Herbs for Women 500g", price: 1199, stock: 60, seller: s3,
      category: cats["Beauty & Health"],
      description: "Plant-based protein blend with 23g protein per serving, enriched with Shatavari, Flaxseeds, and Vitamin D3. Chocolate flavor. No artificial sweeteners.",
      images: [img("protein powder women health supplement"), img("plant protein shake fitness")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "The Moms Co Natural Baby Lotion 200ml", price: 349, stock: 120, seller: s3,
      category: cats["Beauty & Health"],
      description: "Australia certified toxin-free baby lotion with oat milk, shea butter, and jojoba oil. Hypoallergenic, tear-free, pediatrician tested. Safe from day 1.",
      images: [img("baby lotion natural organic gentle"), img("baby skin care moisturizer")],
      rating: 4.7, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  TOYS & GAMES  (StyleVault — kids section)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Funskool Monopoly Classic Board Game", price: 799, stock: 45, seller: s2,
      category: cats["Toys & Games"],
      description: "The classic property trading board game for 2–8 players. Includes full playing board, 8 tokens, title deed cards, play money, and 2 dice. Ages 8+.",
      images: [img("monopoly board game family"), img("board game playing fun")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "LeapFrog Learning Pad for Kids", price: 1499, stock: 30, seller: s2,
      category: cats["Toys & Games"],
      description: "Interactive learning tablet for ages 3–7 with 30+ activities covering alphabet, numbers, shapes, and logic. Drop-safe kid-proof design. Educational and fun.",
      images: [img("learning pad tablet kids educational"), img("children tablet toy learning")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Hot Wheels 20-Car Gift Pack", price: 1199, stock: 60, seller: s2,
      category: cats["Toys & Games"],
      description: "Set of 20 die-cast Hot Wheels cars in assorted styles. Each car measures approximately 7cm. Collectible pack — great gift for ages 3+. Styles may vary.",
      images: [img("hot wheels toy cars collection"), img("die cast toy cars kids")],
      rating: 4.8, numReviews: 0,
    },
    {
      name: "Lego Classic Creative Bricks 484 Pieces", price: 2499, stock: 25, seller: s2,
      category: cats["Toys & Games"],
      description: "484 classic LEGO bricks in 29 different colors. Includes wheels, eyes, and special parts. Encourages creative free play, fine motor skills, and imagination. Ages 4+.",
      images: [img("lego classic bricks building set"), img("lego colorful blocks creative")],
      rating: 4.9, numReviews: 0,
    },
    {
      name: "Rubik's Cube 3x3 Original", price: 399, stock: 100, seller: s2,
      category: cats["Toys & Games"],
      description: "The original Rubik's Cube 3x3 with smooth corner cutting, pop-resistant design, and vivid colors. Great for brain development and competitive speedcubing. Ages 8+.",
      images: [img("rubiks cube 3x3 puzzle toy"), img("rubik cube colorful puzzle")],
      rating: 4.5, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  ORGANIC & NATURAL  (FreshRoots)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Organic India Tulsi Green Tea 25 Bags", price: 249, stock: 300, seller: s3,
      category: cats["Organic & Natural"],
      description: "Certified organic Tulsi Green Tea with Holy Basil (Rama, Vana, Krishna Tulsi). Rich in antioxidants, boosts immunity and reduces stress. 25 biodegradable tea bags.",
      images: [img("tulsi green tea organic herbal"), img("organic tea bags healthy drink")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Two Brothers Organic A2 Ghee 500g", price: 899, stock: 80, seller: s3,
      category: cats["Organic & Natural"],
      description: "Small-batch cultured A2 Gir cow ghee using traditional bilona method. Rich in CLA, omega-3, and fat-soluble vitamins. Grainy texture confirms purity. Farm-made.",
      images: [img("organic ghee cow a2 farm"), img("bilona ghee golden jar")],
      rating: 4.9, numReviews: 0,
    },
    {
      name: "Himalayan Pink Salt Fine Grain 1kg", price: 299, stock: 200, seller: s3,
      category: cats["Organic & Natural"],
      description: "Unrefined Himalayan pink salt packed with 84+ trace minerals. No additives, anti-caking agents, or bleach. Ideal for cooking, pickling, and salt lamps.",
      images: [img("himalayan pink salt natural mineral"), img("pink salt grains cooking")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Nutriorg Moringa Leaf Powder 200g", price: 349, stock: 120, seller: s3,
      category: cats["Organic & Natural"],
      description: "Certified organic Moringa (Drumstick leaf) powder. 92 nutrients, 46 antioxidants, high plant-based protein. Add to smoothies, dals, or warm water. USDA certified.",
      images: [img("moringa leaf powder organic green"), img("organic superfood powder health")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Conscious Food Kashmiri Walnut Kernels 500g", price: 799, stock: 60, seller: s3,
      category: cats["Organic & Natural"],
      description: "Light amber hand-selected Kashmiri walnut kernels. Naturally grown, no pesticides. Rich in omega-3, protein, and brain-boosting nutrients. Vacuum-sealed for freshness.",
      images: [img("kashmiri walnuts dry fruits organic"), img("walnut kernels healthy snack")],
      rating: 4.7, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  ACCESSORIES  (StyleVault)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Fossil Gen 6 Smartwatch 44mm", price: 19995, stock: 20, seller: s2,
      category: cats["Accessories"],
      description: "Wear OS smartwatch with Snapdragon 4100+, SpO2, heart rate, sleep tracking, and 24-hour battery. 3ATM water-resistant, customizable watch faces, NFC payments.",
      images: [img("fossil smartwatch gen 6 leather"), img("smart watch wearable stylish")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Baggit Women's Vegan Leather Handbag", price: 1799, stock: 40, seller: s2,
      category: cats["Accessories"],
      description: "Spacious structured handbag in vegan leather with gold-tone hardware, magnetic snap closure, inside zip pocket, and detachable shoulder strap. 3 color options.",
      images: [img("women handbag vegan leather stylish"), img("baggit purse shoulder bag")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Ray-Ban Aviator Classic Sunglasses", price: 6990, stock: 25, seller: s2,
      category: cats["Accessories"],
      description: "Iconic RB3025 aviator with gold metal frame, crystal green G-15 lenses (100% UV protection), and spring hinges. Includes original case and cleaning cloth.",
      images: [img("ray ban aviator sunglasses gold"), img("aviator sunglasses classic fashion")],
      rating: 4.8, numReviews: 0,
    },
    {
      name: "Tommy Hilfiger Men's Canvas Belt", price: 1499, stock: 60, seller: s2,
      category: cats["Accessories"],
      description: "Woven canvas belt with leather trim and signature Tommy Hilfiger logo buckle. Casual-smart style for jeans and chinos. Available in 85cm–105cm. Navy/Brown.",
      images: [img("tommy hilfiger canvas belt men"), img("canvas belt fashion accessories")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Swarovski Crystal Stud Earrings", price: 2499, stock: 35, seller: s2,
      category: cats["Accessories"],
      description: "Classic round crystal stud earrings with Swarovski crystal, gold-tone setting, and butterfly backing. Hypoallergenic, suitable for sensitive ears. Gift-boxed.",
      images: [img("swarovski crystal stud earrings jewellery"), img("crystal earrings elegant fashion")],
      rating: 4.6, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  STATIONERY & OFFICE  (TechZone — tech office supplies)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Arteza Premium Colored Pencils Set of 48", price: 1299, stock: 80, seller: s1,
      category: cats["Stationery & Office"],
      description: "48 artist-quality colored pencils with soft, highly pigmented cores. Blendable, lightfast, break-resistant. Ideal for adult coloring, sketching, and illustration.",
      images: [img("colored pencils set art supplies"), img("arteza art pencils drawing")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Leuchtturm1917 A5 Dotted Notebook", price: 999, stock: 60, seller: s1,
      category: cats["Stationery & Office"],
      description: "Premium German-made notebook with 249 numbered pages, dot-grid layout, table of contents, and ribbon bookmarks. Acid-free 80gsm paper. Available in 20+ colors.",
      images: [img("leuchtturm notebook dotted bullet journal"), img("notebook dotgrid hardcover premium")],
      rating: 4.8, numReviews: 0,
    },
    {
      name: "Zebra Sarasa Clip Gel Pens 0.5mm Set of 10", price: 499, stock: 150, seller: s1,
      category: cats["Stationery & Office"],
      description: "10 vibrant gel ink pens with quick-dry formula and retractable clip. Smooth consistent writing at 0.5mm. Acid-free, water-resistant ink. 10 assorted colors.",
      images: [img("zebra gel pens colorful writing"), img("gel ink pens stationery set")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Faber-Castell Pitt Artist Pen Set of 8", price: 899, stock: 45, seller: s1,
      category: cats["Stationery & Office"],
      description: "Indian ink artist pens with super-fine to brush tips. Waterproof, lightfast, acid-free. Ideal for illustration, calligraphy, manga, and inking. 8-piece set.",
      images: [img("faber castell artist pen ink set"), img("art pen drawing ink set")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "IKEA ALEX Desk Organizer Set", price: 1299, stock: 30, seller: s1,
      category: cats["Stationery & Office"],
      description: "Modular desk organizer set with 5 compartments of varying sizes. Powder-coated steel, anti-slip pads, stackable. Keeps pens, scissors, and supplies within reach.",
      images: [img("desk organizer office stationery set"), img("office desk organizer metal")],
      rating: 4.3, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  FOOD & BEVERAGES  (FreshRoots)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Cornitos Nachos Crisps Cheese & Herbs 150g", price: 149, stock: 400, seller: s3,
      category: cats["Food & Beverages"],
      description: "Crunchy corn nachos with cheese & herbs seasoning. Zero trans fat, no MSG, no artificial colors. Baked not fried. Perfect snack with dips or as a standalone.",
      images: [img("nachos chips cheese herbs snack"), img("cornitos crisps party snack")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Bru Gold Roast & Ground Coffee 200g", price: 299, stock: 200, seller: s3,
      category: cats["Food & Beverages"],
      description: "Premium blend of roasted Arabica and Robusta beans, medium roast. Delivers a rich, full-bodied cup with a smooth finish. Works in filter, french press, or moka pot.",
      images: [img("bru coffee roasted ground beans"), img("coffee beans ground package")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Wonderland Alphonso Mango Pickle 500g", price: 199, stock: 150, seller: s3,
      category: cats["Food & Beverages"],
      description: "Traditional Konkan-style Alphonso mango pickle with sesame oil, natural spices, and no preservatives. Sourced from Ratnagiri, Maharashtra. Ready to eat.",
      images: [img("mango pickle indian achaar jar"), img("alphonso mango pickle traditional")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Tata Tea Gold 500g", price: 299, stock: 250, seller: s3,
      category: cats["Food & Beverages"],
      description: "Premium blend of whole leaf tea and tea dust for a strong, fragrant cup. Flavored with natural extracts. Ideal for chai with milk and spices. India's No. 1 tea brand.",
      images: [img("tata tea gold packet indian chai"), img("tea leaves brewing cup")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Veeba Sriracha Hot Sauce 340g", price: 199, stock: 180, seller: s3,
      category: cats["Food & Beverages"],
      description: "Authentic sriracha hot chilli sauce with garlic, vinegar, and red chillies. No artificial preservatives. Pairs with noodles, burgers, eggs, and dipping. Medium heat.",
      images: [img("sriracha hot sauce chilli bottle"), img("hot sauce bottle condiment")],
      rating: 4.3, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  BABY & KIDS  (StyleVault)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Mee Mee Baby Rattle Set of 5", price: 449, stock: 100, seller: s2,
      category: cats["Baby & Kids"],
      description: "BPA-free, non-toxic baby rattles with bright colors and varied textures. Stimulates sensory development and grip skills. Safe for babies 3 months+. Machine washable.",
      images: [img("baby rattle toys colorful set"), img("infant toy rattle sensory")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Johnson's Baby Shampoo 200ml", price: 199, stock: 300, seller: s2,
      category: cats["Baby & Kids"],
      description: "Clinically proven no more tears formula. Hypoallergenic, free of parabens, phthalates, and dyes. Gentle enough for newborns. Leaves hair soft and shiny.",
      images: [img("johnson baby shampoo no tears gentle"), img("baby shampoo hair wash soft")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Babyhug Hooded Towel Set of 2", price: 699, stock: 80, seller: s2,
      category: cats["Baby & Kids"],
      description: "100% cotton hooded bath towels with animal prints for babies 0–2 years. Super absorbent, soft, and dermatologically tested. Set of 2. Machine washable at 40°C.",
      images: [img("baby hooded towel cotton set"), img("baby bath towel soft cotton")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Pampers Premium Care New Born Diapers 56 Count", price: 999, stock: 60, seller: s2,
      category: cats["Baby & Kids"],
      description: "Ultra-soft Pampers with cotton-like feel, up to 12-hour leakage protection, and wetness indicator. Dermatologically tested for newborn sensitive skin. Newborn size.",
      images: [img("pampers diapers newborn baby"), img("baby diaper pack soft skin")],
      rating: 4.8, numReviews: 0,
    },
    {
      name: "Chicco Digital Ear Thermometer", price: 1499, stock: 40, seller: s2,
      category: cats["Baby & Kids"],
      description: "Pediatrician-recommended digital ear thermometer with 1-second reading, memory recall for last 8 readings, fever alert, and flexible probe tip. Includes 40 probe covers.",
      images: [img("baby ear thermometer digital chicco"), img("infant thermometer pediatric")],
      rating: 4.5, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  PET SUPPLIES  (FreshRoots — natural pet care)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Pedigree Adult Dog Food Chicken & Veg 3kg", price: 799, stock: 70, seller: s3,
      category: cats["Pet Supplies"],
      description: "Complete and balanced nutrition for adult dogs. Made with real chicken, vegetables, whole grains, and added vitamins D, E and omega-6. No artificial flavors.",
      images: [img("pedigree dog food chicken kibble"), img("adult dog food bag nutrition")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Whiskas Ocean Fish Cat Food 1.2kg", price: 499, stock: 80, seller: s3,
      category: cats["Pet Supplies"],
      description: "Complete dry cat food with tender ocean fish flavour bites. Enriched with taurine for heart & eye health, vitamins, and mineral balance. Suitable for adult cats 1+.",
      images: [img("whiskas cat food ocean fish bag"), img("cat dry food packet")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Heads Up For Tails Dog Collar with ID Tag", price: 599, stock: 50, seller: s3,
      category: cats["Pet Supplies"],
      description: "Premium nylon dog collar with personalized stainless steel ID tag (engrave your pet's name & number). Adjustable 35–50cm, quick-release buckle. Multiple colors.",
      images: [img("dog collar nylon colorful id tag"), img("pet collar adjustable dog")],
      rating: 4.6, numReviews: 0,
    },
    {
      name: "Catit Flower Fountain 3L Water Dispenser", price: 1999, stock: 30, seller: s3,
      category: cats["Pet Supplies"],
      description: "Triple-action filter fountain with flower-shaped stream. 3L capacity, quiet pump, dual-voltage. Encourages hydration for cats. Includes 2 replacement filters.",
      images: [img("cat water fountain electric flower"), img("pet water dispenser fountain")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Virbac Tick & Flea Dog Shampoo 200ml", price: 349, stock: 90, seller: s3,
      category: cats["Pet Supplies"],
      description: "Veterinary-formulated shampoo that kills and repels ticks, fleas, and lice on contact. Gentle on skin and coat, with a conditioning formula. Safe for weekly use.",
      images: [img("dog flea tick shampoo vet"), img("pet shampoo grooming bottle")],
      rating: 4.3, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  AUTOMOTIVE  (TechZone)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Ambrane 20000mAh Car Jump Starter", price: 4499, stock: 22, seller: s1,
      category: cats["Automotive"],
      description: "Portable jump starter + power bank for petrol engines up to 3.5L. Peak current 400A, LED torch, dual USB output. Includes clamps, safety bag, and instructions.",
      images: [img("car jump starter portable power bank"), img("automotive jump starter battery")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Bosch Microfiber Cleaning Cloth Set of 6", price: 599, stock: 100, seller: s1,
      category: cats["Automotive"],
      description: "Premium 380gsm microfiber cloths. Scratch-free cleaning for car exterior, interior, dashboard, glass, and wheels. Machine washable up to 500 times. 40x40cm each.",
      images: [img("microfiber car cleaning cloth set"), img("car detailing cloth automotive")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Meguiar's Ultimate Liquid Wax 473ml", price: 1799, stock: 35, seller: s1,
      category: cats["Automotive"],
      description: "Professional-grade synthetic liquid car wax with ThinFilm technology for easy on/off application. Provides deep shine, UV protection, and water beading for up to 12 months.",
      images: [img("meguiars car wax polish liquid"), img("car wax shine polish detailing")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Nedis Dashcam Full HD 1080p", price: 3999, stock: 28, seller: s1,
      category: cats["Automotive"],
      description: "Full HD 1080p dash camera with 2.7-inch screen, 140° wide angle, night vision, loop recording, G-sensor, and parking mode. Includes 32GB microSD card.",
      images: [img("dashcam car camera hd recording"), img("dashboard camera night vision car")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Gadget Shield Car Seat Cover Set Premium", price: 2999, stock: 20, seller: s1,
      category: cats["Automotive"],
      description: "Universal fit PU leather car seat covers for 5 seats (front + rear). Water-resistant, anti-slip backing, airbag-compatible. Easy installation. Black/Beige options.",
      images: [img("car seat cover leather universal set"), img("auto seat cover premium black")],
      rating: 4.2, numReviews: 0,
    },

    // ══════════════════════════════════════════════════════════════════════════
    //  GARDEN & OUTDOORS  (FreshRoots)
    // ══════════════════════════════════════════════════════════════════════════
    {
      name: "Ugaoo Jade Plant in Ceramic Pot", price: 399, stock: 60, seller: s3,
      category: cats["Garden & Outdoors"],
      description: "Live Jade succulent in premium white ceramic pot. Low maintenance, requires watering once a week. Known as a money plant, it brings good luck and prosperity indoors.",
      images: [img("jade plant succulent ceramic pot indoor"), img("indoor plant succulent gift")],
      rating: 4.7, numReviews: 0,
    },
    {
      name: "Kraft Seeds Flower Seed Kit — 10 Varieties", price: 499, stock: 90, seller: s3,
      category: cats["Garden & Outdoors"],
      description: "Kit of 10 popular flowering plants: Marigold, Zinnia, Sunflower, Petunia, Cosmos, Dianthus, Aster, Stock, Alyssum, Candytuft. Includes growing guide. Indian climate adapted.",
      images: [img("flower seeds garden kit variety"), img("gardening seed packet flowers")],
      rating: 4.5, numReviews: 0,
    },
    {
      name: "Gardening Tool Set 8 Pieces — Stainless Steel", price: 999, stock: 40, seller: s3,
      category: cats["Garden & Outdoors"],
      description: "Professional 8-piece garden tool set: trowel, cultivator, weeder, transplanter, pruner, gloves, fork, and rake. Ergonomic TPR handles, rust-resistant stainless steel.",
      images: [img("garden tools set stainless steel kit"), img("gardening hand tools set")],
      rating: 4.4, numReviews: 0,
    },
    {
      name: "Balcony Grow Bag Set 12x12 inch — 10 Pack", price: 699, stock: 70, seller: s3,
      category: cats["Garden & Outdoors"],
      description: "BPA-free fabric grow bags with excellent drainage and aeration. 12x12 inch size fits balconies perfectly. Ideal for tomatoes, chillies, herbs, and flowers. Washable and reusable.",
      images: [img("grow bags fabric garden balcony"), img("plant grow bag fabric container")],
      rating: 4.3, numReviews: 0,
    },
    {
      name: "Kirloskar Star-1 0.5HP Water Pump", price: 3599, stock: 15, seller: s3,
      category: cats["Garden & Outdoors"],
      description: "0.5HP centrifugal monoblock water pump for garden irrigation, water transfer, and drainage. Maximum head 25m, discharge 1500 LPH. Thermal overload protection. ISI marked.",
      images: [img("kirloskar water pump garden irrigation"), img("electric water pump motor")],
      rating: 4.6, numReviews: 0,
    },
  ];
}

// ── seed products ─────────────────────────────────────────────────────────────
async function seedProducts(sellers, cats) {
  console.log("\n📦  Seeding products...");
  const defs = buildProductDefs(sellers, cats);
  const created = [];

  for (const d of defs) {
    const exists = await Product.findOne({ name: d.name });
    if (exists) {
      console.log(`   ⏭️  "${d.name.slice(0, 45)}..." already exists`);
      created.push(exists);
      continue;
    }
    const p = await Product.create({
      name:        d.name,
      slug:        slugify(d.name, { lower: true, strict: true }),
      description: d.description,
      price:       d.price,
      category:    d.category._id,
      seller:      d.seller._id,
      stock:       d.stock,
      images:      d.images,
      status:      "approved",
      rating:      d.rating,
      numReviews:  0,
    });
    created.push(p);
    console.log(`   ✅  ₹${d.price.toLocaleString("en-IN").padStart(6)}  ${d.name.slice(0, 50)}`);
  }

  console.log(`\n   Total: ${created.length} products`);
  return created;
}

// ── helpers for orders ────────────────────────────────────────────────────────
function makeItem(product, seller, qty, commRate) {
  const gross      = product.price * qty;
  const commission = pct(gross, commRate);
  const earnings   = fmt(gross - commission);
  return {
    _id:              oid(),
    product:          product._id,
    seller:           seller._id,
    name:             product.name,
    price:            product.price,
    quantity:         qty,
    image:            product.images?.[0]?.url || "",
    commissionRate:   commRate,
    commissionAmount: commission,
    sellerEarnings:   earnings,
  };
}

function buildSubOrders(items, status, daysAgo) {
  const map = new Map();
  items.forEach(it => {
    const sid = it.seller.toString();
    if (!map.has(sid)) map.set(sid, { seller: it.seller, ids: [], gross: 0, comm: 0, net: 0 });
    const s = map.get(sid);
    s.ids.push(it._id);
    s.gross += it.price * it.quantity;
    s.comm  += it.commissionAmount;
    s.net   += it.sellerEarnings;
  });
  const base = Date.now() - daysAgo * 86400000;
  return [...map.values()].map(s => ({
    seller:           s.seller,
    items:            s.ids,
    status,
    grossAmount:      fmt(s.gross),
    commissionAmount: fmt(s.comm),
    netEarnings:      fmt(s.net),
    shippedAt:        ["shipped","delivered"].includes(status) ? new Date(base + 2*86400000) : undefined,
    deliveredAt:      status === "delivered"                   ? new Date(base + 5*86400000) : undefined,
  }));
}

function calcPrices(items, config) {
  const itemsPrice    = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxPrice      = pct(itemsPrice, config.taxRate);
  const shippingPrice = itemsPrice >= config.freeShippingThreshold ? 0 : config.shippingCost;
  const totalPrice    = fmt(itemsPrice + taxPrice + shippingPrice);
  const totalComm     = fmt(items.reduce((s, i) => s + i.commissionAmount, 0));
  return { itemsPrice, taxPrice, shippingPrice, totalPrice, totalComm };
}

// ── seed orders ───────────────────────────────────────────────────────────────
async function seedOrdersAndReviews(buyers, sellers, products, config) {
  console.log("\n🧾  Seeding orders + reviews...");

  const COMM = config.commissionRate;

  const pByName = name => products.find(p => p.name.includes(name));

  // Lookup sellers by shopName from actual DB objects
  const [s1, s2, s3] = sellers;

  // Addresses
  const addrs = [
    { address: "15 MG Road",         city: "Bengaluru", postalCode: "560001", country: "India", phone: "9000111111" },
    { address: "42 Juhu Beach Road",  city: "Mumbai",    postalCode: "400049", country: "India", phone: "9000222222" },
    { address: "7 Anna Nagar West",   city: "Chennai",   postalCode: "600040", country: "India", phone: "9000333333" },
  ];

  // Define 3 delivered orders + 1 pending per buyer
  // Each delivered order has 2–3 items from different sellers where possible
  const orderPlans = [
    // ── Buyer 0 (Sneha Reddy) ──────────────────────────────────────────────
    {
      buyer: buyers[0], addr: addrs[0],
      delivered: [
        {
          items: [
            { p: pByName("Sony WH-1000XM5"), qty: 1, seller: s1 },
            { p: pByName("Ikigai"),          qty: 1, seller: s3 },
            { p: pByName("Mamaearth"),       qty: 2, seller: s3 },
          ],
          daysAgo: 25, method: "UPI",
        },
        {
          items: [
            { p: pByName("Women's Silk Saree"),      qty: 1, seller: s2 },
            { p: pByName("Baggit Women's"),          qty: 1, seller: s2 },
            { p: pByName("Organic India Tulsi"),     qty: 3, seller: s3 },
          ],
          daysAgo: 12, method: "Card",
        },
      ],
      pending: {
        items: [
          { p: pByName("Logitech MX Master"), qty: 1, seller: s1 },
          { p: pByName("Leuchtturm1917"),     qty: 2, seller: s1 },
        ],
        method: "COD",
      },
    },

    // ── Buyer 1 (Rahul Verma) ──────────────────────────────────────────────
    {
      buyer: buyers[1], addr: addrs[1],
      delivered: [
        {
          items: [
            { p: pByName("JBL Flip 6"),          qty: 1, seller: s1 },
            { p: pByName("Men's Linen Kurta"),    qty: 1, seller: s2 },
            { p: pByName("Two Brothers Organic"), qty: 2, seller: s3 },
          ],
          daysAgo: 30, method: "COD",
        },
        {
          items: [
            { p: pByName("Lego Classic"),            qty: 1, seller: s2 },
            { p: pByName("Tata Tea Gold"),           qty: 2, seller: s3 },
            { p: pByName("Himalayan Pink Salt"),     qty: 2, seller: s3 },
          ],
          daysAgo: 10, method: "UPI",
        },
      ],
      pending: {
        items: [
          { p: pByName("Samsung 27-inch"),   qty: 1, seller: s1 },
          { p: pByName("Rubik's Cube"),      qty: 2, seller: s2 },
        ],
        method: "Card",
      },
    },

    // ── Buyer 2 (Pooja Nambiar) ────────────────────────────────────────────
    {
      buyer: buyers[2], addr: addrs[2],
      delivered: [
        {
          items: [
            { p: pByName("Ray-Ban Aviator"),       qty: 1, seller: s2 },
            { p: pByName("Zero to One"),           qty: 1, seller: s3 },
            { p: pByName("Oziva Protein"),         qty: 1, seller: s3 },
          ],
          daysAgo: 20, method: "Card",
        },
        {
          items: [
            { p: pByName("Fossil Gen 6"),               qty: 1, seller: s2 },
            { p: pByName("Conscious Food Kashmiri"),    qty: 1, seller: s3 },
            { p: pByName("Bru Gold"),                   qty: 2, seller: s3 },
          ],
          daysAgo: 8, method: "UPI",
        },
      ],
      pending: {
        items: [
          { p: pByName("Prestige Induction"),  qty: 1, seller: s3 },
          { p: pByName("Arteza Premium"),      qty: 1, seller: s1 },
        ],
        method: "COD",
      },
    },
  ];

  const allDeliveredItems = []; // { product, buyer } for reviews

  for (const plan of orderPlans) {
    const { buyer, addr, delivered, pending } = plan;

    // Check if this buyer already has orders
    const existingOrders = await Order.countDocuments({ buyer: buyer._id });
    if (existingOrders > 0) {
      console.log(`   ⏭️  ${buyer.email} already has orders — skipped`);
      continue;
    }

    // Create delivered orders
    for (const o of delivered) {
      const validItems = o.items.filter(i => i.p); // skip if product not found
      if (validItems.length === 0) continue;

      const items = validItems.map(i => makeItem(i.p, i.seller, i.qty, COMM));
      const { itemsPrice, taxPrice, shippingPrice, totalPrice, totalComm } = calcPrices(items, config);
      const base = new Date(Date.now() - o.daysAgo * 86400000);

      await Order.create({
        buyer:           buyer._id,
        orderItems:      items,
        sellerSubOrders: buildSubOrders(items, "delivered", o.daysAgo),
        shippingInfo:    addr,
        paymentInfo:     { method: o.method },
        itemsPrice, taxPrice, shippingPrice, totalPrice,
        totalCommission: totalComm,
        orderStatus:     "delivered",
        isPaid:          true,
        paidAt:          new Date(base.getTime() + 1*86400000),
        deliveredAt:     new Date(base.getTime() + 5*86400000),
        createdAt:       base,
      });

      // Collect for reviews
      validItems.forEach(i => {
        allDeliveredItems.push({ product: i.p, buyer });
      });

      console.log(`   ✅  DELIVERED order for ${buyer.name} — ₹${totalPrice.toLocaleString("en-IN")} (${o.items.map(i=>i.p?.name?.slice(0,20)||"?").join(", ")})`);
    }

    // Create pending order
    if (pending) {
      const validItems = pending.items.filter(i => i.p);
      if (validItems.length > 0) {
        const items = validItems.map(i => makeItem(i.p, i.seller, i.qty, COMM));
        const { itemsPrice, taxPrice, shippingPrice, totalPrice, totalComm } = calcPrices(items, config);
        await Order.create({
          buyer:           buyer._id,
          orderItems:      items,
          sellerSubOrders: buildSubOrders(items, "pending", 0),
          shippingInfo:    addr,
          paymentInfo:     { method: pending.method },
          itemsPrice, taxPrice, shippingPrice, totalPrice,
          totalCommission: totalComm,
          orderStatus:     "pending",
          isPaid:          false,
          createdAt:       new Date(),
        });
        console.log(`   ✅  PENDING  order for ${buyer.name} — ₹${totalPrice.toLocaleString("en-IN")}`);
      }
    }
  }

  // ── Reviews (only on delivered items) ─────────────────────────────────────
  console.log("\n⭐  Seeding reviews...");

  const reviewTexts = {
    "Sony WH-1000XM5":        { r: 5, t: "Incredible noise cancellation — flights and offices are now peaceful. Build quality feels premium. Battery lasts forever." },
    "Ikigai":                  { r: 5, t: "One of the most beautiful and inspiring books I've read. Simple language but deeply meaningful. Changed my perspective on work." },
    "Mamaearth Vitamin C":     { r: 4, t: "Skin feels noticeably brighter after 2 weeks. Lathers well and doesn't leave skin dry. Packaging is great too." },
    "Women's Silk Saree":      { r: 5, t: "The fabric is gorgeous and the zari border is exactly as shown. Received so many compliments at the wedding. Will order again!" },
    "Baggit Women's":          { r: 4, t: "Good quality vegan leather, looks exactly like the photo. Spacious enough for daily use. The strap is a bit short though." },
    "Organic India Tulsi":     { r: 5, t: "Genuine tulsi fragrance, calming and fresh. Been having it every morning instead of regular tea. My whole family loves it." },
    "JBL Flip 6":              { r: 5, t: "Took it to the beach — survived water splashes perfectly. Sound is loud and punchy for its size. Worth every rupee." },
    "Men's Linen Kurta":       { r: 4, t: "Perfect for summer. Very breathable and comfortable. Fitting is accurate to size chart. Fabric could be slightly thicker." },
    "Two Brothers Organic":    { r: 5, t: "You can smell the purity. Grainy texture proves it's authentic bilona ghee. Tastes incredible on rotis. Best ghee I've had." },
    "Lego Classic":            { r: 5, t: "My 6-year-old has been playing with this non-stop. Great value for the number of pieces. Builds creativity brilliantly." },
    "Tata Tea Gold":           { r: 4, t: "Strong, fragrant chai every morning. Makes perfect masala tea. Been using this brand for years and it never disappoints." },
    "Himalayan Pink Salt":     { r: 4, t: "Lovely mineral taste compared to regular iodized salt. Used it in cooking and as a bath scrub. Good quality and fair price." },
    "Ray-Ban Aviator":         { r: 5, t: "Classic, timeless design. Lens quality is excellent — very clear with great UV protection. The gold frame looks premium in person." },
    "Zero to One":             { r: 5, t: "Peter Thiel writes with such clarity and conviction. Made me rethink everything about startups and building unique products." },
    "Oziva Protein":           { r: 4, t: "Good quality plant protein, dissolves well without clumping. The chocolate flavor is pleasant. Noticing better energy post-workout." },
    "Fossil Gen 6":            { r: 4, t: "Gorgeous watch face, feels premium on the wrist. Battery life could be better but Wear OS is smooth and responsive." },
    "Conscious Food Kashmiri": { r: 5, t: "Freshest walnuts I've ever bought online. Vacuum sealed perfectly. Crunchy, light amber, absolutely no bitterness." },
    "Bru Gold":                { r: 4, t: "Rich aroma, consistent quality. Brews a smooth filter coffee. Perfect for South Indian filter. My morning coffee ritual sorted." },
  };

  for (const { product, buyer } of allDeliveredItems) {
    // Check if review already exists
    const exists = await Review.findOne({ product: product._id, buyer: buyer._id });
    if (exists) continue;

    // Find matching review text
    const matchKey = Object.keys(reviewTexts).find(k => product.name.includes(k));
    const rv = matchKey ? reviewTexts[matchKey] : { r: 4, t: "Good product, happy with the purchase. Delivery was fast and packaging was secure." };

    await Review.create({
      product:  product._id,
      buyer:    buyer._id,
      rating:   rv.r,
      comment:  rv.t,
    });

    // Update product rating
    const allReviews = await Review.find({ product: product._id });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(product._id, {
      rating:     parseFloat(avg.toFixed(2)),
      numReviews: allReviews.length,
    });

    console.log(`   ✅  Review by ${buyer.name} on "${product.name.slice(0, 40)}..." (${rv.r}★)`);
  }
}

// ── seed carts ────────────────────────────────────────────────────────────────
async function seedCarts(buyers, sellers, products) {
  console.log("\n🛒  Seeding carts...");

  const [s1, s2, s3] = sellers;
  const pByName = name => products.find(p => p.name.includes(name));

  const cartPlans = [
    {
      buyer: buyers[0],
      items: [
        { p: pByName("Samsung 27-inch"),    qty: 1, seller: s1 },
        { p: pByName("Nutriorg Moringa"),   qty: 2, seller: s3 },
        { p: pByName("Swarovski Crystal"),  qty: 1, seller: s2 },
      ],
    },
    {
      buyer: buyers[1],
      items: [
        { p: pByName("Anker 65W"),          qty: 1, seller: s1 },
        { p: pByName("Wonderchef Granite"), qty: 1, seller: s3 },
        { p: pByName("Sapiens"),            qty: 1, seller: s3 },
        { p: pByName("Funskool Monopoly"),  qty: 1, seller: s2 },
      ],
    },
    {
      buyer: buyers[2],
      items: [
        { p: pByName("Decathlon Domyos"),     qty: 1, seller: s1 },
        { p: pByName("WOW Skin Science"),     qty: 2, seller: s3 },
        { p: pByName("Tommy Hilfiger"),       qty: 1, seller: s2 },
      ],
    },
  ];

  for (const plan of cartPlans) {
    const existing = await Cart.findOne({ buyer: plan.buyer._id });
    if (existing) {
      console.log(`   ⏭️  Cart for ${plan.buyer.email} already exists`);
      continue;
    }

    const validItems = plan.items.filter(i => i.p);
    if (validItems.length === 0) continue;

    await Cart.create({
      buyer: plan.buyer._id,
      items: validItems.map(i => ({
        product:  i.p._id,
        seller:   i.seller._id,
        name:     i.p.name,
        price:    i.p.price,
        quantity: i.qty,
        image:    i.p.images?.[0]?.url || "",
      })),
    });
    console.log(`   ✅  Cart for ${plan.buyer.name} (${validItems.length} items)`);
  }
}

// ── seed wishlists ────────────────────────────────────────────────────────────
async function seedWishlists(buyers, products) {
  console.log("\n💖  Seeding wishlists...");

  const pByName = name => products.find(p => p.name.includes(name));

  const wishlistPlans = [
    {
      buyer: buyers[0],
      products: [
        pByName("Fossil Gen 6"),
        pByName("The Alchemist"),
        pByName("Ugaoo Jade"),
        pByName("Catit Flower"),
        pByName("Rich Dad"),
      ],
    },
    {
      buyer: buyers[1],
      products: [
        pByName("Logitech MX Master"),
        pByName("Ray-Ban Aviator"),
        pByName("Two Brothers Organic"),
        pByName("Hot Wheels"),
        pByName("Meguiar's"),
      ],
    },
    {
      buyer: buyers[2],
      products: [
        pByName("Sony WH-1000XM5"),
        pByName("Women's Silk Saree"),
        pByName("Organic India Tulsi"),
        pByName("Gardening Tool"),
        pByName("Pedigree Adult"),
      ],
    },
  ];

  for (const plan of wishlistPlans) {
    const existing = await Wishlist.findOne({ buyer: plan.buyer._id });
    if (existing) {
      console.log(`   ⏭️  Wishlist for ${plan.buyer.email} already exists`);
      continue;
    }

    const validProducts = plan.products.filter(Boolean).map(p => p._id);
    await Wishlist.create({ buyer: plan.buyer._id, products: validProducts });
    console.log(`   ✅  Wishlist for ${plan.buyer.name} (${validProducts.length} items)`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
  await connect();

  // Ensure platform config exists
  let config = await Config.findOne();
  if (!config) {
    config = await Config.create({ commissionRate: 10, taxRate: 5, shippingCost: 49, freeShippingThreshold: 999 });
    console.log("⚙️  Platform config created\n");
  }

  const { sellers, buyers } = await seedUsers();
  const cats     = await seedCategories();
  const products = await seedProducts(sellers, cats);

  await seedOrdersAndReviews(buyers, sellers, products, config);
  await seedCarts(buyers, sellers, products);
  await seedWishlists(buyers, products);

  console.log("\n" + "=".repeat(60));
  console.log("🎉  seedExtra.js complete!");
  console.log("=".repeat(60));
  console.log("\n🔑  NEW LOGIN CREDENTIALS");
  console.log("─".repeat(50));
  console.log("  seller2@nexus.com  /  Seller@123  → TechZone India");
  console.log("  seller3@nexus.com  /  Seller@123  → StyleVault");
  console.log("  seller4@nexus.com  /  Seller@123  → FreshRoots Organics");
  console.log("  buyer2@nexus.com   /  Buyer@123   → Sneha Reddy");
  console.log("  buyer3@nexus.com   /  Buyer@123   → Rahul Verma");
  console.log("  buyer4@nexus.com   /  Buyer@123   → Pooja Nambiar");
  console.log("\n📊  SEEDED");
  console.log("─".repeat(50));
  console.log("  15 categories");
  console.log("  75 products (5 per category, real Unsplash photos)");
  console.log("  6  delivered orders with verified reviews");
  console.log("  3  pending orders");
  console.log("  3  carts with items ready");
  console.log("  3  wishlists");
  console.log("=".repeat(60) + "\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("❌  seedExtra.js failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});