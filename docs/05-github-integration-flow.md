# OpenSource Compass - GitHub Integration Flow

## Overview

GitHub integration powers profile analysis, skill extraction, repository recommendations, issue recommendations, and contribution statistics. The backend owns all GitHub API calls to enforce token security, caching, rate-limit handling, and consistent normalization.

## REST API Usage

Use GitHub REST API for:

- Authenticated user profile: `GET /user`
- User emails: `GET /user/emails`
- User repositories: `GET /user/repos`
- Public user repositories: `GET /users/{username}/repos`
- Repository details: `GET /repos/{owner}/{repo}`
- Repository languages: `GET /repos/{owner}/{repo}/languages`
- README: `GET /repos/{owner}/{repo}/readme`
- Issues: `GET /repos/{owner}/{repo}/issues`
- Labels: `GET /repos/{owner}/{repo}/labels`
- Contributors: `GET /repos/{owner}/{repo}/contributors`
- Releases: `GET /repos/{owner}/{repo}/releases`

REST responses should be normalized into `github_repositories` and `github_issues`.

## GraphQL API Usage

Use GitHub GraphQL API when nested or batched data is more efficient:

- Contribution calendar.
- Pinned repositories.
- Repository language edges with sizes.
- Issue lists with labels and assignees.
- Pull request counts and merge status.
- Batched lookup by repository full name.

GraphQL queries should be versioned in source files and measured for cost. For large queries, use pagination and persist cursors in job metadata.

## Rate Limit Handling

Every GitHub response should update account-level rate limit metadata when available:

- `rate_limit_remaining`
- `rate_limit_reset_at`

Handling rules:

- If remaining calls are low, defer non-critical sync jobs.
- If GitHub returns `403` or `429` for rate limiting, schedule retry after reset.
- Prefer conditional requests with `ETag` and `If-None-Match` for cached resources.
- Use exponential backoff for transient `5xx` errors.
- Surface a friendly "GitHub sync delayed" state in the UI instead of failing hard.

## Repository Sync

Initial sync:

1. Fetch GitHub profile.
2. Fetch repositories sorted by recent activity.
3. Skip archived forks by default unless the user opts in.
4. For each repository, fetch languages, topics, README metadata, issue counts, and license.
5. Normalize into `github_repositories`.
6. Build skill evidence from languages, topics, stars, repo recency, and user ownership.
7. Trigger skill profile analysis and repository recommendations.

Incremental sync:

1. Find repositories with stale `last_synced_at`.
2. Use `pushed_at` and conditional requests to avoid unnecessary updates.
3. Refresh only changed repositories and their open issues.
4. Recompute affected recommendations.

## Issue Sync

Issue sync should prioritize repositories shown in recommendations or saved by users.

Steps:

1. Fetch open issues.
2. Include labels and assignees.
3. Derive flags:
   - `good_first_issue` from labels such as `good first issue`, `good-first-issue`.
   - `help_wanted` from labels such as `help wanted`, `help-wanted`.
4. Estimate difficulty from labels, body length, touched technologies, comment count, and repository complexity.
5. Save to `github_issues`.
6. Generate or refresh `issue_recommendations`.

## Contribution Data Fetching

Use GraphQL for contribution history:

- Pull requests opened.
- Pull requests merged.
- Issues opened and closed.
- Repository contribution counts.
- Contribution calendar streaks.
- Language distribution where inferable from contributed repositories.

Store aggregated results in `contribution_stats` by time window.

## Error Handling

| Failure | Handling |
| --- | --- |
| Token missing | Return `github_account_not_connected` |
| Token revoked | Mark account as reconnect required and notify user |
| Rate limited | Persist reset time and retry after reset |
| Repository not found | Mark cache stale or removed |
| Repository private/forbidden | Hide from public recommendations and record access issue |
| Validation failure | Log normalized payload ID and skip row |
| GitHub outage | Retry with exponential backoff |

## Caching Strategy

| Data | Cache Duration |
| --- | --- |
| User profile | 6 hours |
| User repository list | 12 hours |
| Repository metadata | 24 hours, shorter for saved/recommended repos |
| README summary | Until README SHA changes |
| Open issues | 2-6 hours |
| Contribution stats | 12-24 hours |
| AI repository summary | Until repository default branch or README changes |

Use stale-while-revalidate behavior in the backend: return cached data immediately, then refresh asynchronously when stale.

## Recommended Worker Jobs

- `github.profile.sync`
- `github.repositories.sync`
- `github.repository.syncOne`
- `github.issues.sync`
- `github.contributions.sync`
- `recommendations.repositories.generate`
- `recommendations.issues.generate`
- `notifications.generate`

