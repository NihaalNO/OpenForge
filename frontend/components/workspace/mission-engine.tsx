"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  AlertTriangle,
  ArrowDown,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  GitPullRequest,
  Layers3,
  ListChecks,
  PackageCheck,
  Play,
  Route,
  Save,
  ShieldAlert,
  Sparkles,
  Target,
  TestTube2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { WorkspaceCard } from "./workspace-components";

type MissionSectionId =
  | "brief"
  | "before"
  | "knowledge"
  | "plan"
  | "mentor"
  | "risks"
  | "success"
  | "pr";

type MissionStatus = "Not Started" | "In Progress" | "Saved" | "Pull Request Ready";

interface MissionChecklistItem {
  id: string;
  label: string;
  detail: string;
  required: boolean;
  prepared: boolean;
}

interface MissionConcept {
  name: string;
  summary: string;
  files: string[];
}

interface MissionStage {
  id: string;
  name: string;
  goal: string;
  files: string[];
  docs: string[];
  outcome: string;
}

interface MissionRisk {
  label: string;
  why: string;
  items: string[];
}

interface MissionModel {
  title: string;
  difficulty: string;
  expectedExperience: string;
  duration: string;
  confidence: string;
  brief: {
    what: string;
    why: string;
    outcome: string;
  };
  before: MissionChecklistItem[];
  concepts: MissionConcept[];
  stages: MissionStage[];
  mentorNotes: string[];
  risks: MissionRisk[];
  successCriteria: string[];
  pr: {
    title: string;
    summary: string[];
    checklist: string[];
    files: string[];
    testing: string[];
  };
}

const sections: Array<{ id: MissionSectionId; label: string; icon: LucideIcon }> = [
  { id: "brief", label: "Mission Brief", icon: Target },
  { id: "before", label: "Before You Begin", icon: BookOpenCheck },
  { id: "knowledge", label: "Knowledge Checklist", icon: Layers3 },
  { id: "plan", label: "Execution Plan", icon: Route },
  { id: "mentor", label: "Mentor Notes", icon: Sparkles },
  { id: "risks", label: "Risks", icon: ShieldAlert },
  { id: "success", label: "Success Criteria", icon: ClipboardCheck },
  { id: "pr", label: "PR Assistant", icon: GitPullRequest }
];

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

function formatLevel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ");
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

function readmePath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.readme.path ?? "README";
}

function docsFor(intelligence: RepositoryKnowledgePackage, pattern?: RegExp) {
  const docs = unique([readmePath(intelligence), ...intelligence.docs.docFiles]);
  return pattern ? pathsMatching(docs, pattern, 4) : docs.slice(0, 4);
}

function primaryEntryPoint(intelligence: RepositoryKnowledgePackage) {
  return intelligence.entryPoints[0]?.path ?? intelligence.tree.importantFiles[0]?.path ?? null;
}

function primaryTests(intelligence: RepositoryKnowledgePackage) {
  return unique([...intelligence.testStructure.testDirectories, ...intelligence.testStructure.testFiles]).slice(0, 5);
}

function confidenceLevel(intelligence: RepositoryKnowledgePackage) {
  if (!intelligence.sourceLimits.truncated && intelligence.readme.content && intelligence.tree.processedEntries > 0) return "High";
  if (!intelligence.sourceLimits.truncated || intelligence.readme.content) return "Medium";
  return "Developing";
}

function estimatedDuration(intelligence: RepositoryKnowledgePackage) {
  if (intelligence.complexity.level === "advanced") return "4-6 hours";
  if (intelligence.complexity.level === "intermediate") return "2-4 hours";
  return "60-120 minutes";
}

function expectedExperience(intelligence: RepositoryKnowledgePackage) {
  if (intelligence.complexity.level === "advanced") return "Advanced contributor";
  if (intelligence.complexity.level === "intermediate") return "Comfortable with the detected stack";
  return "New contributor with setup patience";
}

function concept(name: string, summary: string, files: string[]): MissionConcept | null {
  return files.length ? { name, summary, files } : null;
}

function buildMission(repository: GitHubRepositorySummary, intelligence: RepositoryKnowledgePackage): MissionModel {
  const paths = allKnownPaths(intelligence);
  const tests = primaryTests(intelligence);
  const docs = docsFor(intelligence);
  const entry = primaryEntryPoint(intelligence);
  const serviceFiles = pathsMatching(paths, /service|services|domain|worker|job/i);
  const apiFiles = pathsMatching(paths, /api|route|controller|client/i);
  const authFiles = pathsMatching(paths, /auth|login|session|jwt|oauth|middleware|supabase/i);
  const databaseFiles = pathsMatching(paths, /database|schema|migration|repository|supabase|prisma|drizzle/i);
  const frontendFiles = pathsMatching(paths, /frontend|app\/|pages\/|components\/|lib\/api|next\.config|vite|react/i);
  const implementationFiles = unique([entry, ...serviceFiles, ...apiFiles, ...frontendFiles]).slice(0, 6);
  const missingPrep = [
    !intelligence.readme.content ? "README content was not available in the scan." : null,
    !intelligence.docs.hasContributingGuide ? "No contribution guide was detected." : null,
    !intelligence.testStructure.hasTests ? "No automated tests were detected." : null,
    intelligence.sourceLimits.truncated ? "Workspace knowledge was truncated." : null
  ].filter(Boolean) as string[];
  const concepts = [
    concept("Project Contract", "The README and docs define what maintainers expect contributors to respect.", docs),
    concept("API Contracts", "Request and response boundaries show how product behavior is promised to other layers.", apiFiles),
    concept("Service Boundaries", "Services usually hold reusable behavior and hidden integration assumptions.", serviceFiles),
    concept("Authentication Flow", "Auth paths need extra care because they affect identity, access, and protected actions.", authFiles),
    concept("Database Relationships", "Schema and migration files name the product objects other modules coordinate around.", databaseFiles),
    concept("Testing Strategy", "Tests and workflow files show how maintainers expect changes to be proven.", unique([...tests, ...intelligence.workflowFiles.map((workflow) => workflow.path)]))
  ].filter(Boolean) as MissionConcept[];

  return {
    title: `Prepare a focused contribution to ${repository.name}`,
    difficulty: formatLevel(intelligence.complexity.level),
    expectedExperience: expectedExperience(intelligence),
    duration: estimatedDuration(intelligence),
    confidence: confidenceLevel(intelligence),
    brief: {
      what: `Build enough understanding of ${repository.fullName} to make one narrow, reviewable contribution.`,
      why: "A good pull request starts before code changes. Mission turns repository signals into a calm path through context, implementation, validation, and review prep.",
      outcome: "You should finish with a scoped change plan, checked risks, validation notes, and pull request material ready to adapt."
    },
    before: [
      {
        id: "readme",
        label: "README reviewed",
        detail: readmePath(intelligence),
        required: true,
        prepared: Boolean(intelligence.readme.content)
      },
      {
        id: "contributing",
        label: "Contribution Guide reviewed",
        detail: intelligence.docs.hasContributingGuide ? docsFor(intelligence, /contributing/i)[0] ?? "Contribution guide detected" : "No contribution guide detected",
        required: false,
        prepared: intelligence.docs.hasContributingGuide
      },
      {
        id: "architecture",
        label: "Relevant architecture understood",
        detail: entry ?? intelligence.tree.directories[0]?.path ?? "Primary entry point not detected",
        required: true,
        prepared: Boolean(entry || intelligence.tree.directories.length)
      },
      {
        id: "tests",
        label: "Related tests identified",
        detail: tests[0] ?? "No tests detected; prepare manual verification notes",
        required: true,
        prepared: intelligence.testStructure.hasTests
      }
    ],
    concepts,
    stages: [
      {
        id: "understand",
        name: "Understand",
        goal: "Read the repository promise and identify the behavior your contribution must preserve.",
        files: docs,
        docs,
        outcome: "You can explain what the repository does and where the contribution belongs."
      },
      {
        id: "locate",
        name: "Locate",
        goal: "Find the smallest set of files likely to carry the change.",
        files: implementationFiles.length ? implementationFiles : [entry ?? "Primary implementation path not detected"],
        docs: docsFor(intelligence, /architecture|api|setup|readme/i),
        outcome: "You have a short file list and know which modules depend on it."
      },
      {
        id: "implement",
        name: "Implement",
        goal: "Make one narrow change that respects existing boundaries and naming.",
        files: implementationFiles,
        docs: docsFor(intelligence, /contributing|style|readme/i),
        outcome: "The change is scoped, readable, and avoids unrelated refactors."
      },
      {
        id: "validate",
        name: "Validate",
        goal: "Run the closest automated or manual checks before considering the work done.",
        files: tests.length ? tests : ["Manual verification notes required"],
        docs: unique([...docsFor(intelligence, /test|quality|ci|readme/i), ...intelligence.workflowFiles.map((workflow) => workflow.path)]),
        outcome: "You know what passed, what was not run, and why."
      },
      {
        id: "review",
        name: "Review",
        goal: "Read the diff like a maintainer before asking for review.",
        files: implementationFiles,
        docs: docsFor(intelligence, /contributing|pull|review|readme/i),
        outcome: "The diff is small, named clearly, and free of accidental churn."
      },
      {
        id: "pr",
        name: "Prepare Pull Request",
        goal: "Turn implementation and validation into a maintainer-friendly PR.",
        files: implementationFiles,
        docs: docs,
        outcome: "The PR title, summary, checklist, and testing notes are ready."
      }
    ],
    mentorNotes: [
      entry ? `Start from ${entry}; it is the clearest entry point OpenForge found.` : "Start with the README and the most important mapped files before editing.",
      tests.length ? `Keep ${tests[0]} close while implementing. Tests usually reveal the maintainer contract faster than broad code reading.` : "Because no tests were detected, write down exact manual verification steps as you work.",
      authFiles.length ? `Treat ${authFiles[0]} as a high-trust path. Authentication changes should stay small and easy to review.` : "Avoid widening scope into authentication or access control unless the mission truly requires it.",
      missingPrep.length ? `Preparation gap: ${missingPrep[0]}` : "The repository has enough signals for a contributor to begin with confidence."
    ],
    risks: [
      {
        label: "Related modules",
        why: "Changes can ripple through nearby contracts even when the diff is small.",
        items: unique([...apiFiles, ...serviceFiles, ...frontendFiles]).slice(0, 6)
      },
      {
        label: "Dependent services",
        why: "External services and storage boundaries often create hidden setup requirements.",
        items: unique([...databaseFiles, ...authFiles, ...intelligence.detectedStack.databases, ...intelligence.detectedStack.deployment]).slice(0, 6)
      },
      {
        label: "Testing impact",
        why: "Maintainers need evidence that behavior still works after the change.",
        items: tests.length ? tests : ["No automated tests detected; manual testing carries more weight."]
      },
      {
        label: "Potential regressions",
        why: "These areas are connected to user-visible or repository-wide behavior.",
        items: unique([authFiles[0], apiFiles[0], entry, intelligence.workflowFiles[0]?.path]).filter(Boolean).slice(0, 5)
      }
    ],
    successCriteria: [
      "Relevant changes implemented",
      intelligence.testStructure.hasTests ? "Closest tests pass" : "Manual validation completed and documented",
      intelligence.docs.hasContributingGuide ? "Contribution guide expectations checked" : "Documentation updated if the change affects contributor understanding",
      "Pull request checklist completed"
    ],
    pr: {
      title: `Improve ${repository.name} contribution path`,
      summary: [
        `Prepared a focused contribution for ${repository.fullName}.`,
        implementationFiles[0] ? `Primary area: ${implementationFiles[0]}.` : "Primary implementation area should be confirmed before opening the PR.",
        tests.length ? `Validation should include ${tests[0]}.` : "Validation should include clear manual testing notes."
      ],
      checklist: [
        "I kept the change scoped to the mission.",
        "I reviewed the related files and dependencies.",
        intelligence.testStructure.hasTests ? "I ran the closest relevant tests." : "I documented manual verification because tests were not detected.",
        "I noted risks, limitations, or follow-up work."
      ],
      files: implementationFiles.length ? implementationFiles : allKnownPaths(intelligence).slice(0, 5),
      testing: tests.length
        ? tests.map((test) => `Run or inspect checks near ${test}.`)
        : ["Record manual steps, expected result, and observed result in the PR."]
    }
  };
}

function statusFromProgress(started: boolean, saved: boolean, prReady: boolean): MissionStatus {
  if (prReady) return "Pull Request Ready";
  if (saved) return "Saved";
  if (started) return "In Progress";
  return "Not Started";
}

function storageKey(repositoryId: string) {
  return `openforge:mission:${repositoryId}`;
}

export function MissionEngine({
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
  const [activeSection, setActiveSection] = useState<MissionSectionId>("brief");
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [completedStages, setCompletedStages] = useState<Record<string, boolean>>({});
  const [completedSuccess, setCompletedSuccess] = useState<Record<string, boolean>>({});

  const mission = useMemo(() => intelligence ? buildMission(repository, intelligence) : null, [repository, intelligence]);

  useEffect(() => {
    if (!repository.id || typeof window === "undefined") return;

    const stored = window.localStorage.getItem(storageKey(repository.id));
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        started?: boolean;
        saved?: boolean;
        checkedItems?: Record<string, boolean>;
        completedStages?: Record<string, boolean>;
        completedSuccess?: Record<string, boolean>;
      };

      setStarted(Boolean(parsed.started));
      setSaved(Boolean(parsed.saved));
      setCheckedItems(parsed.checkedItems ?? {});
      setCompletedStages(parsed.completedStages ?? {});
      setCompletedSuccess(parsed.completedSuccess ?? {});
    } catch {
      window.localStorage.removeItem(storageKey(repository.id));
    }
  }, [repository.id]);

  useEffect(() => {
    if (!repository.id || typeof window === "undefined") return;

    window.localStorage.setItem(
      storageKey(repository.id),
      JSON.stringify({ started, saved, checkedItems, completedStages, completedSuccess })
    );
  }, [repository.id, started, saved, checkedItems, completedStages, completedSuccess]);

  if (!intelligence || !mission) {
    return (
      <EmptyState
        title="Mission needs repository context"
        description={`${repository.fullName} needs repository understanding before Mission can guide a contributor through preparation, implementation, and pull request readiness.`}
      />
    );
  }

  const beforeComplete = mission.before.every((item) => checkedItems[item.id] || item.prepared);
  const implementationComplete = Boolean(completedStages.implement);
  const validationComplete = Boolean(completedStages.validate);
  const prReady = mission.successCriteria.every((item) => completedSuccess[item]);
  const status = statusFromProgress(started, saved, prReady);
  const milestones = [
    { label: "Repository Understood", complete: true },
    { label: "Mission Started", complete: started },
    { label: "Implementation Complete", complete: implementationComplete },
    { label: "Validation Complete", complete: validationComplete },
    { label: "Pull Request Ready", complete: prReady }
  ];

  function startMission() {
    setStarted(true);
    setSaved(false);
    setActiveSection("before");
  }

  function saveMission() {
    setSaved(true);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <WorkspaceCard className="p-0">
          <div className="grid overflow-hidden lg:grid-cols-[1fr_300px]">
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Mission Dashboard</p>
              <h2 className="mt-2 break-words text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                {mission.title}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{repository.fullName}</Badge>
                <Badge>{mission.difficulty}</Badge>
                <Badge>{mission.confidence} confidence</Badge>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MissionFact label="Repository" value={repository.fullName} />
                <MissionFact label="Expected Experience" value={mission.expectedExperience} />
                <MissionFact label="Estimated Duration" value={mission.duration} />
                <MissionFact label="Mission Status" value={status} />
              </dl>
            </div>
            <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
              <div className="grid gap-2">
                <Button type="button" variant="primary" onClick={startMission}>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {started ? "Resume Mission" : "Start Mission"}
                </Button>
                {onAskMentor ? (
                  <Button type="button" onClick={() => onAskMentor("What should I understand first for this Mission?")}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Ask Mentor
                  </Button>
                ) : null}
                <Button type="button" onClick={saveMission}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save For Later
                </Button>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Progress is saved on this device. Mission never opens or submits a pull request for you.
              </p>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeSection;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      active ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active && "text-brand-violet")} aria-hidden="true" />
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        </WorkspaceCard>

        {activeSection === "brief" ? <MissionBrief mission={mission} /> : null}
        {activeSection === "before" ? (
          <BeforeBegin
            items={mission.before}
            checkedItems={checkedItems}
            onToggle={(id) => setCheckedItems((current) => ({ ...current, [id]: !current[id] }))}
          />
        ) : null}
        {activeSection === "knowledge" ? <KnowledgeChecklist concepts={mission.concepts} /> : null}
        {activeSection === "plan" ? (
          <ExecutionPlan
            stages={mission.stages}
            completedStages={completedStages}
            onToggle={(id) => setCompletedStages((current) => ({ ...current, [id]: !current[id] }))}
          />
        ) : null}
        {activeSection === "mentor" ? <MentorNotes notes={mission.mentorNotes} /> : null}
        {activeSection === "risks" ? <RisksDependencies risks={mission.risks} /> : null}
        {activeSection === "success" ? (
          <SuccessCriteria
            criteria={mission.successCriteria}
            completed={completedSuccess}
            onToggle={(item) => setCompletedSuccess((current) => ({ ...current, [item]: !current[item] }))}
          />
        ) : null}
        {activeSection === "pr" ? <PullRequestAssistant mission={mission} /> : null}
      </div>

      <aside className="xl:sticky xl:top-5 xl:self-start">
        <WorkspaceCard>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Mission Progress</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">{status}</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {milestones.map((milestone, index) => (
              <div key={milestone.label}>
                <div className="flex items-center gap-3 rounded-[18px] border border-border bg-background p-3">
                  {milestone.complete ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                  )}
                  <span className={cn("text-sm", milestone.complete ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {milestone.label}
                  </span>
                </div>
                {index < milestones.length - 1 ? (
                  <div className="flex h-5 items-center pl-5">
                    <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {!beforeComplete ? (
            <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-sm leading-6">Finish the preparation checks before implementation.</p>
              </div>
            </div>
          ) : null}
        </WorkspaceCard>
      </aside>
    </div>
  );
}

function MissionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold capitalize text-foreground">{value}</dd>
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

function MissionBrief({ mission }: { mission: MissionModel }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Mission Brief" title="What this mission prepares you to do." />
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <BriefPoint icon={Target} label="What" value={mission.brief.what} />
        <BriefPoint icon={Clock3} label="Why It Matters" value={mission.brief.why} />
        <BriefPoint icon={FileCheck2} label="Expected Outcome" value={mission.brief.outcome} />
      </div>
    </WorkspaceCard>
  );
}

function BriefPoint({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-violet" aria-hidden="true" />
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function BeforeBegin({
  items,
  checkedItems,
  onToggle
}: {
  items: MissionChecklistItem[];
  checkedItems: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Before You Begin" title="Verify repository understanding before editing." />
      <div className="mt-5 grid gap-3">
        {items.map((item) => {
          const complete = checkedItems[item.id] || item.prepared;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                "grid cursor-pointer gap-3 rounded-[18px] border bg-background p-4 text-left transition-colors sm:grid-cols-[24px_1fr_auto]",
                complete ? "border-emerald-200" : "border-amber-200 bg-amber-50/50"
              )}
            >
              <span className="mt-0.5">
                {complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="mt-1 block break-words text-sm leading-6 text-muted-foreground">{item.detail}</span>
              </span>
              <Badge>{item.required ? "Required" : "Recommended"}</Badge>
            </button>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

function KnowledgeChecklist({ concepts }: { concepts: MissionConcept[] }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Knowledge Checklist" title="Understand the concepts before editing code.">
        Expand only what you need. Mission keeps explanations short and tied to repository signals.
      </SectionHeading>
      <div className="mt-5 grid gap-3">
        {concepts.map((item) => (
          <details key={item.name} className="group rounded-[18px] border border-border bg-background p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="font-semibold text-foreground">{item.name}</span>
              <ChevronDown className="h-4 w-4 text-brand-violet transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.files.slice(0, 6).map((file) => <Badge key={`${item.name}-${file}`} className="break-all">{file}</Badge>)}
            </div>
          </details>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function ExecutionPlan({
  stages,
  completedStages,
  onToggle
}: {
  stages: MissionStage[];
  completedStages: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Execution Plan" title="Move from understanding to pull request preparation." />
      <div className="mt-6 grid gap-3">
        {stages.map((stage, index) => (
          <div key={stage.id}>
            <div className="grid gap-4 rounded-[18px] border border-border bg-background p-4 lg:grid-cols-[52px_1fr_auto]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-blue-wash text-sm font-semibold text-brand-violet">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">{stage.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{stage.goal}</p>
                <StageList label="Suggested files" items={stage.files} />
                <StageList label="Related documentation" items={stage.docs} />
                <p className="mt-3 text-sm leading-6 text-foreground">
                  <span className="font-medium">Expected outcome:</span> {stage.outcome}
                </p>
              </div>
              <Button type="button" onClick={() => onToggle(stage.id)} className="self-start">
                <CheckCircle2 className={cn("h-4 w-4", completedStages[stage.id] && "text-emerald-600")} aria-hidden="true" />
                {completedStages[stage.id] ? "Complete" : "Mark Done"}
              </Button>
            </div>
            {index < stages.length - 1 ? (
              <div className="flex h-8 items-center pl-6">
                <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function StageList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? items.slice(0, 6).map((item) => <Badge key={`${label}-${item}`} className="break-all">{item}</Badge>) : <Badge>None detected</Badge>}
      </div>
    </div>
  );
}

function MentorNotes({ notes }: { notes: string[] }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Mentor Notes" title="Repository-specific guidance before the edit." />
      <div className="mt-5 grid gap-3">
        {notes.map((note) => (
          <div key={note} className="flex items-start gap-3 rounded-[18px] border border-border bg-background p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
            <p className="text-sm leading-6 text-foreground">{note}</p>
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function RisksDependencies({ risks }: { risks: MissionRisk[] }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Risks & Dependencies" title="Know what can move when you change code." />
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {risks.map((risk) => (
          <div key={risk.label} className="rounded-[18px] border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-brand-violet" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">{risk.label}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{risk.why}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {risk.items.length ? risk.items.map((item) => <Badge key={`${risk.label}-${item}`} className="break-all">{item}</Badge>) : <Badge>None detected</Badge>}
            </div>
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function SuccessCriteria({
  criteria,
  completed,
  onToggle
}: {
  criteria: string[];
  completed: Record<string, boolean>;
  onToggle: (item: string) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Success Criteria" title="Mission is complete when these are true." />
      <div className="mt-5 grid gap-3">
        {criteria.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border bg-background p-4 text-left transition-colors hover:border-brand-violet/40"
          >
            <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", completed[item] ? "text-emerald-600" : "text-muted-foreground")} aria-hidden="true" />
            <span className="text-sm leading-6 text-foreground">{item}</span>
          </button>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function PullRequestAssistant({ mission }: { mission: MissionModel }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Pull Request Assistant" title="Prepare the PR. Do not submit it here." />
      <div className="mt-5 grid gap-3">
        <AssistantBlock icon={GitPullRequest} title="Suggested PR title">
          {mission.pr.title}
        </AssistantBlock>
        <AssistantList icon={FileText} title="Summary" items={mission.pr.summary} />
        <AssistantList icon={ClipboardCheck} title="Checklist" items={mission.pr.checklist} />
        <AssistantList icon={FileCheck2} title="Files modified or likely touched" items={mission.pr.files} />
        <AssistantList icon={TestTube2} title="Testing notes" items={mission.pr.testing} />
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


