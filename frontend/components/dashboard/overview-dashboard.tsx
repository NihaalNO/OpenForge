"use client";

import type { DashboardResponse } from "@openforge/shared";
import { Activity, BookOpen, GitFork, Github, RefreshCw, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, ErrorState, LoadingSkeleton, PageHeader, StatCard } from "@/components/common/ui";
import { fetchDashboard } from "@/lib/api/dashboard";
import { syncGitHubData } from "@/lib/api/github";

function formatDate(value: string | null) {
  if (!value) {
    return "Not synced";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function OverviewDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    setError(null);
    const response = await fetchDashboard({ force });
    setDashboard(response);
  }

  async function handleSync() {
    setIsSyncing(true);
    setError(null);

    try {
      await syncGitHubData();
      await load(true);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "GitHub sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    load()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Dashboard failed to load");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingSkeleton rows={3} />;
  }

  if (!dashboard) {
    return <ErrorState message={error ?? "No dashboard data."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User Overview"
        title="Your open-source control room"
        description="GitHub sync, repository coverage, workspace intelligence, roadmap status, and recent updates in one calm workspace."
        actions={
          <Button type="button" onClick={handleSync} disabled={isSyncing} variant="primary">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
            {isSyncing ? "Preparing Workspace..." : "Sync GitHub"}
          </Button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {dashboard.github?.avatarUrl ? (
              <img
                src={dashboard.github.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full border border-border"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background">
                <Github className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h2 className="text-2xl font-semibold">{dashboard.user.displayName ?? "Developer"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dashboard.github?.username ? `@${dashboard.github.username}` : "GitHub not connected"} / Last sync{" "}
                {formatDate(dashboard.github?.lastSyncedAt ?? null)}
              </p>
            </div>
          </div>
          <span className="openforge-badge">Roadmap {dashboard.metrics.learningRoadmapStatus.replaceAll("_", " ")}</span>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total repositories synced" value={dashboard.metrics.totalRepositories} icon={Github} />
        <StatCard label="Owned repositories" value={dashboard.metrics.ownedRepositories} icon={Star} />
        <StatCard label="Forked repositories" value={dashboard.metrics.forkedRepositories} icon={GitFork} />
        <StatCard label="Contributed repositories" value={dashboard.metrics.contributedRepositories} icon={Activity} />
        <StatCard label="Workspace insights" value={dashboard.metrics.workspaceInsightsGenerated} icon={BookOpen} />
      </section>

      <section>
        <Card>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          {dashboard.recentActivity.length === 0 ? (
            <EmptyInline text="Activity will appear after syncs and generated insights." />
          ) : (
            <ul className="mt-4 space-y-3">
              {dashboard.recentActivity.map((activity) => (
                <li key={activity.id} className="rounded-[15px] border border-border bg-background p-4 text-sm">
                  <p className="font-medium">{activity.title}</p>
                  <p className="mt-1 text-muted-foreground">{activity.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <p className="mt-4 rounded-[15px] border border-border bg-background p-4 text-sm text-muted-foreground">{text}</p>;
}

