import { Router } from "express";
import {
  generateWorkspaceKnowledge,
  getWorkspaceKnowledge
} from "../controllers/workspace-knowledge.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";

export const workspaceKnowledgeRouter = Router();

workspaceKnowledgeRouter.use(authMiddleware);
workspaceKnowledgeRouter.get("/:repositoryId/workspace-knowledge", asyncHandler(getWorkspaceKnowledge));
workspaceKnowledgeRouter.post("/:repositoryId/workspace-knowledge/generate", asyncHandler(generateWorkspaceKnowledge));


