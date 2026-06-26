import { Router } from "express";
import {
  completeOnboarding,
  getCurrentAuthenticatedUser,
  getCurrentSession,
  logout
} from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.get("/me", authMiddleware, asyncHandler(getCurrentAuthenticatedUser));
authRouter.get("/session", authMiddleware, getCurrentSession);
authRouter.patch("/onboarding", authMiddleware, asyncHandler(completeOnboarding));
authRouter.post("/logout", authMiddleware, logout);
