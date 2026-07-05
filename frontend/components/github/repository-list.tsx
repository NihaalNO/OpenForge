"use client";

import type { GitHubRepositorySummary } from "@openforge/shared";
import { BrainCircuit, GitFork, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/components/common/ui";
import {
  fetchGitHubRepositories,
  fetchWorkspaceKnowledge,
  generateWorkspaceKnowledge,
  syncGitHubData
} from "@/lib/api/github";
import { cn } from "@/lib/utils";

type RepositoryFilter = "all" | "owner" | "fork" | "contributor" | "organization_member";

const filters: Array<{ value: RepositoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "owner", label: "Owned" },
  { value: "fork", label: "Forks" },
  { value: "contributor", label: "Contributed" },
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
  const [intelligenceMap, setIntelligenceMap] = useState<Record<string, boolean>>({});
  const [generatingRepositoryId, setGeneratingRepositoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRepositories() {
    const response = await fetchGitHubRepositories();
    setRepositories(response.repositories);

    const checks = await Promise.allSettled(
      response.repositories.map(async (repository) => {
        await fetchWorkspaceKnowledge(repository.id);
        return repository.id;
      })
    );
    setIntelligenceMap(
      Object.fromEntries(
        checks
          .filter((check): check is PromiseFulfilledResult<string> => check.status === "fulfilled")
          .map((check) => [check.value, true])
      )
    );
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

  async function handleGenerateIntelligence(repositoryId: string) {
    setGeneratingRepositoryId(repositoryId);
    setError(null);

    try {
      await generateWorkspaceKnowledge(repositoryId);
      setIntelligenceMap((current) => ({ ...current, [repositoryId]: true }));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Workspace knowledge generation failed");
    } finally {
      setGeneratingRepositoryId(null);
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
      <PageHeader
        eyebrow="GitHub Data"
        title="Repositories"
        description="Synced GitHub repositories with clear metadata, relationship tags, and focused workspace actions."
        actions={
          <Button type="button" onClick={handleSync} disabled={isSyncing} variant="primary">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
            {isSyncing ? "Syncing..." : "Sync repositories"}
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              activeFilter === filter.value
                ? "border-soft-blue-wash bg-soft-blue-wash text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : visibleRepositories.length === 0 ? (
        <EmptyState
          title="No repositories synced"
          description="Run a GitHub sync or switch filters to view owned, forked, contributed, and organization repositories."
        />
      ) : (
        <div className="grid gap-4">
          {visibleRepositories.map((repository) => (
            <Card key={repository.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-semibold">{repository.fullName}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {repository.description ?? "No description provided."}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge>{relationshipLabel(repository)}</Badge>
                  {repository.isFork ? (
                    <Badge>
                      <GitFork className="h-3 w-3" aria-hidden="true" />
                      Fork
                    </Badge>
                  ) : null}
                  <Badge>{repository.visibility ?? "public"}</Badge>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{repository.primaryLanguage ?? "Unknown language"}</span>
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

              <div className="mt-6 flex flex-wrap gap-2">
                <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
                  Open in GitHub
                </a>
                {intelligenceMap[repository.id] ? (
                  <Link href={`/app/repositories/${repository.ownerLogin}/${repository.name}/workspace`} className="openforge-button-primary">
                    Open Workspace
                  </Link>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleGenerateIntelligence(repository.id)}
                    disabled={generatingRepositoryId === repository.id}
                    variant="primary"
                  >
                    <BrainCircuit className="h-4 w-4" aria-hidden="true" />
                    {generatingRepositoryId === repository.id ? "Generating..." : "Prepare Workspace"}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

