import type { Request, Response } from "express";
import { UnauthorizedError } from "../lib/http-error.js";
import { dashboardService } from "../services/dashboard.service.js";

function requireUserId(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}

export async function getDashboard(req: Request, res: Response) {
  res.json(await dashboardService.getDashboard(requireUserId(req)));
}

export async function getDashboardAnalytics(req: Request, res: Response) {
  res.json(await dashboardService.getAnalytics(requireUserId(req)));
}

export async function getSavedRepositories(req: Request, res: Response) {
  res.json(await dashboardService.getSavedRepositories(requireUserId(req)));
}
