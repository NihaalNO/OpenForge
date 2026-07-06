"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Badge, Button } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { clampProgress, statusIcon, statusTone } from "./flow-helpers";
import type { FlowMilestone } from "./types";

export function InteractiveRoadmap({
  milestones,
  defaultExpandedId,
  ariaLabel = "Interactive roadmap",
  className
}: {
  milestones: FlowMilestone[];
  defaultExpandedId?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState(defaultExpandedId ?? milestones.find((item) => item.status === "active")?.id ?? milestones[0]?.id);

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-border bg-background p-4", className)} aria-label={ariaLabel}>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[720px] auto-cols-fr grid-flow-col gap-0">
          {milestones.map((milestone, index) => {
            const StatusIcon = statusIcon(milestone.status);
            const active = expandedId === milestone.id;
            const progress = clampProgress(milestone.progress ?? (milestone.status === "complete" ? 100 : milestone.status === "active" ? 50 : 0));

            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => setExpandedId((current) => current === milestone.id ? "" : milestone.id)}
                className="group relative grid cursor-pointer grid-rows-[32px_1fr] gap-3 px-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-expanded={active}
              >
                <span className="relative flex items-center">
                  {index > 0 ? <span className="h-px flex-1 bg-border" aria-hidden="true" /> : <span className="flex-1" />}
                  <span className={cn("relative z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-colors", statusTone(milestone.status))}>
                    <StatusIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {index < milestones.length - 1 ? <span className="h-px flex-1 bg-border" aria-hidden="true" /> : <span className="flex-1" />}
                </span>
                <span className={cn("block min-h-36 rounded-[18px] border p-4 transition-colors", active ? "border-brand-violet/50 bg-card" : "border-border bg-card/70 group-hover:border-brand-violet/30")}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-semibold text-foreground">{milestone.title}</span>
                      {milestone.meta ? <span className="mt-1 block text-xs text-muted-foreground">{milestone.meta}</span> : null}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-brand-violet transition-transform", active && "rotate-180")} aria-hidden="true" />
                  </span>
                  <span className="mt-4 block h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-brand-violet transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </span>
                  {milestone.description ? <span className="mt-3 block text-sm leading-6 text-muted-foreground">{milestone.description}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expandedId ? (
          <motion.div
            key={expandedId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {milestones.filter((item) => item.id === expandedId).map((item) => (
              <div key={item.id} className="mt-4 rounded-[18px] border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{item.status ?? "pending"}</Badge>
                  {item.dependencies?.map((dependency) => <Badge key={dependency}>{dependency}</Badge>)}
                </div>
                {item.details?.length ? (
                  <div className="mt-3 grid gap-2">
                    {item.details.map((detail) => (
                      <p key={detail} className="text-sm leading-6 text-muted-foreground">{detail}</p>
                    ))}
                  </div>
                ) : null}
                {item.action ? (
                  <Button type="button" onClick={item.action.onClick} className="mt-4">
                    {item.action.label}
                  </Button>
                ) : null}
              </div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
