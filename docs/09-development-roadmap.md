# OpenSource Compass - Development Roadmap

## Phase 1: Foundation Setup

Tasks:

- Create monorepo structure.
- Initialize Next.js frontend with TypeScript and Tailwind CSS.
- Add shadcn/ui configuration.
- Initialize Express backend with TypeScript.
- Add shared TypeScript package.
- Add linting, formatting, and environment examples.
- Configure Supabase project variables.
- Add Docker files for local backend/database workflow where applicable.

Acceptance criteria:

- Frontend runs locally.
- Backend health endpoint runs locally.
- Shared types can be imported by frontend and backend.
- Environment validation fails clearly when required variables are missing.
- README documents local setup.

Expected output:

- Working scaffold with no product features yet.
- Health checks and baseline developer tooling.

## Phase 2: Authentication and User Profiles

Tasks:

- Configure Supabase Auth with GitHub OAuth.
- Implement login page and OAuth callback route.
- Implement backend JWT auth middleware.
- Implement `/auth/me`, `/auth/session`, and `/auth/logout`.
- Create user bootstrap logic.
- Implement onboarding flow for experience level, goals, languages, and topics.
- Create protected route guard.

Acceptance criteria:

- User can sign in with GitHub.
- User records are created in `users`, `user_profiles`, and `github_accounts`.
- Protected routes redirect unauthenticated users.
- Onboarding status controls access to app routes.
- Logout clears client session.

Expected output:

- Secure authenticated app shell with profile bootstrap.

## Phase 3: GitHub Integration

Tasks:

- Implement GitHub REST client.
- Implement GitHub GraphQL client.
- Fetch and cache GitHub profile.
- Sync repositories.
- Sync repository details, languages, topics, README metadata, and issues.
- Fetch contribution stats.
- Track rate limits and sync status.
- Add repository explorer base UI.

Acceptance criteria:

- Authenticated user can sync GitHub profile.
- Repository and issue cache tables populate correctly.
- Rate-limit failures produce recoverable UI/API states.
- Repository explorer displays cached metadata.

Expected output:

- Reliable GitHub data ingestion and repository browsing foundation.

## Phase 4: Recommendation Engine

Tasks:

- Implement skill analysis from GitHub profile and repositories.
- Build repository health scoring.
- Build repository recommendation scoring.
- Build issue difficulty estimation.
- Build issue recommendation scoring.
- Add filters for language, difficulty, topics, and saved status.
- Implement save repository and save issue flows.

Acceptance criteria:

- Users receive personalized repository recommendations.
- Users receive personalized issue recommendations.
- Recommendation reasons are understandable.
- Saved repositories and issues persist.
- Dismissed or saved items affect future recommendation status.

Expected output:

- Functional personalized discovery experience.

## Phase 5: AI Features

Tasks:

- Implement AI provider abstraction.
- Add OpenAI adapter first, with Gemini/Ollama-compatible adapters behind config.
- Create prompt templates and schemas.
- Implement repository analysis.
- Implement issue explanation.
- Implement learning roadmap generation.
- Implement contribution plan generation.
- Add AI usage logging and cost controls.
- Add cached AI results.

Acceptance criteria:

- Repository analysis returns structured summaries.
- Issue explanation returns practical contribution guidance.
- Roadmap generation persists to `learning_roadmaps`.
- AI calls respect token limits, cost limits, and safety filtering.
- Failed AI calls are logged and recover gracefully.

Expected output:

- AI mentor features integrated with repository and issue workflows.

## Phase 6: Dashboard and Analytics

Tasks:

- Build dashboard summary endpoint.
- Build contribution stats endpoint.
- Add contribution dashboard charts.
- Add roadmap progress UI.
- Add notification generation.
- Add notifications inbox and read status.
- Add profile and settings pages.

Acceptance criteria:

- Dashboard shows skill score, recommendations, contribution stats, and notifications.
- Contribution stats reflect GitHub data.
- Notifications are generated for matching issues and recommendations.
- Settings update user preferences.

Expected output:

- Complete product dashboard experience.

## Phase 7: Testing, Polish, and Deployment

Tasks:

- Add backend unit and integration tests.
- Add frontend component and route tests.
- Add API contract tests.
- Add database migration test.
- Add accessibility checks.
- Add loading, empty, error, and rate-limit states.
- Configure Vercel deployment for frontend.
- Configure backend deployment with Docker.
- Configure Supabase production environment.
- Add monitoring and error tracking.

Acceptance criteria:

- Critical API flows are tested.
- Auth and RLS behavior are verified.
- Frontend is responsive and accessible.
- Production deployment succeeds.
- Logs and errors are observable.

Expected output:

- Production-ready v1 release candidate.

