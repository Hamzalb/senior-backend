"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const barterController_1 = require("../controllers/barterController");
const router = express_1.default.Router();
router.post("/initiate", authMiddleware_1.protect, barterController_1.initiateBarter);
router.get("/my-barters", authMiddleware_1.protect, barterController_1.getMyBarters);
router.get("/:barterId", authMiddleware_1.protect, barterController_1.getBarterById);
router.patch("/:barterId/decision", authMiddleware_1.protect, barterController_1.decideBarter);
exports.default = router;
