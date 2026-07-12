# OpenForge backend

The backend ingests GitHub repository evidence and generates grounded Workspace modules. AI calls use the multi-provider orchestration layer described in [AI orchestration](../docs/ai-orchestration.md). Configure at least one enabled provider and one explicit model in `backend/.env`; providers without a key or model are skipped.

Legacy `AI_PROVIDER=groq`, `GROQ_API_KEY`, and `AI_DEFAULT_MODEL` remain temporarily supported through the same adapter contract. They are deprecated and are not silently ignored.

Development diagnostics are available at `GET /api/v1/diagnostics/ai`. The response excludes keys, prompts, and source content.

Run `npm test`, `npm run typecheck`, and `npm run build` from this directory.
