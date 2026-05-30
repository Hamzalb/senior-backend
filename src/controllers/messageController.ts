// controllers/messageController.ts
import asyncHandler from "express-async-handler";
import Message from "../models/Message";
import Notification from "../models/Notification";
import User from "../models/User";
import Item from "../models/Product";
import Barter from "../models/Barter";
import { emitNotification, emitUnreadCount, emitMessage } from "../socket";
import { uploadToSupabase } from "../utils/supabase";

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
export const sendMessage = asyncHandler(async (req: any, res: any) => {
  const { recipientId, content, barterId, productId, messageType, offeredProductId, requestedProductId } = req.body;
  const senderId = req.user._id;

  if (!recipientId) {
    res.status(400);
    throw new Error("Recipient is required");
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
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
  let imageUrl: string | undefined;
  if (req.file) {
    try {
      imageUrl = await uploadToSupabase(req.file, "messages");
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500);
      throw new Error("Failed to upload image");
    }
  }

  // Determine message type
  const msgType = messageType || (imageUrl ? 'image' : 'text');

  // Create the message
  const message = await Message.create({
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
    const barter = await Barter.create({
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
  const sender = await User.findById(senderId);
  let notificationMessage = "";
  let notificationType = "message";
  
  if (msgType === 'trade_request') {
    notificationType = "barter_request";
    notificationMessage = `${sender?.username || "Someone"} wants to trade items with you!`;
  } else if (msgType === 'image') {
    notificationMessage = `${sender?.username || "Someone"} sent you an image`;
  } else {
    notificationMessage = `${sender?.username || "Someone"} sent you a message: "${(content || "").substring(0, 50)}${(content || "").length > 50 ? "..." : ""}"`;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type: notificationType,
    title: msgType === 'trade_request' ? "Trade Request" : "New Message",
    message: notificationMessage,
    barterId: message.barterId,
    productId: offeredProductId || productId,
  });

  // Emit real-time notification
  emitNotification(recipientId, notification);

  // Emit the message to the recipient for real-time chat
  emitMessage(recipientId, populatedMessage);

  // Emit unread count update
  const unreadCount = await Notification.getUnreadCount(recipientId);
  emitUnreadCount(recipientId, unreadCount);

  res.status(201).json({
    message: "Message sent successfully",
    data: populatedMessage,
  });
});

// @desc    Get conversation between two users
// @route   GET /api/messages/conversation/:userId
// @access  Private
export const getConversation = asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;
  const { limit, skip } = req.query;
  const currentUserId = req.user._id;

  const options = {
    limit: limit ? parseInt(limit as string) : 50,
    skip: skip ? parseInt(skip as string) : 0,
  };

  const messages = await Message.getConversation(currentUserId.toString(), userId, options);

  // Mark messages as read (messages where current user is recipient)
  await Message.updateMany(
    { sender: userId, recipient: currentUserId, isRead: false },
    { isRead: true }
  );

  // Update unread notification count for the current user
  const unreadCount = await Notification.getUnreadCount(currentUserId.toString());
  emitUnreadCount(currentUserId.toString(), unreadCount);

  res.json({
    message: "Conversation retrieved successfully",
    data: messages.reverse(), // Reverse to show oldest first
    count: messages.length,
  });
});

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = asyncHandler(async (req: any, res: any) => {
  const currentUserId = req.user._id;

  const conversations = await Message.getConversations(currentUserId.toString());

  res.json({
    message: "Conversations retrieved successfully",
    data: conversations,
    count: conversations.length,
  });
});

// @desc    Get unread messages count
// @route   GET /api/messages/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req: any, res: any) => {
  const currentUserId = req.user._id;
  const unreadCount = await Message.getUnreadCount(currentUserId.toString());

  res.json({
    message: "Unread count retrieved successfully",
    unreadCount,
  });
});

// @desc    Mark messages as read in a conversation
// @route   PUT /api/messages/mark-read/:userId
// @access  Private
export const markAsRead = asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const result = await Message.updateMany(
    { sender: userId, recipient: currentUserId, isRead: false },
    { isRead: true }
  );

  // Update unread notification count
  const unreadCount = await Notification.getUnreadCount(currentUserId.toString());
  emitUnreadCount(currentUserId.toString(), unreadCount);

  res.json({
    message: "Messages marked as read",
    modifiedCount: result.modifiedCount,
  });
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = asyncHandler(async (req: any, res: any) => {
  const { messageId } = req.params;
  const currentUserId = req.user._id;

  const message = await Message.findById(messageId);

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
