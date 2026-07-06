import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot } from "lucide-react";
import type { FlowStatus } from "./types";

export function statusIcon(status: FlowStatus = "pending") {
  if (status === "complete") return CheckCircle2;
  if (status === "active") return CircleDot;
  if (status === "blocked") return AlertTriangle;
  return CircleDashed;
}

export function statusTone(status: FlowStatus = "pending") {
  if (status === "complete") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "active") return "border-brand-violet/40 bg-soft-blue-wash text-brand-violet";
  if (status === "blocked") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-border bg-card text-muted-foreground";
}

export function clampProgress(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
