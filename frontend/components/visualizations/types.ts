import type { LucideIcon } from "lucide-react";

export type FlowStatus = "complete" | "active" | "pending" | "blocked";

export interface FlowAction {
  label: string;
  onClick?: () => void;
}

export interface FlowMilestone {
  id: string;
  title: string;
  description?: string | undefined;
  status?: FlowStatus | undefined;
  meta?: string | undefined;
  progress?: number | undefined;
  icon?: LucideIcon | undefined;
  details?: string[] | undefined;
  dependencies?: string[] | undefined;
  action?: FlowAction | undefined;
}

export interface ProcedureStep extends FlowMilestone {
  duration?: string | undefined;
  estimate?: string | undefined;
}

export interface FlowPathStep {
  id: string;
  title: string;
  description?: string | undefined;
  status?: FlowStatus | undefined;
  icon?: LucideIcon | undefined;
  meta?: string | undefined;
  onSelect?: (() => void) | undefined;
}

export interface GraphNode {
  id: string;
  label: string;
  description?: string | undefined;
  kind?: string | undefined;
  icon?: LucideIcon | undefined;
  x?: number | undefined;
  y?: number | undefined;
  meta?: string[] | undefined;
  preview?: string | undefined;
  collapsed?: boolean | undefined;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string | undefined;
  strength?: "primary" | "secondary" | undefined;
}

export interface DecisionNode extends FlowPathStep {
  branch?: "yes" | "no" | "maybe" | undefined;
}
