import type { RepositoryKnowledgePackage, WorkspaceModuleType } from "@openforge/shared";
import { createHash } from "node:crypto";
import { z } from "zod";

export const REPOSITORY_INTELLIGENCE_VERSION = "repo-context-v2-grounded";
export const WORKSPACE_CONTENT_VERSION = "workspace-modules-v3-groq-only";
export const WORKSPACE_PROMPT_VERSION = "workspace-prompt-v3-evidence-cards";
const REQUIRED: WorkspaceModuleType[] = ["explorer", "mission", "mentor", "review", "timeline"];
const LEGACY_PHRASES = ["Relationships before folders", "Understand how this repository works", "Teach Me This Repository", "No direct dependency was inferred", "Start at the route or page component first"];
const LEGACY_MODULE_SET = new Set(["frontend", "backend", "services", "authentication", "database", "external apis", "testing", "documentation"]);

export function isCompleteWorkspaceModuleSet(moduleTypes: string[]) { const values = new Set(moduleTypes); return REQUIRED.every((item) => values.has(item)); }

export const evidenceReferenceSchema = z.object({
  type: z.enum(["file", "directory", "manifest", "workflow", "readme", "issue", "pull_request", "commit", "database_event"]),
  path: z.string().optional(), identifier: z.string().optional(), explanation: z.string().min(1)
}).refine((value) => Boolean(value.path || value.identifier), "Evidence requires a path or identifier");

export const generatedWorkspaceSchema = z.object({
  status: z.enum(["ready", "insufficient_evidence"]), summary: z.string().min(1),
  cards: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), summary: z.string().min(1), details: z.array(z.string().min(1)), evidence: z.array(evidenceReferenceSchema).min(1) }))
});

export function knownRepositoryPaths(knowledge: RepositoryKnowledgePackage) { return new Set([...knowledge.raw.selectedFilePaths, ...knowledge.tree.directories.map((x) => x.path), ...knowledge.tree.importantFiles.map((x) => x.path), ...knowledge.docs.docFiles, ...knowledge.manifests.map((x) => x.path), ...knowledge.workflowFiles.map((x) => x.path), ...knowledge.testStructure.testDirectories, ...knowledge.testStructure.testFiles, ...knowledge.entryPoints.map((x) => x.path), ...(knowledge.readme.path ? [knowledge.readme.path] : [])]); }

export function isLegacyGenericPayload(input: unknown) {
  if (!input || typeof input !== "object") return true;
  const payload = input as Record<string, unknown>; const text = JSON.stringify(input).toLowerCase();
  if (payload.generationSource !== "groq" || payload.provider !== "groq" || payload.contentVersion !== WORKSPACE_CONTENT_VERSION || payload.grounded !== true) return true;
  if (LEGACY_PHRASES.some((phrase) => text.includes(phrase.toLowerCase()))) return true;
  const titles = Array.isArray(payload.cards) ? payload.cards.map((card) => String((card as {title?:unknown}).title ?? "").toLowerCase()) : [];
  return titles.length >= 4 && titles.every((title) => LEGACY_MODULE_SET.has(title));
}

export function semanticContentHash(input: unknown) { const cards = generatedWorkspaceSchema.parse(input).cards.map(({title,summary,details}) => ({title,summary,details})); return createHash("sha256").update(JSON.stringify(cards)).digest("hex"); }

export function validateGeneratedPayload(input: unknown, knowledge: RepositoryKnowledgePackage, collaboration: Record<string, unknown> = {}) {
  const parsed = generatedWorkspaceSchema.parse(input); const paths = knownRepositoryPaths(knowledge);
  const identifiers = new Set(Object.values(collaboration).flatMap((value) => Array.isArray(value) ? value.map(String) : []));
  const valid = (e: z.infer<typeof evidenceReferenceSchema>) => e.path ? paths.has(e.path) : Boolean(e.identifier && (e.type === "database_event" || identifiers.has(e.identifier)));
  for (const card of parsed.cards) if (!card.evidence.every(valid)) throw new Error("Generated Workspace card contains nonexistent or foreign evidence");
  if (parsed.status === "ready" && parsed.cards.length === 0) throw new Error("Ready Workspace content must contain evidence-backed cards");
  const evidenceCount = parsed.cards.reduce((count, card) => count + card.evidence.length, 0);
  return {...parsed, grounded:true, evidenceCoverage: parsed.cards.length ? 1 : 0, evidenceCount};
}
