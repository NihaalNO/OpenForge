"use client";

import type { GitHubRepositorySummary } from "@opensource-compass/shared";
import { RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchGitHubRepositories, syncGitHubData } from "@/lib/api/github";

export function RepositoryList() {
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
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

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              GitHub data
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Repositories</h1>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {isSyncing ? "Syncing..." : "Sync repositories"}
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <p className="text-sm text-muted-foreground">Loading repositories...</p>
          </div>
        ) : repositories.length === 0 ? (
          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <h2 className="text-lg font-medium">No repositories synced</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run a GitHub sync to fetch your public repositories.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {repositories.map((repository) => (
              <Link
                key={repository.id}
                href={`/app/repositories/${repository.ownerLogin}/${repository.name}`}
                className="rounded-lg border bg-card p-5 text-card-foreground transition hover:border-foreground/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{repository.fullName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {repository.description ?? "No description provided."}
                    </p>
                  </div>
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                    {repository.visibility ?? "public"}
                  </span>
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

