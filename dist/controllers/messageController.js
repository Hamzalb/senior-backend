"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.markAsRead = exports.getUnreadCount = exports.getConversations = exports.getConversation = exports.sendMessage = void 0;
// controllers/messageController.ts
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Message_1 = __importDefault(require("../models/Message"));
const Notification_1 = __importDefault(require("../models/Notification"));
const User_1 = __importDefault(require("../models/User"));
const Barter_1 = __importDefault(require("../models/Barter"));
const socket_1 = require("../socket");
const supabase_1 = require("../utils/supabase");
// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = (0, express_async_handler_1.default)(async (req, res) => {
    const { recipientId, content, barterId, productId, messageType, offeredProductId, requestedProductId } = req.body;
    const senderId = req.user._id;
    if (!recipientId) {
        res.status(400);
        throw new Error("Recipient is required");
    }
    // Check if recipient exists
    const recipient = await User_1.default.findById(recipientId);
    if (!recipient) {
        res.status(404);
        throw new Error("Recipient not found");
    }
    // Prevent sending message to yourself
    if (recipientId === senderId.toString()) {
        res.status(400);
        throw new Error("Cannot send message to yourself");
    }
    // Handle image upload if present
    let imageUrl;
    if (req.file) {
        try {
            imageUrl = await (0, supabase_1.uploadToSupabase)(req.file, "messages");
        }
        catch (error) {
            console.error("Error uploading image:", error);
            res.status(500);
            throw new Error("Failed to upload image");
        }
    }
    // Determine message type
    const msgType = messageType || (imageUrl ? 'image' : 'text');
    // Create the message
    const message = await Message_1.default.create({
        sender: senderId,
        recipient: recipientId,
        content: content || "",
        imageUrl,
        messageType: msgType,
        offeredProductId,
        requestedProductId,
        barterId,
        productId,
    });
    // Populate sender and recipient info
    let populatedMessage = await message.populate([
        { path: "sender", select: "username email profileImage" },
        { path: "recipient", select: "username email profileImage" },
    ]);
    // If it's a trade request, populate product info and create barter
    if (msgType === 'trade_request' && offeredProductId && requestedProductId) {
        // Create a barter request
        const barter = await Barter_1.default.create({
            productOfferedId: offeredProductId,
            productRequestedId: requestedProductId,
            offeredBy: senderId,
            requestedFrom: recipientId,
            status: "pending",
        });
        // Update message with barterId
        message.barterId = barter._id;
        await message.save();
        // Populate product details
        populatedMessage = await message.populate([
            { path: "sender", select: "username email profileImage" },
            { path: "recipient", select: "username email profileImage" },
            { path: "offeredProductId", select: "title images category" },
            { path: "requestedProductId", select: "title images category" },
        ]);
    }
    // Create notification for the recipient
    const sender = await User_1.default.findById(senderId);
    let notificationMessage = "";
    let notificationType = "message";
    if (msgType === 'trade_request') {
        notificationType = "barter_request";
        notificationMessage = `${sender?.username || "Someone"} wants to trade items with you!`;
    }
    else if (msgType === 'image') {
        notificationMessage = `${sender?.username || "Someone"} sent you an image`;
    }
    else {
        notificationMessage = `${sender?.username || "Someone"} sent you a message: "${(content || "").substring(0, 50)}${(content || "").length > 50 ? "..." : ""}"`;
    }
    const notification = await Notification_1.default.create({
        recipient: recipientId,
        sender: senderId,
        type: notificationType,
        title: msgType === 'trade_request' ? "Trade Request" : "New Message",
        message: notificationMessage,
        barterId: message.barterId,
        productId: offeredProductId || productId,
    });
    // Emit real-time notification
    (0, socket_1.emitNotification)(recipientId, notification);
    // Emit the message to the recipient for real-time chat
    (0, socket_1.emitMessage)(recipientId, populatedMessage);
    // Emit unread count update
    const unreadCount = await Notification_1.default.getUnreadCount(recipientId);
    (0, socket_1.emitUnreadCount)(recipientId, unreadCount);
    res.status(201).json({
        message: "Message sent successfully",
        data: populatedMessage,
    });
});
// @desc    Get conversation between two users
// @route   GET /api/messages/conversation/:userId
// @access  Private
exports.getConversation = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const { limit, skip } = req.query;
    const currentUserId = req.user._id;
    const options = {
        limit: limit ? parseInt(limit) : 50,
        skip: skip ? parseInt(skip) : 0,
    };
    const messages = await Message_1.default.getConversation(currentUserId.toString(), userId, options);
    // Mark messages as read (messages where current user is recipient)
    await Message_1.default.updateMany({ sender: userId, recipient: currentUserId, isRead: false }, { isRead: true });
    // Update unread notification count for the current user
    const unreadCount = await Notification_1.default.getUnreadCount(currentUserId.toString());
    (0, socket_1.emitUnreadCount)(currentUserId.toString(), unreadCount);
    res.json({
        message: "Conversation retrieved successfully",
        data: messages.reverse(), // Reverse to show oldest first
        count: messages.length,
    });
});
// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.user._id;
    const conversations = await Message_1.default.getConversations(currentUserId.toString());
    res.json({
        message: "Conversations retrieved successfully",
        data: conversations,
        count: conversations.length,
    });
});
// @desc    Get unread messages count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.user._id;
    const unreadCount = await Message_1.default.getUnreadCount(currentUserId.toString());
    res.json({
        message: "Unread count retrieved successfully",
        unreadCount,
    });
});
// @desc    Mark messages as read in a conversation
// @route   PUT /api/messages/mark-read/:userId
// @access  Private
exports.markAsRead = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const result = await Message_1.default.updateMany({ sender: userId, recipient: currentUserId, isRead: false }, { isRead: true });
    // Update unread notification count
    const unreadCount = await Notification_1.default.getUnreadCount(currentUserId.toString());
    (0, socket_1.emitUnreadCount)(currentUserId.toString(), unreadCount);
    res.json({
        message: "Messages marked as read",
        modifiedCount: result.modifiedCount,
    });
});
// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
exports.deleteMessage = (0, express_async_handler_1.default)(async (req, res) => {
    const { messageId } = req.params;
    const currentUserId = req.user._id;
    const message = await Message_1.default.findById(messageId);
    if (!message) {
        res.status(404);
        throw new Error("Message not found");
    }
    // Only allow sender or recipient to delete the message
    if (message.sender.toString() !== currentUserId.toString() &&
        message.recipient.toString() !== currentUserId.toString()) {
        res.status(403);
        throw new Error("Not authorized to delete this message");
    }
    await message.deleteOne();
    res.json({ message: "Message deleted successfully" });
});
