"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.getAllProducts = exports.updateUser = exports.getUserById = exports.deleteUser = exports.getAllUsers = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
// @desc Get all users
exports.getAllUsers = (0, express_async_handler_1.default)(async (req, res) => {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const [users, total] = await Promise.all([
        User_1.default.find({}).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        User_1.default.countDocuments({}),
    ]);
    res.json({ users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});
// @desc Delete user
exports.deleteUser = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await User_1.default.findById(req.params.id);
    if (user) {
        await user.deleteOne();
        res.json({ message: "User removed" });
    }
    else {
        res.status(404);
        throw new Error("User not found");
    }
});
// @desc Get user by ID
exports.getUserById = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await User_1.default.findById(req.params.id).select("-password");
    if (user) {
        res.json(user);
    }
    else {
        res.status(404);
        throw new Error("User not found");
    }
});
// @desc Update user
exports.updateUser = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await User_1.default.findById(req.params.id);
    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        if (req.body.role)
            user.role = req.body.role;
        const updatedUser = await user.save();
        res.json(updatedUser);
    }
    else {
        res.status(404);
        throw new Error("User not found");
    }
});
exports.getAllProducts = (0, express_async_handler_1.default)(async (req, res) => {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const [products, total] = await Promise.all([
        Product_1.default.find({})
            .select("title category price images owner isAvailable createdAt")
            .populate("owner", "username")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Product_1.default.countDocuments({}),
    ]);
    res.json({ products, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});
exports.deleteProduct = (0, express_async_handler_1.default)(async (req, res) => {
    const product = await Product_1.default.findById(req.params.id);
    if (product) {
        await product.deleteOne();
        res.json({ message: "Product removed" });
    }
    else {
        res.status(404);
        throw new Error("Product not found");
    }
});
