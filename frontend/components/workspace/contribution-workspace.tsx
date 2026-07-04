"use client";

import { useState } from "react";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";
import {
  RepositoryHero,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceLoader,
  WorkspaceOverview,
  WorkspacePlaceholder,
  WorkspaceTabBar,
  type WorkspaceTab
} from "./workspace-components";
import { WorkspaceLauncher } from "./workspace-launcher";

export function ContributionWorkspacePage({ owner, repo }: { owner: string; repo: string }) {
  return (
    <WorkspaceProvider owner={owner} repo={repo}>
      <ContributionWorkspace />
    </WorkspaceProvider>
  );
}

function ContributionWorkspace() {
  const { repository, intelligence, isLoading, isGenerating, error, regenerateIntelligence } = useWorkspace();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  if (isLoading) return <WorkspaceLoader />;
  if (error && !repository) return <WorkspaceError message={error} />;
  if (!repository) return <WorkspaceError message="Repository was not found." />;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        repository={repository}
        intelligence={intelligence}
        isGenerating={isGenerating}
        onRegenerate={() => void regenerateIntelligence()}
      />
      {error ? <WorkspaceError message={error} /> : null}
      <RepositoryHero repository={repository} intelligence={intelligence} />
      <WorkspaceTabBar activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" ? (
        <WorkspaceOverview repository={repository} intelligence={intelligence} />
      ) : (
        <WorkspacePlaceholder tab={activeTab} />
      )}
    </WorkspaceLayout>
  );
}

export function WorkspaceSelector() {
  return <WorkspaceLauncher />;
}

export {
  WorkspaceCard,
  WorkspaceContent,
  WorkspaceEmptyState,
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceLoader,
  WorkspaceLoading,
  WorkspacePlaceholder,
  WorkspaceShell,
  WorkspaceTabBar,
  WorkspaceTabs
} from "./workspace-components";
