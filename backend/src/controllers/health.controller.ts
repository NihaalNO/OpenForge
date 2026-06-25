import type { Request, Response } from "express";
import type { HealthResponse } from "@opensource-compass/shared";

export function getHealth(_req: Request, res: Response<HealthResponse>) {
  res.json({
    status: "ok",
    service: "backend",
    version: "0.1.0"
  });
}

