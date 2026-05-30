"use strict";
// productsController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductsByUser = exports.getUserProducts = exports.getProductById = exports.addProduct = exports.getProducts = exports.updateProduct = exports.deleteProduct = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Product_1 = __importDefault(require("../models/Product"));
const supabase_1 = require("../utils/supabase"); // your Supabase client
const uuid_1 = require("uuid");
const getProducts = (0, express_async_handler_1.default)(async (req, res) => {
    const { category, page = "1", limit = "12" } = req.query;
    const filter = { isAvailable: true };
    if (category && category !== "All") {
        filter.category = category;
    }
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const [products, total] = await Promise.all([
        Product_1.default.find(filter)
            .populate("owner", "username")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Product_1.default.countDocuments(filter),
    ]);
    res.status(200).json({
        products,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
    });
});
exports.getProducts = getProducts;
const getProductById = (0, express_async_handler_1.default)(async (req, res) => {
    console.log(req.params.id);
    const product = await Product_1.default.findById(req.params.id).populate("owner", "username");
    if (product) {
        res.status(200).json(product);
    }
    else {
        res.status(404);
        throw new Error("Product Not Found");
    }
});
exports.getProductById = getProductById;
const addProduct = (0, express_async_handler_1.default)(async (req, res) => {
    const { title, description, category, price } = req.body;
    if (!title) {
        res.status(400);
        throw new Error("Title is required");
    }
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    if (!req.file || !req.file.buffer) {
        res.status(400);
        throw new Error("Image file is required");
    }
    // 1) Create a unique filename for Supabase
    const originalName = req.file.originalname; // e.g. "photo.jpg"
    const ext = originalName.substring(originalName.lastIndexOf(".") + 1); // "jpg"
    const uuidName = `${(0, uuid_1.v4)()}.${ext}`; // e.g. "a1b2c3d4-...-xyz.jpg"
    const supabasePath = `products/${uuidName}`;
    // 2) Upload buffer to Supabase Storage bucket called "sineor"
    const { data: uploadData, error: uploadError } = await supabase_1.supabaseAdmin.storage
        .from("sineor")
        .upload(supabasePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: "public, max-age=31536000",
        upsert: false,
    });
    if (uploadError) {
        console.error("🛑 Supabase upload error:", uploadError);
        res.status(500);
        throw new Error("Failed to upload image to Supabase Storage");
    }
    // 3) Retrieve the public URL from Supabase
    const { data } = supabase_1.supabaseAdmin.storage
        .from("sineor")
        .getPublicUrl(supabasePath);
    // NOTE: there is no “error” returned by getPublicUrl in the latest typings;
    //       instead you get “data.publicUrl.”
    const publicUrl = data.publicUrl; // <-- THIS is how you access the URL.
    if (!publicUrl) {
        console.error("⚠️ Supabase getPublicUrl returned no URL (data.publicUrl is falsy)");
        res.status(500);
        throw new Error("Could not retrieve public URL for uploaded image");
    }
    // 4) Save the new Product into MongoDB, storing the Supabase URL
    const item = new Product_1.default({
        title,
        description,
        category,
        images: [publicUrl], // store the full Supabase public URL string
        owner: req.user._id,
        isAvailable: true,
        price: price ? parseFloat(price) : 0,
    });
    const createdItem = await item.save();
    res.status(201).json(createdItem);
});
exports.addProduct = addProduct;
const getUserProducts = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        if (!req.user?._id) {
            res.status(401);
            throw new Error("User not authenticated");
        }
        const products = await Product_1.default.find({ owner: req.user._id })
            .populate("owner", "username")
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json(products);
    }
    catch (error) {
        throw error;
    }
});
exports.getUserProducts = getUserProducts;
const getProductsByUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.params;
    const products = await Product_1.default.find({ owner: userId, isAvailable: true })
        .populate("owner", "username")
        .sort({ createdAt: -1 })
        .lean();
    res.status(200).json(products);
});
exports.getProductsByUser = getProductsByUser;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product_1.default.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product deleted successfully" });
    }
    catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteProduct = deleteProduct;
// Update product - only owner can update
exports.updateProduct = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { title, description, category, isAvailable, price } = req.body;
    // Check if user is authenticated
    if (!req.user?._id) {
        res.status(401);
        throw new Error("User not authenticated");
    }
    // Find the product
    const product = await Product_1.default.findById(id);
    if (!product) {
        res.status(404);
        throw new Error("Product not found");
    }
    // Check if the user is the owner of the product
    if (product.owner.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("You are not authorized to update this product");
    }
    // Update fields
    if (title !== undefined)
        product.title = title;
    if (description !== undefined)
        product.description = description;
    if (category !== undefined)
        product.category = category;
    if (isAvailable !== undefined)
        product.isAvailable = isAvailable;
    if (price !== undefined) {
        const parsedPrice = parseFloat(price);
        product.price = isNaN(parsedPrice) ? 0 : parsedPrice;
    }
    const updatedProduct = await product.save();
    res.status(200).json(updatedProduct);
});
