// productRoutes.ts

import express from "express";
import {
  getProducts,
  addProduct,
  getProductById,
  getUserProducts,
  getProductsByUser,
  deleteProduct,
  updateProduct,
} from "../controllers/productsController";
import { protect } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddlware";

const router = express.Router();
router.get("/", getProducts);
router.get("/my-products", protect, getUserProducts);
router.get("/user/:userId", getProductsByUser);
router.post("/", protect, upload.single("image"), addProduct);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);
router.get("/:id", getProductById);

export default router;
