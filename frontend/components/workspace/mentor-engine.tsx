"use client";

import type { GitHubRepositorySummary, WorkspaceKnowledgePackage } from "@openforge/shared";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Compass,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  GitPullRequest,
  Github,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Network,
  Route,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";
import { WorkspaceCard } from "./workspace-components";

type MentorCategoryId =
  | "architecture"
  | "authentication"
  | "api"
  | "database"
  | "testing"
  | "contribution"
  | "structure"
  | "mission"
  | "else";
type MentorDepth = "beginner" | "standard" | "maintainer";

interface MentorConcept {
  id: string;
  name: string;
  category: MentorCategoryId;
  definition: string;
  purpose: string;
  reasoning: string;
  whereUsed: string[];
  relatedModules: string[];
  relatedDocs: string[];
  relatedFiles: string[];
  suggestedReading: string[];
  nextQuestions: string[];
  dependencies: string[];
  icon: LucideIcon;
}

interface UnderstandingEvent {
  id: string;
  conceptId: string;
  conceptName: string;
  category: MentorCategoryId;
  learnedAt: string;
}

const categories: Array<{ id: MentorCategoryId; label: string; icon: LucideIcon; prompt: string }> = [
  { id: "architecture", label: "Architecture", icon: Layers3, prompt: "How does this repository fit together?" },
  { id: "authentication", label: "Authentication", icon: LockKeyhole, prompt: "Where is identity and access handled?" },
  { id: "api", label: "API", icon: Network, prompt: "How do requests move through the system?" },
  { id: "database", label: "Database", icon: Database, prompt: "What data model should I understand?" },
  { id: "testing", label: "Testing", icon: TestTube2, prompt: "How should I prove a change works?" },
  { id: "contribution", label: "Contribution Workflow", icon: GitPullRequest, prompt: "What makes a contribution reviewable here?" },
  { id: "structure", label: "Project Structure", icon: Compass, prompt: "Where should I start reading?" },
  { id: "mission", label: "Active Mission", icon: Route, prompt: "What should I understand before this mission?" },
  { id: "else", label: "Something Else", icon: MessageSquareText, prompt: "Ask with repository context attached." }
];

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

function storageKey(repositoryId: string) {
  return `openforge:mentor:${repositoryId}`;
}

function missionStorageKey(repositoryId: string) {
  return `openforge:mission:${repositoryId}`;
}

function allKnownPaths(intelligence: WorkspaceKnowledgePackage) {
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

function pathsMatching(paths: string[], pattern: RegExp, limit = 6) {
  return paths.filter((path) => pattern.test(path)).slice(0, limit);
}

function readmePath(intelligence: WorkspaceKnowledgePackage) {
  return intelligence.readme.path ?? "README";
}

function docsFor(intelligence: WorkspaceKnowledgePackage, pattern?: RegExp) {
  const docs = unique([readmePath(intelligence), ...intelligence.docs.docFiles]);
  return pattern ? pathsMatching(docs, pattern, 4) : docs.slice(0, 4);
}

function primaryEntryPoint(intelligence: WorkspaceKnowledgePackage) {
  return intelligence.entryPoints[0]?.path ?? intelligence.tree.importantFiles[0]?.path ?? null;
}

function primaryTests(intelligence: WorkspaceKnowledgePackage) {
  return unique([...intelligence.testStructure.testDirectories, ...intelligence.testStructure.testFiles]).slice(0, 5);
}

function buildMentorConcepts(intelligence: WorkspaceKnowledgePackage): MentorConcept[] {
  const paths = allKnownPaths(intelligence);
  const tests = primaryTests(intelligence);
  const entry = primaryEntryPoint(intelligence);
  const docs = docsFor(intelligence);
  const serviceFiles = pathsMatching(paths, /service|services|domain|worker|job/i);
  const apiFiles = pathsMatching(paths, /api|route|controller|client/i);
  const authFiles = pathsMatching(paths, /auth|login|session|jwt|oauth|middleware|supabase/i);
  const databaseFiles = pathsMatching(paths, /database|schema|migration|repository|supabase|prisma|drizzle/i);
  const frontendFiles = pathsMatching(paths, /frontend|app\/|pages\/|components\/|lib\/api|next\.config|vite|react/i);
  const backendFiles = pathsMatching(paths, /backend|server|routes|controllers|middleware|app\.ts/i);
  const toolingFiles = unique([
    ...intelligence.manifests.map((manifest) => manifest.path),
    ...pathsMatching(paths, /scripts|tsconfig|eslint|prettier|package\.json|env/i)
  ]).slice(0, 6);

  return [
    {
      id: "repository-architecture",
      name: "Repository Architecture",
      category: "architecture",
      definition: "The high-level shape of the product: surfaces, contracts, behavior, data, and operating checks.",
      purpose: "It helps a contributor decide where a change belongs before reading individual files.",
      reasoning: entry
        ? `OpenForge found ${entry} as the clearest entry point, so architecture should start there and branch into related contracts.`
        : "Workspace Knowledge did not find a single entry point, so architecture should start with docs and important paths.",
      whereUsed: unique([entry, ...frontendFiles, ...backendFiles, ...serviceFiles]).slice(0, 6),
      relatedModules: unique(["Frontend", "API", "Backend", "Services", "Database", "Testing"]),
      relatedDocs: docs,
      relatedFiles: unique([entry, ...frontendFiles, ...backendFiles, ...serviceFiles]).slice(0, 6),
      suggestedReading: unique([readmePath(intelligence), entry, ...docs, ...serviceFiles]).slice(0, 5),
      nextQuestions: ["Which file is the best starting point?", "Which modules depend on the entry point?", "Where does user-facing behavior cross into backend behavior?"],
      dependencies: ["Project Structure", "API", "Testing"],
      icon: Layers3
    },
    {
      id: "authentication-flow",
      name: "Authentication",
      category: "authentication",
      definition: "The repository paths that establish identity, sessions, protected routes, or access checks.",
      purpose: "Authentication protects user trust and usually affects both UI behavior and backend permissions.",
      reasoning: authFiles.length
        ? `${authFiles[0]} is a high-trust path, so Mentor treats auth as a concept to understand before changing protected workflows.`
        : "No strong auth path was detected; Mentor still checks for related login, session, OAuth, JWT, and middleware vocabulary.",
      whereUsed: authFiles,
      relatedModules: unique(["Frontend", "Backend", "API", "Middleware"]),
      relatedDocs: docsFor(intelligence, /auth|login|session|security|readme/i),
      relatedFiles: authFiles,
      suggestedReading: unique([...authFiles, ...pathsMatching(paths, /middleware|callback|session/i)]).slice(0, 5),
      nextQuestions: ["Where is Authentication initialized?", "Why is JWT validated here?", "Which routes depend on auth middleware?"],
      dependencies: ["API", "Middleware", "Frontend"],
      icon: LockKeyhole
    },
    {
      id: "api-contracts",
      name: "API Layer",
      category: "api",
      definition: "The request and response boundary between screens, services, storage, and external systems.",
      purpose: "API contracts show what behavior the repository promises to callers.",
      reasoning: apiFiles.length
        ? `${apiFiles[0]} is a useful first stop because API files reveal request shape, auth expectations, service calls, and response shape.`
        : "Workspace Knowledge found limited API evidence, so Mentor falls back to route, controller, and client paths.",
      whereUsed: apiFiles,
      relatedModules: unique(["Routes", "Controllers", "Services", "Frontend clients"]),
      relatedDocs: docsFor(intelligence, /api|endpoint|route|readme/i),
      relatedFiles: apiFiles,
      suggestedReading: unique([...apiFiles, ...serviceFiles]).slice(0, 5),
      nextQuestions: ["Which service handles this API behavior?", "Where is the client call made?", "What validation happens before the response?"],
      dependencies: ["Authentication", "Services", "Shared contracts"],
      icon: Network
    },
    {
      id: "database-model",
      name: "Database",
      category: "database",
      definition: "The durable data model: schemas, migrations, repositories, and persistence helpers.",
      purpose: "Database files name the product objects that other modules coordinate around.",
      reasoning: databaseFiles.length
        ? `${databaseFiles[0]} should be read as vocabulary before changing services that persist or fetch data.`
        : "No database file was strongly detected, so Mentor relies on detected database tooling and related repository paths.",
      whereUsed: databaseFiles,
      relatedModules: unique(["Services", "Backend", "Repositories", ...intelligence.detectedStack.databases]),
      relatedDocs: docsFor(intelligence, /database|schema|migration|supabase|readme/i),
      relatedFiles: databaseFiles,
      suggestedReading: unique([...databaseFiles, ...pathsMatching(paths, /repository|model|schema/i)]).slice(0, 5),
      nextQuestions: ["Which services write this data?", "Where is this schema read from the UI?", "Do migrations affect existing records?"],
      dependencies: ["Services", "API", "Authentication"],
      icon: Database
    },
    {
      id: "testing-strategy",
      name: "Testing Strategy",
      category: "testing",
      definition: "The checks and test locations maintainers use to decide whether behavior is preserved.",
      purpose: "Testing turns understanding into evidence before a pull request asks for review.",
      reasoning: tests.length
        ? `${tests[0]} is the closest detected testing signal, so contributors should inspect it before claiming validation.`
        : "No automated tests were detected; Mentor recommends precise manual verification notes.",
      whereUsed: tests.length ? tests : ["No automated tests detected"],
      relatedModules: unique(["CI/CD", "Developer Experience", "Pull Request Readiness"]),
      relatedDocs: docsFor(intelligence, /test|quality|ci|readme/i),
      relatedFiles: unique([...tests, ...intelligence.workflowFiles.map((workflow) => workflow.path)]),
      suggestedReading: unique([...tests, ...intelligence.workflowFiles.map((workflow) => workflow.path)]).slice(0, 5),
      nextQuestions: ["Which test is closest to my change?", "What manual validation should I record?", "Which workflow will run in CI?"],
      dependencies: ["CI/CD", "Developer Experience"],
      icon: TestTube2
    },
    {
      id: "contribution-workflow",
      name: "Contribution Workflow",
      category: "contribution",
      definition: "The path from understanding the repository to preparing a focused, reviewable pull request.",
      purpose: "It keeps contributors from jumping into broad edits before they know the maintainer contract.",
      reasoning: intelligence.docs.hasContributingGuide
        ? "A contribution guide was detected, so Mentor treats docs plus tests as the review contract."
        : "No contribution guide was detected, so Mentor leans on README, tests, and CI as the practical review contract.",
      whereUsed: unique([readmePath(intelligence), ...docs, ...tests]),
      relatedModules: unique(["Documentation", "Testing", "CI/CD", "Mission"]),
      relatedDocs: docs,
      relatedFiles: unique([...docs, ...tests, ...intelligence.workflowFiles.map((workflow) => workflow.path)]),
      suggestedReading: unique([readmePath(intelligence), ...docsFor(intelligence, /contributing|readme|test|ci/i), ...tests]).slice(0, 5),
      nextQuestions: ["What should I understand before editing?", "How small should this pull request be?", "What evidence belongs in the PR description?"],
      dependencies: ["Documentation", "Testing", "Mission"],
      icon: GitPullRequest
    },
    {
      id: "project-structure",
      name: "Project Structure",
      category: "structure",
      definition: "The folders, manifests, entry points, and docs that orient a contributor in this repository.",
      purpose: "Structure gives newcomers a map before details become distracting.",
      reasoning: `Workspace Knowledge processed ${intelligence.tree.processedEntries} entries and selected ${intelligence.raw.selectedFilePaths.length} paths for closer reading.`,
      whereUsed: unique([entry, ...intelligence.tree.directories.map((directory) => directory.path)]).slice(0, 6),
      relatedModules: unique(["Documentation", "Frontend", "Backend", "Developer Experience"]),
      relatedDocs: docs,
      relatedFiles: unique([entry, ...toolingFiles, ...intelligence.tree.importantFiles.map((file) => file.path)]).slice(0, 8),
      suggestedReading: unique([readmePath(intelligence), entry, ...toolingFiles]).slice(0, 5),
      nextQuestions: ["What should I read first?", "Which folders are safe for a first contribution?", "Where are scripts and setup described?"],
      dependencies: ["Documentation", "Developer Experience"],
      icon: Compass
    },
    {
      id: "developer-experience",
      name: "Developer Experience",
      category: "structure",
      definition: "The scripts, manifests, environment files, and setup helpers that make local work repeatable.",
      purpose: "Good developer experience lowers the cost of understanding and validating a contribution.",
      reasoning: toolingFiles.length
        ? `${toolingFiles[0]} is a contributor-facing path because tooling defines setup and verification habits.`
        : "Limited tooling was detected, so contributors should document manual setup assumptions as they learn.",
      whereUsed: toolingFiles,
      relatedModules: unique(["Testing", "CI/CD", "Documentation"]),
      relatedDocs: docsFor(intelligence, /setup|dev|contributing|readme/i),
      relatedFiles: toolingFiles,
      suggestedReading: unique([readmePath(intelligence), ...toolingFiles]).slice(0, 5),
      nextQuestions: ["Which script runs the closest check?", "Which environment variables are required?", "Where does setup differ from CI?"],
      dependencies: ["Testing", "CI/CD"],
      icon: Wrench
    }
  ];
}

function selectConcept(concepts: MentorConcept[], category: MentorCategoryId, query: string, contextConceptId?: string): MentorConcept | null {
  const contextConcept = concepts.find((concept) => concept.id === contextConceptId || concept.category === contextConceptId);
  if (contextConcept) return contextConcept;

  const normalized = query.toLowerCase();
  const matched = concepts.find((concept) =>
    [concept.name, concept.category, ...concept.relatedModules, ...concept.relatedFiles].some((item) => item.toLowerCase().includes(normalized) || normalized.includes(item.toLowerCase()))
  );
  if (matched && normalized.length > 2) return matched;

  return concepts.find((concept) => concept.category === category) ?? concepts[0] ?? null;
}

function depthExplanation(concept: MentorConcept, depth: MentorDepth) {
  if (depth === "beginner") {
    return `${concept.name} is the part to understand before you edit related files. Start with what it protects or connects, then read only the suggested paths.`;
  }
  if (depth === "maintainer") {
    return `${concept.name} matters because it defines review risk. A maintainer will ask whether the change respects ${concept.dependencies.join(", ") || "nearby contracts"} and whether validation covers the affected boundary.`;
  }
  return `${concept.name} exists to connect repository intent with implementation boundaries. Read the reasoning, inspect the related files, then choose the smallest next question.`;
}

function depthLabel(depth: MentorDepth) {
  if (depth === "beginner") return "Beginner";
  if (depth === "maintainer") return "Maintainer";
  return "Standard";
}

function groupHistory(events: UnderstandingEvent[]) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  return {
    Today: events.filter((event) => new Date(event.learnedAt).toDateString() === today),
    Yesterday: events.filter((event) => new Date(event.learnedAt).toDateString() === yesterdayKey),
    "Last Week": events.filter((event) => {
      const learnedAt = new Date(event.learnedAt);
      const age = now.getTime() - learnedAt.getTime();
      return learnedAt.toDateString() !== today && learnedAt.toDateString() !== yesterdayKey && age <= 7 * 24 * 60 * 60 * 1000;
    })
  };
}

function learningGap(concepts: MentorConcept[], history: UnderstandingEvent[]) {
  const learnedIds = new Set(history.map((event) => event.conceptId));
  const learnedCategories = new Set(history.map((event) => event.category));
  const repeatedCategory = categories.find((category) => history.filter((event) => event.category === category.id).length >= 2);
  const missingDependency = concepts.find((concept) => !learnedIds.has(concept.id) && concept.dependencies.some((dependency) => learnedCategories.has(dependency.toLowerCase() as MentorCategoryId)));
  const unvisited = concepts.find((concept) => !learnedIds.has(concept.id));

  if (repeatedCategory && missingDependency) {
    return `You've explored ${repeatedCategory.label} several times but have not looked at ${missingDependency.name} yet. That is the next useful gap to close.`;
  }
  if (unvisited) return `You have not studied ${unvisited.name} yet. It is a logical next concept because it touches ${unvisited.dependencies[0] ?? "the repository map"}.`;
  return "You have touched every major Mentor concept. The next gap is depth: revisit one area at Maintainer level and inspect the files.";
}

function isMissionActive(repositoryId: string) {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(missionStorageKey(repositoryId));
  if (!stored) return false;
  try {
    const parsed = JSON.parse(stored) as { started?: boolean; saved?: boolean };
    return Boolean(parsed.started || parsed.saved);
  } catch {
    return false;
  }
}

export function MentorEngine({
  repository,
  intelligence,
  isGenerating,
  onRegenerate,
  onOpenExplorer
}: {
  repository: GitHubRepositorySummary;
  intelligence: WorkspaceKnowledgePackage | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onOpenExplorer: () => void;
}) {
  const { mentorContext, setMentorContext } = useWorkspace();
  const [activeCategory, setActiveCategory] = useState<MentorCategoryId>("architecture");
  const [depth, setDepth] = useState<MentorDepth>("standard");
  const [question, setQuestion] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [history, setHistory] = useState<UnderstandingEvent[]>([]);
  const [missionActive, setMissionActive] = useState(false);
  const concepts = useMemo(() => intelligence ? buildMentorConcepts(intelligence) : [], [intelligence]);
  const selectedConcept = useMemo(
    () => concepts.find((concept) => concept.id === selectedConceptId) ?? concepts.find((concept) => concept.category === activeCategory) ?? concepts[0] ?? null,
    [activeCategory, concepts, selectedConceptId]
  );

  useEffect(() => {
    if (!repository.id || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey(repository.id));
    if (stored) {
      try {
        setHistory(JSON.parse(stored) as UnderstandingEvent[]);
      } catch {
        window.localStorage.removeItem(storageKey(repository.id));
      }
    }
    setMissionActive(isMissionActive(repository.id));
  }, [repository.id]);

  useEffect(() => {
    if (!intelligence || !concepts.length) return;
    const category = categories.some((item) => item.id === mentorContext.category) ? mentorContext.category as MentorCategoryId : null;
    const nextCategory = mentorContext.source === "mission" ? "mission" : category ?? activeCategory;
    const concept = selectConcept(concepts, nextCategory, mentorContext.subject ?? mentorContext.prompt ?? "", mentorContext.conceptId);
    if (!concept) return;
    setActiveCategory(nextCategory);
    setSelectedConceptId(concept.id);
    if (mentorContext.prompt) setQuestion(mentorContext.prompt);
  }, [activeCategory, concepts, intelligence, mentorContext]);

  useEffect(() => {
    if (!repository.id || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(repository.id), JSON.stringify(history.slice(0, 24)));
  }, [history, repository.id]);

  if (!intelligence) {
    return (
      <EmptyState
        title="Mentor needs Workspace Knowledge"
        description={`${repository.fullName} needs repository understanding before Mentor can teach architecture, context, gaps, and next questions.`}
        action={
          <Button type="button" onClick={onRegenerate} disabled={isGenerating} variant="primary">
            <Sparkles className={cn("h-4 w-4", isGenerating && "animate-spin")} aria-hidden="true" />
            {isGenerating ? "Understanding repository..." : "Prepare Workspace"}
          </Button>
        }
      />
    );
  }

  function recordUnderstanding(concept: MentorConcept) {
    const event: UnderstandingEvent = {
      id: `${concept.id}-${Date.now()}`,
      conceptId: concept.id,
      conceptName: concept.name,
      category: concept.category,
      learnedAt: new Date().toISOString()
    };
    setHistory((current) => [event, ...current.filter((item) => item.conceptId !== concept.id)].slice(0, 24));
  }

  function askQuestion(nextQuestion = question) {
    const concept = selectConcept(concepts, activeCategory, nextQuestion, mentorContext.conceptId);
    if (!concept) return;
    setQuestion(nextQuestion);
    setSelectedConceptId(concept.id);
    recordUnderstanding(concept);
  }

  function selectCategory(category: MentorCategoryId) {
    const nextConcept = concepts.find((concept) => concept.category === category) ?? concepts[0];
    setActiveCategory(category);
    setSelectedConceptId(nextConcept?.id ?? null);
    setMentorContext({ source: "workspace", category });
    if (nextConcept) recordUnderstanding(nextConcept);
  }

  const contextLabel = mentorContext.source === "mission" || missionActive
    ? "Mission context active"
    : mentorContext.source === "explorer"
      ? "Explorer context inherited"
      : "Workspace context inherited";
  const displayedConcept = selectedConcept;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <WorkspaceCard className="p-0">
          <div className="grid overflow-hidden lg:grid-cols-[1fr_300px]">
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Mentor</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                What do I still not understand about this repository?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Mentor teaches repository concepts through guided entry points, reusable understanding cards, and next questions tied to {repository.fullName}.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{contextLabel}</Badge>
                <Badge>{concepts.length} dictionary entries</Badge>
                <Badge>{history.length} concepts studied</Badge>
              </div>
            </div>
            <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
              <DepthSelector depth={depth} onChange={setDepth} />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Depth changes the explanation style. Repository reasoning stays the same.</p>
            </div>
          </div>
        </WorkspaceCard>

        {missionActive || mentorContext.source === "mission" ? (
          <MissionMentorPanel
            repository={repository}
            concept={displayedConcept}
            onAsk={(prompt) => {
              setActiveCategory("mission");
              askQuestion(prompt);
            }}
          />
        ) : null}

        <WorkspaceCard>
          <SectionHeading eyebrow="Guided Entry Points" title="Choose the kind of understanding you need first." />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className={cn(
                    "min-h-32 cursor-pointer rounded-[18px] border bg-background p-4 text-left transition-colors hover:border-brand-violet/40 hover:bg-card",
                    active && "border-brand-violet/50 bg-soft-blue-wash/45"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{category.label}</span>
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-muted-foreground">{category.prompt}</span>
                </button>
              );
            })}
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <SectionHeading eyebrow="Repository Question" title="Ask freely, with current context attached." />
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="mentor-question">Repository question</label>
            <input
              id="mentor-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: Why is auth middleware connected to these API routes?"
              className="openforge-input w-full"
            />
            <Button type="button" variant="primary" onClick={() => askQuestion()} disabled={!question.trim()}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Explain
            </Button>
          </div>
        </WorkspaceCard>

        {displayedConcept ? (
          <UnderstandingCard
            repository={repository}
            concept={displayedConcept}
            depth={depth}
            onOpenExplorer={onOpenExplorer}
            onFollowUp={askQuestion}
          />
        ) : null}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <UnderstandingHistory history={history} />
        <LearningGapPanel gap={learningGap(concepts, history)} />
        <DictionaryPanel concepts={concepts} selectedId={displayedConcept?.id ?? null} onSelect={(concept) => {
          setActiveCategory(concept.category);
          setSelectedConceptId(concept.id);
          recordUnderstanding(concept);
        }} />
      </aside>
    </div>
  );
}

function DepthSelector({ depth, onChange }: { depth: MentorDepth; onChange: (depth: MentorDepth) => void }) {
  const depths: Array<{ id: MentorDepth; label: string }> = [
    { id: "beginner", label: "Beginner" },
    { id: "standard", label: "Standard" },
    { id: "maintainer", label: "Maintainer" }
  ];

  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">Explanation Depth</p>
      <div className="mt-3 grid gap-2">
        {depths.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors",
              depth === item.id ? "bg-soft-blue-wash text-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MissionMentorPanel({
  repository,
  concept,
  onAsk
}: {
  repository: GitHubRepositorySummary;
  concept: MentorConcept | null;
  onAsk: (prompt: string) => void;
}) {
  const prompts = [
    "Explain this Mission",
    "Why this task?",
    "What should I understand first?",
    "Common mistakes"
  ];

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Mission Mentoring" title="Contextual guidance for the active mission.">
        Mentor is using mission progress and workspace knowledge together, so the next explanation stays tied to {repository.fullName}.
      </SectionHeading>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onAsk(prompt)}
            className="flex min-h-20 cursor-pointer items-center justify-between gap-3 rounded-[18px] border border-border bg-background p-4 text-left text-sm font-semibold text-foreground transition-colors hover:border-brand-violet/40 hover:bg-card"
          >
            {prompt}
            <ArrowRight className="h-4 w-4 text-brand-violet" aria-hidden="true" />
          </button>
        ))}
      </div>
      {concept ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Current mission-adjacent concept: <span className="font-medium text-foreground">{concept.name}</span>.
        </p>
      ) : null}
    </WorkspaceCard>
  );
}

function UnderstandingCard({
  repository,
  concept,
  depth,
  onOpenExplorer,
  onFollowUp
}: {
  repository: GitHubRepositorySummary;
  concept: MentorConcept;
  depth: MentorDepth;
  onOpenExplorer: () => void;
  onFollowUp: (question: string) => void;
}) {
  const Icon = concept.icon;

  return (
    <WorkspaceCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Understanding Card</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">{concept.name}</h3>
          </div>
        </div>
        <Button type="button" onClick={onOpenExplorer}>
          <Compass className="h-4 w-4" aria-hidden="true" />
          Open in Explorer
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <MentorBlock title="Reasoning First">{concept.reasoning}</MentorBlock>
        <MentorBlock title={`${depthLabel(depth)} Explanation`}>{depthExplanation(concept, depth)}</MentorBlock>
        <MentorBlock title="What It Is">{concept.definition}</MentorBlock>
        <MentorBlock title="Why It Exists">{concept.purpose}</MentorBlock>
        <MentorList title="Where It Is Used" items={concept.whereUsed} />
        <MentorList title="Related Modules" items={concept.relatedModules} />
        <MentorList title="Related Documentation" items={concept.relatedDocs} />
        <MentorList title="Suggested Reading" items={concept.suggestedReading} />
      </div>

      <div className="mt-5 rounded-[18px] border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-brand-violet" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-foreground">Suggested Next Questions</h4>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {concept.nextQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onFollowUp(question)}
              className="cursor-pointer rounded-[15px] border border-border bg-card p-3 text-left text-sm leading-6 text-muted-foreground transition-colors hover:border-brand-violet/40 hover:text-foreground"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button mt-5">
        <Github className="h-4 w-4" aria-hidden="true" />
        Open Repository
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </WorkspaceCard>
  );
}

function UnderstandingHistory({ history }: { history: UnderstandingEvent[] }) {
  const grouped = groupHistory(history);

  return (
    <WorkspaceCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          <BrainCircuit className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Understanding History</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Learning progress</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-4">
        {Object.entries(grouped).map(([label, events]) => (
          <section key={label}>
            <h4 className="text-xs font-medium uppercase text-muted-foreground">{label}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {events.length ? events.map((event) => <Badge key={event.id}>{event.conceptName}</Badge>) : <Badge>No concepts yet</Badge>}
            </div>
          </section>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function LearningGapPanel({ gap }: { gap: string }) {
  return (
    <WorkspaceCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Learning Gap</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Next concept to close</h3>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{gap}</p>
    </WorkspaceCard>
  );
}

function DictionaryPanel({
  concepts,
  selectedId,
  onSelect
}: {
  concepts: MentorConcept[];
  selectedId: string | null;
  onSelect: (concept: MentorConcept) => void;
}) {
  return (
    <WorkspaceCard>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Repository Dictionary</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Concept detail views</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {concepts.map((concept) => {
          const Icon = concept.icon;
          const active = selectedId === concept.id;
          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => onSelect(concept)}
              className={cn(
                "flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-[15px] border bg-background p-3 text-left transition-colors hover:border-brand-violet/40",
                active ? "border-brand-violet/50 bg-soft-blue-wash/45" : "border-border"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{concept.name}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{concept.definition}</span>
              </span>
            </button>
          );
        })}
      </div>
    </WorkspaceCard>
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

function MentorBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <h4 className="text-xs font-medium uppercase text-muted-foreground">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-foreground">{children}</p>
    </section>
  );
}

function MentorList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <h4 className="text-xs font-medium uppercase text-muted-foreground">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.slice(0, 8).map((item) => <Badge key={`${title}-${item}`} className="break-all">{item}</Badge>) : <Badge>None detected</Badge>}
      </div>
    </section>
  );
}

