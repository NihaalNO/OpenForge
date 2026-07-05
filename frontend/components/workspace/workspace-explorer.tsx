"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  FileText,
  Github,
  GitPullRequest,
  GitBranch,
  GraduationCap,
  LockKeyhole,
  Map as MapIcon,
  Network,
  Rocket,
  Route,
  Server,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Wrench
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { WorkspaceCard } from "./workspace-components";

type ExplorerView = "architecture" | "knowledge" | "journey" | "contributions";
type ConceptKind = "documentation" | "frontend" | "backend" | "service" | "database" | "auth" | "api" | "testing" | "ci" | "deployment" | "dx" | "infrastructure";

interface ConceptNode {
  id: ConceptKind;
  name: string;
  purpose: string;
  dependencies: string[];
  relatedModules: string[];
  relatedDocs: string[];
  relatedTests: string[];
  relatedFiles: string[];
  suggestedReading: string[];
  insight: string;
  strength: "primary" | "supporting" | "detected";
  icon: typeof BrainCircuit;
}

interface ContributionArea {
  name: string;
  expectedExperience: string;
  learningValue: string;
  suggestedFirstContribution: string;
  concepts: ConceptKind[];
  icon: typeof BrainCircuit;
}

interface ReadingStep {
  title: string;
  target: string;
  why: string;
  conceptId?: ConceptKind;
}

const viewLabels: Array<{ id: ExplorerView; label: string; icon: typeof MapIcon }> = [
  { id: "architecture", label: "Architecture", icon: Network },
  { id: "knowledge", label: "Knowledge Map", icon: BrainCircuit },
  { id: "journey", label: "Reading Journey", icon: Route },
  { id: "contributions", label: "Contribution Areas", icon: GitPullRequest }
];

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

function formatLevel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "unknown";
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

function fallbackList(items: string[], fallback: string) {
  return items.length ? items : [fallback];
}

function readmePath(intelligence: RepositoryKnowledgePackage) {
  return intelligence.readme.path ?? "README";
}

function primaryEntryPoint(intelligence: RepositoryKnowledgePackage) {
  return intelligence.entryPoints[0]?.path ?? intelligence.tree.importantFiles[0]?.path ?? null;
}

function primaryTests(intelligence: RepositoryKnowledgePackage) {
  return unique([...intelligence.testStructure.testDirectories, ...intelligence.testStructure.testFiles]).slice(0, 5);
}

function docsFor(intelligence: RepositoryKnowledgePackage, pattern?: RegExp) {
  const docs = unique([readmePath(intelligence), ...intelligence.docs.docFiles]);
  return pattern ? pathsMatching(docs, pattern, 4) : docs.slice(0, 4);
}

function conceptExists(intelligence: RepositoryKnowledgePackage, id: ConceptKind, paths: string[]) {
  if (id === "documentation") return Boolean(intelligence.readme.content || intelligence.docs.docFiles.length);
  if (id === "frontend") return paths.some((path) => /frontend|app\/|pages\/|components\/|next\.config|vite|react/i.test(path)) || intelligence.detectedStack.frameworks.some((item) => /next|react|vue|svelte|angular|vite/i.test(item));
  if (id === "backend") return paths.some((path) => /backend|server|api\/|routes|controllers|express/i.test(path)) || intelligence.detectedStack.frameworks.some((item) => /express|fastify|nestjs|koa|hono/i.test(item));
  if (id === "service") return paths.some((path) => /service|domain|usecase|worker|job/i.test(path));
  if (id === "database") return paths.some((path) => /database|migration|schema|supabase|prisma|drizzle|typeorm/i.test(path)) || intelligence.detectedStack.databases.length > 0;
  if (id === "auth") return paths.some((path) => /auth|login|session|jwt|oauth|supabase/i.test(path));
  if (id === "api") return paths.some((path) => /api|route|controller|client/i.test(path));
  if (id === "testing") return intelligence.testStructure.hasTests;
  if (id === "ci") return intelligence.workflowFiles.length > 0 || intelligence.detectedStack.ci.length > 0;
  if (id === "deployment") return paths.some((path) => /docker|deploy|vercel|netlify|railway|render|fly\.toml/i.test(path)) || intelligence.detectedStack.deployment.length > 0;
  if (id === "dx") return paths.some((path) => /package\.json|eslint|prettier|tsconfig|scripts|dev/i.test(path));
  return paths.some((path) => /infra|docker|compose|workflow|terraform|k8s|helm/i.test(path));
}

function buildConcepts(intelligence: RepositoryKnowledgePackage): ConceptNode[] {
  const paths = allKnownPaths(intelligence);
  const tests = primaryTests(intelligence);
  const manifests = intelligence.manifests.map((manifest) => manifest.path);
  const entry = primaryEntryPoint(intelligence);
  const definitions: ConceptNode[] = [
    {
      id: "documentation",
      name: "Documentation",
      purpose: "Explains the project contract before a contributor touches code.",
      dependencies: [],
      relatedModules: docsFor(intelligence),
      relatedDocs: docsFor(intelligence),
      relatedTests: [],
      relatedFiles: docsFor(intelligence),
      suggestedReading: docsFor(intelligence),
      insight: intelligence.docs.hasContributingGuide
        ? "Read the contribution guide after the README; it usually contains the rules maintainers enforce in reviews."
        : "There is no detected contribution guide, so the README and tests become the practical maintainer contract.",
      strength: "primary",
      icon: FileText
    },
    {
      id: "frontend",
      name: "Frontend",
      purpose: "Turns repository behavior into the user-facing product surface.",
      dependencies: ["API", "Authentication", "Developer Experience"],
      relatedModules: fallbackList(pathsMatching(paths, /frontend|app\/|pages\/|components\/|next\.config|vite|react/i), "No frontend module was detected"),
      relatedDocs: docsFor(intelligence, /frontend|ui|client|readme/i),
      relatedTests: pathsMatching(tests, /frontend|component|ui|app|page/i),
      relatedFiles: pathsMatching(paths, /frontend|app\/|pages\/|components\/|lib\/api|next\.config|vite/i),
      suggestedReading: unique([entry, ...pathsMatching(paths, /app\/page|layout|components|lib\/api/i)]).slice(0, 4),
      insight: "Start at the route or page component first, then follow shared UI and API helpers. That path teaches behavior faster than scanning every component.",
      strength: "primary",
      icon: Code2
    },
    {
      id: "backend",
      name: "Backend",
      purpose: "Coordinates requests, domain rules, authentication checks, and persistence boundaries.",
      dependencies: ["Database", "Services", "Authentication", "External APIs"],
      relatedModules: fallbackList(pathsMatching(paths, /backend|server|routes|controllers|middleware/i), "No backend module was detected"),
      relatedDocs: docsFor(intelligence, /backend|server|api|readme/i),
      relatedTests: pathsMatching(tests, /backend|server|api|route|controller/i),
      relatedFiles: pathsMatching(paths, /backend|server|routes|controllers|middleware|app\.ts/i),
      suggestedReading: unique([entry, ...pathsMatching(paths, /routes|controllers|middleware|server/i)]).slice(0, 4),
      insight: "Read route definitions before services. Routes reveal the repository's public promises; services explain how those promises are kept.",
      strength: "primary",
      icon: Server
    },
    {
      id: "service",
      name: "Services",
      purpose: "Holds reusable product operations and integration logic behind route or UI boundaries.",
      dependencies: ["Database", "External APIs", "Testing"],
      relatedModules: fallbackList(pathsMatching(paths, /service|services|worker|job|domain/i), "No service layer was detected"),
      relatedDocs: docsFor(intelligence, /service|job|worker|readme/i),
      relatedTests: pathsMatching(tests, /service|worker|job|domain/i),
      relatedFiles: pathsMatching(paths, /service|services|worker|job|domain/i),
      suggestedReading: pathsMatching(paths, /service|services|worker|job/i),
      insight: "Service files are usually the best place for a first behavioral change because they sit between transport code and storage details.",
      strength: "primary",
      icon: Boxes
    },
    {
      id: "database",
      name: "Database",
      purpose: "Stores durable project state and defines how data moves through the system.",
      dependencies: ["Services", "Backend"],
      relatedModules: fallbackList(pathsMatching(paths, /database|migration|schema|supabase|prisma|drizzle|typeorm/i), intelligence.detectedStack.databases[0] ?? "No database module was detected"),
      relatedDocs: docsFor(intelligence, /database|schema|migration|supabase/i),
      relatedTests: pathsMatching(tests, /database|repository|model|schema/i),
      relatedFiles: pathsMatching(paths, /database|migration|schema|supabase|prisma|drizzle|typeorm/i),
      suggestedReading: pathsMatching(paths, /schema|migration|supabase|repository/i),
      insight: "Read schema or migration files as vocabulary. They name the product objects that other modules are quietly coordinating around.",
      strength: "supporting",
      icon: Database
    },
    {
      id: "auth",
      name: "Authentication",
      purpose: "Protects user identity, sessions, and privileged repository actions.",
      dependencies: ["Backend", "Frontend", "External APIs"],
      relatedModules: fallbackList(pathsMatching(paths, /auth|login|session|jwt|oauth|supabase/i), "No authentication module was detected"),
      relatedDocs: docsFor(intelligence, /auth|login|session|security/i),
      relatedTests: pathsMatching(tests, /auth|login|session|jwt|oauth/i),
      relatedFiles: pathsMatching(paths, /auth|login|session|jwt|oauth|supabase/i),
      suggestedReading: pathsMatching(paths, /auth|middleware|jwt|session|callback/i),
      insight: "Most auth contributions are smaller than they look. Start with validation, middleware, or callback handling before reading token generation end to end.",
      strength: "primary",
      icon: LockKeyhole
    },
    {
      id: "api",
      name: "API",
      purpose: "Defines the contract between screens, backend behavior, and external systems.",
      dependencies: ["Backend", "Services", "Authentication"],
      relatedModules: fallbackList(pathsMatching(paths, /api|route|controller|client/i), "No API module was detected"),
      relatedDocs: docsFor(intelligence, /api|endpoint|route/i),
      relatedTests: pathsMatching(tests, /api|route|controller|client/i),
      relatedFiles: pathsMatching(paths, /api|route|controller|client/i),
      suggestedReading: pathsMatching(paths, /routes|controllers|api|client/i),
      insight: "API boundaries are the fastest way to understand flow: request shape, auth expectations, service call, response shape.",
      strength: "supporting",
      icon: Network
    },
    {
      id: "testing",
      name: "Testing",
      purpose: "Shows which behaviors maintainers expect contributors to preserve.",
      dependencies: ["Frontend", "Backend", "Services"],
      relatedModules: fallbackList(tests, "No tests were detected"),
      relatedDocs: docsFor(intelligence, /test|quality|readme/i),
      relatedTests: tests,
      relatedFiles: tests,
      suggestedReading: tests,
      insight: intelligence.testStructure.hasTests
        ? "Read tests after the entry point. Tests explain what maintainers care about more plainly than implementation details do."
        : "No tests were detected, so the first contribution should include careful manual verification notes.",
      strength: "primary",
      icon: TestTube2
    },
    {
      id: "ci",
      name: "CI/CD",
      purpose: "Automates repository checks so contributors know whether a change is review-ready.",
      dependencies: ["Testing", "Developer Experience"],
      relatedModules: fallbackList(intelligence.workflowFiles.map((workflow) => workflow.path), "No workflow files were detected"),
      relatedDocs: docsFor(intelligence, /ci|workflow|quality|deploy/i),
      relatedTests: tests,
      relatedFiles: intelligence.workflowFiles.map((workflow) => workflow.path),
      suggestedReading: intelligence.workflowFiles.map((workflow) => workflow.path),
      insight: "CI files are review expectations in executable form. Read them before changing test commands or project scripts.",
      strength: "supporting",
      icon: ShieldCheck
    },
    {
      id: "deployment",
      name: "Deployment",
      purpose: "Defines how the repository leaves local development and becomes a running system.",
      dependencies: ["CI/CD", "Infrastructure", "Backend"],
      relatedModules: fallbackList(pathsMatching(paths, /docker|deploy|vercel|netlify|railway|render|fly\.toml/i), intelligence.detectedStack.deployment[0] ?? "No deployment module was detected"),
      relatedDocs: docsFor(intelligence, /deploy|docker|hosting|environment/i),
      relatedTests: [],
      relatedFiles: pathsMatching(paths, /docker|deploy|vercel|netlify|railway|render|fly\.toml|compose/i),
      suggestedReading: pathsMatching(paths, /docker|deploy|env|compose|vercel|netlify/i),
      insight: "Deployment should usually come after architecture and tests. It explains operational constraints, not first contribution scope.",
      strength: "detected",
      icon: Rocket
    },
    {
      id: "dx",
      name: "Developer Experience",
      purpose: "Provides scripts, configuration, and local setup affordances that keep contributions repeatable.",
      dependencies: ["Documentation", "Testing", "CI/CD"],
      relatedModules: fallbackList(unique([...manifests, ...pathsMatching(paths, /scripts|tsconfig|eslint|prettier|package\.json/i)]), "No developer tooling was detected"),
      relatedDocs: docsFor(intelligence, /setup|dev|contributing|readme/i),
      relatedTests: tests,
      relatedFiles: unique([...manifests, ...pathsMatching(paths, /scripts|tsconfig|eslint|prettier|package\.json/i)]).slice(0, 6),
      suggestedReading: unique([readmePath(intelligence), ...manifests, ...pathsMatching(paths, /scripts|tsconfig|package\.json/i)]).slice(0, 5),
      insight: "Developer Experience is often the safest first contribution area: scripts, docs, and setup fixes improve every future contributor's path.",
      strength: "supporting",
      icon: Wrench
    },
    {
      id: "infrastructure",
      name: "Infrastructure",
      purpose: "Connects runtime services, environments, containers, and automation around the app.",
      dependencies: ["Deployment", "Database", "CI/CD"],
      relatedModules: fallbackList(pathsMatching(paths, /infra|docker|compose|workflow|terraform|k8s|helm|env/i), "No infrastructure module was detected"),
      relatedDocs: docsFor(intelligence, /infra|docker|env|deploy/i),
      relatedTests: [],
      relatedFiles: pathsMatching(paths, /infra|docker|compose|workflow|terraform|k8s|helm|env/i),
      suggestedReading: pathsMatching(paths, /docker|compose|workflow|env|deploy/i),
      insight: "Infrastructure explains how the system is held together, but first-time contributors should change it only after understanding app and test flow.",
      strength: "detected",
      icon: GitBranch
    }
  ];

  return definitions.filter((concept) => concept.strength === "primary" || conceptExists(intelligence, concept.id, paths));
}

function buildReadingJourney(intelligence: RepositoryKnowledgePackage, concepts: ConceptNode[]): ReadingStep[] {
  const conceptIds = new Set(concepts.map((concept) => concept.id));
  const entry = primaryEntryPoint(intelligence);
  const tests = primaryTests(intelligence)[0];
  const contributing = intelligence.docs.docFiles.find((path) => /contributing/i.test(path));
  const auth = concepts.find((concept) => concept.id === "auth")?.relatedFiles[0];
  const service = concepts.find((concept) => concept.id === "service")?.relatedFiles[0] ?? concepts.find((concept) => concept.id === "backend")?.relatedFiles[0];

  return [
    { title: "README", target: readmePath(intelligence), why: "Learn the repository promise, setup vocabulary, and maintainer framing.", conceptId: "documentation" },
    { title: "Project Structure", target: entry ?? concepts[0]?.relatedModules[0] ?? "Primary entry point not detected", why: "Anchor the architecture before inspecting individual files.", conceptId: conceptIds.has("frontend") ? "frontend" : "backend" },
    auth ? { title: "Authentication", target: auth, why: "Understand how protected behavior and user identity shape the system.", conceptId: "auth" } : null,
    service ? { title: "Core Services", target: service, why: "Follow the reusable operations that connect UI, API, and data.", conceptId: conceptIds.has("service") ? "service" : "backend" } : null,
    { title: "Tests", target: tests ?? "No tests detected", why: "Learn how maintainers expect behavior to be verified.", conceptId: "testing" },
    contributing ? { title: "Contribution Guide", target: contributing, why: "Finish with review rules after the system shape is familiar.", conceptId: "documentation" } : null
  ].filter(Boolean) as ReadingStep[];
}

function buildContributionAreas(intelligence: RepositoryKnowledgePackage, concepts: ConceptNode[]): ContributionArea[] {
  const has = (id: ConceptKind) => concepts.some((concept) => concept.id === id);
  const level = formatLevel(intelligence.complexity.level);

  const areas: ContributionArea[] = [
    {
      name: "Documentation",
      expectedExperience: "Beginner",
      learningValue: "Learn project vocabulary without changing runtime behavior.",
      suggestedFirstContribution: intelligence.docs.hasContributingGuide ? "Clarify setup or architecture notes in existing docs." : "Add a short contribution note that points to setup and tests.",
      concepts: ["documentation", "dx"],
      icon: FileText
    },
    {
      name: "Testing",
      expectedExperience: has("testing") ? "Beginner to Intermediate" : "Intermediate",
      learningValue: "Discover the behavioral contract maintainers want protected.",
      suggestedFirstContribution: has("testing") ? "Add a focused regression test near an existing test path." : "Document a manual verification checklist for the first small change.",
      concepts: ["testing", "ci"],
      icon: TestTube2
    },
    {
      name: "Frontend",
      expectedExperience: has("frontend") ? level : "Not detected",
      learningValue: "Understand user workflows and API consumption.",
      suggestedFirstContribution: "Improve a small UI state, empty state, or typed API rendering path.",
      concepts: ["frontend", "api", "auth"],
      icon: Code2
    },
    {
      name: "Backend",
      expectedExperience: has("backend") ? level : "Not detected",
      learningValue: "Learn request flow, service boundaries, and persistence rules.",
      suggestedFirstContribution: "Start with validation, error copy, or one service-level behavior.",
      concepts: ["backend", "service", "database"],
      icon: Server
    },
    {
      name: "Authentication",
      expectedExperience: has("auth") ? "Intermediate" : "Not detected",
      learningValue: "Understand trust boundaries and protected workflows.",
      suggestedFirstContribution: "Inspect validation or callback handling before touching token generation.",
      concepts: ["auth", "api", "frontend"],
      icon: LockKeyhole
    },
    {
      name: "Developer Experience",
      expectedExperience: "Beginner",
      learningValue: "Improve repeatability for every future contributor.",
      suggestedFirstContribution: "Tighten setup instructions, scripts, or local environment docs.",
      concepts: ["dx", "documentation", "testing"],
      icon: Wrench
    },
    {
      name: "Infrastructure",
      expectedExperience: has("infrastructure") ? "Intermediate to Advanced" : "Not detected",
      learningValue: "See how the repository runs outside a local editor.",
      suggestedFirstContribution: "Clarify environment variables or container usage before changing deployment behavior.",
      concepts: ["infrastructure", "deployment", "ci"],
      icon: Rocket
    }
  ];

  return areas.filter((area) => area.expectedExperience !== "Not detected" || area.name === "Documentation" || area.name === "Developer Experience");
}

function buildArchitecture(concepts: ConceptNode[]) {
  const order: ConceptKind[] = ["frontend", "api", "backend", "service", "database", "auth", "ci", "deployment", "infrastructure"];
  const map = new Map(concepts.map((concept) => [concept.id, concept]));
  const detected = order.map((id) => map.get(id)).filter(Boolean) as ConceptNode[];

  return detected.length ? detected : concepts.slice(0, 5);
}

function firstInsight(concepts: ConceptNode[]) {
  return concepts.find((concept) => concept.id === "auth")?.insight ?? concepts.find((concept) => concept.strength === "primary")?.insight ?? "Start with the README, entry point, and tests before opening individual files.";
}

export function WorkspaceExplorer({
  repository,
  intelligence,
  isGenerating,
  onRegenerate,
  onAskMentor
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onAskMentor?: (concept: ConceptNode) => void;
}) {
  const [activeView, setActiveView] = useState<ExplorerView>("architecture");
  const [learningMode, setLearningMode] = useState(false);
  const concepts = useMemo(() => intelligence ? buildConcepts(intelligence) : [], [intelligence]);
  const [selectedConceptId, setSelectedConceptId] = useState<ConceptKind | null>(null);
  const selectedConcept = concepts.find((concept) => concept.id === selectedConceptId) ?? concepts[0] ?? null;
  const journey = useMemo(() => intelligence ? buildReadingJourney(intelligence, concepts) : [], [intelligence, concepts]);
  const areas = useMemo(() => intelligence ? buildContributionAreas(intelligence, concepts) : [], [intelligence, concepts]);
  const architecture = useMemo(() => buildArchitecture(concepts), [concepts]);

  if (!intelligence) {
    return (
      <EmptyState
        title="Explorer needs Repository Intelligence"
        description={`${repository.fullName} can become an architecture map once OpenForge has analyzed the repository.`}
        action={
          <Button type="button" onClick={onRegenerate} disabled={isGenerating} variant="primary">
            <Sparkles className={cn("h-4 w-4", isGenerating && "animate-spin")} aria-hidden="true" />
            {isGenerating ? "Understanding repository..." : "Generate Intelligence"}
          </Button>
        }
      />
    );
  }

  function teachRepository() {
    setLearningMode(true);
    setActiveView("journey");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <WorkspaceCard className="p-0">
          <div className="grid overflow-hidden lg:grid-cols-[1fr_280px]">
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Explorer</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">Understand how this repository works.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Concept-first navigation across architecture, knowledge, reading order, and contribution domains.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{concepts.length} concepts</Badge>
                <Badge>{journey.length} reading steps</Badge>
                <Badge>{areas.length} contribution areas</Badge>
              </div>
            </div>
            <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
              <Button type="button" variant="primary" onClick={teachRepository} className="w-full">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                Teach Me This Repository
              </Button>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Generates a deterministic learning path from Repository Intelligence.</p>
            </div>
          </div>
        </WorkspaceCard>

        <div className="overflow-x-auto rounded-[24px] border border-border bg-card p-2">
          <div className="flex min-w-max gap-2">
            {viewLabels.map((view) => {
              const Icon = view.icon;
              const active = activeView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground hover:bg-background hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-brand-violet")} aria-hidden="true" />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeView === "architecture" ? <ArchitectureView architecture={architecture} onSelect={(id) => setSelectedConceptId(id)} selectedId={selectedConcept?.id ?? null} /> : null}
        {activeView === "knowledge" ? <KnowledgeMapView concepts={concepts} onSelect={(id) => setSelectedConceptId(id)} selectedId={selectedConcept?.id ?? null} /> : null}
        {activeView === "journey" ? <ReadingJourneyView journey={journey} concepts={concepts} learningMode={learningMode} onSelect={(id) => setSelectedConceptId(id)} /> : null}
        {activeView === "contributions" ? <ContributionAreasView repository={repository} areas={areas} concepts={concepts} onSelect={(id) => setSelectedConceptId(id)} /> : null}
      </div>

      <ModuleDetailPanel
        repository={repository}
        concept={selectedConcept}
        {...(onAskMentor ? { onAskMentor } : {})}
      />
    </div>
  );
}

function ArchitectureView({
  architecture,
  selectedId,
  onSelect
}: {
  architecture: ConceptNode[];
  selectedId: ConceptKind | null;
  onSelect: (id: ConceptKind) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionTitle eyebrow="Architecture" title="Relationships before folders.">
        Read this as a system map: product surface, contracts, behavior, storage, and operational support.
      </SectionTitle>
      <div className="mt-6 grid gap-3">
        {architecture.map((concept, index) => {
          const Icon = concept.icon;
          const active = selectedId === concept.id;

          return (
            <div key={concept.id}>
              <button
                type="button"
                onClick={() => onSelect(concept.id)}
                className={cn(
                  "grid w-full cursor-pointer gap-4 rounded-[24px] border bg-background p-4 text-left transition-colors sm:grid-cols-[48px_1fr_auto]",
                  active ? "border-brand-violet/50 bg-soft-blue-wash/45" : "border-border hover:border-brand-violet/40 hover:bg-card"
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-brand-violet">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-foreground">{concept.name}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{concept.purpose}</span>
                  <span className="mt-3 flex flex-wrap gap-2">
                    {concept.dependencies.slice(0, 4).map((dependency) => <Badge key={dependency}>{dependency}</Badge>)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 self-center text-brand-violet" aria-hidden="true" />
              </button>
              {index < architecture.length - 1 ? (
                <div className="flex h-8 items-center pl-6">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

function KnowledgeMapView({
  concepts,
  selectedId,
  onSelect
}: {
  concepts: ConceptNode[];
  selectedId: ConceptKind | null;
  onSelect: (id: ConceptKind) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionTitle eyebrow="Knowledge Map" title="Concepts first, files second.">
        Each node teaches purpose, dependencies, docs, tests, and related implementation areas.
      </SectionTitle>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {concepts.map((concept) => {
          const Icon = concept.icon;

          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => onSelect(concept.id)}
              className={cn(
                "min-h-44 cursor-pointer rounded-[24px] border bg-background p-4 text-left transition-colors hover:border-brand-violet/40 hover:bg-card",
                selectedId === concept.id && "border-brand-violet/50 bg-soft-blue-wash/45"
              )}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-base font-semibold text-foreground">{concept.name}</span>
              </span>
              <span className="mt-4 block text-sm leading-6 text-muted-foreground">{concept.purpose}</span>
              <span className="mt-4 flex flex-wrap gap-2">
                <Badge>{concept.dependencies.length} dependencies</Badge>
                <Badge>{concept.relatedDocs.length} docs</Badge>
                <Badge>{concept.relatedTests.length} tests</Badge>
              </span>
            </button>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

function ReadingJourneyView({
  journey,
  concepts,
  learningMode,
  onSelect
}: {
  journey: ReadingStep[];
  concepts: ConceptNode[];
  learningMode: boolean;
  onSelect: (id: ConceptKind) => void;
}) {
  return (
    <WorkspaceCard>
      <SectionTitle eyebrow={learningMode ? "Learning Mode" : "Reading Journey"} title="A guided path through the repository.">
        This order is generated from Repository Intelligence so contributors learn architecture before navigation.
      </SectionTitle>
      {learningMode ? (
        <div className="mt-5 rounded-[18px] border border-brand-violet/20 bg-soft-blue-wash/55 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
            <p className="text-sm leading-6 text-foreground">{firstInsight(concepts)}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-6 grid gap-3">
        {journey.map((step, index) => (
          <div key={`${step.title}-${step.target}`}>
            <button
              type="button"
              onClick={() => step.conceptId ? onSelect(step.conceptId) : undefined}
              className="grid w-full cursor-pointer gap-4 rounded-[24px] border border-border bg-background p-4 text-left transition-colors hover:border-brand-violet/40 hover:bg-card sm:grid-cols-[44px_1fr]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft-blue-wash text-sm font-semibold text-brand-violet">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{step.title}</span>
                <span className="mt-1 block break-words text-sm text-brand-violet">{step.target}</span>
                <span className="mt-2 block text-sm leading-6 text-muted-foreground">{step.why}</span>
              </span>
            </button>
            {index < journey.length - 1 ? (
              <div className="flex h-8 items-center pl-5 sm:pl-6">
                <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function ContributionAreasView({
  repository,
  areas,
  concepts,
  onSelect
}: {
  repository: GitHubRepositorySummary;
  areas: ContributionArea[];
  concepts: ConceptNode[];
  onSelect: (id: ConceptKind) => void;
}) {
  const conceptMap = new Map(concepts.map((concept) => [concept.id, concept.name]));

  return (
    <WorkspaceCard>
      <SectionTitle eyebrow="Contribution Areas" title="Meaningful domains for first contributions.">
        Areas are grouped by learning value and expected experience, not by directory tree.
      </SectionTitle>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {areas.map((area) => {
          const Icon = area.icon;
          const firstConcept = area.concepts.find((id) => conceptMap.has(id));

          return (
            <div key={area.name} className="rounded-[24px] border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{area.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.learningValue}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3">
                <AreaFact label="Expected Experience" value={area.expectedExperience} />
                <AreaFact label="Suggested First Contribution" value={area.suggestedFirstContribution} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {area.concepts.filter((id) => conceptMap.has(id)).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelect(id)}
                    className="openforge-badge cursor-pointer transition-colors hover:text-foreground"
                  >
                    {conceptMap.get(id)}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {firstConcept ? (
                  <Button type="button" onClick={() => onSelect(firstConcept)} className="px-4">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Inspect Area
                  </Button>
                ) : null}
                <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button px-4">
                  <Github className="h-4 w-4" aria-hidden="true" />
                  Open in GitHub
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}

function ModuleDetailPanel({
  repository,
  concept,
  onAskMentor
}: {
  repository: GitHubRepositorySummary;
  concept: ConceptNode | null;
  onAskMentor?: (concept: ConceptNode) => void;
}) {
  if (!concept) return null;

  const Icon = concept.icon;

  return (
    <aside className="xl:sticky xl:top-5 xl:self-start">
      <WorkspaceCard className="xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">Module Detail</p>
            <h3 className="mt-1 break-words text-xl font-semibold text-foreground">{concept.name}</h3>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <DetailBlock title="What this module does">{concept.purpose}</DetailBlock>
          <DetailBlock title="Why it exists">It gives contributors a mental model for {concept.name.toLowerCase()} before they decide which files matter.</DetailBlock>
          <DetailList title="Who depends on it" items={fallbackList(concept.dependencies, "No direct dependency was inferred")} />
          <DetailList title="Related documentation" items={concept.relatedDocs} />
          <DetailList title="Related tests" items={concept.relatedTests} />
          <DetailList title="Related folders/files" items={concept.relatedFiles} />
          <DetailList title="Suggested reading" items={concept.suggestedReading} />
          <DetailBlock title="OpenForge Insight">{concept.insight}</DetailBlock>
        </div>

        <div className="mt-5 grid gap-2">
          {onAskMentor ? (
            <Button type="button" variant="primary" onClick={() => onAskMentor(concept)} className="w-full">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Ask Mentor
            </Button>
          ) : null}
          <a href={repository.htmlUrl} target="_blank" rel="noreferrer" className="openforge-button w-full">
            <Github className="h-4 w-4" aria-hidden="true" />
            Open in GitHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </WorkspaceCard>
    </aside>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

function AreaFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-card p-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <h4 className="text-xs font-medium uppercase text-muted-foreground">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-foreground">{children}</p>
    </section>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <h4 className="text-xs font-medium uppercase text-muted-foreground">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.slice(0, 8).map((item) => <Badge key={`${title}-${item}`} className="break-all">{item}</Badge>) : <Badge>None detected</Badge>}
      </div>
    </section>
  );
}
