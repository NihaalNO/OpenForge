"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Code2,
  Database,
  ExternalLink,
  Github,
  GitPullRequest,
  LockKeyhole,
  MessageSquareText,
  Route,
  SearchCode,
  Server,
  ShieldCheck,
  TestTube2,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { DecisionFlow, PathVisualization } from "@/components/visualizations";
import { cn } from "@/lib/utils";
import { relationshipLabel, WorkspaceCard } from "./workspace-components";

type Tone = "positive" | "prepare" | "blocked";
type Rating = "Strong" | "Promising" | "Needs care";

function formatDate(value?: string | null) {
  if (!value) return "Not prepared yet";

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

function sentenceCase(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function listOrFallback(items: string[], fallback: string) {
  return items.length ? items.join(", ") : fallback;
}

function firstMatch(paths: string[], pattern: RegExp) {
  return paths.find((path) => pattern.test(path)) ?? null;
}

function allKnownPaths(intelligence: RepositoryKnowledgePackage) {
  return [
    ...intelligence.raw.selectedFilePaths,
    ...intelligence.docs.docFiles,
    ...intelligence.testStructure.testDirectories,
    ...intelligence.testStructure.testFiles,
    ...intelligence.entryPoints.map((entry) => entry.path),
    ...intelligence.tree.directories.map((directory) => directory.path),
    ...intelligence.tree.importantFiles.map((file) => file.path)
  ];
}

function readmePath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.readme.path ?? "README";
}

function primaryEntryPoint(intelligence: RepositoryKnowledgePackage) {
  return intelligence.entryPoints[0]?.path ?? intelligence.tree.importantFiles[0]?.path ?? null;
}

function primaryTestPath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.testStructure.testDirectories[0] ?? intelligence.testStructure.testFiles[0] ?? null;
}

function primaryModule(intelligence: RepositoryKnowledgePackage) {
  const paths = allKnownPaths(intelligence);
  const authPath = firstMatch(paths, /(^|\/|\\)(auth|authentication|session|oauth|login|jwt)(\/|\\|\.|$)/i);

  return (
    authPath ??
    intelligence.tree.directories.find((directory) => directory.importance === "high")?.path ??
    intelligence.entryPoints[0]?.path ??
    intelligence.tree.importantFiles.find((file) => file.importance === "high")?.path ??
    null
  );
}

function confidenceLevel(intelligence: RepositoryKnowledgePackage) {
  if (!intelligence.sourceLimits.truncated && intelligence.readme.content && intelligence.tree.processedEntries > 0) return "High";
  if (!intelligence.sourceLimits.truncated || intelligence.readme.content) return "Medium";
  return "Developing";
}

function readinessModel(intelligence: RepositoryKnowledgePackage): {
  answer: string;
  tone: Tone;
  reasons: string[];
  cautions: string[];
} {
  const readiness = intelligence.contributionReadiness.level;
  const reasons = intelligence.contributionReadiness.reasons.length
    ? intelligence.contributionReadiness.reasons
    : [
        intelligence.readme.content ? "README gives the project a clear starting point." : null,
        intelligence.testStructure.hasTests ? "Tests are present, so changes can be checked." : null,
        intelligence.workflowFiles.length ? "CI is configured for pull request feedback." : null,
        intelligence.docs.hasContributingGuide ? "Contributor guidance is available." : null
      ].filter(Boolean) as string[];
  const cautions = intelligence.contributionReadiness.blockers.length
    ? intelligence.contributionReadiness.blockers
    : [
        !intelligence.docs.hasContributingGuide ? "No contribution guide was detected." : null,
        !intelligence.testStructure.hasTests ? "No tests were detected in the scan." : null,
        intelligence.sourceLimits.truncated ? "The repository scan was truncated." : null
      ].filter(Boolean) as string[];

  if (readiness === "high") {
    return {
      answer: "Yes",
      tone: "positive",
      reasons: reasons.slice(0, 4),
      cautions: cautions.slice(0, 2)
    };
  }

  if (readiness === "medium") {
    return {
      answer: "With Some Preparation",
      tone: "prepare",
      reasons: reasons.slice(0, 3),
      cautions: cautions.slice(0, 3)
    };
  }

  return {
    answer: "Not Yet",
    tone: "blocked",
    reasons: reasons.slice(0, 2),
    cautions: cautions.slice(0, 4)
  };
}

function toneClasses(tone: Tone) {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "prepare") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function toneIcon(tone: Tone) {
  if (tone === "positive") return CheckCircle2;
  if (tone === "prepare") return CircleDashed;
  return AlertTriangle;
}

function openForgeInsight(intelligence: RepositoryKnowledgePackage) {
  const paths = allKnownPaths(intelligence);
  const docsPath = firstMatch(paths, /(^|\/|\\)docs?(\/|\\|$)|readme|contributing/i);
  const testsPath = primaryTestPath(intelligence);
  const authPath = firstMatch(paths, /(^|\/|\\)(auth|authentication|session|oauth|login|jwt)(\/|\\|\.|$)/i);

  if (docsPath && testsPath && authPath) {
    return `Start by triangulating ${docsPath}, ${authPath}, and ${testsPath}. Those three areas explain the project rules, the risky behavior, and how maintainers expect changes to be proven.`;
  }

  if (authPath && testsPath) {
    return `The fastest way to understand this repository is to read ${authPath} beside ${testsPath}. Authentication touches product behavior, while tests show which promises the maintainers protect.`;
  }

  if (docsPath && testsPath) {
    return `Treat ${docsPath} as the map and ${testsPath} as the contract. A first contribution should move between those two before changing core code.`;
  }

  if (intelligence.tree.totalEntries > 120 && primaryModule(intelligence)) {
    return `Although OpenForge mapped ${intelligence.tree.totalEntries} repository entries, your first contribution should probably stay near ${primaryModule(intelligence)}. A narrow first pass will teach more than a broad tour.`;
  }

  return `Begin with ${readmePath(intelligence)} and keep the first change close to ${primaryEntryPoint(intelligence) ?? "the clearest entry point"}. This repository will make more sense after one small, verified path through it.`;
}

function technologyOverview(intelligence: RepositoryKnowledgePackage) {
  const paths = allKnownPaths(intelligence);
  const frameworks = intelligence.detectedStack.frameworks;
  const authPath = firstMatch(paths, /(^|\/|\\)(auth|authentication|session|oauth|login|jwt|supabase)(\/|\\|\.|$)/i);
  const backendFramework = frameworks.find((item) => /express|fastify|nestjs|koa|hono|django|flask|rails|spring/i.test(item));
  const frontendFramework = frameworks.find((item) => /next|react|vue|svelte|angular|remix|vite/i.test(item));

  return [
    { label: "Frontend", value: frontendFramework ?? intelligence.detectedStack.languages[0] ?? "Not detected", icon: Code2 },
    { label: "Backend", value: backendFramework ?? primaryEntryPoint(intelligence) ?? "Not detected", icon: Server },
    { label: "Database", value: listOrFallback(intelligence.detectedStack.databases, "Not detected"), icon: Database },
    { label: "Authentication", value: authPath ?? "Not detected", icon: LockKeyhole },
    {
      label: "Testing",
      value: listOrFallback([...intelligence.testStructure.detectedFrameworks, ...intelligence.detectedStack.testing], primaryTestPath(intelligence) ?? "Not detected"),
      icon: TestTube2
    },
    {
      label: "CI/CD",
      value: listOrFallback(intelligence.detectedStack.ci.length ? intelligence.detectedStack.ci : intelligence.workflowFiles.map((workflow) => workflow.name), "Not detected"),
      icon: ShieldCheck
    },
    { label: "Deployment", value: listOrFallback(intelligence.detectedStack.deployment, "Not detected"), icon: UploadCloud }
  ];
}

function ratingFromScore(score: number): Rating {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Promising";
  return "Needs care";
}

function ratingWidth(rating: Rating) {
  if (rating === "Strong") return "88%";
  if (rating === "Promising") return "64%";
  return "38%";
}

function recommendationRatings(
  repository: GitHubRepositorySummary,
  intelligence: RepositoryKnowledgePackage
): Array<{ label: string; rating: Rating; explanation: string }> {
  const architectureSignals = [
    intelligence.entryPoints.length > 0,
    intelligence.tree.directories.some((directory) => directory.importance === "high"),
    intelligence.manifests.length > 0,
    !intelligence.sourceLimits.truncated
  ].filter(Boolean).length;
  const learningSignals = [
    intelligence.readme.content,
    intelligence.testStructure.hasTests,
    intelligence.detectedStack.languages.length > 0,
    intelligence.entryPoints.length > 0
  ].filter(Boolean).length;
  const structureSignals = [
    intelligence.tree.directories.length > 0,
    intelligence.tree.importantFiles.length > 0,
    intelligence.docs.docFiles.length > 0,
    intelligence.manifests.length > 0
  ].filter(Boolean).length;
  const lastActivity = repository.pushedAt ?? repository.githubUpdatedAt ?? repository.lastSyncedAt;

  return [
    {
      label: "Documentation",
      rating: ratingFromScore((intelligence.readme.content ? 45 : 0) + (intelligence.docs.hasContributingGuide ? 25 : 0) + Math.min(intelligence.docs.docFiles.length, 3) * 10),
      explanation: intelligence.readme.content
        ? `${readmePath(intelligence)} gives a first contributor somewhere concrete to start.`
        : "Documentation is thin, so a contributor will need to infer more from code."
    },
    {
      label: "Architecture",
      rating: ratingFromScore(architectureSignals * 24),
      explanation: primaryEntryPoint(intelligence)
        ? `${primaryEntryPoint(intelligence)} anchors the project structure.`
        : "OpenForge found limited entry-point guidance in the scan."
    },
    {
      label: "Learning Value",
      rating: ratingFromScore(learningSignals * 24),
      explanation: `${formatLevel(intelligence.complexity.level)} expected experience with ${listOrFallback(intelligence.detectedStack.languages.slice(0, 2), "a small detected stack")}.`
    },
    {
      label: "Test Coverage",
      rating: intelligence.testStructure.hasTests ? "Strong" : "Needs care",
      explanation: intelligence.testStructure.hasTests
        ? `${primaryTestPath(intelligence)} gives contributors a way to verify behavior.`
        : "No tests were detected, so changes need extra manual verification."
    },
    {
      label: "Maintainer Activity",
      rating: lastActivity ? "Promising" : "Needs care",
      explanation: lastActivity
        ? `Recent GitHub metadata was available from ${formatDate(lastActivity)}.`
        : "No recent activity timestamp was available in the repository context."
    },
    {
      label: "Project Structure",
      rating: ratingFromScore(structureSignals * 24),
      explanation: intelligence.tree.directories.length
        ? `${intelligence.tree.directories.length} directories and ${intelligence.tree.importantFiles.length} important files were mapped.`
        : "The scan did not surface much structure to orient a new contributor."
    }
  ];
}

function firstFifteenMinutes(intelligence: RepositoryKnowledgePackage) {
  const module = primaryModule(intelligence);

  return [
    { title: "Read README", detail: readmePath(intelligence) },
    { title: "Run the project locally", detail: intelligence.manifests[0]?.path ?? "Use the detected package manifest" },
    { title: module && /auth|session|oauth|login|jwt/i.test(module) ? "Understand auth" : "Understand the main module", detail: module ?? "Trace the primary entry point" },
    { title: "Explore tests", detail: primaryTestPath(intelligence) ?? "Look for manual verification paths" },
    { title: "You are ready to begin", detail: "Choose one narrow change and keep notes as you go" }
  ];
}

function mentorship(intelligence: RepositoryKnowledgePackage) {
  const module = primaryModule(intelligence) ?? primaryEntryPoint(intelligence) ?? readmePath(intelligence);
  const testPath = primaryTestPath(intelligence);
  const postpone = intelligence.detectedStack.deployment.length
    ? "deployment"
    : intelligence.workflowFiles.length
      ? "CI tuning"
      : "large architecture changes";

  return {
    begin: module,
    why: testPath
      ? `${module} is close to the behavior a contributor needs to understand, and ${testPath} can show how maintainers expect that behavior to be checked.`
      : `${module} is the clearest mapped starting point, so it will teach the repository shape without forcing a broad rewrite.`,
    postpone
  };
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
      {children ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{children}</p> : null}
    </div>
  );
}

export function WelcomeSection({
  repository,
  intelligence,
  onStartMission
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage;
  onStartMission: () => void;
}) {
  return (
    <WorkspaceCard className="p-0">
      <div className="grid overflow-hidden lg:grid-cols-[1fr_320px]">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium uppercase text-muted-foreground">Welcome</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{repository.primaryLanguage ?? "Unknown language"}</Badge>
            <Badge>{relationshipLabel(repository)}</Badge>
            <Badge>Repository Understood</Badge>
          </div>
          <h2 className="mt-5 break-words text-3xl font-semibold leading-tight text-foreground lg:text-4xl">
            {repository.name}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {repository.description ?? "No description provided."}
          </p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <IntroFact label="Owner" value={repository.ownerLogin} />
            <IntroFact label="Primary language" value={repository.primaryLanguage ?? "Unknown"} />
            <IntroFact label="Workspace prepared" value={formatDate(intelligence.generatedAt)} />
            <IntroFact label="Confidence Level" value={confidenceLevel(intelligence)} />
          </dl>

          <div className="mt-6 rounded-[18px] border border-border bg-background p-4">
            <p className="text-base leading-7 text-foreground">I spent a few moments understanding this repository.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Here is what I discovered, in the order I would introduce it to a first-time contributor.</p>
          </div>
        </div>

        <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
          <button
            type="button"
            onClick={onStartMission}
            className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-violet/90"
          >
            <Route className="h-4 w-4" aria-hidden="true" />
            Start Mission
          </button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Turn this orientation into a guided contribution workflow.</p>

          <div className="mt-5 grid gap-2">
            <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
              <Github className="h-4 w-4" aria-hidden="true" />
              Open on GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </WorkspaceCard>
  );
}

function IntroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold capitalize text-foreground">{value}</dd>
    </div>
  );
}

export function CanContributeSection({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  const model = readinessModel(intelligence);
  const Icon = toneIcon(model.tone);

  return (
    <WorkspaceCard>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div>
          <SectionHeading eyebrow="Can You Contribute Today?" title="The direct answer comes first." />
          <div className={cn("mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold", toneClasses(model.tone))}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {model.answer}
          </div>
        </div>

        <div className="grid gap-3">
          {model.reasons.map((reason) => (
            <SignalRow key={reason} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />} text={sentenceCase(reason)} />
          ))}
          {model.cautions.map((caution) => (
            <SignalRow key={caution} icon={<AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />} text={sentenceCase(caution)} />
          ))}
        </div>
      </div>
    </WorkspaceCard>
  );
}

function SignalRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-border bg-background p-4">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

export function OpenForgeInsightSection({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  return (
    <WorkspaceCard className="border-brand-violet/20 bg-soft-blue-wash/55">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <SectionHeading eyebrow="OpenForge Insight" title="One maintainer-style observation." />
          <p className="mt-4 max-w-4xl text-base leading-7 text-foreground">{openForgeInsight(intelligence)}</p>
        </div>
      </div>
    </WorkspaceCard>
  );
}

export function ProjectBuiltSection({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="How This Project Is Built" title="The technology shape, without the long tour." />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {technologyOverview(intelligence).map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-[18px] border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand-violet" aria-hidden="true" />
                <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
              </div>
              <p className="mt-3 break-words text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

export function WhyRecommendedSection({
  repository,
  intelligence
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage;
}) {
  const ratings = recommendationRatings(repository, intelligence);

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Why OpenForge Recommends This Project" title="The opinion, with reasons attached." />
      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DecisionFlow
          title="Recommendation path"
          nodes={[
            {
              id: "ready",
              title: "Repository ready?",
              description: readinessModel(intelligence).answer,
              status: readinessModel(intelligence).tone === "positive" ? "complete" : readinessModel(intelligence).tone === "prepare" ? "active" : "blocked",
              branch: readinessModel(intelligence).tone === "blocked" ? "no" : "yes"
            },
            {
              id: "docs",
              title: "Documentation signal?",
              description: ratings[0]?.explanation,
              status: ratings[0]?.rating === "Needs care" ? "blocked" : "complete",
              branch: ratings[0]?.rating === "Needs care" ? "maybe" : "yes"
            },
            {
              id: "architecture",
              title: "Architecture understandable?",
              description: ratings[1]?.explanation,
              status: ratings[1]?.rating === "Needs care" ? "active" : "complete",
              branch: ratings[1]?.rating === "Needs care" ? "maybe" : "yes"
            },
            {
              id: "mission",
              title: "Start Mission",
              description: "OpenForge recommends a narrow contribution path instead of a broad repository tour.",
              status: "active",
              branch: "yes"
            }
          ]}
        />
        <div className="grid gap-3">
          {ratings.map((item) => (
            <div key={item.label} className="rounded-[18px] border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <Badge>{item.rating}</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-violet" style={{ width: ratingWidth(item.rating) }} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceCard>
  );
}

export function FirstFifteenMinutesSection({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  const steps = firstFifteenMinutes(intelligence);

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Your First 15 Minutes" title="A short path from arrival to orientation." />
      <PathVisualization
        className="mt-5"
        steps={steps.map((step, index) => ({
          id: step.title,
          title: step.title,
          description: step.detail,
          status: index === 0 ? "active" : index === steps.length - 1 ? "pending" : "pending",
          meta: index === 0 ? "Start here" : index === steps.length - 1 ? "Ready" : "Next"
        }))}
      />
    </WorkspaceCard>
  );
}

export function MentorshipSection({ intelligence }: { intelligence: RepositoryKnowledgePackage }) {
  const advice = mentorship(intelligence);

  return (
    <WorkspaceCard>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <SectionHeading eyebrow="If I Were Contributing Today..." title="I would keep the first move narrow." />
          <div className="mt-4 grid gap-3">
            <MentorPoint label="Where to begin" value={advice.begin} />
            <MentorPoint label="Why" value={advice.why} />
            <MentorPoint label="What to postpone" value={`Ignore ${advice.postpone} for now. It can wait until the project shape is familiar.`} />
          </div>
        </div>
      </div>
    </WorkspaceCard>
  );
}

function MentorPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

export function WorkspaceNextActions({
  repository,
  onStartMission
}: {
  repository: GitHubRepositorySummary;
  onStartMission: () => void;
}) {
  const actions = [
    {
      title: "Explore Repository",
      description: "Review files, metadata, and repository context with the basics already in mind.",
      icon: SearchCode,
      enabled: true,
      href: `/app/repositories/${repository.ownerLogin}/${repository.name}`
    },
    {
      title: "Mission",
      description: "Turn this orientation into a focused contribution path.",
      icon: GitPullRequest,
      enabled: true,
      onClick: onStartMission
    },
    {
      title: "Mentor",
      description: "Ask grounded questions about setup, files, and where to start.",
      icon: MessageSquareText,
      enabled: false
    }
  ];

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Where Do You Want To Go Next?" title="Choose the next step in the contributor journey." />
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

          if (action.enabled && action.onClick) {
            return (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className="grid min-h-40 cursor-pointer gap-4 rounded-[24px] border border-border bg-background p-5 text-left transition-colors hover:border-brand-violet/40 hover:bg-card sm:grid-cols-[auto_1fr_auto]"
              >
                {content}
              </button>
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
  onStartMission
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
  isGenerating: boolean;
  onStartMission: () => void;
}) {
  if (!intelligence) {
    return (
      <EmptyState
        title="Preparing Workspace"
        description={isGenerating ? "Understanding Repository..." : `${repository.fullName} will open here once repository context is ready.`}
      />
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <WelcomeSection
        repository={repository}
        intelligence={intelligence}
        onStartMission={onStartMission}
      />
      <CanContributeSection intelligence={intelligence} />
      <OpenForgeInsightSection intelligence={intelligence} />
      <ProjectBuiltSection intelligence={intelligence} />
      <WhyRecommendedSection repository={repository} intelligence={intelligence} />
      <FirstFifteenMinutesSection intelligence={intelligence} />
      <MentorshipSection intelligence={intelligence} />
      <WorkspaceNextActions repository={repository} onStartMission={onStartMission} />
    </div>
  );
}


