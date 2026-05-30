// authMiddleware.ts

import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction, RequestHandler } from "express";

interface AuthRequest extends Request {
  user?: any;
}

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

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  console.log("🔐 [protect] authHeader:", req.headers.authorization);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Not authorized, token missing" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({ message: "Not authorized, user not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err);
    res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as admin" });
  }
};
