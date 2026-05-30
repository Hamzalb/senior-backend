"use strict";
// backend/controllers/barterController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyBarters = exports.getBarterById = exports.decideBarter = exports.initiateBarter = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const Barter_1 = __importDefault(require("../models/Barter"));
const notificationController_1 = require("./notificationController");
const socket_1 = require("../socket");
const Notification_1 = __importDefault(require("../models/Notification"));
// @desc    Initiate a barter request
// @route   POST /api/barter/initiate
// @access  Private (Protected) - requires a valid token via protect middleware
const initiateBarter = (0, express_async_handler_1.default)(async (req, res) => {
    // 1) Ensure user is authenticated
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    const { productIdToBarterFor, productOfferedId, offeredProductPrice, requestedProductPrice } = req.body;
    // 2) Basic validation of IDs
    if (!productIdToBarterFor || !productOfferedId) {
        res.status(400);
        throw new Error("Missing product IDs in request body");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(productIdToBarterFor) ||
        !mongoose_1.default.Types.ObjectId.isValid(productOfferedId)) {
        res.status(400);
        throw new Error("Invalid product ID format");
    }
    // 3) Load the "offered" product from the database
    const productOffered = await Product_1.default.findById(productOfferedId);
    if (!productOffered) {
        res.status(404);
        throw new Error("Product you offered for barter not found");
    }
    // Verify ownership
    if (productOffered.owner.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("You do not own the product you are offering for barter");
    }
    // 4) Load the "requested" product (the one we want to barter for), and populate its owner
    const productToBarterFor = await Product_1.default.findById(productIdToBarterFor).populate("owner");
    if (!productToBarterFor) {
        res.status(404);
        throw new Error("The product you want to barter for was not found");
    }
    // 5) ENSURE CATEGORIES MATCH
    if (productOffered.category !== productToBarterFor.category) {
        res.status(400);
        throw new Error("Both products must be in the same category to barter");
    }
    // 6) Ensure user is not trying to barter for their own product
    const otherUser = productToBarterFor.owner;
    if (otherUser && otherUser._id.toString() === req.user._id.toString()) {
        res.status(400);
        throw new Error("You cannot initiate a barter request for your own product");
    }
    // 7) Now we can create the Barter document with prices
    const barter = await Barter_1.default.create({
        productOfferedId,
        productRequestedId: productIdToBarterFor,
        offeredBy: req.user._id,
        requestedFrom: otherUser._id,
        offeredProductPrice: offeredProductPrice || 0,
        requestedProductPrice: requestedProductPrice || 0,
        status: "pending",
    });
    // 8) Create in-app notification for the product owner
    const notification = await (0, notificationController_1.createNotification)({
        recipientId: otherUser._id.toString(),
        senderId: req.user._id.toString(),
        type: "barter_request",
        title: "New Replacement Request!",
        message: `${req.user.username || "Someone"} wants to swap their "${productOffered.title}" for your "${productToBarterFor.title}"`,
        barterId: barter._id.toString(),
        productId: productToBarterFor._id.toString(),
        productOfferedId: productOffered._id.toString(),
        productRequestedId: productToBarterFor._id.toString(),
    });
    // 9) Emit real-time notification via Socket.io
    if (notification) {
        (0, socket_1.emitNotification)(otherUser._id.toString(), notification);
        // Also emit updated unread count
        const unreadCount = await Notification_1.default.getUnreadCount(otherUser._id.toString());
        (0, socket_1.emitUnreadCount)(otherUser._id.toString(), unreadCount);
    }
    // 10) Populate barter with user info for response
    const populatedBarter = await Barter_1.default.findById(barter._id)
        .populate("productOfferedId", "title images category price")
        .populate("productRequestedId", "title images category price")
        .populate("offeredBy", "username email _id")
        .populate("requestedFrom", "username email _id");
    // 11) Respond with success - include full barter info for chat integration
    res.status(200).json({
        message: "Replacement request sent successfully. The product owner has been notified.",
        barterId: barter._id,
        barter: populatedBarter,
    });
});
exports.initiateBarter = initiateBarter;
// @desc    Decide on a barter request (approve or decline)
// @route   PUT /api/barter/:barterId/decide
// @access  Private
const decideBarter = (0, express_async_handler_1.default)(async (req, res) => {
    const { barterId } = req.params;
    const { decision } = req.body; // expects "approved" or "declined"
    // 1) Validate incoming decision value
    if (!["approved", "declined"].includes(decision)) {
        res.status(400);
        throw new Error("Invalid decision value. Must be 'approved' or 'declined'.");
    }
    // 2) Fetch the barter by ID, populating products and both users
    const barter = await Barter_1.default.findById(barterId)
        .populate("productOfferedId")
        .populate("productRequestedId")
        .populate("offeredBy", "username email _id")
        .populate("requestedFrom", "username email _id");
    if (!barter) {
        res.status(404);
        throw new Error("Barter not found.");
    }
    // 3) Update item availability if approved, and set barter.status
    if (decision === "approved") {
        await Product_1.default.findByIdAndUpdate(barter.productOfferedId._id, {
            isAvailable: false,
        });
        await Product_1.default.findByIdAndUpdate(barter.productRequestedId._id, {
            isAvailable: false,
        });
        barter.status = "approved";
    }
    else {
        // decision === "declined"
        barter.status = "declined";
    }
    // 4) Save the updated barter document
    await barter.save();
    // 5) Create notification for the barter initiator
    const initiator = barter.offeredBy;
    const approver = barter.requestedFrom;
    const notificationType = decision === "approved" ? "barter_approved" : "barter_declined";
    const notificationTitle = decision === "approved" ? "Barter Approved!" : "Barter Declined";
    const notificationMessage = decision === "approved"
        ? `Your barter request for "${barter.productRequestedId.title}" has been approved by ${approver.username}!`
        : `Your barter request for "${barter.productRequestedId.title}" was declined by ${approver.username}.`;
    const notification = await (0, notificationController_1.createNotification)({
        recipientId: initiator._id.toString(),
        senderId: approver._id.toString(),
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        barterId: barter._id.toString(),
        productId: barter.productRequestedId._id.toString(),
        productOfferedId: barter.productOfferedId._id.toString(),
        productRequestedId: barter.productRequestedId._id.toString(),
    });
    // 6) Emit real-time notification via Socket.io
    if (notification) {
        (0, socket_1.emitNotification)(initiator._id.toString(), notification);
        const unreadCount = await Notification_1.default.getUnreadCount(initiator._id.toString());
        (0, socket_1.emitUnreadCount)(initiator._id.toString(), unreadCount);
    }
    // 7) Re-fetch the barter so it's fully populated for the response
    const populatedBarter = await Barter_1.default.findById(barter._id)
        .populate("productOfferedId")
        .populate("productRequestedId")
        .populate("offeredBy", "username email")
        .populate("requestedFrom", "username email");
    // 8) Send the final JSON response
    res.json({ message: `Barter ${decision}.`, barter: populatedBarter });
});
exports.decideBarter = decideBarter;
// @desc    Get barter by ID
// @route   GET /api/barter/:barterId
// @access  Private
const getBarterById = (0, express_async_handler_1.default)(async (req, res) => {
    const { barterId } = req.params;
    const barter = await Barter_1.default.findById(barterId)
        .populate("productOfferedId")
        .populate("productRequestedId")
        .populate("offeredBy")
        .populate("requestedFrom");
    if (!barter) {
        res.status(404);
        throw new Error("Barter not found");
    }
    res.json(barter);
});
exports.getBarterById = getBarterById;
// @desc    Get all barters for a user (incoming and outgoing)
// @route   GET /api/barter/my-barters
// @access  Private
const getMyBarters = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    // Barters where user is the initiator (offeredBy)
    const outgoingBarters = await Barter_1.default.find({ offeredBy: req.user._id })
        .populate("productOfferedId")
        .populate("productRequestedId")
        .populate("requestedFrom", "username email")
        .sort({ createdAt: -1 });
    // Barters where user is the recipient (requestedFrom)
    const incomingBarters = await Barter_1.default.find({ requestedFrom: req.user._id })
        .populate("productOfferedId")
        .populate("productRequestedId")
        .populate("offeredBy", "username email")
        .sort({ createdAt: -1 });
    res.json({
        outgoing: outgoingBarters,
        incoming: incomingBarters,
    });
});
exports.getMyBarters = getMyBarters;
