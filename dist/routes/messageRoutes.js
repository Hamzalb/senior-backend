"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/messageRoutes.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddlware_1 = require("../middleware/uploadMiddlware");
const messageController_1 = require("../controllers/messageController");
const router = express_1.default.Router();
// @route   POST /api/messages
// @desc    Send a new message (with optional image)
router.post("/", authMiddleware_1.protect, uploadMiddlware_1.uploadSingle, messageController_1.sendMessage);
// @route   GET /api/messages/conversations
// @desc    Get all conversations for current user
router.get("/conversations", authMiddleware_1.protect, messageController_1.getConversations);
// @route   GET /api/messages/unread-count
// @desc    Get unread messages count
router.get("/unread-count", authMiddleware_1.protect, messageController_1.getUnreadCount);
// @route   GET /api/messages/conversation/:userId
// @desc    Get conversation with a specific user
router.get("/conversation/:userId", authMiddleware_1.protect, messageController_1.getConversation);
// @route   PUT /api/messages/mark-read/:userId
// @desc    Mark messages as read in a conversation
router.put("/mark-read/:userId", authMiddleware_1.protect, messageController_1.markAsRead);
// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
router.delete("/:messageId", authMiddleware_1.protect, messageController_1.deleteMessage);
exports.default = router;
