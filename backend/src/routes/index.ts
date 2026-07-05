import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { aiRouter } from "./ai.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { githubRouter } from "./github.routes.js";
import { healthRouter } from "./health.routes.js";
import { notificationsRouter } from "./notifications.routes.js";
import { recommendationsRouter } from "./recommendations.routes.js";
import { workspaceKnowledgeRouter } from "./workspace-knowledge.routes.js";
import { settingsRouter } from "./settings.routes.js";

export const apiRouter = Router();

apiRouter.use("/ai", aiRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/github", githubRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/recommendations", recommendationsRouter);
apiRouter.use("/repositories", workspaceKnowledgeRouter);
apiRouter.use("/settings", settingsRouter);

