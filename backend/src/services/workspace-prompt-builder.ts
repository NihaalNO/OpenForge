import type { RepositoryEvidencePackage } from "@openforge/shared";
import { env } from "../config/env.js";
import { estimateTokens } from "../utils/token-estimator.js";

export const WORKSPACE_SCHEMA_HINT = '{"status":"ready|insufficient_evidence","summary":"...","cards":[{"id":"stable-id","title":"...","summary":"...","details":[],"evidence":[{"type":"repository_metadata|readme|documentation|directory|file|manifest|workflow|test|issue|pull_request|commit|mission|timeline_event|learning_history|database_event","path":"copy an exact path from supplied evidence; omit when absent","identifier":"copy the supplied evidence id or identifier when no path exists","explanation":"why this exact supplied evidence supports the claim"}]}]}';

export function buildWorkspacePrompt(evidencePackage: RepositoryEvidencePackage, promptVersion: string, contentVersion: string) {
  const prompt = JSON.stringify({ moduleType: evidencePackage.moduleType, repositoryIdentity: { repositoryId: evidencePackage.repositoryId, repositoryFullName: evidencePackage.repositoryFullName, contextSnapshotId: evidencePackage.contextSnapshotId, headSha: evidencePackage.headSha }, evidence: evidencePackage.evidence, omittedEvidenceCount: evidencePackage.omittedEvidenceCount, evidenceTruncated: evidencePackage.truncated, promptVersion, contentVersion });
  if (prompt.length > env.WORKSPACE_MAX_PROMPT_CHARS) throw Object.assign(new Error("Evidence prompt exceeds the configured character limit"), { code: "EVIDENCE_BUDGET_EXCEEDED" });
  return { prompt, estimatedTokens: estimateTokens(prompt) };
}
