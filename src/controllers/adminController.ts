import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Product from "../models/Product";

// @desc Get all users
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = "1", limit = "50" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find({}).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    User.countDocuments({}),
  ]);

  res.json({ users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

// @desc Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc Get user by ID
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc Create user (admin)
export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error("Username, email and password are required");
  }

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) {
    res.status(400);
    throw new Error("A user with that email or username already exists");
  }

  const user = await User.create({ username, email, password, role: role || "customer" });
  const { password: _pw, ...userWithoutPassword } = user.toObject();
  res.status(201).json(userWithoutPassword);
});

// @desc Update user
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    if (req.body.role) user.role = req.body.role;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    const { password: _pw, ...userWithoutPassword } = updatedUser.toObject();
    res.json(userWithoutPassword);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export const getAllProducts = asyncHandler(async (req, res) => {
  const { page = "1", limit = "50" } = req.query;
  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find({})
      .select("title category price images owner isAvailable createdAt")
      .populate("owner", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments({}),
  ]);

  res.json({ products, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});
