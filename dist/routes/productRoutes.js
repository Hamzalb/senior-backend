"use strict";
// productRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productsController_1 = require("../controllers/productsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddlware_1 = require("../middleware/uploadMiddlware");
const router = express_1.default.Router();
router.get("/", productsController_1.getProducts);
router.get("/my-products", authMiddleware_1.protect, productsController_1.getUserProducts);
router.get("/user/:userId", productsController_1.getProductsByUser);
router.post("/", authMiddleware_1.protect, uploadMiddlware_1.upload.single("image"), productsController_1.addProduct);
router.put("/:id", authMiddleware_1.protect, productsController_1.updateProduct);
router.delete("/:id", authMiddleware_1.protect, productsController_1.deleteProduct);
router.get("/:id", productsController_1.getProductById);
exports.default = router;
