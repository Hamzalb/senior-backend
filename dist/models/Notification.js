"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Notification.ts
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    recipient: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true, // Index for faster queries by recipient
    },
    sender: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Barter",
    },
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Item",
    },
    productOfferedId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Item",
    },
    productRequestedId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
notificationSchema.statics.getUnreadCount = function (recipientId) {
    return this.countDocuments({ recipient: recipientId, isRead: false });
};
const Notification = mongoose_1.default.model("Notification", notificationSchema);
exports.default = Notification;
