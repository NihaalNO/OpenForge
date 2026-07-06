"use client";

import type { GitHubRepositorySummary } from "@openforge/shared";
import {
  Activity,
  ClipboardCheck,
  Map,
  MessageSquareText,
  Route,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, EmptyState, ErrorState } from "@/components/common/ui";
import { cn } from "@/lib/utils";

export type WorkspaceTab = "map" | "mission" | "mentor" | "review" | "timeline";

const workspaceSections: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof Map;
  purpose: string;
}> = [
  {
    id: "map",
    label: "Explorer",
    icon: Map,
    purpose: "Explorer explains architecture, concepts, reading order, and contribution domains before files."
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
    id: "review",
    label: "Review",
    icon: ClipboardCheck,
    purpose: "Review helps contributors decide whether they are ready to open a pull request."
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: Activity,
    purpose: "Timeline reflects contributor learning, review reflections, and workspace progress."
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
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[24px] border border-border bg-card">
        <div className="h-11 animate-pulse border-b border-border bg-background/70" />
        <div className="space-y-5 p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="h-5 w-44 animate-pulse rounded-full bg-muted" />
              <div className="h-9 w-72 max-w-full animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-56 max-w-full animate-pulse rounded-full bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-11 w-36 animate-pulse rounded-full bg-muted" />
              <div className="h-11 w-44 animate-pulse rounded-full bg-soft-blue-wash" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-[18px] border border-border bg-background" />
            ))}
          </div>
        </div>
      </div>
      <div className="h-72 animate-pulse rounded-[24px] border border-border bg-card" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-52 animate-pulse rounded-[24px] border border-border bg-card" />
        <div className="h-52 animate-pulse rounded-[24px] border border-border bg-card" />
      </div>
    </div>
  );
}

export function WorkspaceLoader() {
  return <WorkspaceLoading />;
}

export function WorkspaceError({ message }: { message: string }) {
  return <ErrorState message={message} />;
}

export function WorkspaceEmptyState({
  title = "Preparing Workspace",
  description = "Understanding Repository..."
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

export function relationshipLabel(repository: GitHubRepositorySummary) {
  if (repository.relationshipType === "organization_member") return "Organization";
  if (repository.relationshipType === "contributor") return "Contributor";
  if (repository.relationshipType === "collaborator") return "Collaborator";
  if (repository.relationshipType === "fork") return "Fork";
  return "Owner";
}

export function WorkspaceHeader({ repository }: { repository: GitHubRepositorySummary }) {
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
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Repository Header</p>
          <h1 className="mt-2 break-words text-3xl font-semibold leading-tight text-foreground">{repository.fullName}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {repository.description ?? "No description provided."}
          </p>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceMeta label="Owner" value={repository.ownerLogin} />
          <WorkspaceMeta label="Default branch" value={repository.defaultBranch ?? "Unknown"} />
          <WorkspaceMeta label="Last GitHub sync" value={formatDate(repository.lastSyncedAt)} />
          <WorkspaceMeta label="Open issues" value={`${repository.openIssuesCount}`} />
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

export function WorkspacePlaceholder({ tab }: { tab: WorkspaceTab }) {
  const definition = workspaceSections.find((item) => item.id === tab);
  const Icon = definition?.icon;

  return (
    <WorkspaceCard className="min-h-64">
      <div className="flex min-h-52 flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
        </div>
        <p className="mt-4 text-xs font-medium uppercase text-muted-foreground">Available in next phase</p>
        <h2 className="mt-2 text-2xl font-semibold">{definition?.label}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{definition?.purpose}</p>
      </div>
    </WorkspaceCard>
  );
}

