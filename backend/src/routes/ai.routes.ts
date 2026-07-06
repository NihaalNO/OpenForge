import { Router } from "express";
import {
  generateLearningRoadmap
} from "../controllers/ai.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const aiRouter = Router();

aiRouter.use(authMiddleware);
aiRouter.post("/learning-roadmap/generate", asyncHandler(generateLearningRoadmap));

