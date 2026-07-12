# Multi-provider AI orchestration

OpenForge processes repository evidence in three stages. Map jobs summarize bounded evidence units such as README files, manifests, tests, workflows, issues, and pull requests. A deterministic reducer deduplicates facts, paths, and evidence identifiers. Synthesis receives only reduced knowledge and module-relevant evidence. Grounding validation rejects nonexistent paths, missing evidence, malformed JSON, and unsupported cards.

## Routing

Models are configured through provider model lists and default fast/reasoning settings. The router filters disabled, cooling-down, oversized, incapable, and private-ineligible models before scoring capability (40), health (20), quota availability (15), structured output (10), expected latency (10), and configured priority (5). Reasoning-tier fit is a tie-breaking bonus. `AI_PROVIDER_PRIORITY` is a preference rather than an assignment.

Calls are bounded by the lowest applicable task, model, module, and global token limit. Provider failures are normalized. Rate limits honor `Retry-After`, repeated failures trigger cooldown, token-limit failures are not retried unchanged on the same model, and attempts stop at `AI_MAX_PROVIDER_ATTEMPTS`. OpenRouter uses only configured models (plus the explicitly enabled free-router model), records the returned model, and is excluded from private repositories unless its model registry record is explicitly approved.

## Cache and data model

`repository_evidence_summaries` uses repository, path, blob SHA, summary type, prompt version, and evidence version as its content-addressed identity. A stable blob can therefore be reused by Explorer, Mission, Mentor, and Review. `ai_task_runs` stores routing metadata without prompts. `ai_provider_health` stores cooldown state. Migration `addon-11.sql` adds the registry, telemetry, cache, indexes, constraints, triggers, and user-scoped RLS.

## Adding a provider

Implement `AIProviderAdapter`, including health, discovery (or configured models), structured generation, capability estimation, and error normalization. Register the adapter in `provider-factory.ts`; add environment parsing and explicit model configuration. Business and Workspace services must never branch on provider-specific behavior.

## Workspace generation

Workspace services select repository evidence, decompose it by repository concepts, route bounded calls, reduce structured results deterministically, synthesize a single coherent package per module, and validate grounding before storage. If all providers fail, semantic content remains unavailable with an explicit retry state; no generic cards are generated.
