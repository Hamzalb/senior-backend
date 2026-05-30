import User from "../models/User";
import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";

// @desc    Get all users for messaging directory
// @route   GET /api/users
// @access  Private
export const getAllUsers = asyncHandler(async (req: any, res: any) => {
  const { search, page = 1, limit = 20 } = req.query;
  const currentUserId = req.user._id;

  // Build query - exclude current user
  const query: any = {
    _id: { $ne: currentUserId }
  };

  // Add search filter if provided
  if (search) {
    query.username = { $regex: search, $options: 'i' };
  }

  // Execute query with pagination
  const users = await User.find(query)
    .select('_id username email role createdAt')
    .sort({ username: 1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await User.countDocuments(query);

  res.json({
    message: 'Users retrieved successfully',
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

export const getUserProfile = asyncHandler(async (req: any, res: any) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.username,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

export const getUserById = asyncHandler(async (req: any, res: any) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("_id username email role");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
});

export const updateProfile = asyncHandler(async (req: any, res) => {
  const userId = req.user._id;
  const { email, oldPassword, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new Error("Old password is incorrect");

  user.email = email || user.email;
  if (newPassword) user.password = await bcrypt.hash(newPassword, 10);

  await user.save();

  res
    .status(200)
    .json({ message: "Profile updated successfully", email: user.email });
});
