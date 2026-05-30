import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendMail";

const FRONTEND_URL = "https://senior-frontend-eta.vercel.app";

export const register = async (req: any, res: any) => {
  const { username, email, password } = req.body;

  try {
    // 1) Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 2) Create & save (pre('save') hook will hash the password once)
    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err: any) {
    console.error("❌ Registration error:", err);
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
};

export const login = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    // 1) Lookup user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // 2) Compare plain vs hashed (schema hook already ran at registration)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3) Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    // 4) Respond
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const forgotPassword = async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Please provide an email");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("No user found with that email");
  }

  // 1) generate a random token (not saved to DB yet)
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2) hash it and set to resetPasswordToken field
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  await user.save({ validateBeforeSave: false });

  // 3) build reset URL (client‐side route)
  const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
  console.log("Password reset token (dev only):", resetToken);
  console.log("Password reset URL (dev only):", resetUrl);

  // 4) email text
  const message = `You requested a password reset. Click or copy/paste the link below into your browser within 15 minutes:\n\n${resetUrl}\n\nIf you didn't request this, please ignore.`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password reset request",
      text: message,
    });
    res.status(200).json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("Error sending reset email:", err);
    // if email fails, clear the reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error("Email could not be sent");
  }
};

export const resetPassword = async (req: any, res: any) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) {
    res.status(400);
    throw new Error("Please provide a new password");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Token is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated" });
};

export const getMe = async (req: any, res: any) => {
  try {
    // The authMiddleware attaches the user to req.user
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    });
  } catch (err: any) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
