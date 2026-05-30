// --- Imports ---
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import barterRoutes from "./routes/barterRoutes";
import productRoutes from "./routes/productRoutes";
import adminRoutes from "./routes/adminRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import messageRoutes from "./routes/messageRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import Category from "./models/Category";
import User from "./models/User";
import Item from "./models/Product";
import Barter from "./models/Barter";
import { notFound, errorHandler } from "./middleware/errorMiddleware";
import { initSocket } from "./socket";

dotenv.config();
const app = express();
const httpServer = createServer(app);
// --- Middleware Setup ---
const FRONTEND_URLS = [
  "https://senior-frontend-master.vercel.app",
  "https://senior-frontend-eta.vercel.app",
  "https://senior-frontend-murex.vercel.app",
  "https://senior-frontend-git-main-hamzalbs-projects.vercel.app",
  "http://localhost:3000",
  "http://localhost:5050",
  "http://192.168.1.108:3000",
  "http://192.168.1.108:5050",
];

app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      // allow requests with no origin (mobile apps, curl, Postman)
      if (!incomingOrigin) return callback(null, true);

      // allow any local network IP (192.168.x.x or 10.x.x.x) for development
      const isLocalNetwork = /^http:\/\/(192\.168\.|10\.)[\d.]+:\d+$/.test(incomingOrigin);
      // allow all vercel preview deployments for this project
      const isVercelPreview = /^https:\/\/senior-frontend[^.]*\.vercel\.app$/.test(incomingOrigin);
      if (FRONTEND_URLS.includes(incomingOrigin) || isLocalNetwork || isVercelPreview) {
        callback(null, incomingOrigin);
      } else {
        callback(
          new Error(`CORS policy: origin ${incomingOrigin} not allowed`),
          false
        );
      }
    },
    credentials: true, // send Access-Control-Allow-Credentials: true
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      // send Access-Control-Allow-Headers
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Health Check Route ---
app.get("/", (req, res) => {
  res.send("Backend is running ✨");
});

// --- Public Stats (no auth) ---
app.get("/api/stats", async (_req, res) => {
  try {
    const [users, approvedBarters, totalBarters, categoryStats] = await Promise.all([
      User.countDocuments(),
      Barter.countDocuments({ status: "approved" }),
      Barter.countDocuments(),
      Item.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    res.json({
      users,
      approvedBarters,
      totalBarters,
      productsByCategory: categoryStats.map((c: any) => ({
        category: c._id ?? "Unknown",
        count: c.count,
      })),
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// 3) Your routes (MUST come *after* the static line)
app.use("/api/barter", barterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/categories", categoryRoutes);

// 4) Error handlers
app.use(notFound);
app.use(errorHandler);

// --- MongoDB Connection & Server Start ---
const PORT = Number(process.env.PORT) || 5001;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(async () => {
    console.log("✅ MongoDB connected");

    // Mark all built-in categories as isDefault: true
    const DEFAULT_CATEGORIES = ["Electronics", "Clothing", "Books", "Toys", "Home", "Automobiles", "Other"];
    const result = await Category.updateMany(
      { name: { $in: DEFAULT_CATEGORIES } },
      { $set: { isDefault: true } }
    );
    console.log(`✅ Marked ${result.modifiedCount} categories as built-in`);

    // Initialize Socket.io
    initSocket(httpServer);
    console.log("🔌 Socket.io initialized");
    
    // Start server with HTTP server (required for Socket.io)
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err: any) => console.error("❌ MongoDB connection error:", err));
