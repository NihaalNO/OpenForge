"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Github,
  GitPullRequest,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Route,
  SearchCode
} from "lucide-react";
import Link from "next/link";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { relationshipLabel, WorkspaceCard } from "./workspace-components";

function formatDate(value?: string | null) {
  if (!value) return "Not generated";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLevel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "Unknown";
}

function estimatedContributionTime(intelligence: RepositoryKnowledgePackage) {
  if (intelligence.complexity.level === "beginner" && intelligence.contributionReadiness.level === "high") return "2-4 hours";
  if (intelligence.complexity.level === "advanced" || intelligence.contributionReadiness.level === "low") return "1-2 days";
  return "4-8 hours";
}

function primaryEntryPoint(intelligence: RepositoryKnowledgePackage) {
  return intelligence.entryPoints[0]?.path ?? intelligence.tree.importantFiles[0]?.path ?? null;
}

function primaryTestPath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.testStructure.testDirectories[0] ?? intelligence.testStructure.testFiles[0] ?? null;
}

function importantModule(intelligence: RepositoryKnowledgePackage) {
  return (
    intelligence.tree.directories.find((directory) => directory.importance === "high")?.path ??
    intelligence.tree.importantFiles.find((file) => file.importance === "high")?.path ??
    intelligence.tree.directories[0]?.path ??
    null
  );
}

function contributingPath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.docs.docFiles.find((path) => /contributing/i.test(path)) ?? null;
}

function readmePath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.readme.path ?? "README";
}

function joinList(items: string[], fallback: string) {
  return items.length ? items.join(", ") : fallback;
}

function healthBreakdown(intelligence: RepositoryKnowledgePackage) {
  const hasImportantStructure = intelligence.tree.directories.some((directory) => directory.importance !== "low") ||
    intelligence.entryPoints.length > 0;
  const maintainabilitySignals = [
    intelligence.manifests.length > 0,
    intelligence.tree.importantFiles.length > 0,
    !intelligence.sourceLimits.truncated,
    Boolean(intelligence.readme.content)
  ].filter(Boolean).length;

  return [
    {
      label: "Documentation",
      score: Math.min(100, 35 + (intelligence.readme.content ? 25 : 0) + Math.min(intelligence.docs.docFiles.length, 4) * 10),
      detail: intelligence.readme.content ? "README detected" : "README missing"
    },
    {
      label: "Testing",
      score: intelligence.testStructure.hasTests ? 82 : 28,
      detail: intelligence.testStructure.hasTests ? "Tests detected" : "No tests detected"
    },
    {
      label: "CI/CD",
      score: intelligence.workflowFiles.length ? 84 : 32,
      detail: intelligence.workflowFiles.length ? `${intelligence.workflowFiles.length} workflow files` : "No workflow files"
    },
    {
      label: "License",
      score: intelligence.docs.hasLicense ? 90 : 35,
      detail: intelligence.docs.hasLicense ? "License detected" : "License not detected"
    },
    {
      label: "Contribution Guide",
      score: intelligence.docs.hasContributingGuide ? 88 : 40,
      detail: intelligence.docs.hasContributingGuide ? "Guide detected" : "No guide detected"
    },
    {
      label: "Repository Structure",
      score: hasImportantStructure ? 78 : 45,
      detail: hasImportantStructure ? "Entry points mapped" : "Structure is limited"
    },
    {
      label: "Maintainability",
      score: 35 + maintainabilitySignals * 15,
      detail: intelligence.sourceLimits.truncated ? "Scan was truncated" : "Scan completed"
    }
  ];
}

function healthScore(intelligence: RepositoryKnowledgePackage) {
  const items = healthBreakdown(intelligence);
  return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
}

function recommendation(intelligence: RepositoryKnowledgePackage) {
  const readiness = intelligence.contributionReadiness.level;
  const complexity = intelligence.complexity.level;
  const strengths = [
    intelligence.readme.content ? "a README" : null,
    intelligence.docs.hasContributingGuide ? "a contribution guide" : null,
    intelligence.testStructure.hasTests ? "tests" : null,
    intelligence.workflowFiles.length ? "CI" : null,
    intelligence.docs.hasLicense ? "a license" : null
  ].filter(Boolean) as string[];
  const cautions = [
    !intelligence.docs.hasContributingGuide ? "no contribution guide" : null,
    !intelligence.testStructure.hasTests ? "no detected tests" : null,
    !intelligence.workflowFiles.length ? "no detected CI" : null,
    intelligence.sourceLimits.truncated ? "a truncated intelligence scan" : null
  ].filter(Boolean) as string[];
  const startTarget = contributingPath(intelligence) ?? readmePath(intelligence);

  if (readiness === "high" && complexity !== "advanced") {
    return `This repository is a strong place to begin contributing. It has ${joinList(strengths, "several useful project signals")} and a ${formatLevel(complexity)} structure. Start by reading ${startTarget}, then inspect ${primaryTestPath(intelligence) ?? primaryEntryPoint(intelligence) ?? "the primary entry point"} before choosing a small change.`;
  }

  if (readiness === "medium") {
    return `This repository is workable for a focused contribution, but it needs a careful first pass. OpenForge found ${joinList(strengths, "some structure")} and ${cautions.length ? cautions.join(", ") : "no major blockers"}. Start with ${startTarget}, keep the first change narrow, and verify setup before implementing.`;
  }

  return `This repository may be challenging for a first contribution. OpenForge found ${cautions.length ? cautions.join(", ") : "limited readiness signals"} and a ${formatLevel(complexity)} complexity profile. Start by reading ${startTarget}, identify one safe documentation or test-adjacent change, and avoid broad implementation work until setup is clear.`;
}

export function RepositoryReadinessHero({
  repository,
  intelligence,
  isGenerating,
  onRegenerate
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage;
  isGenerating: boolean;
  onRegenerate: () => void;
}) {
  return (
    <WorkspaceCard className="p-0">
      <div className="grid overflow-hidden lg:grid-cols-[1fr_330px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge>{repository.primaryLanguage ?? "Unknown language"}</Badge>
            <Badge>{relationshipLabel(repository)}</Badge>
            <Badge>{formatLevel(intelligence.contributionReadiness.level)} readiness</Badge>
          </div>
          <h2 className="mt-5 break-words text-3xl font-semibold leading-tight text-foreground lg:text-4xl">
            {repository.name}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {repository.description ?? "No description provided."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HeroMetric label="Readiness" value={`${intelligence.contributionReadiness.score}/100`} detail={formatLevel(intelligence.contributionReadiness.level)} />
            <HeroMetric label="Complexity" value={formatLevel(intelligence.complexity.level)} detail={`${intelligence.complexity.score}/100`} />
            <HeroMetric label="First contribution" value={estimatedContributionTime(intelligence)} detail="Estimated time" />
            <HeroMetric label="Intelligence" value={formatDate(intelligence.generatedAt)} detail="Last generated" />
          </div>
        </div>

        <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
          <div className="rounded-[24px] bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Primary action</p>
            <button
              type="button"
              disabled
              className="mt-3 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-medium text-white opacity-70"
            >
              <Route className="h-4 w-4" aria-hidden="true" />
              Start Mission
            </button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Mission planning arrives in a later phase.</p>
          </div>

          <div className="mt-4 grid gap-2">
            <Button type="button" onClick={onRegenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Regenerate Intelligence
            </Button>
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
              <Github className="h-4 w-4" aria-hidden="true" />
              Open in GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </WorkspaceCard>
  );
}

function HeroMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-3 break-words text-xl font-semibold capitalize text-foreground">{value}</p>
      <p className="mt-1 break-words text-sm capitalize text-muted-foreground">{detail}</p>
    </div>
  );
}

export function OpenForgeRecommendation({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  return (
    <WorkspaceCard className="border-brand-violet/20 bg-soft-blue-wash/55">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-brand-violet">OpenForge Recommendation</p>
          <p className="mt-2 max-w-4xl text-base leading-7 text-foreground">{recommendation(intelligence)}</p>
        </div>
      </div>
    </WorkspaceCard>
  );
}

export function RepositorySnapshot({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  const items = [
    { label: "Languages", values: intelligence.detectedStack.languages },
    { label: "Frameworks", values: intelligence.detectedStack.frameworks },
    { label: "Package managers", values: intelligence.detectedStack.packageManagers },
    { label: "Test frameworks", values: intelligence.testStructure.detectedFrameworks },
    { label: "CI provider", values: intelligence.detectedStack.ci.length ? intelligence.detectedStack.ci : intelligence.workflowFiles.map((workflow) => workflow.name) },
    { label: "License", values: [intelligence.docs.hasLicense ? "Detected" : "Not detected"] },
    { label: "Documentation", values: [intelligence.readme.content ? "README" : "No README", intelligence.docs.hasContributingGuide ? "Contributing guide" : "No guide"] },
    { label: "Important docs", values: intelligence.docs.docFiles.slice(0, 4) }
  ];

  return (
    <WorkspaceCard>
      <h2 className="text-xl font-semibold">Repository Snapshot</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.values.length ? item.values.slice(0, 6).map((value) => <Badge key={`${item.label}-${value}`}>{value}</Badge>) : <Badge>None detected</Badge>}
            </div>
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

export function QuickStartSection({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  const items = [
    { label: "README", path: readmePath(intelligence), why: "Start here for setup, purpose, and project expectations." },
    { label: "CONTRIBUTING.md", path: contributingPath(intelligence) ?? "Not detected", why: "Use this for maintainer rules before changing code." },
    { label: "Entry point", path: primaryEntryPoint(intelligence) ?? "Not detected", why: "Trace how the project starts and where main behavior lives." },
    { label: "Tests", path: primaryTestPath(intelligence) ?? "Not detected", why: "Understand verification before implementing changes." },
    { label: "Important module", path: importantModule(intelligence) ?? "Not detected", why: "Inspect a high-signal area once the basics are clear." }
  ];

  return (
    <WorkspaceCard>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Quick Start</h2>
          <p className="mt-1 text-sm text-muted-foreground">Where should I begin?</p>
        </div>
        <Badge>Suggested reading order</Badge>
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className="grid min-h-20 cursor-pointer gap-3 rounded-[18px] border border-border bg-background p-4 text-left transition-colors hover:border-brand-violet/40 hover:bg-card sm:grid-cols-[44px_1fr_auto]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft-blue-wash text-sm font-semibold text-brand-violet">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{item.label}</span>
              <span className="mt-1 block break-words text-sm text-muted-foreground">{item.path}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{item.why}</span>
            </span>
            <span className="self-center text-xs font-medium uppercase text-muted-foreground">Future open</span>
          </button>
        ))}
      </div>
    </WorkspaceCard>
  );
}

export function RepositoryHealth({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  const score = healthScore(intelligence);
  const breakdown = healthBreakdown(intelligence);

  return (
    <WorkspaceCard>
      <div className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">OpenForge Repository Health</p>
          <p className="mt-3 text-5xl font-semibold text-foreground">{score}</p>
          <p className="mt-1 text-sm text-muted-foreground">out of 100</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand-violet" style={{ width: `${score}%` }} />
          </div>
        </div>

        <div className="grid gap-3">
          {breakdown.map((item) => (
            <div key={item.label} className="rounded-[18px] border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{item.label}</p>
                <span className="text-sm font-semibold text-brand-violet">{item.score}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-violet" style={{ width: `${item.score}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceCard>
  );
}

export function WorkspaceNextActions({ repository }: { repository: GitHubRepositorySummary }) {
  const actions = [
    {
      title: "Explore Repository",
      description: "Open the repository detail view and review synced GitHub metadata.",
      icon: SearchCode,
      enabled: true,
      href: `/app/repositories/${repository.ownerLogin}/${repository.name}`
    },
    {
      title: "Mission Planning",
      description: "Turn repository intelligence into a contribution path.",
      icon: GitPullRequest,
      enabled: false
    },
    {
      title: "Ask Mentor",
      description: "Ask grounded questions about setup, files, and contribution strategy.",
      icon: MessageSquareText,
      enabled: false
    }
  ];

  return (
    <WorkspaceCard>
      <h2 className="text-xl font-semibold">What would you like to do next?</h2>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-foreground">{action.title}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">{action.description}</span>
                {!action.enabled ? <Badge className="mt-4">Available in next phase</Badge> : null}
              </span>
              {action.enabled ? <ArrowRight className="h-4 w-4 text-brand-violet" aria-hidden="true" /> : null}
            </>
          );

          if (action.enabled && action.href) {
            return (
              <Link
                key={action.title}
                href={action.href}
                className="grid min-h-40 cursor-pointer gap-4 rounded-[24px] border border-border bg-background p-5 transition-colors hover:border-brand-violet/40 hover:bg-card sm:grid-cols-[auto_1fr_auto]"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={action.title}
              className="grid min-h-40 gap-4 rounded-[24px] border border-border bg-background p-5 opacity-75 sm:grid-cols-[auto_1fr]"
            >
              {content}
            </div>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

export function WorkspaceOverview({
  repository,
  intelligence,
  isGenerating,
  onRegenerate
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
  isGenerating: boolean;
  onRegenerate: () => void;
}) {
  if (!intelligence) {
    return (
      <EmptyState
        title="Generate Repository Intelligence"
        description={`${repository.fullName} is ready to open, but the Overview needs Repository Intelligence to answer readiness, difficulty, starting points, and next actions.`}
        action={
          <Button type="button" onClick={onRegenerate} disabled={isGenerating} variant="primary">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {isGenerating ? "Generating..." : "Generate Repository Intelligence"}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <RepositoryReadinessHero
        repository={repository}
        intelligence={intelligence}
        isGenerating={isGenerating}
        onRegenerate={onRegenerate}
      />
      <OpenForgeRecommendation intelligence={intelligence} />
      <RepositorySnapshot intelligence={intelligence} />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <QuickStartSection intelligence={intelligence} />
        <RepositoryHealth intelligence={intelligence} />
      </div>
      <WorkspaceNextActions repository={repository} />
    </div>
  );
}
