/**
 * controllers/categoryController.js — Admin manages categories, public reads them
 */

import Category from "../models/Category.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || name.trim().length === 0)
    return res.status(400).json({ success: false, message: "Category name is required" });

  const exists = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: "i" } });
  if (exists)
    return res.status(409).json({ success: false, message: "Category already exists" });

  const category = await Category.create({ name: name.trim(), description });
  res.status(201).json({ success: true, data: category });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort("name");
  res.status(200).json({ success: true, count: categories.length, data: categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category)
    return res.status(404).json({ success: false, message: "Category not found" });
  res.status(200).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || name.trim().length === 0)
    return res.status(400).json({ success: false, message: "Category name cannot be empty" });

  const updated = await Category.findByIdAndUpdate(
    req.params.id,
    { name: name.trim(), description },
    { new: true, runValidators: true }
  );
  if (!updated)
    return res.status(404).json({ success: false, message: "Category not found" });

  res.status(200).json({ success: true, data: updated });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted)
    return res.status(404).json({ success: false, message: "Category not found" });

  res.status(200).json({ success: true, message: "Category deleted" });
});
