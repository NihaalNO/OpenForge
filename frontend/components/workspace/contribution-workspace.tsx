"use client";

import type {
  AiContributionPlan,
  AiRepositoryAnalysis,
  GitHubRepositorySummary,
  RepositoryImportance,
  RepositoryKnowledgePackage
} from "@openforge/shared";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileCode2,
  GitBranch,
  Github,
  Loader2,
  Map,
  MessageSquareText,
  Play,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingSkeleton, PageHeader } from "@/components/common/ui";
import { analyzeRepository, fetchAiLogs, generateContributionPlan } from "@/lib/api/ai";
import {
  fetchGitHubRepository,
  fetchRepositoryIntelligence,
  generateRepositoryIntelligence
} from "@/lib/api/github";
import { cn } from "@/lib/utils";

type WorkspaceTab = "overview" | "map" | "mission" | "mentor" | "quality" | "activity";
type StageStatus = "locked" | "pending" | "active" | "completed";

interface MissionStage {
  id: string;
  title: string;
  status: StageStatus;
  description: string;
  suggestedCommands: string[];
  relevantPaths: string[];
  risks: string[];
  expectedOutput: string;
}

interface MentorResponse {
  promptId: string;
  title: string;
  answer: string;
  keyPoints: string[];
  relatedFiles: string[];
  nextAction: string;
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof Sparkles }> = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "map", label: "Repository Map", icon: Map },
  { id: "mission", label: "Mission", icon: Route },
  { id: "mentor", label: "Mentor", icon: MessageSquareText },
  { id: "quality", label: "Quality Gate", icon: ShieldCheck },
  { id: "activity", label: "Activity", icon: Clock3 }
];

const mentorPrompts = [
  { id: "architecture", title: "Explain this repository architecture" },
  { id: "read-first", title: "What should I read first?" },
  { id: "risky-files", title: "Which files are risky?" },
  { id: "run-locally", title: "How do I run this locally?" },
  { id: "first-contribution", title: "What is a good first contribution?" },
  { id: "test-setup", title: "Explain the test setup" },
  { id: "beginner-mistakes", title: "What mistakes should beginners avoid?" },
  { id: "pr-description", title: "How should I write the PR description?" }
];

function formatLevel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "Unknown";
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function relationshipLabel(repository: GitHubRepositorySummary) {
  if (repository.relationshipType === "organization_member") return "Organization";
  if (repository.relationshipType === "contributor") return "Contributor";
  if (repository.relationshipType === "collaborator") return "Collaborator";
  if (repository.relationshipType === "fork") return "Fork";
  return "Owner";
}

function estimateFirstContributionTime(knowledgePackage: RepositoryKnowledgePackage | null) {
  if (!knowledgePackage) return "Generate intelligence";
  if (knowledgePackage.complexity.level === "beginner" && knowledgePackage.contributionReadiness.level === "high") {
    return "2-4 hours";
  }
  if (knowledgePackage.complexity.level === "advanced" || knowledgePackage.contributionReadiness.level === "low") {
    return "1-2 days";
  }

  return "4-8 hours";
}

function intelligenceConfidence(knowledgePackage: RepositoryKnowledgePackage | null) {
  if (!knowledgePackage) return "Waiting";
  if (knowledgePackage.sourceLimits.truncated || knowledgePackage.tree.truncated) return "Medium";
  if (knowledgePackage.readme.content && knowledgePackage.tree.processedEntries > 0) return "High";
  return "Medium";
}

function getPackageScripts(knowledgePackage: RepositoryKnowledgePackage | null) {
  const packageManifest = knowledgePackage?.manifests.find((manifest) => manifest.path.endsWith("package.json"));
  const scripts = packageManifest?.parsed?.scripts;

  return scripts && typeof scripts === "object" ? (scripts as Record<string, unknown>) : {};
}

function getInstallCommand(knowledgePackage: RepositoryKnowledgePackage | null) {
  const managers = knowledgePackage?.detectedStack.packageManagers ?? [];
  if (managers.includes("pnpm")) return "pnpm install";
  if (managers.includes("yarn")) return "yarn install";
  if (managers.includes("npm")) return "npm install";
  if (managers.includes("pip")) return "pip install -r requirements.txt";
  if (managers.includes("poetry")) return "poetry install";
  if (managers.includes("cargo")) return "cargo build";
  if (managers.includes("go modules")) return "go mod download";
  if (managers.includes("maven")) return "mvn install";
  if (managers.includes("gradle")) return "gradle build";
  return null;
}

function getScriptCommand(scripts: Record<string, unknown>, names: string[]) {
  const name = names.find((candidate) => candidate in scripts);
  return name ? `npm run ${name}` : null;
}

function buildOpenForgeOpinion(knowledgePackage: RepositoryKnowledgePackage | null) {
  if (!knowledgePackage) {
    return "Generate repository intelligence first so OpenForge can ground the workspace in real files, docs, tests, and setup signals.";
  }

  const strengths = [
    knowledgePackage.readme.content ? "README" : null,
    knowledgePackage.docs.hasContributingGuide ? "contribution guide" : null,
    knowledgePackage.testStructure.hasTests ? "tests" : null,
    knowledgePackage.workflowFiles.length > 0 ? "CI" : null
  ].filter(Boolean);
  const firstRead = knowledgePackage.docs.hasContributingGuide
    ? "the contribution guide"
    : knowledgePackage.readme.path ?? knowledgePackage.entryPoints[0]?.path ?? "the detected entry points";
  const tests = knowledgePackage.testStructure.testDirectories[0] ?? knowledgePackage.testStructure.testFiles[0] ?? null;

  if (knowledgePackage.contributionReadiness.level === "high") {
    return `This repository looks approachable because it has ${strengths.join(", ")}. Start with ${firstRead}${tests ? `, then inspect ${tests}` : ""}.`;
  }

  if (knowledgePackage.contributionReadiness.level === "medium") {
    return `This repository has enough structure to start, but a few signals are missing. Begin with ${firstRead}, then keep your first pull request small and verify setup locally.`;
  }

  return `This repository needs a cautious first pass. Read ${firstRead}, identify a very small documentation or test-safe change, and avoid broad implementation work until setup is clear.`;
}

function buildMissionStages(
  knowledgePackage: RepositoryKnowledgePackage | null,
  contributionPlan: AiContributionPlan | null
): MissionStage[] {
  const scripts = getPackageScripts(knowledgePackage);
  const installCommand = getInstallCommand(knowledgePackage);
  const devCommand = getScriptCommand(scripts, ["dev", "start", "serve"]);
  const testCommand = getScriptCommand(scripts, ["test", "test:unit", "typecheck"]);
  const lintCommand = getScriptCommand(scripts, ["lint", "check"]);
  const entryPaths = knowledgePackage?.entryPoints.map((entry) => entry.path) ?? [];
  const docPaths = [
    knowledgePackage?.readme.path,
    ...((knowledgePackage?.docs.docFiles ?? []).filter((path) => /contributing|docs|readme/i.test(path)))
  ].filter(Boolean) as string[];
  const importantPaths = [
    ...entryPaths,
    ...(knowledgePackage?.tree.directories.filter((item) => item.importance !== "low").map((item) => item.path) ?? []),
    ...(knowledgePackage?.tree.importantFiles.filter((item) => item.importance !== "low").map((item) => item.path) ?? [])
  ].slice(0, 8);

  return [
    {
      id: "clone",
      title: "Clone Repository",
      status: "completed",
      description: `Bring ${knowledgePackage?.fullName ?? "the repository"} onto your machine and checkout the default branch.`,
      suggestedCommands: knowledgePackage ? [`git clone <repository-url>`, `git checkout ${knowledgePackage.defaultBranch}`] : [],
      relevantPaths: [knowledgePackage?.readme.path ?? "README"].filter(Boolean),
      risks: knowledgePackage?.docs.hasLicense ? [] : ["License was not detected; confirm contribution terms before deeper work."],
      expectedOutput: "A clean working tree on the default branch."
    },
    {
      id: "install",
      title: "Install Dependencies",
      status: knowledgePackage ? "active" : "locked",
      description: "Use detected manifests and package managers to install the project dependencies.",
      suggestedCommands: installCommand ? [installCommand] : contributionPlan?.setupChecklist.slice(0, 2) ?? [],
      relevantPaths: knowledgePackage?.manifests.map((manifest) => manifest.path).slice(0, 5) ?? [],
      risks: knowledgePackage?.manifests.length ? [] : ["No dependency manifest was detected in the intelligence package."],
      expectedOutput: "Dependencies install without missing runtime or lockfile errors."
    },
    {
      id: "run",
      title: "Run Project",
      status: knowledgePackage ? "pending" : "locked",
      description: "Start the app or service using the closest detected project script.",
      suggestedCommands: devCommand ? [devCommand] : contributionPlan?.setupChecklist.slice(2, 4) ?? [],
      relevantPaths: entryPaths.slice(0, 5),
      risks: knowledgePackage?.detectedStack.deployment.includes("Docker") ? ["Docker setup exists; local app scripts may not be the only supported path."] : [],
      expectedOutput: "The app, package, or service runs locally with visible logs or a local URL."
    },
    {
      id: "understand",
      title: "Understand Key Areas",
      status: knowledgePackage ? "pending" : "locked",
      description: "Read the files and folders most likely to explain architecture, setup, and contribution boundaries.",
      suggestedCommands: [],
      relevantPaths: [...docPaths, ...importantPaths].slice(0, 8),
      risks: knowledgePackage?.sourceLimits.truncated ? ["The repository tree was truncated; some important areas may be hidden."] : [],
      expectedOutput: "You can name the main entry point, test surface, and one safe area to change."
    },
    {
      id: "scope",
      title: "Choose Contribution Scope",
      status: knowledgePackage ? "pending" : "locked",
      description: contributionPlan?.taskPlan[0] ?? "Pick a narrow change connected to docs, tests, entry points, or a clearly isolated feature area.",
      suggestedCommands: [],
      relevantPaths: contributionPlan?.implementationChecklist.slice(0, 3) ?? importantPaths.slice(0, 5),
      risks: ["Avoid cross-cutting rewrites until you have run tests and understood project conventions."],
      expectedOutput: "A one-sentence pull request scope with files you expect to touch."
    },
    {
      id: "implement",
      title: "Implement Changes",
      status: "pending",
      description: contributionPlan?.implementationChecklist[0] ?? "Make the smallest useful change while following existing structure and style.",
      suggestedCommands: [],
      relevantPaths: importantPaths.slice(0, 6),
      risks: contributionPlan?.implementationChecklist.slice(1, 3) ?? ["Keep unrelated formatting and broad refactors out of the first pull request."],
      expectedOutput: "A focused diff that is easy for a maintainer to review."
    },
    {
      id: "test",
      title: "Test Thoroughly",
      status: knowledgePackage?.testStructure.hasTests ? "pending" : "locked",
      description: "Run the repository's detected verification path before preparing the pull request.",
      suggestedCommands: [testCommand, lintCommand].filter(Boolean) as string[],
      relevantPaths: [
        ...(knowledgePackage?.testStructure.testDirectories ?? []),
        ...(knowledgePackage?.testStructure.testFiles ?? [])
      ].slice(0, 6),
      risks: knowledgePackage?.testStructure.hasTests ? [] : ["No tests were detected; document manual verification clearly."],
      expectedOutput: "Tests, lint, or manual checks pass with notes for anything unavailable."
    },
    {
      id: "pr",
      title: "Prepare Pull Request",
      status: "pending",
      description: contributionPlan?.pullRequestChecklist[0] ?? "Write a concise PR that explains what changed, why it changed, and how it was verified.",
      suggestedCommands: ["git status", "git diff --stat"],
      relevantPaths: knowledgePackage?.workflowFiles.map((workflow) => workflow.path).slice(0, 4) ?? [],
      risks: contributionPlan?.pullRequestChecklist.slice(1, 3) ?? ["Do not skip verification notes if CI or tests are missing."],
      expectedOutput: "A maintainer-friendly PR description with screenshots or logs when relevant."
    }
  ];
}

function curatedMapItems(knowledgePackage: RepositoryKnowledgePackage | null) {
  if (!knowledgePackage) return [];

  return [
    ...knowledgePackage.tree.directories.filter((path) => path.importance !== "low").map((path) => ({
      path: path.path,
      category: path.category,
      importance: path.importance,
      reason: "Important repository area"
    })),
    ...knowledgePackage.entryPoints.map((entry) => ({
      path: entry.path,
      category: "entry point",
      importance: "high" as RepositoryImportance,
      reason: entry.reason
    })),
    ...knowledgePackage.tree.importantFiles.filter((file) => file.importance !== "low").map((file) => ({
      path: file.path,
      category: file.category,
      importance: file.importance,
      reason: file.reason
    })),
    ...knowledgePackage.testStructure.testDirectories.map((path) => ({
      path,
      category: "tests",
      importance: "medium" as RepositoryImportance,
      reason: "Test directory"
    })),
    ...knowledgePackage.workflowFiles.map((workflow) => ({
      path: workflow.path,
      category: "workflow",
      importance: "high" as RepositoryImportance,
      reason: workflow.name
    }))
  ]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.path === item.path) === index)
    .slice(0, 28);
}

function buildMentorFallback(
  promptId: string,
  title: string,
  knowledgePackage: RepositoryKnowledgePackage | null,
  analysis: AiRepositoryAnalysis | null,
  plan: AiContributionPlan | null
): MentorResponse {
  const entryPaths = knowledgePackage?.entryPoints.map((entry) => entry.path) ?? analysis?.importantFiles ?? [];
  const testPaths = [
    ...(knowledgePackage?.testStructure.testDirectories ?? []),
    ...(knowledgePackage?.testStructure.testFiles ?? [])
  ];
  const docs = [
    knowledgePackage?.readme.path,
    ...(knowledgePackage?.docs.docFiles ?? [])
  ].filter(Boolean) as string[];

  const responseMap: Record<string, MentorResponse> = {
    architecture: {
      promptId,
      title,
      answer: analysis?.architecture ?? "Architecture is inferred from entry points, manifests, important directories, and framework signals.",
      keyPoints: [
        `Primary stack: ${[
          ...(knowledgePackage?.detectedStack.languages ?? []),
          ...(knowledgePackage?.detectedStack.frameworks ?? [])
        ].slice(0, 5).join(", ") || "not detected"}`,
        `Entry points: ${entryPaths.slice(0, 3).join(", ") || "not detected"}`,
        `Important directories: ${knowledgePackage?.tree.directories.slice(0, 3).map((item) => item.path).join(", ") || "not detected"}`
      ],
      relatedFiles: entryPaths.slice(0, 6),
      nextAction: "Open the first entry point and trace how it loads the nearby modules."
    },
    "read-first": {
      promptId,
      title,
      answer: "Start with the project docs, then move to entry points and tests so you understand both intended usage and verification.",
      keyPoints: [
        knowledgePackage?.docs.hasContributingGuide ? "Contribution guide is available." : "No contribution guide detected.",
        knowledgePackage?.readme.path ? "README is available." : "README was not available.",
        testPaths.length ? "Tests are present and should be read early." : "Tests were not detected."
      ],
      relatedFiles: [...docs, ...entryPaths, ...testPaths].slice(0, 8),
      nextAction: `Read ${docs[0] ?? entryPaths[0] ?? "the first important file"} before choosing a change.`
    },
    "risky-files": {
      promptId,
      title,
      answer: "Risk usually clusters around entry points, config, workflows, and files that affect installation or tests.",
      keyPoints: [
        "Avoid broad changes to package manifests until setup is verified.",
        "Treat CI workflow changes as high impact.",
        "Entry points can affect many routes or runtime paths."
      ],
      relatedFiles: curatedMapItems(knowledgePackage).filter((item) => item.importance === "high").map((item) => item.path).slice(0, 8),
      nextAction: "Prefer documentation, isolated tests, or a small leaf module for your first contribution."
    },
    "run-locally": {
      promptId,
      title,
      answer: "Use the detected package manager and available scripts as your local setup path.",
      keyPoints: [
        getInstallCommand(knowledgePackage) ? `Install with ${getInstallCommand(knowledgePackage)}.` : "No install command was confidently detected.",
        getScriptCommand(getPackageScripts(knowledgePackage), ["dev", "start", "serve"]) ? `Run with ${getScriptCommand(getPackageScripts(knowledgePackage), ["dev", "start", "serve"])}.` : "No run script was confidently detected.",
        knowledgePackage?.detectedStack.deployment.includes("Docker") ? "Docker files are present." : "No Docker setup detected."
      ],
      relatedFiles: knowledgePackage?.manifests.map((manifest) => manifest.path).slice(0, 6) ?? [],
      nextAction: "Run the install command, then record any missing environment variables or runtime errors."
    },
    "first-contribution": {
      promptId,
      title,
      answer: plan?.taskPlan[0] ?? "A good first contribution should be small, reviewable, and connected to detected docs, tests, or an isolated source area.",
      keyPoints: [
        "Use repository conventions before inventing new structure.",
        "Choose a change that can be verified with the detected test path.",
        "Keep the PR scope easy to explain in one sentence."
      ],
      relatedFiles: [...docs, ...testPaths, ...entryPaths].slice(0, 8),
      nextAction: "Write a one-sentence PR scope and identify the exact files you expect to touch."
    },
    "test-setup": {
      promptId,
      title,
      answer: knowledgePackage?.testStructure.hasTests
        ? "Tests were detected through directories, files, or framework dependencies."
        : "No test surface was detected in Repository Intelligence.",
      keyPoints: [
        `Frameworks: ${knowledgePackage?.testStructure.detectedFrameworks.join(", ") || "not detected"}`,
        `Directories: ${knowledgePackage?.testStructure.testDirectories.slice(0, 3).join(", ") || "not detected"}`,
        getScriptCommand(getPackageScripts(knowledgePackage), ["test", "test:unit"]) ? `Command: ${getScriptCommand(getPackageScripts(knowledgePackage), ["test", "test:unit"])}` : "No test script detected."
      ],
      relatedFiles: testPaths.slice(0, 8),
      nextAction: knowledgePackage?.testStructure.hasTests ? "Run the smallest relevant test before changing code." : "Plan a manual verification note for the pull request."
    },
    "beginner-mistakes": {
      promptId,
      title,
      answer: "The common beginner failure mode is changing too much before the project runs locally.",
      keyPoints: [
        "Do not skip README and contribution docs.",
        "Do not change lockfiles unless dependency changes are intentional.",
        "Do not open a PR without verification notes."
      ],
      relatedFiles: [...docs, ...(knowledgePackage?.manifests.map((manifest) => manifest.path) ?? [])].slice(0, 8),
      nextAction: "Make setup pass first, then keep your first diff narrow."
    },
    "pr-description": {
      promptId,
      title,
      answer: "A strong PR description should map the change to repository behavior and verification evidence.",
      keyPoints: [
        "State the problem or improvement in one sentence.",
        "List changed areas, not every file.",
        "Include tests, lint, screenshots, or manual verification."
      ],
      relatedFiles: knowledgePackage?.workflowFiles.map((workflow) => workflow.path).slice(0, 6) ?? [],
      nextAction: "Draft sections for Summary, Changes, Verification, and Risk."
    }
  };

  return responseMap[promptId] ?? responseMap.architecture!;
}

export function WorkspaceHeader({
  repository,
  knowledgePackage,
  onRegenerate,
  isGenerating
}: {
  repository: GitHubRepositorySummary;
  knowledgePackage: RepositoryKnowledgePackage | null;
  onRegenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <PageHeader
      eyebrow="Contribution Workspace"
      title={repository.fullName}
      description={repository.description ?? "Repository-specific workspace powered by GitHub Data and Repository Intelligence."}
      actions={
        <>
          <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
            <Github className="h-4 w-4" aria-hidden="true" />
            Open in GitHub
          </a>
          <Button type="button" onClick={onRegenerate} disabled={isGenerating} variant={knowledgePackage ? "secondary" : "primary"}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {knowledgePackage ? "Regenerate Intelligence" : "Generate Intelligence"}
          </Button>
        </>
      }
    />
  );
}

export function IntelligenceHero({
  repository,
  knowledgePackage,
  onStartMission,
  onRegenerate,
  isGenerating
}: {
  repository: GitHubRepositorySummary;
  knowledgePackage: RepositoryKnowledgePackage | null;
  onStartMission: () => void;
  onRegenerate: () => void;
  isGenerating: boolean;
}) {
  const ready = knowledgePackage?.contributionReadiness.level === "high";

  return (
    <section className="openforge-card overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={ready ? "border-brand-violet/25 text-brand-violet" : ""}>
              {knowledgePackage ? (ready ? "Repository Ready" : "Needs orientation") : "Intelligence needed"}
            </Badge>
            <Badge>{relationshipLabel(repository)}</Badge>
            <Badge>{repository.primaryLanguage ?? "Unknown language"}</Badge>
          </div>
          <h2 className="mt-5 text-3xl font-semibold leading-tight text-foreground">
            {knowledgePackage ? "Your guided path into this repository is ready." : "Generate intelligence to unlock the workspace."}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            OpenForge maps readiness, complexity, key paths, setup signals, and verification gates so your first pull request has a clear path.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={onStartMission} disabled={!knowledgePackage}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Start Mission
            </Button>
            <Button type="button" onClick={onRegenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BrainCircuit className="h-4 w-4" aria-hidden="true" />}
              {knowledgePackage ? "Regenerate Intelligence" : "Generate Intelligence"}
            </Button>
          </div>
        </div>
        <div className="border-t border-border bg-soft-blue-wash/45 p-6 lg:border-l lg:border-t-0 lg:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Signal label="Readiness" value={knowledgePackage ? `${formatLevel(knowledgePackage.contributionReadiness.level)} · ${knowledgePackage.contributionReadiness.score}/100` : "Not generated"} />
            <Signal label="Complexity" value={knowledgePackage ? `${formatLevel(knowledgePackage.complexity.level)} · ${knowledgePackage.complexity.score}/100` : "Unknown"} />
            <Signal label="First contribution" value={estimateFirstContributionTime(knowledgePackage)} />
            <Signal label="Confidence" value={intelligenceConfidence(knowledgePackage)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}

export function WorkspaceTabs({
  activeTab,
  onChange
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-full border border-border bg-card p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-brand-violet")} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function OverviewTab({
  repository,
  knowledgePackage
}: {
  repository: GitHubRepositorySummary;
  knowledgePackage: RepositoryKnowledgePackage | null;
}) {
  if (!knowledgePackage) {
    return <WorkspaceEmptyState />;
  }

  const snapshot = [
    ["Language", repository.primaryLanguage ?? knowledgePackage.detectedStack.languages[0] ?? "Unknown"],
    ["Frameworks", knowledgePackage.detectedStack.frameworks.join(", ") || "None detected"],
    ["Package managers", knowledgePackage.detectedStack.packageManagers.join(", ") || "None detected"],
    ["Test frameworks", knowledgePackage.detectedStack.testing.join(", ") || "None detected"],
    ["CI provider", knowledgePackage.detectedStack.ci.join(", ") || "None detected"],
    ["License", repository.licenseKey ?? (knowledgePackage.docs.hasLicense ? "Detected" : "Not detected")],
    ["Important docs", String(knowledgePackage.docs.docFiles.length)],
    ["Tree entries", `${knowledgePackage.tree.processedEntries}/${knowledgePackage.tree.totalEntries}`]
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Card>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-violet">OpenForge says</p>
              <p className="mt-2 text-lg leading-8 text-foreground">{buildOpenForgeOpinion(knowledgePackage)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Repository Snapshot</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {snapshot.map(([label, value]) => (
              <div key={label} className="rounded-[18px] border border-border bg-background p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <MissionProgress stages={buildMissionStages(knowledgePackage, null)} />
    </div>
  );
}

export function RepositoryMap({ knowledgePackage }: { knowledgePackage: RepositoryKnowledgePackage | null }) {
  const items = curatedMapItems(knowledgePackage);

  if (!knowledgePackage) return <WorkspaceEmptyState />;
  if (items.length === 0) {
    return (
      <EmptyState
        title="No curated paths found"
        description="Repository Intelligence did not detect important files, directories, tests, workflows, or entry points for this repository."
      />
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Repository Map</h2>
          <p className="mt-1 text-sm text-muted-foreground">Curated paths only. High-impact files appear first.</p>
        </div>
        <Badge>{items.length} paths</Badge>
      </div>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={`${item.category}-${item.path}`} className="grid gap-3 rounded-[18px] border border-border bg-background p-4 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FileCode2 className="h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
                <p className="break-words text-sm font-semibold text-foreground">{item.path}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
              <ImportanceBadge importance={item.importance} />
              <Badge>{item.category}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ImportanceBadge({ importance }: { importance: RepositoryImportance }) {
  return (
    <Badge
      className={cn(
        importance === "high" && "border-brand-violet/25 text-brand-violet",
        importance === "medium" && "border-soft-blue-wash text-foreground"
      )}
    >
      {importance === "high" ? "High impact" : importance === "medium" ? "Medium impact" : "Low impact"}
    </Badge>
  );
}

export function MissionTimeline({
  knowledgePackage,
  contributionPlan
}: {
  knowledgePackage: RepositoryKnowledgePackage | null;
  contributionPlan: AiContributionPlan | null;
}) {
  if (!knowledgePackage) return <WorkspaceEmptyState />;

  const stages = buildMissionStages(knowledgePackage, contributionPlan);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Card>
        <h2 className="text-xl font-semibold">Mission Timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">A repository-specific path from local setup to pull request readiness.</p>
        <div className="mt-6 space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative rounded-[18px] border border-border bg-background p-4">
              <div className="flex items-start gap-4">
                <StageIcon status={stage.status} index={index + 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{stage.title}</h3>
                    <Badge>{stage.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stage.description}</p>
                  <StageDetails stage={stage} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <MissionProgress stages={stages} />
    </div>
  );
}

function StageIcon({ status, index }: { status: StageStatus; index: number }) {
  const classes = cn(
    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
    status === "completed" && "border-brand-violet bg-brand-violet text-white",
    status === "active" && "border-brand-violet bg-soft-blue-wash text-brand-violet",
    status === "pending" && "border-border bg-card text-muted-foreground",
    status === "locked" && "border-border bg-muted text-muted-foreground"
  );

  if (status === "completed") {
    return (
      <span className={classes}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  return <span className={classes}>{index}</span>;
}

function StageDetails({ stage }: { stage: MissionStage }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <DetailBlock title="Suggested commands" items={stage.suggestedCommands} fallback="No command detected" />
      <DetailBlock title="Relevant paths" items={stage.relevantPaths} fallback="No path detected" />
      <DetailBlock title="Risk notes" items={stage.risks} fallback="No major risk detected" />
      <div className="rounded-[15px] border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Expected output</p>
        <p className="mt-2 text-sm text-foreground">{stage.expectedOutput}</p>
      </div>
    </div>
  );
}

function DetailBlock({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div className="rounded-[15px] border border-border bg-card p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item, index) => <Badge key={`${title}-${item}-${index}`}>{item}</Badge>)
        ) : (
          <span className="text-sm text-muted-foreground">{fallback}</span>
        )}
      </div>
    </div>
  );
}

function MissionProgress({ stages }: { stages: MissionStage[] }) {
  const completed = stages.filter((stage) => stage.status === "completed").length;
  const active = stages.find((stage) => stage.status === "active") ?? stages[0];

  return (
    <aside className="openforge-card h-fit p-5 lg:sticky lg:top-24">
      <p className="text-sm font-semibold">Mission Progress</p>
      <div className="mt-4 h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-violet" style={{ width: `${Math.max(12, (completed / stages.length) * 100)}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{completed} of {stages.length} stages completed</p>
      <div className="mt-5 rounded-[18px] bg-soft-blue-wash p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Current focus</p>
        <p className="mt-2 text-lg font-semibold">{active?.title ?? "Generate intelligence"}</p>
      </div>
    </aside>
  );
}

export function MentorPanel({
  repositoryId,
  knowledgePackage,
  analysis,
  contributionPlan,
  onAnalysis,
  onPlan
}: {
  repositoryId: string;
  knowledgePackage: RepositoryKnowledgePackage | null;
  analysis: AiRepositoryAnalysis | null;
  contributionPlan: AiContributionPlan | null;
  onAnalysis: (analysis: AiRepositoryAnalysis) => void;
  onPlan: (plan: AiContributionPlan) => void;
}) {
  const [response, setResponse] = useState<MentorResponse | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePrompt(promptId: string, title: string) {
    setActivePrompt(promptId);
    setError(null);

    try {
      let latestAnalysis = analysis;
      let latestPlan = contributionPlan;

      if (["architecture", "read-first", "risky-files"].includes(promptId) && !latestAnalysis) {
        const result = await analyzeRepository(repositoryId);
        latestAnalysis = result.analysis;
        onAnalysis(result.analysis);
      }

      if (["first-contribution", "pr-description"].includes(promptId) && !latestPlan) {
        const result = await generateContributionPlan({ repositoryId });
        latestPlan = result.analysis;
        onPlan(result.analysis);
      }

      setResponse(buildMentorFallback(promptId, title, knowledgePackage, latestAnalysis, latestPlan));
    } catch (mentorError) {
      setResponse(buildMentorFallback(promptId, title, knowledgePackage, analysis, contributionPlan));
      setError(mentorError instanceof Error ? mentorError.message : "Mentor used deterministic repository context because AI was unavailable.");
    } finally {
      setActivePrompt(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-semibold">Mentor Prompts</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">One-click prompts grounded in repository intelligence and existing AI analysis.</p>
        <div className="mt-5 grid gap-2">
          {mentorPrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => void handlePrompt(prompt.id, prompt.title)}
              className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-full border border-border bg-background px-4 py-2 text-left text-sm font-medium transition-colors hover:text-brand-violet disabled:cursor-not-allowed disabled:opacity-60"
              disabled={activePrompt !== null || !knowledgePackage}
            >
              <span>{prompt.title}</span>
              {activePrompt === prompt.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Mentor Response</h2>
        {error ? <p className="mt-3 rounded-[15px] border border-destructive/30 bg-background p-3 text-sm text-destructive">{error}</p> : null}
        {!knowledgePackage ? (
          <WorkspaceEmptyState compact />
        ) : response ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[18px] bg-soft-blue-wash p-4">
              <p className="text-sm font-semibold text-brand-violet">{response.title}</p>
              <p className="mt-2 text-base leading-7 text-foreground">{response.answer}</p>
            </div>
            <DetailBlock title="Key points" items={response.keyPoints} fallback="No points returned" />
            <DetailBlock title="Related files" items={response.relatedFiles} fallback="No related files detected" />
            <div className="rounded-[15px] border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Next action</p>
              <p className="mt-2 text-sm font-medium text-foreground">{response.nextAction}</p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[18px] border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
            Pick a prompt to get a structured answer. Architecture and contribution prompts can reuse existing AI endpoints; setup and test prompts are derived from deterministic intelligence.
          </div>
        )}
      </Card>
    </div>
  );
}

export function QualityGate({ knowledgePackage }: { knowledgePackage: RepositoryKnowledgePackage | null }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const scripts = getPackageScripts(knowledgePackage);
  const items = [
    {
      id: "env",
      section: "Environment",
      label: "Local setup requirements are understood",
      why: "Maintainers need changes verified against the same environment assumptions.",
      command: getInstallCommand(knowledgePackage)
    },
    {
      id: "build",
      section: "Build",
      label: "Project builds or runs locally",
      why: "A build or run check catches dependency and compile issues before review.",
      command: getScriptCommand(scripts, ["build", "dev", "start"])
    },
    {
      id: "lint",
      section: "Lint",
      label: "Formatting and lint rules pass",
      why: "Style failures distract from the contribution itself.",
      command: getScriptCommand(scripts, ["lint", "format:check", "check"])
    },
    {
      id: "tests",
      section: "Tests",
      label: "Relevant tests pass",
      why: "Tests prove the change behaves as intended and protects nearby code.",
      command: getScriptCommand(scripts, ["test", "test:unit", "test:e2e"])
    },
    {
      id: "docs",
      section: "Documentation",
      label: "Docs or changelog are updated if behavior changed",
      why: "User-facing behavior should be discoverable after the merge.",
      command: null
    },
    {
      id: "pr",
      section: "Pull Request",
      label: "PR summary, verification, and risk notes are ready",
      why: "A clear PR reduces maintainer effort and review back-and-forth.",
      command: "git diff --stat"
    }
  ];

  if (!knowledgePackage) return <WorkspaceEmptyState />;

  return (
    <Card>
      <h2 className="text-xl font-semibold">Quality Gate</h2>
      <p className="mt-1 text-sm text-muted-foreground">Local checklist for deciding whether the contribution is ready to open as a pull request.</p>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <label key={item.id} className="grid cursor-pointer gap-3 rounded-[18px] border border-border bg-background p-4 md:grid-cols-[auto_1fr_auto]">
            <input
              type="checkbox"
              checked={Boolean(checked[item.id])}
              onChange={(event) => setChecked((current) => ({ ...current, [item.id]: event.target.checked }))}
              className="mt-1 h-4 w-4 accent-brand-violet"
            />
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{item.label}</span>
                <Badge>{item.section}</Badge>
              </span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{item.why}</span>
            </span>
            <span className="text-sm text-muted-foreground md:text-right">{item.command ?? "Manual check"}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

export function ActivityTimeline({
  repository,
  knowledgePackage,
  aiLogs
}: {
  repository: GitHubRepositorySummary;
  knowledgePackage: RepositoryKnowledgePackage | null;
  aiLogs: Array<{ id: string; analysisType: string; status: string; createdAt: string }>;
}) {
  const events = [
    repository.lastSyncedAt ? {
      id: "repo-synced",
      title: "Repository synced",
      description: `${repository.fullName} metadata synced from GitHub.`,
      createdAt: repository.lastSyncedAt
    } : null,
    knowledgePackage ? {
      id: "intel-generated",
      title: "Repository intelligence generated",
      description: `${knowledgePackage.tree.processedEntries} tree entries processed with docs, tests, CI, and stack signals.`,
      createdAt: knowledgePackage.generatedAt
    } : null,
    ...aiLogs.slice(0, 8).map((log) => ({
      id: log.id,
      title: log.analysisType.replace(/_/g, " "),
      description: `AI analysis ${log.status}.`,
      createdAt: log.createdAt
    }))
  ].filter(Boolean) as Array<{ id: string; title: string; description: string; createdAt: string }>;

  return (
    <Card>
      <h2 className="text-xl font-semibold">Activity</h2>
      <p className="mt-1 text-sm text-muted-foreground">Workspace events from synced repository data, intelligence generation, and AI logs.</p>
      <div className="mt-6 space-y-3">
        {events.length ? events.map((event) => (
          <div key={event.id} className="flex gap-3 rounded-[18px] border border-border bg-background p-4">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold capitalize">{event.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
              <p className="mt-2 text-xs font-medium uppercase text-muted-foreground">{formatDate(event.createdAt)}</p>
            </div>
          </div>
        )) : (
          <div className="rounded-[18px] border border-border bg-background p-5 text-sm text-muted-foreground">
            No workspace activity yet. Generate intelligence or run a repository analysis to create the first event.
          </div>
        )}
      </div>
    </Card>
  );
}

export function WorkspaceEmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <EmptyState
      title="Repository intelligence required"
      description={compact ? "Generate intelligence before using this workspace panel." : "Generate deterministic repository intelligence to unlock readiness, repository map, mission timeline, mentor prompts, and quality gates."}
    />
  );
}

export function WorkspaceLoadingState() {
  return <LoadingSkeleton rows={4} />;
}

export function ContributionWorkspacePage({ owner, repo }: { owner: string; repo: string }) {
  const [repository, setRepository] = useState<GitHubRepositorySummary | null>(null);
  const [knowledgePackage, setKnowledgePackage] = useState<RepositoryKnowledgePackage | null>(null);
  const [contributionPlan, setContributionPlan] = useState<AiContributionPlan | null>(null);
  const [analysis, setAnalysis] = useState<AiRepositoryAnalysis | null>(null);
  const [aiLogs, setAiLogs] = useState<Array<{ id: string; analysisType: string; status: string; createdAt: string }>>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadWorkspace() {
    setIsLoading(true);
    setError(null);

    try {
      const repositoryResponse = await fetchGitHubRepository(owner, repo);
      setRepository(repositoryResponse.repository);

      const [intelligenceResult, logsResult] = await Promise.allSettled([
        fetchRepositoryIntelligence(repositoryResponse.repository.id),
        fetchAiLogs()
      ]);

      if (intelligenceResult.status === "fulfilled") {
        setKnowledgePackage(intelligenceResult.value.knowledgePackage);
      }

      if (logsResult.status === "fulfilled") {
        setAiLogs(logsResult.value.logs);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load contribution workspace");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateIntelligence(regenerate = true) {
    if (!repository) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateRepositoryIntelligence(repository.id, regenerate);
      setKnowledgePackage(response.knowledgePackage);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Repository intelligence generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [owner, repo]);

  const tabContent = useMemo(() => {
    if (!repository) return null;

    if (activeTab === "overview") return <OverviewTab repository={repository} knowledgePackage={knowledgePackage} />;
    if (activeTab === "map") return <RepositoryMap knowledgePackage={knowledgePackage} />;
    if (activeTab === "mission") return <MissionTimeline knowledgePackage={knowledgePackage} contributionPlan={contributionPlan} />;
    if (activeTab === "mentor") {
      return (
        <MentorPanel
          repositoryId={repository.id}
          knowledgePackage={knowledgePackage}
          analysis={analysis}
          contributionPlan={contributionPlan}
          onAnalysis={setAnalysis}
          onPlan={setContributionPlan}
        />
      );
    }
    if (activeTab === "quality") return <QualityGate knowledgePackage={knowledgePackage} />;
    return <ActivityTimeline repository={repository} knowledgePackage={knowledgePackage} aiLogs={aiLogs} />;
  }, [activeTab, repository, knowledgePackage, contributionPlan, analysis, aiLogs]);

  if (isLoading) return <WorkspaceLoadingState />;
  if (error && !repository) return <ErrorState message={error} />;
  if (!repository) return <ErrorState message="Repository was not found." />;

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        repository={repository}
        knowledgePackage={knowledgePackage}
        onRegenerate={() => void handleGenerateIntelligence(Boolean(knowledgePackage))}
        isGenerating={isGenerating}
      />
      {error ? <ErrorState message={error} /> : null}
      <IntelligenceHero
        repository={repository}
        knowledgePackage={knowledgePackage}
        onStartMission={() => setActiveTab("mission")}
        onRegenerate={() => void handleGenerateIntelligence(Boolean(knowledgePackage))}
        isGenerating={isGenerating}
      />
      <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />
      {tabContent}
    </div>
  );
}

export function WorkspaceSelector() {
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [intelligenceMap, setIntelligenceMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRepositories() {
      const { fetchGitHubRepositories } = await import("@/lib/api/github");
      const response = await fetchGitHubRepositories();
      setRepositories(response.repositories);
      const checks = await Promise.allSettled(
        response.repositories.slice(0, 12).map(async (repository) => {
          await fetchRepositoryIntelligence(repository.id);
          return repository.id;
        })
      );
      setIntelligenceMap(
        Object.fromEntries(checks.filter((check): check is PromiseFulfilledResult<string> => check.status === "fulfilled").map((check) => [check.value, true]))
      );
    }

    loadRepositories()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load repositories"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Open a contribution workspace"
        description="Choose a synced repository to open a guided, repository-specific workspace. Manual repository IDs are no longer part of the workflow."
      />
      {repositories.length === 0 ? (
        <EmptyState
          title="No repositories synced"
          description="Sync GitHub Data first, then return here to open a repository workspace."
          action={<Link href="/app/repositories" className="openforge-button-primary">Go to GitHub Data</Link>}
        />
      ) : (
        <div className="grid gap-4">
          {repositories.map((repository) => (
            <Card key={repository.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-semibold">{repository.fullName}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{repository.description ?? "No description provided."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{relationshipLabel(repository)}</Badge>
                  <Badge>{intelligenceMap[repository.id] ? "Intelligence ready" : "Generate intelligence"}</Badge>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/app/repositories/${repository.ownerLogin}/${repository.name}/workspace`} className="openforge-button-primary">
                  Open Workspace
                </Link>
                <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button">
                  Open in GitHub
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
