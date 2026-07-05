import type { Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../lib/http-error.js";
import { workspaceKnowledgeService } from "../services/workspace-knowledge.service.js";

function requireUserId(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}

function requireParam(req: Request, name: string) {
  const value = req.params[name];

  if (!value) {
    throw new NotFoundError(`${name} route parameter is required`);
  }

  return value;
}

function shouldRegenerate(req: Request) {
  return Boolean((req.body as { regenerate?: boolean } | undefined)?.regenerate);
}

export async function generateWorkspaceKnowledge(req: Request, res: Response) {
  res.json(
    await workspaceKnowledgeService.generateWorkspaceKnowledge(
      requireUserId(req),
      requireParam(req, "repositoryId"),
      shouldRegenerate(req)
    )
  );
}

export async function getWorkspaceKnowledge(req: Request, res: Response) {
  res.json(
    await workspaceKnowledgeService.getWorkspaceKnowledge(
      requireUserId(req),
      requireParam(req, "repositoryId")
    )
  );
}


