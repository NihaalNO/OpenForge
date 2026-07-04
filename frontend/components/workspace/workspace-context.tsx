"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchGitHubRepository,
  fetchRepositoryIntelligence,
  generateRepositoryIntelligence
} from "@/lib/api/github";

export type WorkspaceStatus = "loading" | "ready" | "empty" | "error";

interface WorkspaceContextValue {
  repository: GitHubRepositorySummary | null;
  intelligence: RepositoryKnowledgePackage | null;
  isLoading: boolean;
  isGenerating: boolean;
  status: WorkspaceStatus;
  error: string | null;
  futureMission: null;
  futureMentor: null;
  futureActivity: null;
  retry: () => Promise<void>;
  regenerateIntelligence: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  owner,
  repo,
  children
}: {
  owner: string;
  repo: string;
  children: ReactNode;
}) {
  const [repository, setRepository] = useState<GitHubRepositorySummary | null>(null);
  const [intelligence, setIntelligence] = useState<RepositoryKnowledgePackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspace(active = true) {
    setIsLoading(true);
    setError(null);
    setIntelligence(null);

    try {
      const repositoryResponse = await fetchGitHubRepository(owner, repo);
      if (!active) return;

      setRepository(repositoryResponse.repository);

      try {
        const intelligenceResponse = await fetchRepositoryIntelligence(repositoryResponse.repository.id);
        if (active) {
          setIntelligence(intelligenceResponse.knowledgePackage);
        }
      } catch {
        if (active) {
          setIntelligence(null);
        }
      }
    } catch (loadError) {
      if (active) {
        setRepository(null);
        setError(loadError instanceof Error ? loadError.message : "Unable to load workspace");
      }
    } finally {
      if (active) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    void loadWorkspace(active);

    return () => {
      active = false;
    };
  }, [owner, repo]);

  async function regenerateIntelligence() {
    if (!repository) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateRepositoryIntelligence(repository.id, Boolean(intelligence));
      setIntelligence(response.knowledgePackage);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Repository intelligence generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  const value = useMemo<WorkspaceContextValue>(() => {
    const status: WorkspaceStatus = isLoading ? "loading" : error ? "error" : intelligence ? "ready" : "empty";

    return {
      repository,
      intelligence,
      isLoading,
      isGenerating,
      status,
      error,
      futureMission: null,
      futureMentor: null,
      futureActivity: null,
      retry: () => loadWorkspace(),
      regenerateIntelligence
    };
  }, [repository, intelligence, isLoading, isGenerating, error]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}
