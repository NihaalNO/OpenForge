"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GitPullRequest,
  HelpCircle,
  Layers3,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  Route,
  Send,
  Sparkles,
  TestTube2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { PathVisualization, ProcedureFlow, type ProcedureStep } from "@/components/visualizations";
import { cn } from "@/lib/utils";
import { WorkspaceCard } from "./workspace-components";

type ReviewStageId =
  | "understanding"
  | "mission"
  | "standards"
  | "maintainer"
  | "confidence"
  | "checklist"
  | "assistant"
  | "reflection";

type ConfidenceLevel = "Ready" | "Close" | "Needs a little more review";

interface StoredMission {
  started?: boolean;
  saved?: boolean;
  checkedItems?: Record<string, boolean>;
  completedStages?: Record<string, boolean>;
  completedSuccess?: Record<string, boolean>;
}

interface ReviewItem {
  label: string;
  detail: string;
  why: string;
  complete?: boolean;
}

interface ConfidenceItem {
  label: string;
  level: ConfidenceLevel;
  explanation: string;
}

interface PullRequestDraft {
  title: string;
  summary: string[];
  testing: string[];
  checklist: string[];
  reviewerNotes: string[];
}

interface ReviewModel {
  understanding: {
    structure: ReviewItem[];
    architecture: ReviewItem[];
    dependencies: ReviewItem[];
    docs: ReviewItem[];
    tests: ReviewItem[];
    gaps: string[];
  };
  mission: ReviewItem[];
  standards: ReviewItem[];
  maintainerQuestions: ReviewItem[];
  confidence: ConfidenceItem[];
  checklist: ReviewItem[];
  pr: PullRequestDraft;
  verdict: {
    recommendation: string;
    why: string;
  };
}

interface TimelineReflectionEvent {
  id: string;
  type: "review_reflection";
  title: string;
  description: string;
  topics: string[];
  repositoryFullName: string;
  createdAt: string;
}

const stages: Array<{ id: ReviewStageId; label: string; icon: LucideIcon }> = [
  { id: "understanding", label: "Repository Understanding", icon: Layers3 },
  { id: "mission", label: "Mission Review", icon: Route },
  { id: "standards", label: "Repository Standards", icon: ClipboardCheck },
  { id: "maintainer", label: "Maintainer Perspective", icon: MessageSquareText },
  { id: "confidence", label: "Confidence Review", icon: Sparkles },
  { id: "checklist", label: "PR Checklist", icon: ListChecks },
  { id: "assistant", label: "PR Assistant", icon: GitPullRequest },
  { id: "reflection", label: "Reflection", icon: BookOpenCheck }
];

const reflectionTopics = ["Authentication", "API", "Testing", "Architecture", "Deployment", "Documentation"];

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

function storageKey(repositoryId: string) {
  return `openforge:review:${repositoryId}`;
}

function missionStorageKey(repositoryId: string) {
  return `openforge:mission:${repositoryId}`;
}

export function timelineStorageKey(repositoryId: string) {
  return `openforge:timeline:${repositoryId}`;
}

function readmePath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.readme.path ?? "README";
}

function allKnownPaths(intelligence: RepositoryKnowledgePackage) {
  return unique([
    ...intelligence.raw.selectedFilePaths,
    ...intelligence.docs.docFiles,
    ...intelligence.testStructure.testDirectories,
    ...intelligence.testStructure.testFiles,
    ...intelligence.workflowFiles.map((workflow) => workflow.path),
    ...intelligence.entryPoints.map((entry) => entry.path),
    ...intelligence.manifests.map((manifest) => manifest.path),
    ...intelligence.tree.directories.map((directory) => directory.path),
    ...intelligence.tree.importantFiles.map((file) => file.path)
  ]);
}

function pathsMatching(paths: string[], pattern: RegExp, limit = 5) {
  return paths.filter((path) => pattern.test(path)).slice(0, limit);
}

function primaryTests(intelligence: RepositoryKnowledgePackage) {
  return unique([...intelligence.testStructure.testDirectories, ...intelligence.testStructure.testFiles]).slice(0, 5);
}

function missionProgress(repositoryId: string): StoredMission {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(missionStorageKey(repositoryId));
  if (!stored) return {};

  try {
    return JSON.parse(stored) as StoredMission;
  } catch {
    window.localStorage.removeItem(missionStorageKey(repositoryId));
    return {};
  }
}

function confidenceLevel(readySignals: number, totalSignals: number): ConfidenceLevel {
  if (readySignals >= Math.max(3, totalSignals - 1)) return "Ready";
  if (readySignals >= Math.ceil(totalSignals / 2)) return "Close";
  return "Needs a little more review";
}

function buildReviewModel(
  repository: GitHubRepositorySummary,
  intelligence: RepositoryKnowledgePackage,
  mission: StoredMission
): ReviewModel {
  const paths = allKnownPaths(intelligence);
  const tests = primaryTests(intelligence);
  const docs = unique([readmePath(intelligence), ...intelligence.docs.docFiles]).slice(0, 6);
  const architectureFiles = unique([
    ...intelligence.entryPoints.map((entry) => entry.path),
    ...intelligence.tree.directories.filter((directory) => directory.importance === "high").map((directory) => directory.path),
    ...intelligence.tree.importantFiles.filter((file) => file.importance === "high").map((file) => file.path)
  ]).slice(0, 6);
  const apiFiles = pathsMatching(paths, /api|route|controller|client/i);
  const serviceFiles = pathsMatching(paths, /service|services|domain|worker|job/i);
  const authFiles = pathsMatching(paths, /auth|login|session|jwt|oauth|middleware|supabase/i);
  const likelyFiles = unique([...architectureFiles, ...apiFiles, ...serviceFiles, ...authFiles]).slice(0, 6);
  const completedStages = mission.completedStages ?? {};
  const completedSuccess = mission.completedSuccess ?? {};
  const completedSuccessCount = Object.values(completedSuccess).filter(Boolean).length;
  const workflowNames = intelligence.workflowFiles.map((workflow) => workflow.name || workflow.path);

  const gaps = [
    intelligence.sourceLimits.truncated ? "repository context was truncated, so confirm the changed area manually before opening a PR." : null,
    !intelligence.readme.content ? "README content was not available in the scan." : null,
    !intelligence.docs.hasContributingGuide ? "No contribution guide was detected. Use README, tests, and CI as the practical maintainer contract." : null,
    !intelligence.testStructure.hasTests ? "No automated tests were detected. Manual verification notes will matter more." : null,
    !mission.started ? "Mission progress has not been started or saved on this device." : null
  ].filter(Boolean) as string[];

  const understandingSignals = [
    intelligence.tree.directories.length > 0,
    architectureFiles.length > 0,
    intelligence.manifests.length > 0,
    docs.length > 0,
    tests.length > 0 || !intelligence.testStructure.hasTests
  ].filter(Boolean).length;
  const missionSignals = [
    mission.started,
    completedStages.understand,
    completedStages.implement,
    completedStages.validate,
    completedSuccessCount > 0
  ].filter(Boolean).length;
  const standardsSignals = [
    intelligence.docs.hasContributingGuide,
    intelligence.testStructure.hasTests,
    intelligence.workflowFiles.length > 0,
    intelligence.manifests.length > 0
  ].filter(Boolean).length;

  const checklist = [
    {
      label: "Tests passing",
      detail: tests[0] ?? "No test path detected; record manual verification instead.",
      why: "Maintainers need evidence that behavior still works.",
      complete: Boolean(completedStages.validate && tests.length)
    },
    {
      label: "Documentation updated",
      detail: docs[0] ?? "No docs detected.",
      why: "Docs keep the next contributor from rediscovering the same context.",
      complete: Boolean(completedSuccess["Documentation updated if the change affects contributor understanding"])
    },
    {
      label: "Screenshots added if applicable",
      detail: pathsMatching(paths, /frontend|component|app\/|pages\/|ui/i, 1)[0] ?? "Only needed for visual changes.",
      why: "Visual evidence helps reviewers understand UI changes quickly.",
      complete: false
    },
    {
      label: "PR description prepared",
      detail: "Summary, testing notes, and reviewer notes are drafted below.",
      why: "A clear description reduces back-and-forth during review.",
      complete: completedSuccessCount > 0
    },
    {
      label: "Breaking changes documented",
      detail: "Call out behavior, API, data, or setup changes.",
      why: "Maintainers need to know what downstream users may notice.",
      complete: false
    },
    {
      label: "Related issue linked",
      detail: "Add the issue URL or explain why the PR is standalone.",
      why: "Issue context helps maintainers evaluate scope.",
      complete: false
    },
    intelligence.workflowFiles.length
      ? {
          label: "CI expectations checked",
          detail: workflowNames.slice(0, 3).join(", "),
          why: "Repository workflow files often define the real review gate.",
          complete: Boolean(completedStages.validate)
        }
      : null,
    intelligence.docs.hasContributingGuide
      ? {
          label: "Contribution guide checked",
          detail: docs.find((doc) => /contributing/i.test(doc)) ?? "Contribution guide detected.",
          why: "Repository-specific rules should shape the final PR before generic advice does.",
          complete: true
        }
      : null
  ].filter(Boolean) as ReviewItem[];

  return {
    understanding: {
      structure: [
        {
          label: "Repository structure",
          detail: `${intelligence.tree.directories.length} directories and ${intelligence.tree.importantFiles.length} important files were mapped.`,
          why: "Structure helps you explain where the change belongs before defending how it was implemented.",
          complete: intelligence.tree.directories.length > 0
        }
      ],
      architecture: architectureFiles.length
        ? architectureFiles.map((path) => ({
            label: "Relevant architecture",
            detail: path,
            why: "This is a useful first stop for explaining the system shape.",
            complete: true
          }))
        : [{ label: "Relevant architecture", detail: "Primary architecture path was not detected.", why: "Confirming this manually should happen before implementation discussion.", complete: false }],
      dependencies: intelligence.manifests.length
        ? intelligence.manifests.slice(0, 4).map((manifest) => ({
            label: manifest.kind,
            detail: manifest.path,
            why: "Dependencies reveal setup, scripts, package managers, and review checks.",
            complete: true
          }))
        : [{ label: "Dependencies", detail: "No manifest detected.", why: "Setup assumptions should be confirmed manually.", complete: false }],
      docs: docs.map((doc) => ({
        label: /contributing/i.test(doc) ? "Contribution guide" : "Documentation",
        detail: doc,
        why: "Documentation states the maintainer contract more directly than code often does.",
        complete: true
      })),
      tests: tests.length
        ? tests.map((test) => ({
            label: "Related tests",
            detail: test,
            why: "Tests are the clearest way to show a contribution is ready for review.",
            complete: true
          }))
        : [{ label: "Related tests", detail: "No tests detected.", why: "Manual verification should be written clearly in the PR.", complete: false }],
      gaps
    },
    mission: [
      {
        label: "Mission started",
        detail: mission.started ? "Mission progress exists on this device." : "Mission has not been started here.",
        why: "Review should build on the contributor journey, not start from zero.",
        complete: Boolean(mission.started)
      },
      {
        label: "Relevant files identified",
        detail: likelyFiles.length ? likelyFiles.join(", ") : "No likely implementation files were inferred.",
        why: "A pull request is easier to review when its scope is easy to name.",
        complete: likelyFiles.length > 0
      },
      {
        label: "Implementation stage",
        detail: completedStages.implement ? "Marked complete in Mission." : "Not marked complete in Mission.",
        why: "Implementation should be complete before Review focuses on pull request readiness.",
        complete: Boolean(completedStages.implement)
      },
      {
        label: "Validation stage",
        detail: completedStages.validate ? "Marked complete in Mission." : "Not marked complete in Mission.",
        why: "Validation notes are part of contributor confidence, not paperwork.",
        complete: Boolean(completedStages.validate)
      },
      {
        label: "Mission objectives",
        detail: `${completedSuccessCount} success criteria checked.`,
        why: "Success criteria keep the PR tied to the original mission instead of drifting into extra work.",
        complete: completedSuccessCount > 0
      }
    ],
    standards: [
      {
        label: "Testing requirements",
        detail: tests.length ? `Use checks near ${tests[0]}.` : "No tests detected; prepare exact manual steps.",
        why: "This is repository-specific because it comes from detected test paths.",
        complete: tests.length > 0
      },
      {
        label: "Documentation requirements",
        detail: intelligence.docs.hasContributingGuide ? "Contribution guide detected." : "No contribution guide detected.",
        why: "Docs expectations should come from this repository before generic PR advice.",
        complete: intelligence.docs.hasContributingGuide
      },
      {
        label: "Commit message conventions",
        detail: docs.find((doc) => /contributing|commit/i.test(doc)) ?? "No commit convention detected; use a clear conventional-style subject if the repository does not say otherwise.",
        why: "Commit style affects maintainer scanning and release notes.",
        complete: intelligence.docs.docFiles.some((doc) => /contributing|commit/i.test(doc))
      },
      {
        label: "Pull request expectations",
        detail: workflowNames.length ? `CI signal: ${workflowNames.slice(0, 3).join(", ")}.` : "No workflow files detected.",
        why: "Workflow files are executable review expectations.",
        complete: workflowNames.length > 0
      }
    ],
    maintainerQuestions: [
      {
        label: "Why this implementation?",
        detail: likelyFiles[0] ? `Be ready to explain why the change belongs near ${likelyFiles[0]}.` : "Be ready to explain where the change belongs.",
        why: "Maintainers often ask about placement before they ask about syntax."
      },
      {
        label: "How was this validated?",
        detail: tests[0] ? `Expect a question about checks near ${tests[0]}.` : "Expect a question about manual verification.",
        why: "Reviewers need confidence that the behavior still works."
      },
      {
        label: "What did you intentionally avoid changing?",
        detail: authFiles[0] ? `If ${authFiles[0]} is nearby, call out whether authentication behavior changed.` : "Name any nearby modules left untouched.",
        why: "A clear non-scope answer reassures maintainers that the PR stayed focused."
      },
      {
        label: "What should the reviewer inspect first?",
        detail: likelyFiles.slice(0, 3).join(", ") || "Name the most important changed file in the PR description.",
        why: "Good reviewer notes lower the cost of giving useful feedback."
      }
    ],
    confidence: [
      {
        label: "Repository Understanding",
        level: confidenceLevel(understandingSignals, 5),
        explanation: `This is based on detected structure, architecture, dependencies, documentation, and tests. ${gaps[0] ? `Main gap: ${gaps[0]}` : "The repository has enough signals to explain the contribution context."}`
      },
      {
        label: "Mission Understanding",
        level: confidenceLevel(missionSignals, 5),
        explanation: `This reflects local Mission progress: started, understanding, implementation, validation, and success criteria. ${mission.started ? "Review can build on saved mission context." : "Starting or saving the Mission would make this stronger."}`
      },
      {
        label: "Architecture Understanding",
        level: confidenceLevel(architectureFiles.length ? 3 : 1, 4),
        explanation: architectureFiles.length
          ? `${architectureFiles[0]} gives you a concrete anchor for explaining the system shape.`
          : "The architecture anchor is not obvious from repository context, so confirm it manually."
      },
      {
        label: "Contribution Confidence",
        level: confidenceLevel(missionSignals + standardsSignals, 9),
        explanation: "This combines Mission progress with repository-specific standards. It is a readiness explanation, not an automated grade."
      }
    ],
    checklist,
    pr: {
      title: `${repository.name}: prepare focused contributor update`,
      summary: [
        `Prepared a focused contribution for ${repository.fullName}.`,
        likelyFiles[0] ? `Primary area reviewers should inspect first: ${likelyFiles[0]}.` : "Primary changed area should be named before opening the PR.",
        gaps.length ? `Known preparation note: ${gaps[0]}` : "Repository understanding, mission scope, and review notes are connected."
      ],
      testing: tests.length
        ? tests.map((test) => `Run or inspect checks near ${test}.`)
        : ["Document manual steps, expected result, and observed result because no automated tests were detected."],
      checklist: checklist.map((item) => item.label),
      reviewerNotes: [
        likelyFiles[0] ? `I would start review at ${likelyFiles[0]}.` : "I would name the most important changed file before submitting.",
        completedStages.validate ? "Validation has been marked complete in Mission." : "Validation still needs a clear note before submission.",
        "This PR is intended to stay scoped to the Mission."
      ]
    },
    verdict: {
      recommendation:
        missionSignals >= 4 && standardsSignals >= 2
          ? "I'd confidently open this Pull Request."
          : missionSignals >= 2
            ? "I'd spend a few more minutes tightening the validation and PR notes before submitting."
            : "I'd return to Mission for a short pass before opening this Pull Request.",
      why:
        missionSignals >= 4 && standardsSignals >= 2
          ? "You have enough repository context, mission progress, and validation shape to ask for maintainer review thoughtfully."
          : missionSignals >= 2
            ? "The contribution is close, but Review found a few readiness signals that deserve one calm pass first."
            : "Review should not ask you to submit before the repository and mission context feel grounded."
    }
  };
}

export function ReviewEngine({
  repository,
  intelligence,
  isGenerating,
  onAskMentor
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
  isGenerating: boolean;
  onAskMentor?: (prompt: string) => void;
}) {
  const [activeStage, setActiveStage] = useState<ReviewStageId>("understanding");
  const [mission, setMission] = useState<StoredMission>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [reflection, setReflection] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<Record<string, boolean>>({});
  const [savedReflection, setSavedReflection] = useState(false);
  const model = useMemo(() => intelligence ? buildReviewModel(repository, intelligence, mission) : null, [repository, intelligence, mission]);

  useEffect(() => {
    if (!repository.id || typeof window === "undefined") return;
    setMission(missionProgress(repository.id));
    const stored = window.localStorage.getItem(storageKey(repository.id));
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { checkedItems?: Record<string, boolean>; reflection?: string; selectedTopics?: Record<string, boolean> };
      setCheckedItems(parsed.checkedItems ?? {});
      setReflection(parsed.reflection ?? "");
      setSelectedTopics(parsed.selectedTopics ?? {});
    } catch {
      window.localStorage.removeItem(storageKey(repository.id));
    }
  }, [repository.id]);

  useEffect(() => {
    if (!repository.id || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(repository.id), JSON.stringify({ checkedItems, reflection, selectedTopics }));
  }, [checkedItems, reflection, repository.id, selectedTopics]);

  if (!intelligence || !model) {
    return (
      <EmptyState
        title="Review needs repository context"
        description={`${repository.fullName} needs repository understanding before Review can prepare pull request readiness.`}
      />
    );
  }

  const checklistComplete = model.checklist.filter((item) => checkedItems[item.label] || item.complete).length;

  function toggleChecklist(label: string) {
    setCheckedItems((current) => ({ ...current, [label]: !current[label] }));
  }

  function saveReflection() {
    if (typeof window === "undefined" || !reflection.trim()) return;
    const topics = Object.entries(selectedTopics).filter(([, selected]) => selected).map(([topic]) => topic);
    const event: TimelineReflectionEvent = {
      id: `review-${Date.now()}`,
      type: "review_reflection",
      title: "Review reflection",
      description: reflection.trim(),
      topics,
      repositoryFullName: repository.fullName,
      createdAt: new Date().toISOString()
    };
    const key = timelineStorageKey(repository.id);
    const stored = window.localStorage.getItem(key);
    const events = stored ? JSON.parse(stored) as TimelineReflectionEvent[] : [];
    window.localStorage.setItem(key, JSON.stringify([event, ...events].slice(0, 30)));
    setSavedReflection(true);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <WorkspaceCard className="p-0">
          <div className="grid overflow-hidden lg:grid-cols-[1fr_300px]">
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Review</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                Am I ready to open a Pull Request?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Review checks understanding, mission progress, repository expectations, and maintainer questions before you ask for review.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{repository.fullName}</Badge>
                <Badge>{checklistComplete}/{model.checklist.length} checklist items ready</Badge>
                <Badge>{model.confidence[3]?.level ?? "Confidence developing"}</Badge>
              </div>
            </div>
            <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">OpenForge Verdict</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{model.verdict.recommendation}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{model.verdict.why}</p>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const active = stage.id === activeStage;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStage(stage.id)}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      active ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active && "text-brand-violet")} aria-hidden="true" />
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>
        </WorkspaceCard>

        {activeStage === "understanding" ? (
          <RepositoryUnderstanding
            model={model}
            {...(onAskMentor ? { onAskMentor } : {})}
          />
        ) : null}
        {activeStage === "mission" ? <ItemSection eyebrow="Mission Review" title="What your Mission says about this contribution." items={model.mission} /> : null}
        {activeStage === "standards" ? <ItemSection eyebrow="Repository Standards" title="Repository-specific expectations to respect." items={model.standards} /> : null}
        {activeStage === "maintainer" ? <ItemSection eyebrow="Maintainer Perspective" title="Questions a maintainer may reasonably ask." items={model.maintainerQuestions} icon={HelpCircle} /> : null}
        {activeStage === "confidence" ? <ConfidenceReview items={model.confidence} /> : null}
        {activeStage === "checklist" ? <InteractiveChecklist items={model.checklist} checkedItems={checkedItems} onToggle={toggleChecklist} /> : null}
        {activeStage === "assistant" ? <PullRequestAssistant draft={model.pr} /> : null}
        {activeStage === "reflection" ? (
          <ReflectionPanel
            reflection={reflection}
            selectedTopics={selectedTopics}
            saved={savedReflection}
            onReflectionChange={(value) => {
              setReflection(value);
              setSavedReflection(false);
            }}
            onToggleTopic={(topic) => setSelectedTopics((current) => ({ ...current, [topic]: !current[topic] }))}
            onSave={saveReflection}
          />
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-5 xl:self-start">
        <WorkspaceCard>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Readiness Path</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Review sequence</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <PathVisualization
              orientation="vertical"
              steps={stages.map((stage) => ({
                id: stage.id,
                title: stage.label,
                status: stage.id === activeStage ? "active" : "pending",
                icon: stage.icon,
                onSelect: () => setActiveStage(stage.id)
              }))}
            />
          </div>
        </WorkspaceCard>
      </aside>
    </div>
  );
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

function RepositoryUnderstanding({ model, onAskMentor }: { model: ReviewModel; onAskMentor?: (prompt: string) => void }) {
  return (
    <WorkspaceCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading eyebrow="Repository Understanding" title="Understand the repository before judging the work.">
          Review starts here because implementation quality is hard to discuss without architecture, dependencies, docs, and tests.
        </SectionHeading>
        {onAskMentor ? (
          <Button type="button" onClick={() => onAskMentor("What repository context should I confirm before opening this pull request?")}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Ask Mentor
          </Button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <ReviewList title="Repository structure" items={model.understanding.structure} icon={Layers3} />
        <ReviewList title="Relevant architecture" items={model.understanding.architecture} icon={Route} />
        <ReviewList title="Dependencies" items={model.understanding.dependencies} icon={PackageCheck} />
        <ReviewList title="Related documentation" items={model.understanding.docs} icon={FileText} />
        <ReviewList title="Related tests" items={model.understanding.tests} icon={TestTube2} />
        <section className="rounded-[18px] border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">Understanding gaps</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {model.understanding.gaps.length ? model.understanding.gaps.map((gap) => (
              <p key={gap} className="text-sm leading-6 text-muted-foreground">{gap}</p>
            )) : <p className="text-sm leading-6 text-muted-foreground">No major understanding gaps were detected from repository context and Mission progress.</p>}
          </div>
        </section>
      </div>
    </WorkspaceCard>
  );
}

function ItemSection({ eyebrow, title, items, icon = CheckCircle2 }: { eyebrow: string; title: string; items: ReviewItem[]; icon?: LucideIcon }) {
  const Icon = icon;

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.detail}`} className="rounded-[18px] border border-border bg-background p-4">
            <div className="flex items-start gap-3">
              {item.complete === false ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              ) : (
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{item.detail}</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  <span className="font-medium">Why it matters:</span> {item.why}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function ReviewList({ title, items, icon: Icon }: { title: string; items: ReviewItem[]; icon: LucideIcon }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-violet" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <div key={`${title}-${item.detail}`} className="rounded-[15px] border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              {item.complete === false ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{item.label}</span>
                <span className="mt-1 block break-words text-sm leading-6 text-muted-foreground">{item.detail}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.why}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConfidenceReview({ items }: { items: ConfidenceItem[] }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Confidence Review" title="Readiness explained in plain language.">
        These are not hidden AI scores. Each confidence level names the evidence Review found and the gap, if one exists.
      </SectionHeading>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <section key={item.label} className="rounded-[18px] border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
              <Badge>{item.level}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.explanation}</p>
          </section>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function InteractiveChecklist({
  items,
  checkedItems,
  onToggle
}: {
  items: ReviewItem[];
  checkedItems: Record<string, boolean>;
  onToggle: (label: string) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Pull Request Checklist" title="Make the last pass interactive and repository-aware." />
      <ProcedureFlow
        className="mt-5"
        steps={items.map((item, index): ProcedureStep => {
          const complete = checkedItems[item.label] || item.complete;

          return {
            id: item.label,
            title: item.label,
            description: item.detail,
            status: complete ? "complete" : index === 0 ? "active" : "pending",
            dependencies: index === 0 ? [] : [items[index - 1]?.label ?? "Previous check"],
            details: [`Why it matters: ${item.why}`],
            action: {
              label: complete ? "Mark Not Ready" : "Mark Ready",
              onClick: () => onToggle(item.label)
            }
          };
        })}
      />
    </WorkspaceCard>
  );
}

function PullRequestAssistant({ draft }: { draft: PullRequestDraft }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Pull Request Assistant" title="Prepare the request. OpenForge will not submit it for you." />
      <div className="mt-5 grid gap-3">
        <AssistantBlock icon={GitPullRequest} title="Suggested PR title">{draft.title}</AssistantBlock>
        <AssistantList icon={FileText} title="PR summary" items={draft.summary} />
        <AssistantList icon={TestTube2} title="Testing notes" items={draft.testing} />
        <AssistantList icon={ClipboardCheck} title="Checklist" items={draft.checklist} />
        <AssistantList icon={MessageSquareText} title="Reviewer notes" items={draft.reviewerNotes} />
      </div>
    </WorkspaceCard>
  );
}

function AssistantBlock({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-violet" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">{children}</p>
    </section>
  );
}

function AssistantList({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-violet" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-violet" aria-hidden="true" />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReflectionPanel({
  reflection,
  selectedTopics,
  saved,
  onReflectionChange,
  onToggleTopic,
  onSave
}: {
  reflection: string;
  selectedTopics: Record<string, boolean>;
  saved: boolean;
  onReflectionChange: (value: string) => void;
  onToggleTopic: (topic: string) => void;
  onSave: () => void;
}) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Reflection" title="Capture what this contribution taught you.">
        Reflection feeds Timeline because OpenForge values learning as much as shipping.
      </SectionHeading>
      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor="review-reflection" className="text-sm font-semibold text-foreground">What did you understand better after this work?</label>
          <textarea
            id="review-reflection"
            value={reflection}
            onChange={(event) => onReflectionChange(event.target.value)}
            rows={5}
            className="mt-2 min-h-32 w-full rounded-[18px] border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/25"
            placeholder="Example: I understand how the API route connects to the service layer and what tests protect that behavior."
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Topics this helped with</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {reflectionTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => onToggleTopic(topic)}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selectedTopics[topic] ? "border-brand-violet/50 bg-soft-blue-wash text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="primary" onClick={onSave} disabled={!reflection.trim()}>
            <Send className="h-4 w-4" aria-hidden="true" />
            Add To Timeline
          </Button>
          {saved ? <Badge>Reflection saved to Timeline</Badge> : null}
        </div>
      </div>
    </WorkspaceCard>
  );
}


