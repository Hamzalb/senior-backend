// controllers/notificationController.ts
import asyncHandler from "express-async-handler";
import Notification, { NotificationType } from "../models/Notification";
import mongoose from "mongoose";

// @desc    Get all notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req: any, res: any) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "username")
    .populate("barterId")
    .populate("productId", "title images")
    .populate("productOfferedId", "title images")
    .populate("productRequestedId", "title images");

  const total = await Notification.countDocuments({ recipient: req.user._id });
  const unreadCount = await Notification.getUnreadCount(req.user._id);

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

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req: any, res: any) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const count = await Notification.getUnreadCount(req.user._id);
  res.json({ count });
});

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req: any, res: any) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findById(id);

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

  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.json({ 
    message: "Notification marked as read", 
    notification,
    unreadCount 
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req: any, res: any) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({ message: "All notifications marked as read", unreadCount: 0 });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req: any, res: any) => {
  if (!req.user?._id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error("Invalid notification ID");
  }

  const notification = await Notification.findById(id);

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

  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.json({ 
    message: "Notification deleted",
    unreadCount 
  });
});

// @desc    Create a notification (internal use)
// @access  Internal (called by other controllers)
interface CreateNotificationParams {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  title: string;
  message: string;
  barterId?: string;
  productId?: string;
  productOfferedId?: string;
  productRequestedId?: string;
}

const createNotification = async (params: CreateNotificationParams) => {
  const notification = await Notification.create({
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
  const populatedNotification = await Notification.findById(notification._id)
    .populate("sender", "username")
    .populate("barterId")
    .populate("productId", "title images")
    .populate("productOfferedId", "title images")
    .populate("productRequestedId", "title images");

  return populatedNotification;
};

export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
