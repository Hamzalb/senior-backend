"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUnreadCount = exports.getNotifications = void 0;
// controllers/notificationController.ts
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get all notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const notifications = await Notification_1.default.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "username")
        .populate("barterId")
        .populate("productId", "title images")
        .populate("productOfferedId", "title images")
        .populate("productRequestedId", "title images");
    const total = await Notification_1.default.countDocuments({ recipient: req.user._id });
    const unreadCount = await Notification_1.default.getUnreadCount(req.user._id);
    res.json({
        notifications,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
        unreadCount,
    });
});
exports.getNotifications = getNotifications;
// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    const count = await Notification_1.default.getUnreadCount(req.user._id);
    res.json({ count });
});
exports.getUnreadCount = getUnreadCount;
// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid notification ID");
    }
    const notification = await Notification_1.default.findById(id);
    if (!notification) {
        res.status(404);
        throw new Error("Notification not found");
    }
    // Ensure the notification belongs to the current user
    if (notification.recipient.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to access this notification");
    }
    notification.isRead = true;
    await notification.save();
    const unreadCount = await Notification_1.default.getUnreadCount(req.user._id);
    res.json({
        message: "Notification marked as read",
        notification,
        unreadCount
    });
});
exports.markAsRead = markAsRead;
// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    await Notification_1.default.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read", unreadCount: 0 });
});
exports.markAllAsRead = markAllAsRead;
// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid notification ID");
    }
    const notification = await Notification_1.default.findById(id);
    if (!notification) {
        res.status(404);
        throw new Error("Notification not found");
    }
    // Ensure the notification belongs to the current user
    if (notification.recipient.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to delete this notification");
    }
    await notification.deleteOne();
    const unreadCount = await Notification_1.default.getUnreadCount(req.user._id);
    res.json({
        message: "Notification deleted",
        unreadCount
    });
});
exports.deleteNotification = deleteNotification;
const createNotification = async (params) => {
    const notification = await Notification_1.default.create({
        recipient: params.recipientId,
        sender: params.senderId,
        type: params.type,
        title: params.title,
        message: params.message,
        barterId: params.barterId,
        productId: params.productId,
        productOfferedId: params.productOfferedId,
        productRequestedId: params.productRequestedId,
    });
    // Populate the notification for the response
    const populatedNotification = await Notification_1.default.findById(notification._id)
        .populate("sender", "username")
        .populate("barterId")
        .populate("productId", "title images")
        .populate("productOfferedId", "title images")
        .populate("productRequestedId", "title images");
    return populatedNotification;
};
exports.createNotification = createNotification;
