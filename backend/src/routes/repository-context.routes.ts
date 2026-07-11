import { Router } from "express";
import { getRepositoryContext } from "../controllers/repository-context.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authMiddleware } from "../middleware/auth.js";
import { mentorHistory,mentorQuery,prepareWorkspace,regenerateModule,workspaceContext,workspaceModule,workspaceModuleDebug,workspaceStatus } from "../controllers/workspace.controller.js";

export const repositoryContextRouter = Router();

repositoryContextRouter.use(authMiddleware);
repositoryContextRouter.get("/:repositoryId/context", asyncHandler(getRepositoryContext));
repositoryContextRouter.post("/:repositoryId/workspace/prepare",asyncHandler(prepareWorkspace));
repositoryContextRouter.get("/:repositoryId/workspace/status",asyncHandler(workspaceStatus));
repositoryContextRouter.get("/:repositoryId/workspace/context",asyncHandler(workspaceContext));
repositoryContextRouter.get("/:repositoryId/workspace/modules/:moduleType",asyncHandler(workspaceModule));
repositoryContextRouter.get("/:repositoryId/workspace/modules/:moduleType/debug",asyncHandler(workspaceModuleDebug));
repositoryContextRouter.post("/:repositoryId/workspace/modules/:moduleType/regenerate",asyncHandler(regenerateModule));
repositoryContextRouter.post("/:repositoryId/workspace/mentor/query",asyncHandler(mentorQuery));
repositoryContextRouter.get("/:repositoryId/workspace/mentor/history",asyncHandler(mentorHistory));



