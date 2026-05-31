import express from "express";
import passport from "../config/passport";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  verifyEmail,
  googleCallback,
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Email / password auth
router.post("/register", register);
router.post("/login",    login);
router.get("/me",        protect, getMe);

// Password reset
router.post("/forgot-password",        forgotPassword);
router.put("/reset-password/:token",   resetPassword);

// Email verification
router.get("/verify-email/:token", verifyEmail);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL || "https://senior-frontend-eta.vercel.app"}/login?error=google_failed`, session: false }),
  googleCallback
);

export default router;
