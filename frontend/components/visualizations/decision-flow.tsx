"use client";

import { Badge } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import { PathVisualization } from "./path-visualization";
import type { DecisionNode } from "./types";

export function DecisionFlow({
  nodes,
  title,
  className
}: {
  nodes: DecisionNode[];
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[24px] border border-border bg-background p-4", className)}>
      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      <div className={title ? "mt-4" : undefined}>
        <PathVisualization
          steps={nodes.map((node) => ({
            ...node,
            meta: node.branch ? `${node.branch.toUpperCase()} path` : node.meta
          }))}
          orientation="vertical"
          ariaLabel={title ?? "Decision flow"}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>Reasoning path</Badge>
        <Badge>{nodes.length} decisions</Badge>
      </div>
    </div>
  );
}
