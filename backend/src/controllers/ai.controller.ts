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

export async function generateContributionPlan(req: Request, res: Response) {
  const body = (req.body ?? {}) as {
    issueId?: string;
    repositoryId?: string;
    regenerate?: boolean;
  };

  res.json(
    await aiService.generateContributionPlan(
      requireUserId(req),
      body.issueId,
      body.repositoryId,
      shouldRegenerate(req)
    )
  );
}

export async function listAiLogs(req: Request, res: Response) {
  res.json(await aiService.listLogs(requireUserId(req)));
}

