"use strict";
// authMiddleware.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
//   let token;
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       token = req.headers.authorization.split(" ")[1];
//       interface MyJwtPayload extends jwt.JwtPayload {
//         id: string;
//       }
//       const decoded = jwt.verify(
//         token,
//         process.env.JWT_SECRET as string
//       ) as MyJwtPayload;
//       req.user = await User.findById(decoded.id).select("-password");
//       next();
//     } catch (error) {
//       // Removed internal console.error
//       res.status(401);
//       throw new Error("Not authorized");
//     }
//   }
//   if (!token) {
//     res.status(401);
//     throw new Error("Not authorized");
//   }
// });
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("🔐 [protect] authHeader:", req.headers.authorization);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Not authorized, token missing" });
        return;
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.default.findById(decoded.id).select("-password");
        if (!user) {
            res.status(401).json({ message: "Not authorized, user not found" });
            return;
        }
        req.user = user;
        next();
    }
    catch (err) {
        console.error("JWT Verification Error:", err);
        res.status(401).json({ message: "Not authorized, token invalid" });
    }
};
exports.protect = protect;
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    }
    else {
        res.status(403).json({ message: "Not authorized as admin" });
    }
};
exports.isAdmin = isAdmin;
