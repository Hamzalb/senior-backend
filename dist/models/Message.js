"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Message.ts
const mongoose_1 = __importDefault(require("mongoose"));
const messageSchema = new mongoose_1.default.Schema({
    sender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    recipient: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Item",
    },
    requestedProductId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Item",
    },
    barterId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Barter",
    },
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
messageSchema.statics.getConversation = function (userId1, userId2, options = {}) {
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
messageSchema.statics.getConversations = async function (userId) {
    const messages = await this.aggregate([
        {
            $match: {
                $or: [{ sender: new mongoose_1.default.Types.ObjectId(userId) }, { recipient: new mongoose_1.default.Types.ObjectId(userId) }],
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$sender", new mongoose_1.default.Types.ObjectId(userId)] },
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
                                    { $eq: ["$recipient", new mongoose_1.default.Types.ObjectId(userId)] },
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
    const User = mongoose_1.default.model("User");
    const userIds = messages.map((m) => m._id);
    const users = await User.find({ _id: { $in: userIds } }).select("username email");
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    return messages.map((m) => ({
        user: userMap.get(m._id.toString()),
        lastMessage: m.lastMessage,
        unreadCount: m.unreadCount,
    }));
};
// Static method to get unread count
messageSchema.statics.getUnreadCount = function (recipientId) {
    return this.countDocuments({ recipient: recipientId, isRead: false });
};
const Message = mongoose_1.default.model("Message", messageSchema);
exports.default = Message;
