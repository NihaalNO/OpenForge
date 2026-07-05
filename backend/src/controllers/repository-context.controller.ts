import type { Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../lib/http-error.js";
import { repositoryIntelligenceService } from "../services/repository-intelligence.service.js";

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

export async function getRepositoryContext(req: Request, res: Response) {
  res.json(
    await repositoryIntelligenceService.getRepositoryContext(
      requireUserId(req),
      requireParam(req, "repositoryId")
    )
  );
}



