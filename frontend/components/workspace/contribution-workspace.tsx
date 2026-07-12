"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/common/ui";
import { WorkspaceProvider, useWorkspace } from "./workspace-context";
import {
  WorkspaceError,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceLoader,
  WorkspacePlaceholder,
  type WorkspaceTab
} from "./workspace-components";
import { WorkspaceLauncher } from "./workspace-launcher";
import { WorkspaceExplorer } from "./workspace-explorer";
import { MissionEngine } from "./mission-engine";
import { MentorEngine } from "./mentor-engine";
import { ReviewEngine } from "./review-engine";
import { TimelineEngine } from "./timeline-engine";

export function ContributionWorkspacePage({ owner, repo }: { owner: string; repo: string }) {
  return (
    <WorkspaceProvider owner={owner} repo={repo}>
      <ContributionWorkspace />
    </WorkspaceProvider>
  );
}

function ContributionWorkspace() {
  const { repository, intelligence, isLoading, isGenerating, preparation, modulePackages, refresh, error, retry, setMentorContext } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("map");

  function changeTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    router.replace(`?tab=${tab}`, { scroll: false });
  }

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    const validTabs: WorkspaceTab[] = ["map", "mission", "mentor", "review", "timeline"];

    if (requestedTab && validTabs.includes(requestedTab as WorkspaceTab)) {
      setActiveTab(requestedTab as WorkspaceTab);
    } else if (!requestedTab) {
      setActiveTab("map");
    }
  }, [searchParams]);

  if (isLoading) return <WorkspaceLoader />;
  if (error && !repository) return <WorkspaceLoadError message={error} onRetry={() => void retry()} />;
  if (!repository) return <WorkspaceLoadError message="Repository was not found." onRetry={() => void retry()} />;

  return (
    <WorkspaceLayout>
      <WorkspaceHeader repository={repository} />
      <WorkspacePreparation preparation={preparation} isGenerating={isGenerating} onRefresh={()=>void refresh()} />
      {process.env.NODE_ENV === "development" ? <WorkspaceProvenance modulePackage={modulePackages.explorer} /> : null}
      {error ? <WorkspaceError message={error} /> : null}
      {activeTab === "map" ? (
        <WorkspaceExplorer
          repository={repository}
          modulePackage={modulePackages.explorer}
          isGenerating={isGenerating}
          onAskMentor={(concept) => {
            setMentorContext({
              source: "explorer",
              conceptId: concept.id,
              subject: concept.name,
              prompt: `Help me understand ${concept.name} in this repository.`
            });
            changeTab("mentor");
          }}
        />
      ) : activeTab === "mission" ? (
        <MissionEngine
          repository={repository}
          modulePackage={modulePackages.mission}
          isGenerating={isGenerating}
          onAskMentor={(prompt) => {
            setMentorContext({ source: "mission", category: "mission", prompt });
            changeTab("mentor");
          }}
        />
      ) : activeTab === "mentor" ? (
        <MentorEngine
          repository={repository}
          modulePackage={modulePackages.mentor}
          isGenerating={isGenerating}
          onOpenExplorer={() => changeTab("map")}
        />
      ) : activeTab === "review" ? (
        <ReviewEngine
          repository={repository}
          modulePackage={modulePackages.review}
          isGenerating={isGenerating}
          onAskMentor={(prompt) => {
            setMentorContext({ source: "review", category: "contribution", prompt });
            changeTab("mentor");
          }}
        />
      ) : activeTab === "timeline" ? (
        <TimelineEngine repository={repository} modulePackage={modulePackages.timeline} isGenerating={isGenerating} />
      ) : (
        <WorkspacePlaceholder tab={activeTab} />
      )}
    </WorkspaceLayout>
  );
}

function WorkspaceProvenance({modulePackage}:{modulePackage:import("@openforge/shared").WorkspaceModuleResponse|undefined}){
  if(!modulePackage)return null;
  const p=modulePackage.provenance; return <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 font-mono text-xs leading-5 text-muted-foreground" role="status" aria-label="Workspace content provenance">Repository: {p.repositoryFullName} · Module: {modulePackage.moduleType} · Provider: {p.provider} · Model: {p.model} · Snapshot: {p.contextSnapshotId} · Evidence items: {p.evidenceItemsUsed??0} · Estimated input: {p.estimatedInputTokens??0} tokens · Budget: {p.configuredTokenBudget??0} · Truncated: {String(p.evidenceTruncated??false)} · Duration: {p.generationDurationMs??0}ms · Cache: {modulePackage.cacheHit?"hit":"miss"}</div>;
}

const stageLabels:Record<string,string>={queued:"Preparing to begin",fetching_structure:"Fetching repository structure",reading_documentation:"Reading documentation",understanding_dependencies:"Understanding dependencies",mapping_architecture:"Mapping architecture",selecting_evidence:"Selecting relevant repository evidence",compressing_context:"Compressing repository context",preparing_groq_request:"Preparing Groq request",preparing_explorer:"Generating Explorer guidance",preparing_mission:"Generating Mission guidance",preparing_mentor:"Generating Mentor guidance",preparing_review:"Generating Review guidance",validating_content:"Validating generated content",workspace_ready:"Workspace ready",failed:"Preparation needs attention"};
function WorkspacePreparation({preparation,isGenerating,onRefresh}:{preparation:import("@openforge/shared").WorkspaceStatusResponse|null;isGenerating:boolean;onRefresh:()=>void}){
  const stage=preparation?.job?.stage; const progress=preparation?.job?.progressPercent??0;
  const state=preparation?.job?.status; const description=state==="queued"?"Explorer is queued for preparation.":state==="processing"?"Preparing Explorer…":state==="failed"?`${preparation?.job?.errorMessage??"OpenForge could not prepare Explorer."} Retry is available.`:state==="stale"?"Explorer is based on older repository data. Refresh is available.":"Repository knowledge is cached and ready.";
  return <Card className="p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{stageLabels[stage??""]??(preparation?.ready?"Workspace intelligence ready":"Checking repository knowledge")}</p><p className="mt-1 text-sm text-muted-foreground" role={state==="failed"?"alert":"status"}>{description}</p>{isGenerating?<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-brand-violet transition-[width] duration-300" style={{width:`${progress}%`}} /></div>:null}</div><Button type="button" variant="secondary" onClick={onRefresh} disabled={isGenerating} className="min-h-11 cursor-pointer"><RefreshCw className={`h-4 w-4 ${isGenerating?"animate-spin":""}`} aria-hidden="true" />{state==="failed"||state==="stale"?"Retry":"Refresh knowledge"}</Button></div></Card>;
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
  WorkspaceShell
} from "./workspace-components";

