import type { ZodType, ZodTypeDef } from "zod";

export type AIProviderId = "zai" | "nvidia" | "openai" | "openrouter" | "groq";
export type ReasoningTier = "fast" | "balanced" | "strong";
export type AICapability = "summarization" | "classification" | "structured_output" | "architecture" | "mission" | "mentor" | "review" | "timeline" | "verification";
export type AITaskType = "readme_summary" | "manifest_analysis" | "file_summary" | "directory_summary" | "workflow_analysis" | "test_analysis" | "issue_summary" | "pull_request_summary" | "architecture_synthesis" | "explorer_synthesis" | "mission_synthesis" | "mentor_answer" | "review_synthesis" | "timeline_summary" | "grounding_verification";

export interface ProviderModel { provider: AIProviderId; modelId: string; }
export interface ModelCapabilityProfile extends ProviderModel { enabled: boolean; reasoningTier: ReasoningTier; capabilities: AICapability[]; contextWindowTokens: number; recommendedInputTokens: number; maxOutputTokens: number; supportsJsonMode: boolean; supportsJsonSchema: boolean; priority: number; privateRepositoryAllowed: boolean; }
export interface ProviderHealth { provider: AIProviderId; modelId?: string; status: "healthy" | "degraded" | "rate_limited" | "unavailable" | "misconfigured" | "disabled"; consecutiveFailures: number; cooldownUntil: string | null; lastErrorCode: string | null; lastCheckedAt: string; }
export interface NormalizedAIError { provider: AIProviderId; code: "rate_limited" | "token_limit" | "timeout" | "invalid_json" | "authentication" | "unavailable" | "unknown"; message: string; retryable: boolean; retryAfterMs?: number; status?: number; }
export interface StructuredAIRequest<T> { model: ModelCapabilityProfile; system: string; prompt: string; schema: ZodType<T, ZodTypeDef, unknown>; schemaHint: string; maxOutputTokens: number; timeoutMs: number; }
export interface AIProviderResult<T> { data: T; provider: AIProviderId; requestedModel: string; actualModel: string; inputTokens: number; outputTokens: number; latencyMs: number; }
export interface AIProviderAdapter { readonly providerId: AIProviderId; healthCheck(): Promise<ProviderHealth>; listModels(): Promise<ProviderModel[]>; generateStructured<T>(request: StructuredAIRequest<T>): Promise<AIProviderResult<T>>; estimateCapability(model: ProviderModel): ModelCapabilityProfile; normalizeError(error: unknown): NormalizedAIError; }

export interface AIOrchestrationTask<T> { taskType: AITaskType; workspaceModule?: string; repositoryId: string; userId?: string; privateRepository: boolean; evidenceHash: string; system: string; prompt: string; schema: ZodType<T, ZodTypeDef, unknown>; schemaHint: string; requiredCapabilities: AICapability[]; preferredReasoningTier: ReasoningTier; inputTokenBudget: number; outputTokenBudget: number; maxAttempts?: number; excludeModels?: string[]; promptVersion: string; }
export interface AIOrchestrationResult<T> { status: "completed" | "unavailable"; data: T | null; provider: AIProviderId | null; model: string | null; attempts: number; fallbackUsed: boolean; errorCode?: string; }
