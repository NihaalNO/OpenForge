"use client";

import type { GitHubRepositorySummary, GeneratedWorkspaceCard, WorkspaceModuleResponse, WorkspaceModuleType } from "@openforge/shared";
import { ExternalLink, Sparkles } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { WorkspaceCard } from "./workspace-components";

function cards(payload: Record<string, unknown>): GeneratedWorkspaceCard[] {
  return Array.isArray(payload.cards) ? payload.cards as GeneratedWorkspaceCard[] : [];
}

export function GeneratedWorkspaceModule({ repository, moduleType, modulePackage, isGenerating, onAskMentor }: { repository: GitHubRepositorySummary; moduleType: WorkspaceModuleType; modulePackage: WorkspaceModuleResponse | undefined; isGenerating: boolean; onAskMentor: ((card: { id: string; name: string }) => void) | undefined }) {
  if (isGenerating || !modulePackage) return <EmptyState title={`Preparing ${moduleType}`} description="OpenForge is generating repository-specific guidance from the current evidence snapshot." />;
  const provenance = modulePackage.provenance;
  if (modulePackage.status === "failed") return <EmptyState title="Groq generation is currently unavailable." description="Repository facts are still available, but OpenForge could not prepare repository-specific guidance. Try generating this module again." />;
  if (modulePackage.status !== "ready" || provenance.generationSource !== "groq" || provenance.provider !== "groq" || !provenance.grounded) return <EmptyState title="Repository-specific guidance is not available yet." description="OpenForge will not display semantic cards without validated Groq content and repository evidence." />;
  const generatedCards = cards(modulePackage.payload);
  if (!generatedCards.length) return <EmptyState title="There is not enough repository evidence for this module." description="No semantic cards were created merely to fill the interface." />;
  return <div className="space-y-4">
    {generatedCards.map((card) => <WorkspaceCard key={card.id}>
      <h2 className="text-xl font-semibold text-foreground">{card.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.summary}</p>
      {card.details.length ? <ul className="mt-4 space-y-2 text-sm text-foreground">{card.details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
      <div className="mt-4 flex flex-wrap gap-2">{card.evidence.map((item, index) => <Badge key={`${card.id}-${index}`}>{item.path ?? item.identifier ?? item.type}</Badge>)}</div>
      <div className="mt-4 flex flex-wrap gap-2">{onAskMentor ? <Button type="button" onClick={() => onAskMentor({ id: card.id, name: card.title })}><Sparkles className="h-4 w-4" />Ask Mentor</Button> : null}<a className="openforge-button" href={repository.htmlUrl} target="_blank" rel="noreferrer">Open repository<ExternalLink className="h-4 w-4" /></a></div>
      {process.env.NODE_ENV === "development" ? <details className="mt-4 text-xs text-muted-foreground"><summary className="cursor-pointer">View Evidence</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(card.evidence, null, 2)}</pre></details> : null}
    </WorkspaceCard>)}
  </div>;
}
