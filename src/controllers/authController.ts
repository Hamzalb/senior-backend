import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendMail";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "https://senior-frontend-eta.vercel.app";

// ── helpers ────────────────────────────────────────────────────────────────

function signToken(userId: string, role: string) {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

// ── register ───────────────────────────────────────────────────────────────

export const register = async (req: any, res: any) => {
  const { username, email, password } = req.body;

  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Generate verification token
    const rawToken   = crypto.randomBytes(32).toString("hex");
    const hashedTok  = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    const newUser = new User({
      username,
      email,
      password,
      emailVerificationToken:  hashedTok,
      emailVerificationExpire: expireDate,
    });
    await newUser.save();

    // Send verification email (best-effort — don't fail registration if it errors)
    const verifyUrl = `${FRONTEND_URL}/verify-email/${rawToken}`;
    try {
      await sendEmail({
        to:      email,
        subject: "Verify your Dakesh account",
        text:    `Welcome to Dakesh!\n\nVerify your email here:\n${verifyUrl}\n\nLink expires in 24 hours.`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#0f0f18;color:#f1f1f1;border-radius:16px">
            <h2 style="color:#c084fc;margin-bottom:8px">Verify your Dakesh account</h2>
            <p style="color:#cbd5e1">Hi <strong>${username}</strong>, click the button below to confirm your email address.</p>
            <a href="${verifyUrl}"
               style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-weight:600;border-radius:10px;text-decoration:none">
              Verify Email
            </a>
            <p style="font-size:13px;color:#94a3b8">This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.</p>
          </div>`,
      });
    } catch {
      // non-fatal — user still registered
    }

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err: any) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

// ── verify email ───────────────────────────────────────────────────────────

export const verifyEmail = async (req: any, res: any) => {
  const { token } = req.params;
  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken:  hashed,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Verification link is invalid or has expired" });
  }

  user.isVerified              = true;
  user.emailVerificationToken  = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: "Email verified successfully!" });
};

// ── login ──────────────────────────────────────────────────────────────────

export const login = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(String(user._id), user.role);

    res.status(200).json({
      token,
      user: {
        id:         user._id,
        username:   user.username,
        email:      user.email,
        role:       user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── Google OAuth callback ──────────────────────────────────────────────────

export const googleCallback = async (req: any, res: any) => {
  const user = req.user;
  if (!user) {
    return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
  }

  const token = signToken(String(user._id), user.role);

  const params = new URLSearchParams({
    token,
    username: user.username,
    role:     user.role,
    userId:   String(user._id),
  });

  res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
};

// ── forgot password ────────────────────────────────────────────────────────

export const forgotPassword = async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Please provide an email" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "No user found with that email" });
  }

  const resetToken  = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.resetPasswordToken  = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to:      user.email,
      subject: "Dakesh — password reset request",
      text:    `You requested a password reset.\n\nClick or paste this link in your browser (expires in 15 minutes):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#0f0f18;color:#f1f1f1;border-radius:16px">
          <h2 style="color:#c084fc;margin-bottom:8px">Reset your password</h2>
          <p style="color:#cbd5e1">Hi <strong>${user.username}</strong>, we received a request to reset your password.</p>
          <a href="${resetUrl}"
             style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-weight:600;border-radius:10px;text-decoration:none">
            Reset Password
          </a>
          <p style="font-size:13px;color:#94a3b8">This link expires in 15 minutes. If you didn't request a reset, you can ignore this email.</p>
        </div>`,
    });
    res.status(200).json({ success: true, message: "Reset link sent to your email" });
  } catch {
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ message: "Email could not be sent. Check email config." });
  }
};

// ── reset password ─────────────────────────────────────────────────────────

export const resetPassword = async (req: any, res: any) => {
  const { token }    = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Please provide a new password" });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken:  hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Token is invalid or has expired" });
  }

  user.password            = password;
  user.resetPasswordToken  = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated successfully" });
};

// ── get me ─────────────────────────────────────────────────────────────────

export const getMe = async (req: any, res: any) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    res.status(200).json({
      id:         user._id,
      username:   user.username,
      email:      user.email,
      role:       user.role,
      avatar:     user.avatar,
      isVerified: user.isVerified,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
