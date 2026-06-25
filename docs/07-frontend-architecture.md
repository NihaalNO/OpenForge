# OpenSource Compass - Frontend Architecture

## Overview

The frontend is a Next.js application using React, TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion. The first screen after authentication should be the product dashboard, not a marketing page.

## App Routing Structure

Recommended App Router paths:

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login` | Login screen with GitHub OAuth |
| `/auth/callback` | Supabase OAuth callback |
| `/onboarding` | Goals, skill level, language preferences |
| `/app` | Dashboard home |
| `/app/repositories` | Repository recommendations |
| `/app/repositories/[owner]/[repo]` | Repository explorer and AI summary |
| `/app/issues` | Recommended issues |
| `/app/issues/[issueId]` | Issue explanation and contribution plan |
| `/app/roadmap` | Personalized learning roadmap |
| `/app/contributions` | Contribution dashboard |
| `/app/notifications` | Notifications inbox |
| `/app/profile` | User profile |
| `/app/settings` | Preferences, account, integrations |

## Layout Structure

- `RootLayout`: global providers, fonts, theme, metadata.
- `PublicLayout`: landing and login pages.
- `AppLayout`: sidebar, top navigation, user menu, notification entry point.
- `DashboardLayout`: responsive dashboard grid and page header area.

The app layout should be optimized for repeated use: compact navigation, clear active states, responsive sidebar, and dense but readable data views.

## Page List

- Landing page.
- Login page.
- OAuth callback page.
- Onboarding page.
- Dashboard home.
- Repository recommendations page.
- Repository detail/explorer page.
- Recommended issues page.
- Issue detail page.
- Learning roadmap page.
- Contribution stats page.
- Notifications page.
- Profile page.
- Settings page.

## Component Hierarchy

Suggested component groups:

- `components/layout`: app shell, sidebar, topbar, page header.
- `components/auth`: login button, auth guard, onboarding guard.
- `components/repositories`: repository card, repository filters, repository health badge, repo detail header.
- `components/issues`: issue card, issue filters, difficulty badge, issue explanation panel.
- `components/ai`: analysis status, generated summary, contribution plan viewer.
- `components/dashboard`: stats cards, activity feed, recommendation panels.
- `components/roadmap`: roadmap timeline, milestone card, progress controls.
- `components/notifications`: notification list, unread indicator.
- `components/common`: loading states, empty states, error states, pagination.

## State Management Approach

- Use Supabase client for auth session state.
- Use TanStack Query or SWR for server state.
- Use URL search params for list filters.
- Use lightweight local state for UI controls.
- Avoid global stores unless needed for cross-page UI state.

Server state should be cached by query key:

- `currentUser`
- `dashboardSummary`
- `recommendedRepositories`
- `recommendedIssues`
- `repositoryDetails`
- `repositoryIssues`
- `notifications`

## API Client Structure

Recommended files:

- `lib/api/client.ts`: fetch wrapper with auth header injection.
- `lib/api/auth.ts`: auth endpoints.
- `lib/api/github.ts`: GitHub profile, repository, issue endpoints.
- `lib/api/recommendations.ts`: recommendation endpoints.
- `lib/api/ai.ts`: AI analysis endpoints.
- `lib/api/dashboard.ts`: stats and summary endpoints.
- `lib/api/notifications.ts`: notifications endpoints.
- `lib/supabase/client.ts`: browser Supabase client.
- `lib/supabase/server.ts`: server-side Supabase helper if needed.

The API client should normalize errors into typed application errors.

## Auth Guards

Guard behavior:

- No session: redirect to `/login`.
- Session exists, no app profile: call `/auth/me`.
- Onboarding incomplete: redirect to `/onboarding`.
- GitHub account disconnected: show reconnect state where needed.

Protected routes should render skeleton states while session validation is in progress.

## Dashboard Layout

Dashboard home should include:

- Skill score and experience level.
- Recommended repositories preview.
- Recommended issues preview.
- Contribution stats summary.
- Learning roadmap progress.
- Recent notifications.
- GitHub sync status.

## Loading, Error, and Empty States

Every data-heavy page needs:

- Initial skeleton loading state.
- Refetching indicator.
- Empty state with a clear next action.
- Error state with retry.
- Rate-limit state when GitHub or AI providers are temporarily unavailable.

Examples:

- No recommendations: prompt user to sync GitHub profile or update preferences.
- No issues: suggest broadening filters or syncing repositories.
- AI analysis pending: show queued status and refresh automatically.

## UI Design Principles

- Use a practical developer-tool aesthetic: clear hierarchy, compact cards, readable tables, and restrained motion.
- Use shadcn/ui for buttons, dialogs, tabs, forms, dropdowns, tables, badges, and toasts.
- Use icons for common actions such as save, sync, external link, refresh, and filter.
- Keep Framer Motion subtle: route transitions, panel reveal, progress feedback.
- Design for accessibility: keyboard navigation, focus states, semantic headings, sufficient contrast.
- Prioritize mobile-responsive layouts, but optimize the primary dashboard experience for desktop and laptop use.

