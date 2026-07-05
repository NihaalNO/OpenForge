import { Router } from "express";
import { getRepositoryContext } from "../controllers/repository-context.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const repositoryContextRouter = Router();

repositoryContextRouter.use(authMiddleware);
repositoryContextRouter.get("/:repositoryId/context", asyncHandler(getRepositoryContext));



