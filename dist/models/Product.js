"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const itemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        enum: [
            "Electronics",
            "Clothing",
            "Books",
            "Toys",
            "Home",
            "Automobiles",
            "Other",
        ],
        default: "Other",
    },
    price: {
        type: Number,
        required: false,
        min: 0,
        default: 0,
    },
    images: [String],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
itemSchema.index({ isAvailable: 1, createdAt: -1 });
itemSchema.index({ category: 1, isAvailable: 1 });
itemSchema.index({ owner: 1 });
const Item = mongoose.model("Item", itemSchema);
exports.default = Item;
