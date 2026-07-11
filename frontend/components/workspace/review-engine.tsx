"use client";

import type { GitHubRepositorySummary, WorkspaceModuleResponse } from "@openforge/shared";
import { GeneratedWorkspaceModule } from "./generated-workspace-module";

export function ReviewEngine({ repository, modulePackage, isGenerating, onAskMentor }: { repository: GitHubRepositorySummary; modulePackage: WorkspaceModuleResponse | undefined; isGenerating: boolean; onAskMentor: ((prompt: string) => void) | undefined }) {
  return <GeneratedWorkspaceModule repository={repository} moduleType="review" modulePackage={modulePackage} isGenerating={isGenerating} onAskMentor={onAskMentor ? (card) => onAskMentor(`Explain the review guidance for ${card.name} using repository evidence.`) : undefined} />;
}
