import type { Request, Response } from "express";
import { UnauthorizedError } from "../lib/http-error.js";
import { aiService } from "../services/ai.service.js";

function requireUserId(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}

function shouldRegenerate(req: Request) {
  return Boolean((req.body as { regenerate?: boolean } | undefined)?.regenerate);
}

export async function generateLearningRoadmap(req: Request, res: Response) {
  res.json(await aiService.generateLearningRoadmap(requireUserId(req), shouldRegenerate(req)));
}

