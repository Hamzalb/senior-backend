import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware";
import {
  decideBarter,
  getBarterById,
  initiateBarter,
  getMyBarters,
} from "../controllers/barterController";

const router = express.Router();

router.post("/initiate", protect, initiateBarter);
router.get("/my-barters", protect, getMyBarters);
router.get("/:barterId", protect, getBarterById);
router.patch("/:barterId/decision", protect, decideBarter);

export default router;
