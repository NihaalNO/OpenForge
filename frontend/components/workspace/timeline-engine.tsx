"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GitMerge,
  GitPullRequest,
  HeartHandshake,
  Layers3,
  Lightbulb,
  MessageSquareText,
  Milestone,
  Network,
  PenLine,
  Route,
  Send,
  Sparkles,
  TestTube2,
  Trophy,
  Waypoints
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, EmptyState } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { WorkspaceCard } from "./workspace-components";
import { timelineStorageKey } from "./review-engine";

type TimelineSection = "journey" | "knowledge" | "contribution" | "milestones" | "journal" | "repository" | "summary" | "legacy";

interface TimelineEvent {
  id: string;
  type: "review_reflection" | "mission_reflection" | string;
  title: string;
  description: string | null;
  topics?: string[];
  repositoryFullName?: string;
  createdAt: string;
}

interface MissionSnapshot {
  started?: boolean;
  saved?: boolean;
  checkedItems?: Record<string, boolean>;
  completedStages?: Record<string, boolean>;
  completedSuccess?: Record<string, boolean>;
}

interface UnderstandingEvent {
  id: string;
  conceptId: string;
  conceptName: string;
  category: string;
  learnedAt: string;
}

interface GrowthItem {
  id: string;
  label: string;
  description: string;
  date: string;
  complete: boolean;
  icon: LucideIcon;
}

interface KnowledgeArea {
  name: string;
  description: string;
  learnedAt: string | null;
  strength: "Emerging" | "Practiced" | "Clearer";
  icon: LucideIcon;
}

const sections: Array<{ id: TimelineSection; label: string; icon: LucideIcon }> = [
  { id: "journey", label: "Journey", icon: Route },
  { id: "knowledge", label: "Knowledge", icon: BrainCircuit },
  { id: "contribution", label: "Contribution", icon: HeartHandshake },
  { id: "milestones", label: "Milestones", icon: Milestone },
  { id: "journal", label: "Journal", icon: PenLine },
  { id: "repository", label: "Repository Story", icon: Waypoints },
  { id: "summary", label: "Monthly Summary", icon: CalendarDays },
  { id: "legacy", label: "Legacy", icon: Trophy }
];

const reflectionQuestions = [
  "What surprised you?",
  "What did you learn?",
  "What would you do differently?",
  "What concept feels clearer now?"
];
const defaultReflectionQuestion = "What surprised you?";

function missionStorageKey(repositoryId: string) {
  return `openforge:mission:${repositoryId}`;
}

function mentorStorageKey(repositoryId: string) {
  return `openforge:mentor:${repositoryId}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(value));
}

function readJson<TValue>(key: string, fallback: TValue): TValue {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as TValue;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function completedCount(items?: Record<string, boolean>) {
  return Object.values(items ?? {}).filter(Boolean).length;
}

function isPrReady(mission: MissionSnapshot) {
  return completedCount(mission.completedSuccess) >= 4 || Boolean(mission.completedStages?.pr);
}

function conceptIcon(name: string): LucideIcon {
  if (/auth/i.test(name)) return Network;
  if (/test/i.test(name)) return TestTube2;
  if (/api/i.test(name)) return Network;
  return Layers3;
}

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter(Boolean) as string[]));
}

function conceptNamesFromIntelligence(intelligence: RepositoryKnowledgePackage | null) {
  if (!intelligence) return [];

  return unique([
    "Architecture",
    intelligence.docs.hasContributingGuide ? "Contribution Workflow" : null,
    intelligence.testStructure.hasTests ? "Testing" : null,
    intelligence.workflowFiles.length ? "CI/CD" : null,
    intelligence.detectedStack.databases.length ? "Database" : null,
    intelligence.raw.selectedFilePaths.some((path) => /auth|login|session|jwt|oauth|middleware/i.test(path)) ? "Authentication" : null,
    intelligence.raw.selectedFilePaths.some((path) => /api|route|controller|client/i.test(path)) ? "API Design" : null
  ]);
}

function buildJourney(
  repository: GitHubRepositorySummary,
  intelligence: RepositoryKnowledgePackage | null,
  mission: MissionSnapshot,
  mentorHistory: UnderstandingEvent[],
  reflections: TimelineEvent[]
): GrowthItem[] {
  const generatedAt = intelligence?.generatedAt ?? repository.lastSyncedAt ?? new Date().toISOString();
  const missionDate = repository.lastSyncedAt ?? generatedAt;
  const reflectionDate = reflections[0]?.createdAt ?? new Date().toISOString();
  const prReady = isPrReady(mission);

  return [
    {
      id: "repository-understood",
      label: "Repository Understood",
      description: intelligence
        ? `OpenForge found the first useful paths, docs, and review signals in ${repository.fullName}.`
        : "repository context has not been generated yet.",
      date: generatedAt,
      complete: Boolean(intelligence),
      icon: BookOpenCheck
    },
    {
      id: "explorer-completed",
      label: "Explorer Completed",
      description: mentorHistory.length
        ? "You turned repository structure into concepts you can explain."
        : "Study at least one Mentor concept to make Explorer part of your journey.",
      date: mentorHistory[0]?.learnedAt ?? missionDate,
      complete: mentorHistory.length > 0,
      icon: BrainCircuit
    },
    {
      id: "mission-started",
      label: "Mission Started",
      description: "You moved from general understanding into a focused contribution path.",
      date: missionDate,
      complete: Boolean(mission.started || mission.saved),
      icon: Route
    },
    {
      id: "mission-completed",
      label: "Mission Completed",
      description: `${completedCount(mission.completedStages)} mission stages are marked complete.`,
      date: missionDate,
      complete: completedCount(mission.completedStages) >= 5 || prReady,
      icon: CheckCircle2
    },
    {
      id: "review-completed",
      label: "Review Completed",
      description: reflections.length
        ? "You paused to name what changed in your understanding."
        : "A Review reflection will make this milestone part of your growth record.",
      date: reflectionDate,
      complete: reflections.some((event) => event.type === "review_reflection"),
      icon: MessageSquareText
    },
    {
      id: "pull-request-submitted",
      label: "Pull Request Prepared",
      description: prReady
        ? "Mission success criteria suggest your pull request notes are ready to adapt."
        : "Complete Mission success criteria before treating the pull request as prepared.",
      date: missionDate,
      complete: prReady,
      icon: GitPullRequest
    },
    {
      id: "pull-request-merged",
      label: "Pull Request Merged",
      description: "When a merge is available from synced GitHub data, this story can include it here.",
      date: missionDate,
      complete: false,
      icon: GitMerge
    }
  ];
}

function buildKnowledgeTimeline(intelligence: RepositoryKnowledgePackage | null, mentorHistory: UnderstandingEvent[], reflections: TimelineEvent[]): KnowledgeArea[] {
  const learnedNames = unique([...mentorHistory.map((item) => item.conceptName), ...reflections.flatMap((item) => item.topics ?? [])]);
  const discoveredNames = conceptNamesFromIntelligence(intelligence);
  const names = unique([...learnedNames, ...discoveredNames]).slice(0, 8);

  return names.map((name) => {
    const mentorEvent = mentorHistory.find((event) => event.conceptName === name || event.category === name.toLowerCase());
    const reflectionEvent = reflections.find((event) => event.topics?.includes(name));
    const learnedAt = mentorEvent?.learnedAt ?? reflectionEvent?.createdAt ?? intelligence?.generatedAt ?? null;
    const appearances = mentorHistory.filter((event) => event.conceptName === name || event.category === name.toLowerCase()).length
      + reflections.filter((event) => event.topics?.includes(name)).length;

    return {
      name,
      description: appearances > 1
        ? "You have returned to this concept more than once, which usually means it is becoming part of your working vocabulary."
        : "This concept is now visible in your contributor journey.",
      learnedAt,
      strength: appearances > 1 ? "Clearer" : learnedAt ? "Practiced" : "Emerging",
      icon: conceptIcon(name)
    };
  });
}

function mentorObservation(knowledge: KnowledgeArea[], mission: MissionSnapshot) {
  const clearAreas = knowledge.filter((item) => item.strength === "Clearer");
  const testing = knowledge.find((item) => /test/i.test(item.name));
  const backend = knowledge.find((item) => /api|database|architecture|auth/i.test(item.name));

  if (testing && completedCount(mission.completedStages) >= 4) {
    return "You've become more deliberate about proving your work. Testing is starting to feel like part of contribution, not a separate chore.";
  }
  if (backend && clearAreas.length) {
    return "You've become much more confident with backend-shaped repositories. The next useful step is explaining one boundary in your own words before editing it.";
  }
  if (knowledge.length >= 4) {
    return "Your understanding is spreading across several areas now. Consider choosing one concept and taking it from familiar to comfortable.";
  }
  return "Your timeline is still early, and that is useful. The first growth signal is noticing what you do not understand yet.";
}

function growthStats(repository: GitHubRepositorySummary, mission: MissionSnapshot, mentorHistory: UnderstandingEvent[], reflections: TimelineEvent[], knowledge: KnowledgeArea[]) {
  return [
    { label: "Repositories Explored", value: "1", detail: repository.fullName },
    { label: "Missions Completed", value: isPrReady(mission) ? "1" : "0", detail: isPrReady(mission) ? "One contribution path reached pull request readiness." : "This mission is still becoming ready." },
    { label: "Pull Requests Submitted", value: isPrReady(mission) ? "Ready" : "Preparing", detail: "Timeline treats readiness as a learning signal, not a score." },
    { label: "Pull Requests Merged", value: "Not synced", detail: "No merge signal is stored in this workspace yet." },
    { label: "Contributors Helped", value: reflections.length ? "Future readers" : "Not recorded", detail: "Reflections and documentation notes help the next contributor inherit your context." },
    { label: "Documentation Improvements", value: Object.keys(mission.completedSuccess ?? {}).some((item) => /documentation/i.test(item) && mission.completedSuccess?.[item]) ? "Noted" : "Possible", detail: "Documentation counts when it makes understanding easier for someone else." }
  ];
}

export function TimelineEngine({
  repository,
  intelligence
}: {
  repository: GitHubRepositorySummary;
  intelligence: RepositoryKnowledgePackage | null;
}) {
  const [activeSection, setActiveSection] = useState<TimelineSection>("journey");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [mission, setMission] = useState<MissionSnapshot>({});
  const [mentorHistory, setMentorHistory] = useState<UnderstandingEvent[]>([]);
  const [reflection, setReflection] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState(defaultReflectionQuestion);
  const [savedReflection, setSavedReflection] = useState(false);

  useEffect(() => {
    if (!repository.id) return;
    setEvents(readJson<TimelineEvent[]>(timelineStorageKey(repository.id), []));
    setMission(readJson<MissionSnapshot>(missionStorageKey(repository.id), {}));
    setMentorHistory(readJson<UnderstandingEvent[]>(mentorStorageKey(repository.id), []));
  }, [repository.id]);

  const journey = useMemo(() => buildJourney(repository, intelligence, mission, mentorHistory, events), [events, intelligence, mentorHistory, mission, repository]);
  const knowledge = useMemo(() => buildKnowledgeTimeline(intelligence, mentorHistory, events), [events, intelligence, mentorHistory]);
  const stats = useMemo(() => growthStats(repository, mission, mentorHistory, events, knowledge), [events, knowledge, mentorHistory, mission, repository]);
  const completedJourney = journey.filter((item) => item.complete).length;
  const missionReady = isPrReady(mission);
  const missionReflectionSaved = events.some((event) => event.type === "mission_reflection");
  const latestMonth = events[0]?.createdAt ?? mentorHistory[0]?.learnedAt ?? intelligence?.generatedAt ?? new Date().toISOString();
  const monthlyReflections = events.filter((event) => monthLabel(event.createdAt) === monthLabel(latestMonth));

  function saveMissionReflection() {
    if (typeof window === "undefined" || !reflection.trim()) return;
    const event: TimelineEvent = {
      id: `mission-reflection-${Date.now()}`,
      type: "mission_reflection",
      title: selectedPrompt,
      description: reflection.trim(),
      topics: knowledge.slice(0, 3).map((item) => item.name),
      repositoryFullName: repository.fullName,
      createdAt: new Date().toISOString()
    };
    const nextEvents = [event, ...events].slice(0, 40);
    window.localStorage.setItem(timelineStorageKey(repository.id), JSON.stringify(nextEvents));
    setEvents(nextEvents);
    setReflection("");
    setSavedReflection(true);
  }

  if (!intelligence && !events.length && !mentorHistory.length && !mission.started && !mission.saved) {
    return (
      <EmptyState
        title="Timeline is ready for your growth"
        description="Once this repository is understood, Timeline will connect Mission progress, Mentor learning, Review reflections, and contribution milestones into one calm story."
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <WorkspaceCard className="p-0">
          <div className="grid overflow-hidden lg:grid-cols-[1fr_300px]">
            <div className="p-5 sm:p-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Timeline</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                How have I grown as a contributor?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Timeline connects meaningful moments from this workspace: what you understood, what you practiced, and what now feels clearer.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>{repository.fullName}</Badge>
                <Badge>{completedJourney}/{journey.length} meaningful milestones</Badge>
                <Badge>{knowledge.length} concepts in view</Badge>
              </div>
            </div>
            <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">Mentor Observation</p>
              <p className="mt-2 text-sm leading-6 text-foreground">{mentorObservation(knowledge, mission)}</p>
            </div>
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;
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

        {activeSection === "journey" ? <JourneyView items={journey} /> : null}
        {activeSection === "knowledge" ? <KnowledgeTimeline areas={knowledge} /> : null}
        {activeSection === "contribution" ? <ContributionJourney stats={stats} /> : null}
        {activeSection === "milestones" ? <Milestones items={journey} knowledge={knowledge} reflections={events} /> : null}
        {activeSection === "journal" ? (
          <ReflectionJournal
            events={events}
            missionReady={missionReady}
            missionReflectionSaved={missionReflectionSaved}
            prompt={selectedPrompt}
            reflection={reflection}
            saved={savedReflection}
            onPromptChange={setSelectedPrompt}
            onReflectionChange={(value) => {
              setReflection(value);
              setSavedReflection(false);
            }}
            onSave={saveMissionReflection}
          />
        ) : null}
        {activeSection === "repository" ? <RepositoryStory repository={repository} journey={journey} knowledge={knowledge} /> : null}
        {activeSection === "summary" ? <MonthlyGrowthSummary month={latestMonth} stats={stats} knowledge={knowledge} reflections={monthlyReflections} mission={mission} /> : null}
        {activeSection === "legacy" ? <LegacyView stats={stats} knowledge={knowledge} journey={journey} /> : null}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <WorkspaceCard>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Growth Signal</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Progress is becoming visible.</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {journey.filter((item) => item.complete).slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id === "review-completed" ? "journal" : "journey")}
                className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border bg-background p-3 text-left transition-colors hover:border-brand-violet/40"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="text-sm leading-6 text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </WorkspaceCard>

        <WorkspaceCard>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Next Reflection</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {missionReady && !missionReflectionSaved
                  ? "Your Mission looks ready. Capture what changed before the details fade."
                  : "Return after the next Mission or Review. Timeline works best when learning is named while it is still fresh."}
              </p>
            </div>
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
      <h3 className="mt-2 text-xl font-semibold text-foreground">{title}</h3>
      {children ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{children}</p> : null}
    </div>
  );
}

function JourneyView({ items }: { items: GrowthItem[] }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Journey" title="Meaningful steps, not every interaction.">
        This path only includes moments that changed understanding, confidence, or contribution readiness.
      </SectionHeading>
      <div className="mt-6 grid gap-3">
        {items.map((item, index) => <JourneyRow key={item.id} item={item} last={index === items.length - 1} />)}
      </div>
    </WorkspaceCard>
  );
}

function JourneyRow({ item, last }: { item: GrowthItem; last: boolean }) {
  const Icon = item.icon;
  return (
    <div>
      <div className={cn("grid gap-4 rounded-[18px] border bg-background p-4 sm:grid-cols-[44px_1fr_auto]", item.complete ? "border-border" : "border-dashed border-border opacity-75")}>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", item.complete ? "bg-soft-blue-wash text-brand-violet" : "bg-muted text-muted-foreground")}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{item.label}</h4>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </div>
        <Badge>{item.complete ? formatDate(item.date) : "Waiting"}</Badge>
      </div>
      {!last ? <div className="ml-5 h-6 w-px bg-border" /> : null}
    </div>
  );
}

function KnowledgeTimeline({ areas }: { areas: KnowledgeArea[] }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Knowledge Timeline" title="Concepts that are becoming clearer.">
        This is a learning history. It focuses on concepts you touched through Mentor, Review, and repository context.
      </SectionHeading>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {areas.length ? areas.map((area) => {
          const Icon = area.icon;
          return (
            <section key={area.name} className="rounded-[18px] border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{area.name}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(area.learnedAt)}</p>
                  </div>
                </div>
                <Badge>{area.strength}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{area.description}</p>
            </section>
          );
        }) : <p className="text-sm leading-6 text-muted-foreground">Study a Mentor concept or save a Review reflection to begin your knowledge timeline.</p>}
      </div>
    </WorkspaceCard>
  );
}

function ContributionJourney({ stats }: { stats: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Contribution Journey" title="Growth indicators without competition.">
        These indicators describe progress. They are not a leaderboard and they are not a score.
      </SectionHeading>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => (
          <section key={item.label} className="rounded-[18px] border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
          </section>
        ))}
      </div>
    </WorkspaceCard>
  );
}

function Milestones({ items, knowledge, reflections }: { items: GrowthItem[]; knowledge: KnowledgeArea[]; reflections: TimelineEvent[] }) {
  const milestones = [
    items.find((item) => item.id === "repository-understood"),
    items.find((item) => item.id === "mission-completed"),
    items.find((item) => item.id === "pull-request-submitted"),
    { id: "first-reflection", label: "First Reflection Saved", description: "You named what changed in your understanding.", date: reflections[0]?.createdAt ?? new Date().toISOString(), complete: reflections.length > 0, icon: PenLine },
    { id: "concepts-learned", label: "Five Concepts Learned", description: `${knowledge.length} concepts are currently visible in your learning graph.`, date: knowledge[0]?.learnedAt ?? new Date().toISOString(), complete: knowledge.length >= 5, icon: BrainCircuit }
  ].filter(Boolean) as GrowthItem[];

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Milestones" title="Progress worth remembering.">
        Milestones celebrate transformation without turning growth into achievement hunting.
      </SectionHeading>
      <div className="mt-5 grid gap-3">
        {milestones.map((item) => <JourneyRow key={item.id} item={item} last />)}
      </div>
    </WorkspaceCard>
  );
}

function ReflectionJournal({
  events,
  missionReady,
  missionReflectionSaved,
  prompt,
  reflection,
  saved,
  onPromptChange,
  onReflectionChange,
  onSave
}: {
  events: TimelineEvent[];
  missionReady: boolean;
  missionReflectionSaved: boolean;
  prompt: string;
  reflection: string;
  saved: boolean;
  onPromptChange: (prompt: string) => void;
  onReflectionChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Reflection Journal" title="Reflection turns completion into learning.">
        After a completed Mission, capture what changed. The journal is chronological so progress remains easy to revisit.
      </SectionHeading>
      {missionReady && !missionReflectionSaved ? (
        <div className="mt-5 rounded-[18px] border border-border bg-background p-4">
          <div className="flex flex-wrap gap-2">
            {reflectionQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onPromptChange(question)}
                className={cn(
                  "min-h-10 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  prompt === question ? "border-brand-violet/50 bg-soft-blue-wash text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {question}
              </button>
            ))}
          </div>
          <label htmlFor="mission-reflection" className="mt-4 block text-sm font-semibold text-foreground">{prompt}</label>
          <textarea
            id="mission-reflection"
            value={reflection}
            onChange={(event) => onReflectionChange(event.target.value)}
            rows={5}
            className="mt-2 min-h-32 w-full rounded-[18px] border border-border bg-card px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/25"
            placeholder="Write the part you want future-you to remember."
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="primary" onClick={onSave} disabled={!reflection.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              Save Reflection
            </Button>
            {saved ? <Badge>Reflection saved</Badge> : null}
          </div>
        </div>
      ) : null}
      <div className="mt-5 grid gap-3">
        {events.length ? events.map((event) => (
          <article key={event.id} className="rounded-[18px] border border-border bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Clock3 className="h-4 w-4 text-brand-violet" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
              <Badge>{formatDate(event.createdAt)}</Badge>
            </div>
            {event.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.description}</p> : null}
            {event.topics?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.topics.map((topic) => <Badge key={`${event.id}-${topic}`}>{topic}</Badge>)}
              </div>
            ) : null}
          </article>
        )) : <p className="text-sm leading-6 text-muted-foreground">No reflections yet. Review or a completed Mission will give you the first prompt.</p>}
      </div>
    </WorkspaceCard>
  );
}

function RepositoryStory({ repository, journey, knowledge }: { repository: GitHubRepositorySummary; journey: GrowthItem[]; knowledge: KnowledgeArea[] }) {
  const story = unique([
    ...journey.filter((item) => item.complete).map((item) => item.label),
    ...knowledge.slice(0, 3).map((item) => `${item.name} Learned`)
  ]);

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Repository Story" title={`Your journey inside ${repository.fullName}.`}>
        This view keeps the repository-specific thread intact, from understanding to contribution readiness.
      </SectionHeading>
      <div className="mt-6 grid gap-3">
        {story.length ? story.map((item, index) => (
          <div key={item}>
            <div className="flex items-center gap-3 rounded-[18px] border border-border bg-background p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-sm font-semibold text-brand-violet">{index + 1}</span>
              <p className="text-sm font-medium text-foreground">{item}</p>
            </div>
            {index < story.length - 1 ? <div className="ml-4 h-5 w-px bg-border" /> : null}
          </div>
        )) : <p className="text-sm leading-6 text-muted-foreground">This repository story will appear as soon as a meaningful workspace milestone exists.</p>}
      </div>
    </WorkspaceCard>
  );
}

function MonthlyGrowthSummary({
  month,
  stats,
  knowledge,
  reflections,
  mission
}: {
  month: string;
  stats: Array<{ label: string; value: string; detail: string }>;
  knowledge: KnowledgeArea[];
  reflections: TimelineEvent[];
  mission: MissionSnapshot;
}) {
  const learned = knowledge.filter((item) => item.learnedAt).map((item) => item.name);
  return (
    <WorkspaceCard>
      <SectionHeading eyebrow={monthLabel(month)} title="A calm look at this month.">
        You are building the habit that makes open-source work easier: understand first, contribute second, reflect afterwards.
      </SectionHeading>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <SummaryBlock title="What moved forward" items={[
          `${stats[0]?.value ?? "1"} repository explored`,
          `${isPrReady(mission) ? "One" : "No"} mission completed`,
          `${isPrReady(mission) ? "Pull request notes prepared" : "Pull request notes still preparing"}`,
          `${reflections.length} reflections saved`
        ]} />
        <SummaryBlock title="Concepts learned" items={learned.length ? learned : ["No concept has been recorded yet"]} />
        <SummaryBlock title="Skills strengthened" items={unique([...learned.filter((item) => /test|api|auth|database|architecture/i.test(item)), isPrReady(mission) ? "Pull request readiness" : "Repository orientation"])} />
        <section className="rounded-[18px] border border-border bg-background p-4">
          <h4 className="text-sm font-semibold text-foreground">Monthly reflection</h4>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You are not just collecting activity. You are building evidence that unfamiliar repositories can become understandable with a patient path.
          </p>
        </section>
      </div>
    </WorkspaceCard>
  );
}

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[18px] border border-border bg-background p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-violet" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LegacyView({ stats, knowledge, journey }: { stats: Array<{ label: string; value: string; detail: string }>; knowledge: KnowledgeArea[]; journey: GrowthItem[] }) {
  const strongest = knowledge.filter((item) => item.strength !== "Emerging").map((item) => item.name).slice(0, 4);
  const completed = journey.filter((item) => item.complete).map((item) => item.label);

  return (
    <WorkspaceCard>
      <SectionHeading eyebrow="Legacy View" title="A long-term contributor profile.">
        Legacy is not a score. It is the shape of the confidence you are building over time.
      </SectionHeading>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {stats.slice(0, 4).map((item) => (
          <section key={item.label} className="rounded-[18px] border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
          </section>
        ))}
        <SummaryBlock title="Strongest domains" items={strongest.length ? strongest : ["Still emerging"]} />
        <SummaryBlock title="Growth highlights" items={completed.length ? completed : ["Repository story just beginning"]} />
      </div>
      <blockquote className="mt-5 rounded-[18px] border border-border bg-soft-blue-wash/45 p-4 text-sm leading-6 text-foreground">
        You're no longer approaching repositories with only uncertainty. You're beginning to approach them with evidence, reflection, and experience.
      </blockquote>
    </WorkspaceCard>
  );
}


