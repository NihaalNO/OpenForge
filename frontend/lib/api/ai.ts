"use client";

import type {
  AiAnalysisResponse,
  AiContributionPlan,
  AiLearningRoadmap,
  AiLogsResponse,
  AiRepositoryAnalysis
} from "@opensource-compass/shared";
import { apiRequest } from "./client";

export function analyzeRepository(repositoryId: string, regenerate = false) {
  return apiRequest<AiAnalysisResponse<AiRepositoryAnalysis>>(
    `/ai/repository/${repositoryId}/analyze`,
    {
      method: "POST",
      body: JSON.stringify({ regenerate })
    }
  );
}

export function generateLearningRoadmap(regenerate = false) {
  return apiRequest<AiAnalysisResponse<AiLearningRoadmap>>("/ai/learning-roadmap/generate", {
    method: "POST",
    body: JSON.stringify({ regenerate })
  });
}

export function generateContributionPlan(input: {
  issueId?: string;
  repositoryId?: string;
  regenerate?: boolean;
}) {
  return apiRequest<AiAnalysisResponse<AiContributionPlan>>("/ai/contribution-plan/generate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function fetchAiLogs() {
  return apiRequest<AiLogsResponse>("/ai/logs");
}
