"use client";

import type { GitHubRepositorySummary } from "@openforge/shared";
import {
  Activity,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Route,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState } from "@/components/common/ui";
import { WorkspaceCard } from "./workspace-components";
import { timelineStorageKey } from "./review-engine";

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  topics?: string[];
  repositoryFullName?: string;
  createdAt: string;
}

interface MissionSnapshot {
  started?: boolean;
  saved?: boolean;
  completedStages?: Record<string, boolean>;
  completedSuccess?: Record<string, boolean>;
}

function missionStorageKey(repositoryId: string) {
  return `openforge:mission:${repositoryId}`;
}

function mentorStorageKey(repositoryId: string) {
  return `openforge:mentor:${repositoryId}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function readTimelineEvents(repositoryId: string) {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(timelineStorageKey(repositoryId));
  if (!stored) return [];

  try {
    return JSON.parse(stored) as TimelineEvent[];
  } catch {
    window.localStorage.removeItem(timelineStorageKey(repositoryId));
    return [];
  }
}

function readMissionSnapshot(repositoryId: string): MissionSnapshot {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(missionStorageKey(repositoryId));
  if (!stored) return {};

  try {
    return JSON.parse(stored) as MissionSnapshot;
  } catch {
    window.localStorage.removeItem(missionStorageKey(repositoryId));
    return {};
  }
}

function readMentorCount(repositoryId: string) {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(mentorStorageKey(repositoryId));
  if (!stored) return 0;

  try {
    return (JSON.parse(stored) as unknown[]).length;
  } catch {
    window.localStorage.removeItem(mentorStorageKey(repositoryId));
    return 0;
  }
}

function buildWorkspaceEvents(repository: GitHubRepositorySummary, mission: MissionSnapshot, mentorCount: number): TimelineEvent[] {
  const now = new Date().toISOString();
  const events: TimelineEvent[] = [];

  if (mission.started || mission.saved) {
    const completedStages = Object.values(mission.completedStages ?? {}).filter(Boolean).length;
    const completedSuccess = Object.values(mission.completedSuccess ?? {}).filter(Boolean).length;
    events.push({
      id: "mission-progress",
      type: "mission_progress",
      title: "Mission progress",
      description: `${completedStages} stages and ${completedSuccess} success criteria are marked complete on this device.`,
      repositoryFullName: repository.fullName,
      createdAt: now
    });
  }

  if (mentorCount > 0) {
    events.push({
      id: "mentor-understanding",
      type: "mentor_understanding",
      title: "Mentor understanding",
      description: `${mentorCount} repository concepts have been explored with Mentor.`,
      repositoryFullName: repository.fullName,
      createdAt: now
    });
  }

  return events;
}

function groupByDay(events: TimelineEvent[]) {
  return events.reduce<Record<string, TimelineEvent[]>>((groups, event) => {
    const key = new Date(event.createdAt).toDateString();
    groups[key] = groups[key] ?? [];
    groups[key].push(event);
    return groups;
  }, {});
}

function eventIcon(type: string) {
  if (type === "review_reflection") return BookOpenCheck;
  if (type === "mission_progress") return Route;
  if (type === "mentor_understanding") return MessageSquareText;
  return Activity;
}

export function TimelineEngine({ repository }: { repository: GitHubRepositorySummary }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [mission, setMission] = useState<MissionSnapshot>({});
  const [mentorCount, setMentorCount] = useState(0);

  useEffect(() => {
    if (!repository.id) return;
    setEvents(readTimelineEvents(repository.id));
    setMission(readMissionSnapshot(repository.id));
    setMentorCount(readMentorCount(repository.id));
  }, [repository.id]);

  const allEvents = useMemo(
    () => [...events, ...buildWorkspaceEvents(repository, mission, mentorCount)]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [events, mentorCount, mission, repository]
  );
  const grouped = groupByDay(allEvents);

  if (!allEvents.length) {
    return (
      <EmptyState
        title="Timeline is ready for your learning"
        description="Reflection from Review, explored Mentor concepts, and Mission progress will appear here as the workspace journey grows."
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <WorkspaceCard className="p-0">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium uppercase text-muted-foreground">Timeline</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              How far have I come?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Timeline collects learning signals from this workspace so progress feels continuous after Review.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{events.length} reflections</Badge>
              <Badge>{mentorCount} Mentor concepts</Badge>
              <Badge>{repository.fullName}</Badge>
            </div>
          </div>
        </WorkspaceCard>

        {Object.entries(grouped).map(([day, dayEvents]) => (
          <WorkspaceCard key={day}>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-brand-violet" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">{day}</h3>
            </div>
            <div className="mt-5 grid gap-3">
              {dayEvents.map((event) => {
                const Icon = eventIcon(event.type);

                return (
                  <article key={event.id} className="rounded-[18px] border border-border bg-background p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{event.title}</h4>
                          <Badge>{formatDate(event.createdAt)}</Badge>
                        </div>
                        {event.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.description}</p> : null}
                        {event.topics?.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.topics.map((topic) => <Badge key={`${event.id}-${topic}`}>{topic}</Badge>)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </WorkspaceCard>
        ))}
      </div>

      <aside className="xl:sticky xl:top-5 xl:self-start">
        <WorkspaceCard>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Growth Signal</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Learning is part of contribution.</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {["Repository context understood", "Mission progress remembered", "Review reflection saved"].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[18px] border border-border bg-background p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </WorkspaceCard>
      </aside>
    </div>
  );
}
