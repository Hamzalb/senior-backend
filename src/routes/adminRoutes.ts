import express from "express";
import {
  getAllUsers,
  createUser,
  deleteUser,
  getUserById,
  updateUser,
  getAllProducts,
  deleteProduct,
} from "../controllers/adminController";
import { protect, isAdmin } from "../middleware/authMiddleware";
import User from "../models/User";
import Item from "../models/Product";
import Barter from "../models/Barter";

const router = express.Router();

router.use(protect, isAdmin);
router.get("/stats", async (req, res) => {
  try {
    const [usersCount, productsCount, bartersPending, bartersApproved, bartersDeclined, categoryStats] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments(),
      Barter.countDocuments({ status: "pending" }),
      Barter.countDocuments({ status: "approved" }),
      Barter.countDocuments({ status: "declined" }),
      Item.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    ]);
    res.json({
      users: usersCount,
      products: productsCount,
      barters: bartersPending,
      bartersByStatus: [
        { status: "Pending", count: bartersPending },
        { status: "Approved", count: bartersApproved },
        { status: "Declined", count: bartersDeclined },
      ],
      productsByCategory: categoryStats.map((c: any) => ({ category: c._id ?? "Unknown", count: c.count })),
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
router.delete("/barters", async (req: any, res: any) => {
  try {
    const result = await Barter.deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} barters` });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear barters" });
  }
});

router.get("/barters", async (req: any, res: any) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const skip = (page - 1) * limit;

    const [barters, total] = await Promise.all([
      Barter.find()
        .populate("offeredBy", "username")
        .populate("requestedFrom", "username")
        .populate("productOfferedId", "title")
        .populate("productRequestedId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Barter.countDocuments(),
    ]);

    res.json({ barters, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch barters" });
  }
});
router.get("/products", getAllProducts);
router.delete("/product/:id", deleteProduct);

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
