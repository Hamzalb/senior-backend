// models/Message.ts
import mongoose from "mongoose";

export interface IMessage extends mongoose.Document {
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  content: string;
  imageUrl?: string;
  messageType: 'text' | 'trade_request' | 'image';
  offeredProductId?: mongoose.Types.ObjectId;
  requestedProductId?: mongoose.Types.ObjectId;
  barterId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

interface MessageModel extends mongoose.Model<IMessage> {
  getConversation(userId1: string, userId2: string, options?: { limit?: number; skip?: number }): Promise<IMessage[]>;
  getConversations(userId: string): Promise<any[]>;
  getUnreadCount(recipientId: string): Promise<number>;
}

const messageSchema = new mongoose.Schema<IMessage, MessageModel>({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true,
  },
  imageUrl: {
    type: String,
    default: undefined,
  },
  messageType: {
    type: String,
    enum: ['text', 'trade_request', 'image'],
    default: 'text',
  },
  offeredProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  requestedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  barterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Barter",
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound indexes for efficient queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(
  userId1: string,
  userId2: string,
  options: { limit?: number; skip?: number } = {}
): Promise<IMessage[]> {
  const { limit = 50, skip = 0 } = options;
  return this.find({
    $or: [
      { sender: userId1, recipient: userId2 },
      { sender: userId2, recipient: userId1 },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "username email")
    .populate("recipient", "username email");
};

// Static method to get all conversations for a user
messageSchema.statics.getConversations = async function(userId: string): Promise<any[]> {
  const messages = await this.aggregate([
    {
      $match: {
        $or: [{ sender: new mongoose.Types.ObjectId(userId) }, { recipient: new mongoose.Types.ObjectId(userId) }],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
            "$recipient",
            "$sender",
          ],
        },
        lastMessage: { $first: "$$ROOT" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$recipient", new mongoose.Types.ObjectId(userId)] },
                  { $eq: ["$isRead", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { "lastMessage.createdAt": -1 },
    },
  ]);

  // Populate the user data for each conversation
  await this.populate(messages, {
    path: "lastMessage.sender",
    select: "username email",
  });
  await this.populate(messages, {
    path: "lastMessage.recipient",
    select: "username email",
  });

  // Populate the _id field (the other user in the conversation)
  const User = mongoose.model("User");
  const userIds = messages.map((m: any) => m._id);
  const users = await User.find({ _id: { $in: userIds } }).select("username email");

  const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

  return messages.map((m: any) => ({
    user: userMap.get(m._id.toString()),
    lastMessage: m.lastMessage,
    unreadCount: m.unreadCount,
  }));
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = function(recipientId: string): Promise<number> {
  return this.countDocuments({ recipient: recipientId, isRead: false });
};

const Message = mongoose.model<IMessage, MessageModel>("Message", messageSchema);

export default Message;
