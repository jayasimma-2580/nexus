// routes/categoryRoutes.js
import express from "express";
import { protect, authorizeRoles, requireSeller } from "../middlewares/authMiddleware.js";
import { createCategory, getCategories, getCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";

const router = express.Router();

// Public — anyone can read categories
router.get("/", getCategories);
router.get("/:id", getCategory);

// Sellers can suggest new categories (admin approves products anyway, so this is safe)
// Admins can update and delete
router.post("/", protect, authorizeRoles("admin", "seller"), createCategory);
router.put("/:id", protect, authorizeRoles("admin"), updateCategory);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCategory);

export default router;