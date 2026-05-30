import express from "express";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../controllers/categoryController";
import { protect, isAdmin } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", getCategories);
router.post("/", protect, isAdmin, addCategory);
router.put("/:id", protect, isAdmin, updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);

export default router;
