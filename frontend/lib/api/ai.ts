"use client";

import type {
  AiAnalysisResponse,
  AiLearningRoadmap,
  AiLogsResponse
} from "@openforge/shared";
import { apiRequest } from "./client";

export function generateLearningRoadmap(regenerate = false) {
  return apiRequest<AiAnalysisResponse<AiLearningRoadmap>>("/ai/learning-roadmap/generate", {
    method: "POST",
    body: JSON.stringify({ regenerate })
  });
}

export function fetchAiLogs() {
  return apiRequest<AiLogsResponse>("/ai/logs");
}

