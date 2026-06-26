import type { NextFunction, Request, Response } from "express";
import { getJwtExpiresAt } from "../lib/jwt.js";
import { UnauthorizedError } from "../lib/http-error.js";
import { getSupabaseAuthClient } from "../lib/supabase.js";

function getBearerToken(req: Request) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw new UnauthorizedError();
    }

    const { data, error } = await getSupabaseAuthClient().auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError("Session is invalid or expired");
    }

    req.auth = {
      token,
      user: data.user,
      userId: data.user.id,
      email: data.user.email ?? null,
      role: String(data.user.app_metadata.role ?? "user"),
      expiresAt: getJwtExpiresAt(token),
      githubProviderToken: req.header("x-github-provider-token") ?? null
    };

    next();
  } catch (error) {
    next(error);
  }
}
