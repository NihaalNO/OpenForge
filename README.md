# OpenSource Compass

OpenSource Compass is an AI-powered developer platform that helps users discover, understand, and contribute to open-source GitHub projects based on their GitHub profile, skills, and experience level.

This repository currently contains the Phase 1 foundation scaffold. It intentionally does not implement product features beyond a frontend starter page, a backend health endpoint, shared TypeScript contracts, environment examples, and database artifacts.

## Source of Truth

Planning documents live in `docs/`:

- `docs/01-system-architecture.md`
- `docs/02-database-schema.md`
- `docs/03-api-specification.md`
- `docs/04-auth-flow.md`
- `docs/05-github-integration-flow.md`
- `docs/06-ai-pipeline-design.md`
- `docs/07-frontend-architecture.md`
- `docs/08-backend-architecture.md`
- `docs/09-development-roadmap.md`
- `docs/10-folder-structure.md`

## Workspace Structure

```text
frontend/   Next.js application shell
backend/    Express API shell with /health
shared/     Shared TypeScript types and constants
database/   Schema and migration placeholders
scripts/    Development, deployment, and sync script placeholders
docs/       Architecture and planning documents
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker, optional for local PostgreSQL

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment examples:

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

3. Start local PostgreSQL, optional:

   ```bash
   docker compose up -d postgres
   ```

4. Run the development servers:

   ```bash
   npm run dev
   ```

The frontend defaults to `http://localhost:3000`.
The backend defaults to `http://localhost:4000`.

## Useful Commands

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run lint
npm run typecheck
npm run build
npm run test
```

## Phase 1 Acceptance Criteria

- Frontend app scaffold exists and can run after dependency installation.
- Backend health endpoint exists at `GET /health` and `GET /api/v1/health`.
- Shared types can be imported by frontend and backend.
- Environment validation is centralized and returns clear errors.
- Database schema is copied into `database/schema.sql`.

## Next Phase

Phase 2 should implement Supabase GitHub OAuth, authenticated user bootstrap, onboarding, and protected route guards using the docs as the contract.
