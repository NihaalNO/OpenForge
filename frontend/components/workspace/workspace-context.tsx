"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage, WorkspaceModuleResponse, WorkspaceModuleType, WorkspaceStatusResponse } from "@openforge/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchGitHubRepository,
  fetchRepositoryContext, fetchWorkspaceModule, fetchWorkspaceStatus, prepareWorkspace
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
  intelligence: RepositoryKnowledgePackage | null;
  isLoading: boolean;
  isGenerating: boolean;
  preparation: WorkspaceStatusResponse | null;
  modulePackages: Partial<Record<WorkspaceModuleType,WorkspaceModuleResponse>>;
  refresh: () => Promise<void>;
  status: WorkspaceStatus;
  error: string | null;
  futureMission: null;
  mentorContext: WorkspaceMentorContext;
  futureActivity: null;
  setMentorContext: (context: WorkspaceMentorContext) => void;
  retry: () => Promise<void>;
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
  const [isGenerating,setIsGenerating] = useState(false);
  const [preparation,setPreparation] = useState<WorkspaceStatusResponse|null>(null);
  const [modulePackages,setModulePackages]=useState<Partial<Record<WorkspaceModuleType,WorkspaceModuleResponse>>>({});
  const [error, setError] = useState<string | null>(null);
  const [mentorContext, setMentorContext] = useState<WorkspaceMentorContext>({ source: "workspace" });

  async function loadWorkspace(active = true) {
    setIsLoading(true);
    setError(null);
    setRepository(null);
    setIntelligence(null);
    setPreparation(null);
    setModulePackages({});
    setMentorContext({ source: "workspace" });

    try {
      const repositoryResponse = await fetchGitHubRepository(owner, repo);
      if (!active) return;

      setRepository(repositoryResponse.repository);

      const prepared=await prepareWorkspace(repositoryResponse.repository.id);
      if(active){setPreparation(prepared);setIsGenerating(!prepared.ready && prepared.job?.status!=="failed");}
      if(prepared.ready){const types:WorkspaceModuleType[]=["explorer","mission","mentor","review","timeline"];const packages=await Promise.all(types.map((type)=>fetchWorkspaceModule(repositoryResponse.repository.id,type)));if(active && packages.every((item)=>item.repositoryId===repositoryResponse.repository.id))setModulePackages(Object.fromEntries(packages.map((item)=>[item.moduleType,item])));}

      try {
        const intelligenceResponse = await fetchRepositoryContext(repositoryResponse.repository.id);
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

  useEffect(()=>{if(!repository||!isGenerating)return;const repositoryId=repository.id;const timer=window.setInterval(()=>{void fetchWorkspaceStatus(repositoryId).then(async(next)=>{setPreparation(next);setIsGenerating(!next.ready&&next.job?.status!=="failed");if(next.ready){const [context,...packages]=await Promise.all([fetchRepositoryContext(repositoryId),...(["explorer","mission","mentor","review","timeline"] as WorkspaceModuleType[]).map((type)=>fetchWorkspaceModule(repositoryId,type))]);if(context.knowledgePackage.repositoryId===repositoryId&&packages.every((item)=>item.repositoryId===repositoryId)){setIntelligence(context.knowledgePackage);setModulePackages(Object.fromEntries(packages.map((item)=>[item.moduleType,item])));}}}).catch(()=>undefined);},2000);return()=>window.clearInterval(timer);},[repository,isGenerating]);

  const value = useMemo<WorkspaceContextValue>(() => {
    const status: WorkspaceStatus = isLoading ? "loading" : error ? "error" : intelligence ? "ready" : "empty";

    return {
      repository,
      intelligence,
      isLoading,
      isGenerating,
      preparation,
      modulePackages,
      refresh: async()=>{if(!repository)return;const next=await prepareWorkspace(repository.id,true);setPreparation(next);setIsGenerating(true);},
      status,
      error,
      futureMission: null,
      mentorContext,
      futureActivity: null,
      setMentorContext,
      retry: () => loadWorkspace()
    };
  }, [repository, intelligence, isLoading, isGenerating, error, mentorContext,preparation,modulePackages]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }

  return context;
}


