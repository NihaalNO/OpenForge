"use client";

import type { GitHubRepositorySummary } from "@openforge/shared";
import { ExternalLink, Github, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/components/common/ui";
import { fetchGitHubRepositories } from "@/lib/api/github";
import { relationshipLabel } from "./workspace-components";

export function WorkspaceLauncher() {
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRepositories() {
      const response = await fetchGitHubRepositories();
      setRepositories(response.repositories);
    }

    loadRepositories()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load repositories"))
      .finally(() => setIsLoading(false));
  }, []);

  const visibleRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repositories;

    return repositories.filter((repository) =>
      [
        repository.fullName,
        repository.description ?? "",
        repository.primaryLanguage ?? "",
        repository.relationshipType,
        ...repository.topics
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, repositories]);

  if (isLoading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Open a contribution workspace"
        description="Choose a synced repository to open its IDE-like workspace foundation."
      />

      <Card className="p-4">
        <label className="flex min-h-11 items-center gap-3 rounded-full border border-border bg-background px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Search repositories</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search repositories"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </Card>

      {error ? <ErrorState message={error} /> : null}

      {repositories.length === 0 ? (
        <EmptyState
          title="No repositories synced"
          description="Sync GitHub Data first, then return here to open a repository workspace."
          action={<Link href="/app/repositories" className="openforge-button-primary">Go to GitHub Data</Link>}
        />
      ) : visibleRepositories.length === 0 ? (
        <EmptyState
          title="No repositories match your search"
          description="Try the repository name, owner, language, relationship, or topic."
        />
      ) : (
        <div className="grid gap-4">
          {visibleRepositories.map((repository) => {
            const workspaceHref = `/app/repositories/${repository.ownerLogin}/${repository.name}/workspace`;

            return (
              <Card key={repository.id}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{relationshipLabel(repository)}</Badge>
                      <Badge>{repository.primaryLanguage ?? "Unknown language"}</Badge>
                    </div>
                    <h2 className="mt-4 break-words text-xl font-semibold">{repository.fullName}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {repository.description ?? "No description provided."}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
                      <Github className="h-4 w-4" aria-hidden="true" />
                      Open in GitHub
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    <Link href={workspaceHref} className="openforge-button-primary">
                      Open Workspace
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

