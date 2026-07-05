"use client";

import type { GitHubRepositorySummary, WorkspaceKnowledgePackage } from "@openforge/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchGitHubRepository,
  fetchWorkspaceKnowledge,
  generateWorkspaceKnowledge
} from "@/lib/api/github";

export type WorkspaceStatus = "loading" | "ready" | "empty" | "error";
export type WorkspaceMentorSource = "workspace" | "explorer" | "mission" | "review" | "timeline";

export interface WorkspaceMentorContext {
  source: WorkspaceMentorSource;
  category?: string;
  conceptId?: string;
  subject?: string;
  prompt?: string;
}

interface WorkspaceContextValue {
  repository: GitHubRepositorySummary | null;
  intelligence: WorkspaceKnowledgePackage | null;
  isLoading: boolean;
  isGenerating: boolean;
  status: WorkspaceStatus;
  error: string | null;
  futureMission: null;
  mentorContext: WorkspaceMentorContext;
  futureActivity: null;
  setMentorContext: (context: WorkspaceMentorContext) => void;
  retry: () => Promise<void>;
  regenerateWorkspaceKnowledge: () => Promise<void>;
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
  const [intelligence, setIntelligence] = useState<WorkspaceKnowledgePackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentorContext, setMentorContext] = useState<WorkspaceMentorContext>({ source: "workspace" });

  async function loadWorkspace(active = true) {
    setIsLoading(true);
    setError(null);
    setIntelligence(null);

    try {
      const repositoryResponse = await fetchGitHubRepository(owner, repo);
      if (!active) return;

      setRepository(repositoryResponse.repository);

      try {
        const intelligenceResponse = await fetchWorkspaceKnowledge(repositoryResponse.repository.id);
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

  async function regenerateWorkspaceKnowledge() {
    if (!repository) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateWorkspaceKnowledge(repository.id, Boolean(intelligence));
      setIntelligence(response.knowledgePackage);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Workspace knowledge generation failed");
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
      mentorContext,
      futureActivity: null,
      setMentorContext,
      retry: () => loadWorkspace(),
      regenerateWorkspaceKnowledge
    };
  }, [repository, intelligence, isLoading, isGenerating, error, mentorContext]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}

