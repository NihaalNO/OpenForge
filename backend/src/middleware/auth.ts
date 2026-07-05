import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
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

function isBrowserNavigation(req: Request) {
  return (
    req.method === "GET" &&
    (req.header("sec-fetch-mode") === "navigate" || req.header("accept")?.includes("text/html"))
  );
}

function redirectToLogin(req: Request, res: Response) {
  const nextPath = req.originalUrl.startsWith("/api") ? "/app/repositories" : req.originalUrl;
  const loginUrl = new URL("/login", env.FRONTEND_URL);
  loginUrl.searchParams.set("next", nextPath);
  res.redirect(loginUrl.toString());
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      if (isBrowserNavigation(req)) {
        redirectToLogin(req, res);
        return;
      }

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
