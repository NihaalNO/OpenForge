import { Suspense } from "react";
import { ContributionPlanPanel } from "@/components/ai/contribution-plan-panel";

export default function ContributionsPage() {
  return (
    <Suspense fallback={<div className="linear-card p-5 text-sm text-muted-foreground">Loading AI Planner...</div>}>
      <ContributionPlanPanel />
    </Suspense>
  );
}
