"use client";

import type { AiLearningRoadmap } from "@opensource-compass/shared";
import { Sparkles } from "lucide-react";
import { useState } from "react";
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">AI roadmap</p>
            <h1 className="mt-1 text-2xl font-semibold">Learning Roadmap</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void runRoadmap(false)}
              disabled={isLoading}
              className="linear-button-primary"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isLoading ? "Generating..." : roadmap ? "Load cached" : "Generate roadmap"}
            </button>
            {roadmap ? (
              <button
                type="button"
                onClick={() => void runRoadmap(true)}
                disabled={isLoading}
                className="linear-button"
              >
                Regenerate
              </button>
            ) : null}
          </div>
        </div>

        {error ? <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{error}</div> : null}
        {cached ? <p className="text-xs uppercase tracking-wide text-muted-foreground">Cached result</p> : null}

        {roadmap ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="linear-card p-5">
                <AiResultList title="Current skills" items={roadmap.currentSkills} />
              </div>
              <div className="linear-card p-5">
                <AiResultList title="Missing skills" items={roadmap.missingSkills} />
              </div>
            </div>
            <div className="linear-card p-5">
              <h2 className="text-lg font-medium">Weekly plan</h2>
              <div className="mt-4 grid gap-3">
                {roadmap.weeklyRoadmap.map((week) => (
                  <div key={week.week} className="rounded-md border border-border p-4">
                    <h3 className="font-medium">Week {week.week}: {week.focus}</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {week.tasks.map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="linear-card p-5">
                <AiResultList title="Suggested repositories" items={roadmap.suggestedRepositories} />
              </div>
              <div className="linear-card p-5">
                <AiResultList title="Suggested issues" items={roadmap.suggestedIssues} />
              </div>
            </div>
          </>
        ) : (
          <div className="linear-card p-5">
            <p className="text-sm text-muted-foreground">
              Generate a roadmap after syncing GitHub data and creating AI repository insights.
            </p>
          </div>
        )}
      </div>
  );
}
