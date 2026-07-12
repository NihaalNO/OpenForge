import { Router } from "express";
import { getAiDiagnostics } from "../controllers/ai-diagnostics.controller.js";
export const aiDiagnosticsRouter=Router();aiDiagnosticsRouter.get("/",getAiDiagnostics);
