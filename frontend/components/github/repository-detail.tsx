"use client";

import type { GitHubIssueSummary, GitHubRepositorySummary } from "@opensource-compass/shared";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchGitHubIssues,
  fetchGitHubRepository,
  syncGitHubIssues
} from "@/lib/api/github";

interface RepositoryDetailProps {
  owner: string;
  repo: string;
}

export function RepositoryDetail({ owner, repo }: RepositoryDetailProps) {
  const [repository, setRepository] = useState<GitHubRepositorySummary | null>(null);
  const [issues, setIssues] = useState<GitHubIssueSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingIssues, setIsSyncingIssues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRepositoryData() {
    const [repositoryResponse, issuesResponse] = await Promise.all([
      fetchGitHubRepository(owner, repo),
      fetchGitHubIssues(owner, repo)
    ]);

    setRepository(repositoryResponse.repository);
    setIssues(issuesResponse.issues);
  }

  async function handleIssueSync() {
    setIsSyncingIssues(true);
    setError(null);

    try {
      await syncGitHubIssues(owner, repo);
      await loadRepositoryData();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Issue sync failed");
    } finally {
      setIsSyncingIssues(false);
    }
  }

  useEffect(() => {
    loadRepositoryData()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load repository");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [owner, repo]);

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-5xl space-y-6">
        {isLoading ? (
          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <p className="text-sm text-muted-foreground">Loading repository...</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {repository ? (
          <>
            <div className="rounded-lg border bg-card p-6 text-card-foreground">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Repository
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold">{repository.fullName}</h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {repository.description ?? "No description provided."}
                  </p>
                </div>
                <a
                  href={repository.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  Open GitHub
                </a>
              </div>

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="font-medium">{repository.primaryLanguage ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stars</dt>
                  <dd className="font-medium">{repository.starsCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Forks</dt>
                  <dd className="font-medium">{repository.forksCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Default branch</dt>
                  <dd className="font-medium">{repository.defaultBranch ?? "Unknown"}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                {repository.topics.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No topics synced.</span>
                ) : (
                  repository.topics.map((topic) => (
                    <span key={topic} className="rounded-md border px-2 py-1 text-xs">
                      {topic}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 text-card-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Issues</h2>
                  <p className="text-sm text-muted-foreground">
                    Sync open issues for this selected repository.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleIssueSync}
                  disabled={isSyncingIssues}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {isSyncingIssues ? "Syncing..." : "Sync issues"}
                </button>
              </div>

              {issues.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No issues synced yet. Run issue sync for this repository.
                </p>
              ) : (
                <ul className="mt-4 divide-y">
                  {issues.map((issue) => (
                    <li key={issue.id} className="py-4">
                      <a
                        href={issue.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        #{issue.number} {issue.title}
                      </a>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issue.labels.map((label) => (
                          <span key={label} className="rounded-md border px-2 py-1 text-xs">
                            {label}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

