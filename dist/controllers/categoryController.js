"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.addCategory = exports.getCategories = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Category_1 = __importDefault(require("../models/Category"));
const Product_1 = __importDefault(require("../models/Product"));
const DEFAULT_CATEGORIES = ["Electronics", "Clothing", "Books", "Toys", "Home", "Automobiles", "Other"];
// GET /api/categories — public
exports.getCategories = (0, express_async_handler_1.default)(async (req, res) => {
    const count = await Category_1.default.countDocuments();
    if (count === 0) {
        await Category_1.default.insertMany(DEFAULT_CATEGORIES.map((name) => ({ name, isDefault: true })));
    }
    await Category_1.default.updateMany({ name: { $in: DEFAULT_CATEGORIES } }, { $set: { isDefault: true } });
    const categories = await Category_1.default.find({}).sort({ name: 1 }).lean();
    const counts = await Product_1.default.aggregate([
        { $group: { _id: { $toLower: "$category" }, count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(({ _id, count }) => { if (_id)
        countMap[_id] = count; });
    const result = categories.map((cat) => ({
        ...cat,
        isDefault: DEFAULT_CATEGORIES.includes(cat.name),
        productCount: countMap[cat.name.toLowerCase()] ?? 0,
    }));
    res.json(result);
});
// POST /api/categories — admin only
exports.addCategory = (0, express_async_handler_1.default)(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
        res.status(400);
        throw new Error("Category name is required");
    }
    const existing = await Category_1.default.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existing) {
        res.status(400);
        throw new Error("Category already exists");
    }
    const category = await Category_1.default.create({ name: name.trim() });
    res.status(201).json(category);
});
// PUT /api/categories/:id — admin only
exports.updateCategory = (0, express_async_handler_1.default)(async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
        res.status(400);
        throw new Error("Category name is required");
    }
    const category = await Category_1.default.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error("Category not found");
    }
    if (DEFAULT_CATEGORIES.includes(category.name)) {
        res.status(403);
        throw new Error("Built-in categories cannot be edited");
    }
    category.name = name.trim();
    await category.save();
    res.json(category);
});
// DELETE /api/categories/:id — admin only
exports.deleteCategory = (0, express_async_handler_1.default)(async (req, res) => {
    const category = await Category_1.default.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error("Category not found");
    }
    if (DEFAULT_CATEGORIES.includes(category.name)) {
        res.status(403);
        throw new Error("Built-in categories cannot be deleted");
    }
    await category.deleteOne();
    res.json({ message: "Category deleted" });
});
