import { Router } from "express";
import {
  getDashboard,
  getDashboardAnalytics,
  getSavedRepositories
} from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);
dashboardRouter.get("/", asyncHandler(getDashboard));
dashboardRouter.get("/analytics", asyncHandler(getDashboardAnalytics));
dashboardRouter.get("/saved-repositories", asyncHandler(getSavedRepositories));
