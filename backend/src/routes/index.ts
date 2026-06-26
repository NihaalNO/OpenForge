import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { githubRouter } from "./github.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/github", githubRouter);
apiRouter.use("/health", healthRouter);
