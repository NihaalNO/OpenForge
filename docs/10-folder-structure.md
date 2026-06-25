# OpenSource Compass - Recommended Folder Structure

## Monorepo Structure

```text
opensource-compass/
  frontend/
    app/
    components/
    hooks/
    lib/
    styles/
    public/
    tests/
    next.config.ts
    tailwind.config.ts
    package.json
  backend/
    src/
      config/
      controllers/
      jobs/
      lib/
      middleware/
      repositories/
      routes/
      services/
      types/
      validators/
      app.ts
      server.ts
    tests/
    Dockerfile
    package.json
  shared/
    src/
      api/
      schemas/
      types/
      constants/
    package.json
  database/
    migrations/
    seeds/
    schema.sql
  scripts/
    dev/
    deploy/
    sync/
  docs/
    01-system-architecture.md
    02-database-schema.md
    03-api-specification.md
    04-auth-flow.md
    05-github-integration-flow.md
    06-ai-pipeline-design.md
    07-frontend-architecture.md
    08-backend-architecture.md
    09-development-roadmap.md
    10-folder-structure.md
    schema.sql
  .env.example
  .gitignore
  docker-compose.yml
  package.json
  package-lock.json
  README.md
```

## Folder Responsibilities

### `frontend`

Next.js application responsible for all user-facing UI:

- Public landing and login pages.
- OAuth callback handling.
- Protected dashboard routes.
- Repository explorer.
- Issue recommendation UI.
- AI summaries and plans.
- Profile, settings, and notifications.

### `frontend/app`

Next.js App Router pages, layouts, route groups, loading states, and error boundaries.

### `frontend/components`

Reusable UI components grouped by product area:

- `layout`
- `auth`
- `dashboard`
- `repositories`
- `issues`
- `ai`
- `roadmap`
- `notifications`
- `common`

### `frontend/lib`

Frontend utilities:

- API client.
- Supabase browser client.
- Query keys.
- Formatters.
- Route helpers.

### `backend`

Express API responsible for secure server-side product logic:

- Authentication validation.
- GitHub API integration.
- Recommendation generation.
- AI provider orchestration.
- Dashboard aggregation.
- Notifications.

### `backend/src/controllers`

Thin HTTP handlers that validate input, call services, and return responses.

### `backend/src/services`

Business logic for auth, GitHub sync, skills, recommendations, AI, dashboard, and notifications.

### `backend/src/repositories`

Database access layer. This folder should isolate SQL or Supabase query logic from services.

### `backend/src/middleware`

Express middleware for auth, request IDs, validation, rate limits, logging, and error handling.

### `backend/src/jobs`

Background jobs for GitHub sync, AI analysis, recommendation refresh, contribution stats, and notifications.

### `shared`

Shared TypeScript types, API response contracts, constants, and validation schemas used by both frontend and backend.

### `database`

Database artifacts:

- Migration files.
- Seed data for local development.
- Database schema copies.
- Optional Supabase configuration.

### `scripts`

Developer and deployment scripts:

- Local setup.
- Database reset.
- GitHub sync test utilities.
- Deployment helpers.

### `docs`

Architecture and planning documentation. The files in this directory should remain the source of truth for early implementation phases.

## Environment Files

Recommended files:

- `.env.example`: documented required variables with placeholder values.
- `frontend/.env.local`: local frontend variables.
- `backend/.env`: local backend variables.
- `backend/.env.test`: test variables.

Never commit real secrets.

## Package Management

Use npm workspaces.

Root package responsibilities:

- Shared scripts.
- Workspace configuration.
- Formatting and linting commands.

Example root scripts:

```json
{
  "scripts": {
    "dev": "npm run dev --workspaces",
    "lint": "npm run lint --workspaces",
    "test": "npm run test --workspaces",
    "typecheck": "npm run typecheck --workspaces"
  }
}
```
