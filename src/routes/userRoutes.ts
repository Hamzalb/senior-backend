// userRoutes.ts

import express from "express";
import { getUserProfile, updateProfile, getUserById, getAllUsers } from "../controllers/userController";
import { protect } from "../middleware/authMiddleware"; // Assuming correct path

const router = express.Router();

// Get all users for messaging directory (must be before /:userId)
router.get("/", protect, getAllUsers);

// Define /profile route SECOND
router.route("/profile").get(protect, getUserProfile);

// Get user by ID (for chat, notifications, etc.)
router.get("/:userId", protect, getUserById);

router.put("/update-profile", protect, updateProfile);

export default router;
