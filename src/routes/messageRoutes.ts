// routes/messageRoutes.ts
import express from "express";
import { protect } from "../middleware/authMiddleware";
import { uploadSingle } from "../middleware/uploadMiddlware";
import {
  sendMessage,
  getConversation,
  getConversations,
  getUnreadCount,
  markAsRead,
  deleteMessage,
} from "../controllers/messageController";

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a new message (with optional image)
router.post("/", protect, uploadSingle, sendMessage);

// @route   GET /api/messages/conversations
// @desc    Get all conversations for current user
router.get("/conversations", protect, getConversations);

// @route   GET /api/messages/unread-count
// @desc    Get unread messages count
router.get("/unread-count", protect, getUnreadCount);

// @route   GET /api/messages/conversation/:userId
// @desc    Get conversation with a specific user
router.get("/conversation/:userId", protect, getConversation);

// @route   PUT /api/messages/mark-read/:userId
// @desc    Mark messages as read in a conversation
router.put("/mark-read/:userId", protect, markAsRead);

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
router.delete("/:messageId", protect, deleteMessage);

export default router;
