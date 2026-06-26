import { Router } from "express";
import {
  getGitHubProfile,
  getGitHubRepository,
  listGitHubRepositories,
  listGitHubRepositoryIssues,
  syncGitHub,
  syncGitHubRepositoryIssues
} from "../controllers/github.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const githubRouter = Router();

githubRouter.use(authMiddleware);
githubRouter.get("/profile", asyncHandler(getGitHubProfile));
githubRouter.post("/sync", asyncHandler(syncGitHub));
githubRouter.get("/repositories", asyncHandler(listGitHubRepositories));
githubRouter.get("/repositories/:owner/:repo", asyncHandler(getGitHubRepository));
githubRouter.get("/repositories/:owner/:repo/issues", asyncHandler(listGitHubRepositoryIssues));
githubRouter.post("/repositories/:owner/:repo/issues/sync", asyncHandler(syncGitHubRepositoryIssues));
