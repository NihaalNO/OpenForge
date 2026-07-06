"use client";

import { Maximize2, Minus, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button } from "@/components/common/ui";
import { cn } from "@/lib/utils";
import type { GraphEdge, GraphNode } from "./types";

function layoutNodes(nodes: GraphNode[]) {
  const radius = 180;
  const centerX = 320;
  const centerY = 220;
  return nodes.map((node, index) => {
    if (typeof node.x === "number" && typeof node.y === "number") return node;
    const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;
    return {
      ...node,
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius)
    };
  });
}

export function ExplorableGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
  ariaLabel = "Explorable graph",
  className
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [internalSelectedId, setInternalSelectedId] = useState(selectedId ?? nodes[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const activeId = selectedId ?? internalSelectedId;
  const positioned = useMemo(() => layoutNodes(nodes), [nodes]);
  const nodeMap = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const activeEdges = edges.filter((edge) => edge.source === activeId || edge.target === activeId);
  const activeEdgeIds = new Set(activeEdges.map((edge) => edge.id));
  const hiddenNodes = new Set(
    Object.entries(collapsed)
      .filter(([, isCollapsed]) => isCollapsed)
      .flatMap(([id]) => edges.filter((edge) => edge.source === id).map((edge) => edge.target))
  );
  const visibleNodes = positioned.filter((node) => !hiddenNodes.has(node.id) || node.id === activeId);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  const activeNode = activeId ? nodeMap.get(activeId) : null;

  function selectNode(id: string) {
    setInternalSelectedId(id);
    onSelect?.(id);
  }

  return (
    <div className={cn("overflow-hidden rounded-[24px] border border-border bg-background", className)} aria-label={ariaLabel}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-brand-violet" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">Explore relationships</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))} aria-label="Zoom out" className="h-10 min-h-10 px-3">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} aria-label="Zoom in" className="h-10 min-h-10 px-3">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} aria-label="Reset graph view" className="h-10 min-h-10 px-3">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div
        className="relative h-[520px] touch-none overflow-hidden"
        onPointerDown={(event) => setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y })}
        onPointerMove={(event) => {
          if (!dragStart) return;
          setOffset({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
        }}
        onPointerUp={() => setDragStart(null)}
        onPointerLeave={() => setDragStart(null)}
      >
        <svg className="h-full w-full" viewBox="0 0 640 440" role="img" aria-label={ariaLabel}>
          <g transform={`translate(${offset.x / 4} ${offset.y / 4}) scale(${zoom})`}>
            {visibleEdges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;
              const active = activeEdgeIds.has(edge.id);

              return (
                <g key={edge.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    className={cn(active ? "stroke-brand-violet" : "stroke-border")}
                    strokeWidth={active ? 3 : edge.strength === "primary" ? 2 : 1.5}
                    strokeLinecap="round"
                  />
                  {edge.label ? (
                    <text
                      x={((source.x ?? 0) + (target.x ?? 0)) / 2}
                      y={((source.y ?? 0) + (target.y ?? 0)) / 2 - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {visibleNodes.map((node) => {
              const active = activeId === node.id;
              const related = activeEdges.some((edge) => edge.source === node.id || edge.target === node.id);

              return (
                <g
                  key={node.id}
                  transform={`translate(${(node.x ?? 0) - 58} ${(node.y ?? 0) - 34})`}
                  className="cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectNode(node.id);
                  }}
                >
                  <rect
                    width="116"
                    height="68"
                    rx="14"
                    className={cn(active ? "fill-soft-blue-wash stroke-brand-violet" : related ? "fill-card stroke-brand-violet/60" : "fill-card stroke-border")}
                    strokeWidth={active ? 2 : 1}
                  />
                  <text x="58" y="29" textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
                    {node.label.length > 15 ? `${node.label.slice(0, 14)}...` : node.label}
                  </text>
                  <text x="58" y="48" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {node.kind ?? "module"}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {activeNode ? (
        <div className="border-t border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">Selected node</p>
              <h3 className="mt-1 break-words text-lg font-semibold text-foreground">{activeNode.label}</h3>
              {activeNode.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeNode.description}</p> : null}
            </div>
            <Button
              type="button"
              onClick={() => setCollapsed((current) => ({ ...current, [activeNode.id]: !current[activeNode.id] }))}
              className="shrink-0"
            >
              <X className={cn("h-4 w-4", !collapsed[activeNode.id] && "rotate-45")} aria-hidden="true" />
              {collapsed[activeNode.id] ? "Expand" : "Collapse"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{activeEdges.length} relationships</Badge>
            {activeNode.meta?.slice(0, 5).map((meta) => <Badge key={meta}>{meta}</Badge>)}
          </div>
          {activeNode.preview ? <p className="mt-3 text-sm leading-6 text-foreground">{activeNode.preview}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
