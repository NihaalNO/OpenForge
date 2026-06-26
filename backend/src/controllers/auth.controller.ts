import type { Request, Response } from "express";
import type {
  CompleteOnboardingResponse,
  CurrentUserResponse,
  LogoutResponse,
  SessionResponse
} from "@opensource-compass/shared";
import { UnauthorizedError } from "../lib/http-error.js";
import {
  completeUserOnboarding,
  upsertAuthenticatedUser
} from "../repositories/user.repository.js";

export async function getCurrentAuthenticatedUser(req: Request, res: Response<CurrentUserResponse>) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  const user = await upsertAuthenticatedUser(req.auth.user, req.auth.githubProviderToken);

  res.json({ user });
}

export function getCurrentSession(req: Request, res: Response<SessionResponse>) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  res.json({
    valid: true,
    expiresAt: req.auth.expiresAt
  });
}

export function logout(_req: Request, res: Response<LogoutResponse>) {
  res.json({ success: true });
}

export async function completeOnboarding(req: Request, res: Response<CompleteOnboardingResponse>) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  const user = await completeUserOnboarding(req.auth.userId);

  res.json({ user });
}
