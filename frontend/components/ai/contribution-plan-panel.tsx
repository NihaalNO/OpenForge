"use client";

import type { AiContributionPlan, GitHubIssueSummary, GitHubRepositorySummary } from "@opensource-compass/shared";
import { RefreshCw, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { generateContributionPlan } from "@/lib/api/ai";
import { fetchGitHubIssues, fetchGitHubRepositories } from "@/lib/api/github";
import { AiResultList } from "./ai-result-list";

export function ContributionPlanPanel() {
  const searchParams = useSearchParams();
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [issues, setIssues] = useState<GitHubIssueSummary[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [plan, setPlan] = useState<AiContributionPlan | null>(null);
  const [cached, setCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRepository = useMemo(
    () => repositories.find((repository) => repository.id === selectedRepositoryId) ?? null,
    [repositories, selectedRepositoryId]
  );

  useEffect(() => {
    const initialRepositoryId = searchParams.get("repositoryId");

    fetchGitHubRepositories()
      .then((response) => {
        setRepositories(response.repositories);

        if (initialRepositoryId && response.repositories.some((repository) => repository.id === initialRepositoryId)) {
          setSelectedRepositoryId(initialRepositoryId);
        }
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Repositories failed to load"));
  }, [searchParams]);

  useEffect(() => {
    setSelectedIssueId("");
    setIssues([]);

    if (!selectedRepository) {
      return;
    }

    setIsLoadingIssues(true);
    fetchGitHubIssues(selectedRepository.ownerLogin, selectedRepository.name)
      .then((response) => setIssues(response.issues))
      .catch(() => setIssues([]))
      .finally(() => setIsLoadingIssues(false));
  }, [selectedRepository]);

  async function runPlan(regenerate = false) {
    if (!selectedRepositoryId) {
      setError("Select a repository before generating a contribution plan.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input: { repositoryId: string; issueId?: string; regenerate: boolean } = {
        repositoryId: selectedRepositoryId,
        regenerate
      };

      if (selectedIssueId) {
        input.issueId = selectedIssueId;
      }

      const response = await generateContributionPlan(input);
      setPlan(response.analysis);
      setCached(response.cached);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "Contribution plan generation failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">AI contribution planner</p>
        <h1 className="mt-1 text-2xl font-semibold">AI Planner</h1>
      </div>

      <div className="linear-card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Repository</span>
            <select
              value={selectedRepositoryId}
              onChange={(event) => setSelectedRepositoryId(event.target.value)}
              className="linear-input"
            >
              <option value="">Select a synced repository</option>
              {repositories.map((repository) => (
                <option key={repository.id} value={repository.id}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-muted-foreground">Issue optional</span>
            <select
              value={selectedIssueId}
              onChange={(event) => setSelectedIssueId(event.target.value)}
              disabled={!selectedRepository || isLoadingIssues}
              className="linear-input"
            >
              <option value="">{isLoadingIssues ? "Loading issues..." : "Repository-level plan"}</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  #{issue.number} {issue.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedRepository ? (
          <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
            Planning for {selectedRepository.fullName}
            {selectedIssueId ? " with a selected issue context." : " at repository level."}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runPlan(false)}
            disabled={isLoading || !selectedRepositoryId}
            className="linear-button-primary"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {isLoading ? "Generating..." : plan ? "Load cached" : "Generate plan"}
          </button>
          {plan ? (
            <button
              type="button"
              onClick={() => void runPlan(true)}
              disabled={isLoading}
              className="linear-button"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Regenerate
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {cached ? <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Cached result</p> : null}
      </div>

      {plan ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="linear-card p-5">
            <AiResultList title="Task plan" items={plan.taskPlan} />
          </div>
          <div className="linear-card p-5">
            <AiResultList title="Setup checklist" items={plan.setupChecklist} />
          </div>
          <div className="linear-card p-5">
            <AiResultList title="Implementation checklist" items={plan.implementationChecklist} />
          </div>
          <div className="linear-card p-5">
            <AiResultList title="Testing checklist" items={plan.testingChecklist} />
          </div>
          <div className="linear-card p-5 md:col-span-2">
            <AiResultList title="PR checklist" items={plan.pullRequestChecklist} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
