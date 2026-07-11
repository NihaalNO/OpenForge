import type { RepositoryKnowledgePackage, WorkspaceModuleType } from "@openforge/shared";
import { z } from "zod";

export const REPOSITORY_INTELLIGENCE_VERSION = "repo-context-v2-grounded";
export const WORKSPACE_CONTENT_VERSION = "workspace-modules-v2-grounded";
const REQUIRED_WORKSPACE_MODULES: WorkspaceModuleType[] = ["explorer", "mission", "mentor", "review", "timeline"];

export function isCompleteWorkspaceModuleSet(moduleTypes: string[]) {
  const available = new Set(moduleTypes);
  return REQUIRED_WORKSPACE_MODULES.every((moduleType) => available.has(moduleType));
}

export const evidenceReferenceSchema = z.object({
  type: z.enum(["file", "directory", "manifest", "workflow", "readme", "github_metadata"]),
  path: z.string().optional(),
  detail: z.string().min(1)
});

export const generatedWorkspaceSchema = z.object({
  status: z.enum(["ready", "insufficient_evidence"]),
  summary: z.string().min(1),
  sections: z.array(z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    evidence: z.array(evidenceReferenceSchema).min(1)
  })),
  suggestedNextSteps: z.array(z.object({
    title: z.string().min(1),
    path: z.string(),
    reason: z.string().min(1),
    evidence: z.array(evidenceReferenceSchema).min(1)
  }))
});

export function knownRepositoryPaths(knowledge: RepositoryKnowledgePackage) {
  return new Set([
    ...knowledge.raw.selectedFilePaths,
    ...knowledge.tree.directories.map((item) => item.path),
    ...knowledge.tree.importantFiles.map((item) => item.path),
    ...knowledge.docs.docFiles,
    ...knowledge.manifests.map((item) => item.path),
    ...knowledge.workflowFiles.map((item) => item.path),
    ...knowledge.testStructure.testDirectories,
    ...knowledge.testStructure.testFiles,
    ...knowledge.entryPoints.map((item) => item.path),
    ...(knowledge.readme.path ? [knowledge.readme.path] : [])
  ]);
}

export function hasImplementationEvidence(knowledge: RepositoryKnowledgePackage) {
  const docs = new Set([knowledge.readme.path, ...knowledge.docs.docFiles].filter(Boolean));
  return [...knownRepositoryPaths(knowledge)].some((path) => !docs.has(path) && !/^(LICENSE|CODE_OF_CONDUCT|CONTRIBUTING)(\.|$)/i.test(path));
}

export function deterministicFallback(moduleType: WorkspaceModuleType, knowledge: RepositoryKnowledgePackage, identity: { contextSnapshotId: string; headSha: string }) {
  const paths = [...knownRepositoryPaths(knowledge)];
  const readme = knowledge.readme.path;
  const sufficient = hasImplementationEvidence(knowledge);
  const common = {
    repositoryId: knowledge.repositoryId, repositoryFullName: knowledge.fullName,
    contextSnapshotId: identity.contextSnapshotId, headSha: identity.headSha,
    generationSource: "deterministic_fallback", fallbackUsed: true, grounded: true,
    evidenceCoverage: 1, status: sufficient ? "fallback" : "insufficient_evidence"
  };
  if (moduleType === "explorer") return { ...common, architecture: { status: sufficient ? "ready" : "insufficient_evidence", summary: sufficient ? "Architecture is limited to detected repository paths." : "This repository does not contain enough source structure to infer an architecture.", layers: [] }, concepts: [], readingJourney: readme ? [{ title: "Read the README", path: readme, reason: "It is currently the available source of project context." }] : [], contributionAreas: [], files: paths };
  if (moduleType === "mission") return { ...common, summary: sufficient ? "Use the detected files to prepare a bounded contribution." : "A repository-specific Mission cannot be prepared until the project contains enough implementation or contribution context.", sections: [], suggestedNextSteps: [] };
  if (moduleType === "review") return { ...common, summary: sufficient ? "Only detected standards and tests are included." : "No repository standards were detected.", standards: [], testingNotes: knowledge.testStructure.hasTests ? knowledge.testStructure.testFiles : [], sections: [], suggestedNextSteps: [] };
  if (moduleType === "timeline") return { ...common, summary: "Timeline contains database-backed events only.", events: [] };
  return { ...common, summary: sufficient ? "Answers are limited to supplied repository evidence." : "Only the available repository content can be discussed; implementation context is insufficient.", sections: [], suggestedNextSteps: [] };
}

export function validateGeneratedPayload(input: unknown, knowledge: RepositoryKnowledgePackage) {
  const parsed = generatedWorkspaceSchema.parse(input);
  const paths = knownRepositoryPaths(knowledge);
  const validReference = (reference: z.infer<typeof evidenceReferenceSchema>) => reference.type === "github_metadata" || Boolean(reference.path && paths.has(reference.path));
  const total = parsed.sections.reduce((count, section) => count + section.evidence.length, 0) + parsed.suggestedNextSteps.reduce((count, step) => count + step.evidence.length, 0);
  const sections = parsed.sections.filter((section) => section.evidence.every(validReference));
  const suggestedNextSteps = parsed.suggestedNextSteps.filter((step) => paths.has(step.path) && step.evidence.every(validReference));
  const valid = sections.reduce((count, section) => count + section.evidence.length, 0) + suggestedNextSteps.reduce((count, step) => count + step.evidence.length, 0);
  const evidenceCoverage = total === 0 ? 0 : valid / total;
  if (total > 0 && evidenceCoverage < 0.7) throw new Error("Generated Workspace content is ungrounded");
  return { ...parsed, sections, suggestedNextSteps, grounded: true, evidenceCoverage };
}
