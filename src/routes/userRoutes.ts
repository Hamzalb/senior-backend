// userRoutes.ts

import express from "express";
import { getUserProfile, updateProfile, getUserById, getAllUsers } from "../controllers/userController";
import { protect } from "../middleware/authMiddleware"; // Assuming correct path

const router = express.Router();

router.get("/", protect, getAllUsers);
router.get("/profile", protect, getUserProfile);
router.put("/update-profile", protect, updateProfile);
router.get("/:userId", protect, getUserById);

export default router;
