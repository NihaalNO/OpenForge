"use client";

import type { GitHubRepositorySummary } from "@opensource-compass/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchGitHubRepository } from "@/lib/api/github";
import { RepositoryAiPanel } from "@/components/ai/repository-ai-panel";

interface RepositoryDetailProps {
  owner: string;
  repo: string;
}

export function RepositoryDetail({ owner, repo }: RepositoryDetailProps) {
  const [repository, setRepository] = useState<GitHubRepositorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRepositoryData() {
    const repositoryResponse = await fetchGitHubRepository(owner, repo);

    setRepository(repositoryResponse.repository);
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
                <div className="flex flex-wrap gap-2">
                  <a
                    href={repository.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="linear-button"
                  >
                    Open GitHub
                  </a>
                  <Link
                    href={`/app/contributions?repositoryId=${encodeURIComponent(repository.id)}`}
                    className="linear-button-primary"
                  >
                    Generate AI Contribution Plan
                  </Link>
                </div>
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

            <RepositoryAiPanel repositoryId={repository.id} />
          </>
        ) : null}
      </section>
    </main>
  );
}
