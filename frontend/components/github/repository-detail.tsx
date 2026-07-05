"use client";

import type { GitHubRepositorySummary } from "@openforge/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, ErrorState, LoadingSkeleton, PageHeader } from "@/components/common/ui";
import { fetchGitHubRepository } from "@/lib/api/github";

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

  if (isLoading) {
    return <LoadingSkeleton rows={2} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!repository) {
    return <ErrorState message="Unable to load repository." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="GitHub Data"
        title={repository.fullName}
        description={repository.description ?? "No description provided."}
        actions={
          <>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
              Open in GitHub
            </a>
            <Link href={`/app/repositories/${repository.ownerLogin}/${repository.name}/workspace`} className="openforge-button-primary">
              Open Workspace
            </Link>
          </>
        }
      />

      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Language</dt>
            <dd className="mt-1 font-medium">{repository.primaryLanguage ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stars</dt>
            <dd className="mt-1 font-medium">{repository.starsCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Forks</dt>
            <dd className="mt-1 font-medium">{repository.forksCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Default branch</dt>
            <dd className="mt-1 font-medium">{repository.defaultBranch ?? "Unknown"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {repository.topics.length === 0 ? (
            <span className="text-sm text-muted-foreground">No topics synced.</span>
          ) : (
            repository.topics.map((topic) => <Badge key={topic}>{topic}</Badge>)
          )}
        </div>
      </Card>

    </div>
  );
}

