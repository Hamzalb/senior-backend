"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
const Barter_1 = __importDefault(require("../models/Barter"));
const router = express_1.default.Router();
router.use(authMiddleware_1.protect, authMiddleware_1.isAdmin);
router.get("/stats", async (req, res) => {
    try {
        const usersCount = await User_1.default.countDocuments();
        const productsCount = await Product_1.default.countDocuments();
        const bartersCount = await Barter_1.default.countDocuments({ status: "pending" });
        res.json({
            users: usersCount,
            products: productsCount,
            barters: bartersCount,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
router.delete("/barters", async (req, res) => {
    try {
        const result = await Barter_1.default.deleteMany({});
        res.json({ message: `Cleared ${result.deletedCount} barters` });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to clear barters" });
    }
});
router.get("/barters", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const skip = (page - 1) * limit;
        const [barters, total] = await Promise.all([
            Barter_1.default.find()
                .populate("offeredBy", "username")
                .populate("requestedFrom", "username")
                .populate("productOfferedId", "title")
                .populate("productRequestedId", "title")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Barter_1.default.countDocuments(),
        ]);
        res.json({ barters, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch barters" });
    }
});
router.get("/products", adminController_1.getAllProducts);
router.delete("/product/:id", adminController_1.deleteProduct);
router.get("/users", adminController_1.getAllUsers);
router.get("/:id", adminController_1.getUserById);
router.put("/:id", adminController_1.updateUser);
router.delete("/:id", adminController_1.deleteUser);
exports.default = router;
