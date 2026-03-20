import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

// ── MUST be first — load .env before anything reads process.env ───────────────
import dotenv from "dotenv";
dotenv.config();

// ── Guard: fail fast if required env vars are missing ─────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "JWT_EXPIRE"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[STARTUP ERROR] Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}

import connectDB from "./config/db.js";
connectDB();

import authRoutes            from "./routes/authRoutes.js";
import userRoutes            from "./routes/userRoutes.js";
import categoryRoutes        from "./routes/categoryRoutes.js";
import productRoutes         from "./routes/productRoutes.js";
import cartRoutes            from "./routes/cartRoutes.js";
import wishlistRoutes        from "./routes/wishlistRoutes.js";
import orderRoutes           from "./routes/orderRoutes.js";
import reviewRoutes          from "./routes/reviewRoutes.js";
import sellerAnalyticsRoutes from "./routes/sellerAnalyticsRoutes.js";
import adminRoutes           from "./routes/adminRoutes.js";
import adminAnalyticsRoutes  from "./routes/adminAnalyticsRoutes.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
  .split(",").map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

try {
  const swaggerFile = JSON.parse(fs.readFileSync("./config/swagger-output.json", "utf-8"));
  app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile));
} catch {
  console.warn("Swagger UI skipped — run swagger generator first");
}

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) =>
  res.status(200).json({ message: "NEXUS API is running" })
);

app.use("/api/auth",             authRoutes);
app.use("/api/user",             userRoutes);
app.use("/api/categories",       categoryRoutes);
app.use("/api/products",         productRoutes);
app.use("/api/cart",             cartRoutes);
app.use("/api/wishlist",         wishlistRoutes);
app.use("/api/orders",           orderRoutes);
app.use("/api/reviews",          reviewRoutes);
app.use("/api/seller/analytics", sellerAnalyticsRoutes);
app.use("/api/admin",            adminRoutes);
app.use("/api/admin/analytics",  adminAnalyticsRoutes);

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err.message);
  if (err.name === "ValidationError") {
    const msgs = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: msgs.join(", ") });
  }
  if (err.name === "CastError")
    return res.status(404).json({ success: false, message: "Invalid resource ID" });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }
  if (err.name === "JsonWebTokenError")
    return res.status(401).json({ success: false, message: "Invalid token" });
  if (err.name === "TokenExpiredError")
    return res.status(401).json({ success: false, message: "Token expired" });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`[SERVER] Running in [${process.env.NODE_ENV || "development"}] mode on port ${PORT}`)
);

export default app;