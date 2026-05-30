"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getUserById = exports.getUserProfile = exports.getAllUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
// @desc    Get all users for messaging directory
// @route   GET /api/users
// @access  Private
exports.getAllUsers = (0, express_async_handler_1.default)(async (req, res) => {
    const { search, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;
    // Build query - exclude current user
    const query = {
        _id: { $ne: currentUserId }
    };
    // Add search filter if provided
    if (search) {
        query.username = { $regex: search, $options: 'i' };
    }
    // Execute query with pagination
    const users = await User_1.default.find(query)
        .select('_id username email role createdAt')
        .sort({ username: 1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit));
    // Get total count for pagination
    const total = await User_1.default.countDocuments(query);
    res.json({
        message: 'Users retrieved successfully',
        data: users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});
exports.getUserProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await User_1.default.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.username,
            email: user.email,
            role: user.role,
        });
    }
    else {
        res.status(401);
        throw new Error("Invalid email or password");
    }
});
exports.getUserById = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const user = await User_1.default.findById(userId).select("_id username email role");
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
    });
});
exports.updateProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user._id;
    const { email, oldPassword, newPassword } = req.body;
    const user = await User_1.default.findById(userId);
    if (!user)
        throw new Error("User not found");
    const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
    if (!isMatch)
        throw new Error("Old password is incorrect");
    user.email = email || user.email;
    if (newPassword)
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
    await user.save();
    res
        .status(200)
        .json({ message: "Profile updated successfully", email: user.email });
});
