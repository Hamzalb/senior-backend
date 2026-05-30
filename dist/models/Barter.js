"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Barter.ts
const mongoose_1 = __importDefault(require("mongoose"));
const barterSchema = new mongoose_1.default.Schema({
    productOfferedId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
    },
    productRequestedId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
    },
    offeredBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    requestedFrom: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    offeredProductPrice: {
        type: Number,
        required: false,
        min: 0,
        default: 0,
    },
    requestedProductPrice: {
        type: Number,
        required: false,
        min: 0,
        default: 0,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "declined"],
        default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
});
barterSchema.index({ offeredBy: 1, createdAt: -1 });
barterSchema.index({ requestedFrom: 1, createdAt: -1 });
barterSchema.index({ status: 1 });
exports.default = mongoose_1.default.model("Barter", barterSchema);
