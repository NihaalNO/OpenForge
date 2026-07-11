"use client";

import type { GitHubRepositorySummary, WorkspaceModuleResponse } from "@openforge/shared";
import { GeneratedWorkspaceModule } from "./generated-workspace-module";

export function MentorEngine({ repository, modulePackage, isGenerating }: { repository: GitHubRepositorySummary; modulePackage: WorkspaceModuleResponse | undefined; isGenerating: boolean; onOpenExplorer?: () => void }) {
  return <GeneratedWorkspaceModule repository={repository} moduleType="mentor" modulePackage={modulePackage} isGenerating={isGenerating} onAskMentor={undefined} />;
}
