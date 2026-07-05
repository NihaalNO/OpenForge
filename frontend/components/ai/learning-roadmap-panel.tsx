"use client";

import type { AiLearningRoadmap } from "@openforge/shared";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button, Card, EmptyState, ErrorState, PageHeader } from "@/components/common/ui";
import { generateLearningRoadmap } from "@/lib/api/ai";
import { AiResultList } from "./ai-result-list";

export function LearningRoadmapPanel() {
  const [roadmap, setRoadmap] = useState<AiLearningRoadmap | null>(null);
  const [cached, setCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runRoadmap(regenerate = false) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await generateLearningRoadmap(regenerate);
      setRoadmap(response.analysis);
      setCached(response.cached);
    } catch (roadmapError) {
      setError(roadmapError instanceof Error ? roadmapError.message : "Roadmap generation failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning Roadmap"
        title="Skill growth tied to real repositories"
        description="Generate a weekly learning plan from synced GitHub context and workspace guidance."
        actions={
          <>
            <Button type="button" onClick={() => void runRoadmap(false)} disabled={isLoading} variant="primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isLoading ? "Generating..." : roadmap ? "Load cached" : "Generate roadmap"}
            </Button>
            {roadmap ? (
              <Button type="button" onClick={() => void runRoadmap(true)} disabled={isLoading}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Regenerate
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <ErrorState message={error} /> : null}
      {cached ? <p className="text-xs font-medium uppercase text-muted-foreground">Cached result</p> : null}

      {roadmap ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <AiResultList title="Current skills" items={roadmap.currentSkills} />
            </Card>
            <Card>
              <AiResultList title="Missing skills" items={roadmap.missingSkills} />
            </Card>
          </div>
          <Card>
            <h2 className="text-lg font-semibold">Weekly plan</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {roadmap.weeklyRoadmap.map((week) => (
                <div key={week.week} className="rounded-[24px] border border-border bg-background p-5">
                  <span className="openforge-badge">Week {week.week}</span>
                  <h3 className="mt-4 text-lg font-semibold">{week.focus}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {week.tasks.map((task) => (
                      <li key={task} className="rounded-[15px] border border-border bg-card p-3 leading-6">
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <AiResultList title="Suggested repositories" items={roadmap.suggestedRepositories} />
            </Card>
            <Card>
              <AiResultList title="Suggested issues" items={roadmap.suggestedIssues} />
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          title="Generate a learning roadmap"
          description="After syncing GitHub data and creating workspace guidance, generate a week-by-week path for the skills you need next."
        />
      )}
    </div>
  );
}

