// models/Notification.ts
import mongoose from "mongoose";

export type NotificationType = 
  | "barter_request" 
  | "barter_approved" 
  | "barter_declined"
  | "message";

export interface INotification extends mongoose.Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  barterId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  productOfferedId?: mongoose.Types.ObjectId;
  productRequestedId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationModel extends mongoose.Model<INotification> {
  getUnreadCount(recipientId: string): Promise<number>;
}

const notificationSchema = new mongoose.Schema<INotification, NotificationModel>({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Index for faster queries by recipient
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["barter_request", "barter_approved", "barter_declined", "message"],
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  barterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Barter",
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  productOfferedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  productRequestedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true, // Index for unread count queries
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // Index for sorting by date
  },
});

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(recipientId: string): Promise<number> {
  return this.countDocuments({ recipient: recipientId, isRead: false });
};

const Notification = mongoose.model<INotification, NotificationModel>("Notification", notificationSchema);

export default Notification;
