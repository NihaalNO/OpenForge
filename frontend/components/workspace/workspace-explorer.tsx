"use client";

import type { GitHubRepositorySummary, WorkspaceModuleResponse } from "@openforge/shared";
import { GeneratedWorkspaceModule } from "./generated-workspace-module";

export interface ExplorerCardContext { id: string; name: string; }

export function WorkspaceExplorer({ repository, modulePackage, isGenerating, onAskMentor }: {
  repository: GitHubRepositorySummary;
  modulePackage: WorkspaceModuleResponse | undefined;
  isGenerating: boolean;
  onAskMentor: ((card: ExplorerCardContext) => void) | undefined;
}) {
  return <GeneratedWorkspaceModule repository={repository} moduleType="explorer" modulePackage={modulePackage} isGenerating={isGenerating} onAskMentor={onAskMentor} />;
}
