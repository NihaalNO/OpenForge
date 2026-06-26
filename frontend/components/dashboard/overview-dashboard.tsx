"use client";

import type { DashboardResponse } from "@opensource-compass/shared";
import { Activity, BookOpen, Bot, GitFork, Github, RefreshCw, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/api/dashboard";
import { syncGitHubData } from "@/lib/api/github";

function formatDate(value: string | null) {
  if (!value) {
    return "Not synced";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Github }) {
  return (
    <div className="linear-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold capitalize">{value}</p>
    </div>
  );
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
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-lg border border-border bg-card" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="linear-card p-5 text-sm text-muted-foreground">{error ?? "No dashboard data."}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="linear-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {dashboard.github?.avatarUrl ? (
              <img
                src={dashboard.github.avatarUrl}
                alt=""
                className="h-14 w-14 rounded-lg border border-border"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted">
                <Github className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="text-2xl font-semibold">{dashboard.user.displayName ?? "Developer"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {dashboard.github?.username ? `@${dashboard.github.username}` : "GitHub not connected"} / Last sync{" "}
                {formatDate(dashboard.github?.lastSyncedAt ?? null)}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleSync} disabled={isSyncing} className="linear-button-primary">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
            {isSyncing ? "Syncing" : "Sync GitHub"}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Total repos" value={dashboard.metrics.totalRepositories} icon={Github} />
        <MetricCard label="Owned repos" value={dashboard.metrics.ownedRepositories} icon={Star} />
        <MetricCard label="Forked repos" value={dashboard.metrics.forkedRepositories} icon={GitFork} />
        <MetricCard label="Contributed repos" value={dashboard.metrics.contributedRepositories} icon={Activity} />
        <MetricCard label="AI analyses" value={dashboard.metrics.aiAnalysesCompleted} icon={Bot} />
        <MetricCard label="AI plans" value={dashboard.metrics.contributionPlansGenerated} icon={BookOpen} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <MetricCard
          label="Learning roadmap"
          value={dashboard.metrics.learningRoadmapStatus.replaceAll("_", " ")}
          icon={BookOpen}
        />
        <MetricCard label="Unread" value={dashboard.metrics.unreadNotifications} icon={Activity} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="linear-card p-5">
          <h2 className="text-lg font-semibold">Recent AI analyses</h2>
          {dashboard.recentAiAnalyses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No AI analyses yet. AI actions remain user-triggered.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {dashboard.recentAiAnalyses.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{log.analysisType.replaceAll("_", " ")}</p>
                    <p className="text-muted-foreground">{log.provider} / {log.model}</p>
                  </div>
                  <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                    {log.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="linear-card p-5">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          {dashboard.recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Activity will appear after syncs and generated insights.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {dashboard.recentActivity.map((activity) => (
                <li key={activity.id} className="rounded-md border border-border bg-background p-3 text-sm">
                  <p className="font-medium">{activity.title}</p>
                  <p className="mt-1 text-muted-foreground">{activity.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
