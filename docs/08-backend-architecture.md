# OpenSource Compass - Backend Architecture

## Overview

The backend is an Express.js API that owns business logic, GitHub integration, AI orchestration, recommendation generation, authorization, and persistence. It should remain stateless so it can scale horizontally.

## Express Server Structure

Recommended modules:

- `src/server.ts`: process bootstrap.
- `src/app.ts`: Express app configuration.
- `src/config`: environment parsing and app config.
- `src/routes`: route declarations.
- `src/controllers`: request/response handling.
- `src/services`: business logic.
- `src/repositories`: database access.
- `src/middleware`: auth, validation, errors, logging.
- `src/jobs`: background job processors.
- `src/lib`: clients and shared utilities.

## Controllers

Controllers should be thin:

- Validate request inputs.
- Read authenticated user from `req.auth`.
- Call a service.
- Return typed response.
- Let centralized error middleware handle errors.

Suggested controllers:

- `auth.controller.ts`
- `github.controller.ts`
- `recommendations.controller.ts`
- `ai.controller.ts`
- `dashboard.controller.ts`
- `notifications.controller.ts`
- `saved-items.controller.ts`

## Services

Services hold business logic:

- `AuthService`: user bootstrap, session lookup.
- `GitHubService`: profile, repository, issue, contribution sync.
- `SkillAnalysisService`: deterministic skill extraction.
- `RepositoryRecommendationService`: repository scoring.
- `IssueRecommendationService`: issue scoring.
- `AiService`: provider selection, prompt execution, schema validation.
- `RoadmapService`: roadmap persistence and generation.
- `DashboardService`: aggregate dashboard summaries.
- `NotificationService`: notification creation and read status.

## Routes

Route groups:

- `/api/v1/auth`
- `/api/v1/github`
- `/api/v1/recommendations`
- `/api/v1/saved`
- `/api/v1/ai`
- `/api/v1/dashboard`
- `/api/v1/notifications`

Each route should compose middleware in this order:

1. Authentication.
2. Request validation.
3. Rate limiting where needed.
4. Controller handler.

## Middleware

Required middleware:

- `requestIdMiddleware`: assign request ID.
- `corsMiddleware`: allow frontend origins only.
- `authMiddleware`: validate Supabase JWT.
- `requireUserMiddleware`: enforce authenticated user.
- `validateBody`, `validateQuery`, `validateParams`: schema validation.
- `rateLimitMiddleware`: general API limits.
- `aiRateLimitMiddleware`: stricter AI limits.
- `errorHandler`: normalize errors.
- `notFoundHandler`: handle unknown routes.

## GitHub Service

Responsibilities:

- Retrieve GitHub token for authenticated user.
- Call REST and GraphQL APIs.
- Normalize GitHub responses.
- Persist repository and issue cache.
- Track rate limit metadata.
- Trigger downstream skill and recommendation jobs.

The service should expose high-level methods such as:

- `getProfile(userId)`
- `syncRepositories(userId, options)`
- `syncRepository(owner, repo)`
- `syncIssues(repositoryId)`
- `fetchContributionStats(userId, period)`

## AI Service

Responsibilities:

- Select configured provider.
- Build prompts from versioned prompt templates.
- Enforce token and cost limits.
- Validate structured outputs.
- Log usage to `ai_analysis_logs`.
- Return cached responses when valid.

The AI service should support both synchronous responses for small tasks and queued jobs for expensive analyses.

## Recommendation Service

Repository recommendation inputs:

- Skill profile.
- Preferred languages and topics.
- Repository health score.
- Activity recency.
- Community size.
- Difficulty level.
- Existing saved/dismissed history.

Issue recommendation inputs:

- Skill profile.
- Issue labels.
- Difficulty estimate.
- Freshness.
- Comment count.
- Repository match score.
- Good-first-issue and help-wanted flags.

Scoring should be deterministic and explainable. AI can generate readable explanations but should not be the only ranking mechanism.

## Supabase Service

Use two clients:

- User-scoped client for operations that should respect RLS.
- Service-role client for backend trusted operations and background jobs.

Never expose the service-role key to the frontend.

## Error Handling

Use custom error classes:

- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `ValidationError`
- `ConflictError`
- `RateLimitError`
- `ExternalServiceError`

Every error response should include a stable code and request ID.

## Logging

Use structured logs with:

- Request ID.
- User ID when authenticated.
- Route and status code.
- Latency.
- External provider name.
- GitHub rate-limit remaining.
- AI token usage and cost.

Avoid logging tokens, prompts containing private data, or full repository contents.

## Environment Variables

Required:

```bash
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AI_PROVIDER=openai
OPENAI_API_KEY=
GEMINI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
AI_DEFAULT_MODEL=
AI_MAX_INPUT_TOKENS=12000
AI_MAX_OUTPUT_TOKENS=2000
AI_DAILY_USER_BUDGET_USD=1.00
DATABASE_URL=
LOG_LEVEL=info
```

Optional:

```bash
REDIS_URL=
SENTRY_DSN=
GITHUB_WEBHOOK_SECRET=
ENCRYPTION_KEY=
```

