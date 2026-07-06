"use client";

import type { AiLearningRoadmap } from "@openforge/shared";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button, Card, EmptyState, ErrorState, PageHeader } from "@/components/common/ui";
import { InteractiveRoadmap, PathVisualization, type FlowMilestone } from "@/components/visualizations";
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
          <Card>
            <h2 className="text-lg font-semibold">Weekly roadmap</h2>
            <InteractiveRoadmap
              className="mt-4"
              milestones={roadmap.weeklyRoadmap.map((week, index): FlowMilestone => ({
                id: `week-${week.week}`,
                title: `Week ${week.week}`,
                description: week.focus,
                meta: `${week.tasks.length} tasks`,
                status: index === 0 ? "active" : "pending",
                progress: index === 0 ? 50 : 0,
                details: week.tasks,
                dependencies: index === 0 ? roadmap.currentSkills.slice(0, 2) : [`Week ${roadmap.weeklyRoadmap[index - 1]?.week ?? index}`]
              }))}
            />
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Recommended learning path</h2>
            <PathVisualization
              className="mt-4"
              steps={[
                ...roadmap.currentSkills.slice(0, 2).map((skill, index) => ({
                  id: `current-${skill}`,
                  title: skill,
                  description: "Existing strength to build from.",
                  status: "complete" as const,
                  meta: index === 0 ? "Starting point" : "Foundation"
                })),
                ...roadmap.missingSkills.slice(0, 3).map((skill, index) => ({
                  id: `missing-${skill}`,
                  title: skill,
                  description: "Recommended next learning target.",
                  status: index === 0 ? "active" as const : "pending" as const,
                  meta: "Next skill"
                })),
                {
                  id: "mission-ready",
                  title: "Mission Ready",
                  description: "Apply the sequence inside a focused repository contribution.",
                  status: "pending" as const,
                  meta: "Outcome"
                }
              ]}
            />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <AiResultList title="Current skills" items={roadmap.currentSkills} />
            </Card>
            <Card>
              <AiResultList title="Missing skills" items={roadmap.missingSkills} />
            </Card>
          </div>
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

