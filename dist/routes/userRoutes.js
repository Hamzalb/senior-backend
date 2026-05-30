"use strict";
// userRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming correct path
const router = express_1.default.Router();
// Get all users for messaging directory (must be before /:userId)
router.get("/", authMiddleware_1.protect, userController_1.getAllUsers);
// Define /profile route SECOND
router.route("/profile").get(authMiddleware_1.protect, userController_1.getUserProfile);
// Get user by ID (for chat, notifications, etc.)
router.get("/:userId", authMiddleware_1.protect, userController_1.getUserById);
router.put("/update-profile", authMiddleware_1.protect, userController_1.updateProfile);
exports.default = router;
