"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  Activity,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  Github,
  LayoutPanelTop,
  Loader2,
  Map,
  MessageSquareText,
  RefreshCw,
  Route,
  ShieldCheck
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/ui";
import { cn } from "@/lib/utils";

export type WorkspaceTab = "overview" | "map" | "mission" | "mentor" | "quality" | "activity";

export const workspaceTabs: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof LayoutPanelTop;
  purpose: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutPanelTop,
    purpose: "Repository intelligence, readiness signals, and workspace orientation."
  },
  {
    id: "map",
    label: "Repository Map",
    icon: Map,
    purpose: "Repository mapping will surface important folders, entry points, tests, and documentation."
  },
  {
    id: "mission",
    label: "Mission",
    icon: Route,
    purpose: "Mission planning will guide contributors through implementation, testing, and pull request preparation."
  },
  {
    id: "mentor",
    label: "Mentor",
    icon: MessageSquareText,
    purpose: "Mentor guidance will answer repository questions using synced intelligence and future workspace context."
  },
  {
    id: "quality",
    label: "Quality Gate",
    icon: ShieldCheck,
    purpose: "Quality checks will help contributors verify setup, tests, CI expectations, and pull request readiness."
  },
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
    purpose: "Activity will collect workspace events such as syncs, intelligence updates, and future mission progress."
  }
];

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-5 lg:space-y-6">{children}</div>;
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-border bg-card">
      {children}
    </section>
  );
}

export function WorkspaceContent({ children }: { children: ReactNode }) {
  return <div className="p-4 sm:p-5 lg:p-6">{children}</div>;
}

export function WorkspaceCard({ className, children }: { className?: string; children: ReactNode }) {
  return <Card className={cn("p-5", className)}>{children}</Card>;
}

export function WorkspaceLoading() {
  return <LoadingSkeleton rows={4} />;
}

export function WorkspaceLoader() {
  return <WorkspaceLoading />;
}

export function WorkspaceError({ message }: { message: string }) {
  return <ErrorState message={message} />;
}

export function WorkspaceEmptyState({
  title = "Repository intelligence not generated",
  description = "Generate Repository Intelligence from GitHub Data or use the header action to prepare this workspace."
}: {
  title?: string;
  description?: string;
}) {
  return <EmptyState title={title} description={description} />;
}

function formatDate(value?: string | null) {
  if (!value) return "Not synced";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLevel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "Unknown";
}

export function relationshipLabel(repository: GitHubRepositorySummary) {
  if (repository.relationshipType === "organization_member") return "Organization";
  if (repository.relationshipType === "contributor") return "Contributor";
  if (repository.relationshipType === "collaborator") return "Collaborator";
  if (repository.relationshipType === "fork") return "Fork";
  return "Owner";
}

function repositoryStatus(repository: GitHubRepositorySummary) {
  if (repository.isArchived) return "Archived";
  if (repository.isFork) return "Fork";
  return repository.visibility ?? "Public";
}

function estimatedContributionTime(intelligence: RepositoryKnowledgePackage | null) {
  if (!intelligence) return "Pending";
  if (intelligence.complexity.level === "beginner" && intelligence.contributionReadiness.level === "high") return "2-4 hours";
  if (intelligence.complexity.level === "advanced" || intelligence.contributionReadiness.level === "low") return "1-2 days";
  return "4-8 hours";
}

function aiConfidence(intelligence: RepositoryKnowledgePackage | null) {
  if (!intelligence) return "Placeholder";
  if (intelligence.sourceLimits.truncated || intelligence.tree.truncated) return "Medium";
  if (intelligence.readme.content && intelligence.tree.processedEntries > 0) return "High";
  return "Medium";
}

export function WorkspaceHeader({
  repository,
  intelligence,
  isGenerating,
  onRegenerate
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
  isGenerating: boolean;
  onRegenerate: () => void;
}) {
  return (
    <WorkspaceShell>
      <div className="border-b border-border bg-background/60 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>GitHub Data</span>
          <span>/</span>
          <span>Open Workspace</span>
          <span>/</span>
          <span className="font-medium text-foreground">Contribution Workspace</span>
        </div>
      </div>
      <WorkspaceContent>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{relationshipLabel(repository)}</Badge>
              <Badge>{repositoryStatus(repository)}</Badge>
              <Badge>{repository.primaryLanguage ?? "Unknown language"}</Badge>
            </div>
            <h1 className="mt-4 break-words text-3xl font-semibold leading-tight text-foreground">
              {repository.name}
            </h1>
            <p className="mt-2 break-words text-sm text-muted-foreground">{repository.ownerLogin}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
              <Github className="h-4 w-4" aria-hidden="true" />
              Open in GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <Button type="button" onClick={onRegenerate} disabled={isGenerating} variant="primary">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              {intelligence ? "Regenerate Intelligence" : "Generate Intelligence"}
            </Button>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceMeta label="Repository" value={repository.fullName} />
          <WorkspaceMeta label="Default branch" value={repository.defaultBranch ?? "Unknown"} />
          <WorkspaceMeta label="Last GitHub sync" value={formatDate(repository.lastSyncedAt)} />
          <WorkspaceMeta label="Last intelligence sync" value={formatDate(intelligence?.generatedAt)} />
        </dl>
      </WorkspaceContent>
    </WorkspaceShell>
  );
}

function WorkspaceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function RepositoryHero({
  repository,
  intelligence
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
}) {
  const signals = [
    {
      label: "Contribution Readiness",
      value: intelligence ? formatLevel(intelligence.contributionReadiness.level) : "Pending",
      detail: intelligence ? `${intelligence.contributionReadiness.score}/100` : "Generate intelligence",
      icon: CheckCircle2
    },
    {
      label: "Complexity",
      value: intelligence ? formatLevel(intelligence.complexity.level) : "Pending",
      detail: intelligence ? `${intelligence.complexity.score}/100` : "Awaiting scan",
      icon: GitBranch
    },
    {
      label: "Contribution Time",
      value: estimatedContributionTime(intelligence),
      detail: repository.primaryLanguage ?? "Language unknown",
      icon: Clock3
    },
    {
      label: "Documentation",
      value: intelligence?.docs.hasContributingGuide ? "Contributing guide" : intelligence?.readme.content ? "README" : "Limited",
      detail: intelligence?.docs.hasLicense ? "License detected" : "License unknown",
      icon: FileText
    },
    {
      label: "Tests",
      value: intelligence?.testStructure.hasTests ? "Detected" : "Not detected",
      detail: intelligence?.testStructure.detectedFrameworks.slice(0, 2).join(", ") || "No framework signal",
      icon: BookOpenCheck
    },
    {
      label: "CI",
      value: intelligence?.workflowFiles.length ? "Detected" : "Not detected",
      detail: intelligence?.workflowFiles.length ? `${intelligence.workflowFiles.length} workflow files` : "No workflow files",
      icon: ShieldCheck
    },
    {
      label: "AI Confidence",
      value: aiConfidence(intelligence),
      detail: intelligence ? "Based on deterministic signals" : "Placeholder",
      icon: LayoutPanelTop
    }
  ];

  return (
    <WorkspaceCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Repository Intelligence</p>
          <h2 className="mt-1 text-2xl font-semibold">Workspace readiness</h2>
        </div>
        <Badge>{intelligence ? "Intelligence loaded" : "Intelligence pending"}</Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => {
          const Icon = signal.icon;

          return (
            <div key={signal.label} className="rounded-[18px] border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">{signal.label}</p>
                <Icon className="h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
              </div>
              <p className="mt-3 break-words text-lg font-semibold capitalize text-foreground">{signal.value}</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{signal.detail}</p>
            </div>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

export function WorkspaceTabBar({
  activeTab,
  onChange
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-border bg-card p-2">
      <div className="flex min-w-max gap-2">
        {workspaceTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-brand-violet")} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WorkspaceTabs(props: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return <WorkspaceTabBar {...props} />;
}

export function WorkspacePlaceholder({ tab }: { tab: Exclude<WorkspaceTab, "overview"> }) {
  const definition = workspaceTabs.find((item) => item.id === tab);
  const Icon = definition?.icon;

  return (
    <WorkspaceCard className="min-h-64">
      <div className="flex min-h-52 flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
        </div>
        <p className="mt-4 text-xs font-medium uppercase text-muted-foreground">Coming in Phase 2</p>
        <h2 className="mt-2 text-2xl font-semibold">{definition?.label}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{definition?.purpose}</p>
      </div>
    </WorkspaceCard>
  );
}

export function WorkspaceOverview({
  repository,
  intelligence
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
}) {
  if (!intelligence) {
    return (
      <WorkspaceEmptyState
        title="Generate intelligence to prepare the workspace"
        description={`${repository.fullName} can open now, and Repository Intelligence will fill the workspace header and readiness hero when generated.`}
      />
    );
  }

  const stack = [
    ...intelligence.detectedStack.languages,
    ...intelligence.detectedStack.frameworks,
    ...intelligence.detectedStack.packageManagers
  ].slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <WorkspaceCard>
        <h2 className="text-xl font-semibold">Foundation overview</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This phase opens a repository-specific workspace and grounds it in Repository Intelligence. Deeper planning panels will arrive in later phases.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SignalBadge label="Docs" value={intelligence.docs.hasContributingGuide ? "Ready" : "Basic"} />
          <SignalBadge label="Tests" value={intelligence.testStructure.hasTests ? "Detected" : "Missing"} />
          <SignalBadge label="CI" value={intelligence.workflowFiles.length ? "Detected" : "Missing"} />
        </div>
      </WorkspaceCard>

      <WorkspaceCard>
        <h2 className="text-xl font-semibold">Detected stack</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {stack.length ? stack.map((item) => <Badge key={item}>{item}</Badge>) : <span className="text-sm text-muted-foreground">No stack signals detected.</span>}
        </div>
      </WorkspaceCard>
    </div>
  );
}

function SignalBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
