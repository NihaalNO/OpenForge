import { Router } from "express";
import {
  analyzeRepository,
  generateContributionPlan,
  generateLearningRoadmap,
  listAiLogs
} from "../controllers/ai.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const aiRouter = Router();

aiRouter.use(authMiddleware);
aiRouter.post("/repository/:repositoryId/analyze", asyncHandler(analyzeRepository));
aiRouter.post("/learning-roadmap/generate", asyncHandler(generateLearningRoadmap));
aiRouter.post("/contribution-plan/generate", asyncHandler(generateContributionPlan));
aiRouter.get("/logs", asyncHandler(listAiLogs));
