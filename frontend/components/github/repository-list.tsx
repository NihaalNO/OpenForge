"use client";

import type { GitHubRepositorySummary } from "@opensource-compass/shared";
import { GitFork, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchGitHubRepositories, syncGitHubData } from "@/lib/api/github";

type RepositoryFilter = "all" | "owner" | "fork" | "contributor" | "organization_member";

const filters: Array<{ value: RepositoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "owner", label: "Owned" },
  { value: "fork", label: "Forks" },
  { value: "contributor", label: "Collaborator/Contributor" },
  { value: "organization_member", label: "Organizations" }
];

function relationshipLabel(repository: GitHubRepositorySummary) {
  if (repository.relationshipType === "organization_member") {
    return "Organization";
  }

  if (repository.relationshipType === "contributor") {
    return "Contributor";
  }

  if (repository.relationshipType === "collaborator") {
    return "Collaborator";
  }

  if (repository.relationshipType === "fork") {
    return "Fork";
  }

  return "Owner";
}

export function RepositoryList() {
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [activeFilter, setActiveFilter] = useState<RepositoryFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRepositories() {
    const response = await fetchGitHubRepositories();
    setRepositories(response.repositories);
  }

  async function handleSync() {
    setIsSyncing(true);
    setError(null);

    try {
      await syncGitHubData();
      await loadRepositories();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Repository sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    loadRepositories()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load repositories");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const visibleRepositories = useMemo(() => {
    if (activeFilter === "all") {
      return repositories;
    }

    if (activeFilter === "contributor") {
      return repositories.filter((repository) =>
        repository.relationshipType === "collaborator" || repository.relationshipType === "contributor"
      );
    }

    return repositories.filter((repository) => repository.relationshipType === activeFilter);
  }, [activeFilter, repositories]);

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">GitHub data</p>
            <h1 className="mt-1 text-2xl font-semibold">Repositories</h1>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="linear-button-primary"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {isSyncing ? "Syncing..." : "Sync repositories"}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`whitespace-nowrap rounded-md border px-3 py-2 text-sm transition ${
                activeFilter === filter.value
                  ? "border-primary/40 bg-accent text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="linear-card border-destructive/40 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="linear-card p-5">
            <p className="text-sm text-muted-foreground">Loading repositories...</p>
          </div>
        ) : visibleRepositories.length === 0 ? (
          <div className="linear-card p-5">
            <h2 className="text-lg font-medium">No repositories synced</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run a GitHub sync or switch filters to view owned, forked, collaborator, contributor, and organization repositories.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visibleRepositories.map((repository) => (
              <Link
                key={repository.id}
                href={`/app/repositories/${repository.ownerLogin}/${repository.name}`}
                className="linear-card block p-5 transition hover:border-foreground/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{repository.fullName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {repository.description ?? "No description provided."}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                      {relationshipLabel(repository)}
                    </span>
                    {repository.isFork ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                        <GitFork className="h-3 w-3" aria-hidden="true" />
                        Fork
                      </span>
                    ) : null}
                    <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                      {repository.visibility ?? "public"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{repository.primaryLanguage ?? "Unknown"}</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4" aria-hidden="true" />
                    {repository.starsCount}
                  </span>
                  <span>{repository.forksCount} forks</span>
                  <span>{repository.openIssuesCount} open issues</span>
                </div>
                {repository.isFork && repository.parentRepositoryFullName ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Forked from {repository.parentRepositoryFullName}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
  );
}
