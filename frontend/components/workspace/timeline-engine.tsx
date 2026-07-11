"use client";

import type { GitHubRepositorySummary, WorkspaceModuleResponse } from "@openforge/shared";
import { GeneratedWorkspaceModule } from "./generated-workspace-module";

export function TimelineEngine({ repository, modulePackage, isGenerating = false }: { repository: GitHubRepositorySummary; modulePackage: WorkspaceModuleResponse | undefined; isGenerating?: boolean }) {
  return <GeneratedWorkspaceModule repository={repository} moduleType="timeline" modulePackage={modulePackage} isGenerating={isGenerating} onAskMentor={undefined} />;
}
