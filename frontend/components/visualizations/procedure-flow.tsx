"use client";

import { Clock3, Link2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Badge, Button } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { statusIcon, statusTone } from "./flow-helpers";
import type { ProcedureStep } from "./types";

export function ProcedureFlow({
  steps,
  defaultActiveId,
  ariaLabel = "Step-by-step procedure",
  className
}: {
  steps: ProcedureStep[];
  defaultActiveId?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [activeId, setActiveId] = useState(defaultActiveId ?? steps.find((step) => step.status === "active")?.id ?? steps[0]?.id);

  return (
    <div className={cn("grid gap-3", className)} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const StatusIcon = statusIcon(step.status);
        const active = activeId === step.id;

        return (
          <div key={step.id} className="grid gap-0">
            <button
              type="button"
              onClick={() => setActiveId((current) => current === step.id ? "" : step.id)}
              className={cn(
                "grid w-full cursor-pointer gap-4 rounded-[18px] border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:grid-cols-[44px_1fr_auto]",
                active ? "border-brand-violet/50 bg-soft-blue-wash/45" : "border-border bg-background hover:border-brand-violet/40"
              )}
              aria-expanded={active}
            >
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-full border", statusTone(step.status))}>
                <StatusIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{step.title}</span>
                {step.description ? <span className="mt-1 block text-sm leading-6 text-muted-foreground">{step.description}</span> : null}
                <span className="mt-3 flex flex-wrap gap-2">
                  {step.duration || step.estimate ? (
                    <Badge>
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      {step.duration ?? step.estimate}
                    </Badge>
                  ) : null}
                  {step.dependencies?.map((dependency) => (
                    <Badge key={dependency}>
                      <Link2 className="h-3 w-3" aria-hidden="true" />
                      {dependency}
                    </Badge>
                  ))}
                </span>
              </span>
              <span className="text-sm font-semibold text-brand-violet">{index + 1}</span>
            </button>
            <AnimatePresence initial={false}>
              {active ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mx-4 border-x border-b border-border bg-card p-4 sm:ml-[66px]">
                    <div className="grid gap-2">
                      {step.details?.length ? step.details.map((detail) => (
                        <p key={detail} className="text-sm leading-6 text-muted-foreground">{detail}</p>
                      )) : <p className="text-sm leading-6 text-muted-foreground">No extra details provided.</p>}
                    </div>
                    {step.action ? (
                      <Button type="button" onClick={step.action.onClick} className="mt-4">
                        {step.action.label}
                      </Button>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            {index < steps.length - 1 ? <div className="ml-[21px] h-6 w-px bg-border" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}
