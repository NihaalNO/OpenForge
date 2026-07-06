"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { statusIcon, statusTone } from "./flow-helpers";
import type { FlowPathStep } from "./types";

export function PathVisualization({
  steps,
  orientation = "responsive",
  ariaLabel = "Recommended path",
  className
}: {
  steps: FlowPathStep[];
  orientation?: "vertical" | "horizontal" | "responsive";
  ariaLabel?: string;
  className?: string;
}) {
  const horizontal = orientation === "horizontal";
  const responsive = orientation === "responsive";

  return (
    <div
      className={cn(
        horizontal && "flex items-stretch overflow-x-auto",
        responsive && "grid gap-3 lg:flex lg:items-stretch lg:overflow-x-auto",
        orientation === "vertical" && "grid gap-0",
        className
      )}
      aria-label={ariaLabel}
    >
      {steps.map((step, index) => {
        const StatusIcon = statusIcon(step.status);
        const Icon = step.icon ?? StatusIcon;
        const Wrapper = step.onSelect ? "button" : "div";

        return (
          <div key={step.id} className={cn((horizontal || responsive) && "contents lg:flex lg:items-stretch", orientation === "vertical" && "grid")}>
            <Wrapper
              type={step.onSelect ? "button" : undefined}
              onClick={step.onSelect}
              className={cn(
                "group grid min-h-24 w-full gap-3 rounded-[18px] border border-border bg-background p-4 text-left transition-colors sm:grid-cols-[40px_1fr]",
                step.onSelect && "cursor-pointer hover:border-brand-violet/40 hover:bg-card",
                (horizontal || responsive) && "lg:min-w-56 lg:max-w-64"
              )}
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border", statusTone(step.status))}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{step.title}</span>
                {step.meta ? <span className="mt-1 block text-xs text-brand-violet">{step.meta}</span> : null}
                {step.description ? <span className="mt-2 block text-sm leading-6 text-muted-foreground">{step.description}</span> : null}
              </span>
            </Wrapper>
            {index < steps.length - 1 ? (
              <motion.div
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={cn(
                  "flex items-center justify-center text-muted-foreground",
                  horizontal && "px-3",
                  responsive && "h-6 lg:h-auto lg:px-3",
                  orientation === "vertical" && "h-7"
                )}
                aria-hidden="true"
              >
                {(horizontal || responsive) ? (
                  <>
                    <ArrowDown className="h-4 w-4 lg:hidden" />
                    <ArrowRight className="hidden h-4 w-4 lg:block" />
                  </>
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </motion.div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
