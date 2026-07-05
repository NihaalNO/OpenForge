"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card } from "@/components/common/ui";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";
import {
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceLoader,
  WorkspacePlaceholder,
  WorkspaceTabBar,
  type WorkspaceTab
} from "./workspace-components";
import { WorkspaceLauncher } from "./workspace-launcher";
import { WorkspaceExplorer } from "./workspace-explorer";
import { MissionEngine } from "./mission-engine";
import { MentorEngine } from "./mentor-engine";
import { ReviewEngine } from "./review-engine";
import { TimelineEngine } from "./timeline-engine";
import { WorkspaceOverview } from "./workspace-overview";

export function ContributionWorkspacePage({ owner, repo }: { owner: string; repo: string }) {
  return (
    <WorkspaceProvider owner={owner} repo={repo}>
      <ContributionWorkspace />
    </WorkspaceProvider>
  );
}

function ContributionWorkspace() {
  const { repository, intelligence, isLoading, isGenerating, error, retry, regenerateIntelligence, setMentorContext } = useWorkspace();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  if (isLoading) return <WorkspaceLoader />;
  if (error && !repository) return <WorkspaceLoadError message={error} onRetry={() => void retry()} />;
  if (!repository) return <WorkspaceLoadError message="Repository was not found." onRetry={() => void retry()} />;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader repository={repository} />
      {error ? <WorkspaceError message={error} /> : null}
      <WorkspaceTabBar activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "overview" ? (
        <WorkspaceOverview
          repository={repository}
          intelligence={intelligence}
          isGenerating={isGenerating}
          onRegenerate={() => void regenerateIntelligence()}
          onStartMission={() => setActiveTab("mission")}
        />
      ) : activeTab === "map" ? (
        <WorkspaceExplorer
          repository={repository}
          intelligence={intelligence}
          isGenerating={isGenerating}
          onRegenerate={() => void regenerateIntelligence()}
          onAskMentor={(concept) => {
            setMentorContext({
              source: "explorer",
              conceptId: concept.id,
              subject: concept.name,
              prompt: `Help me understand ${concept.name} in this repository.`
            });
            setActiveTab("mentor");
          }}
        />
      ) : activeTab === "mission" ? (
        <MissionEngine
          repository={repository}
          intelligence={intelligence}
          isGenerating={isGenerating}
          onRegenerate={() => void regenerateIntelligence()}
          onAskMentor={(prompt) => {
            setMentorContext({ source: "mission", category: "mission", prompt });
            setActiveTab("mentor");
          }}
        />
      ) : activeTab === "mentor" ? (
        <MentorEngine
          repository={repository}
          intelligence={intelligence}
          isGenerating={isGenerating}
          onRegenerate={() => void regenerateIntelligence()}
          onOpenExplorer={() => setActiveTab("map")}
        />
      ) : activeTab === "review" ? (
        <ReviewEngine
          repository={repository}
          intelligence={intelligence}
          isGenerating={isGenerating}
          onRegenerate={() => void regenerateIntelligence()}
          onAskMentor={(prompt) => {
            setMentorContext({ source: "review", category: "contribution", prompt });
            setActiveTab("mentor");
          }}
        />
      ) : activeTab === "timeline" ? (
        <TimelineEngine repository={repository} intelligence={intelligence} />
      ) : (
        <WorkspacePlaceholder tab={activeTab} />
      )}
    </WorkspaceLayout>
  );
}

export function WorkspaceSelector() {
  return <WorkspaceLauncher />;
}

function WorkspaceLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Workspace could not open</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Something blocked this repository workspace.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onRetry} variant="primary">
            Retry
          </Button>
          <Link href="/app/repositories" className="openforge-button">
            Return to Repository
          </Link>
        </div>
      </div>
    </Card>
  );
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
