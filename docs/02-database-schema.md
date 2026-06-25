# OpenSource Compass - Database Schema

## Design Principles

The database is designed for PostgreSQL on Supabase. Tables use UUID primary keys, `created_at` and `updated_at` timestamps, JSONB for provider-specific metadata, and explicit foreign keys for user-owned records.

All user-owned tables should have Row Level Security enabled. Backend service-role access can bypass RLS for trusted server operations, but client-side Supabase access must be limited to the authenticated user's own rows.

The executable schema is available in [schema.sql](schema.sql).

## Tables

### users

Application user record mapped to Supabase Auth.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key; should match `auth.users.id` |
| email | text | Unique, nullable if provider does not expose email |
| display_name | text | User-facing name |
| avatar_url | text | Profile image |
| role | text | `user`, `admin`, or future roles |
| onboarding_completed | boolean | Defaults to false |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `email`; `created_at`.

RLS: Users can select and update their own row. Inserts should be handled by backend or auth trigger.

### user_profiles

Extended profile and preferences.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id`, unique |
| bio | text | User bio |
| location | text | Optional location |
| website_url | text | Optional website |
| experience_level | text | `beginner`, `intermediate`, `advanced` |
| preferred_languages | text[] | User-selected languages |
| preferred_topics | text[] | User-selected topics |
| goals | jsonb | Contribution goals |
| settings | jsonb | UI and notification preferences |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `user_id`; GIN indexes on language and topic arrays.

RLS: Users can manage only their own profile.

### github_accounts

Linked GitHub identity and sync metadata.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id`, unique |
| github_user_id | bigint | GitHub numeric user ID, unique |
| username | text | GitHub login |
| access_token_encrypted | text | Encrypted provider token or reference to secret storage |
| scopes | text[] | OAuth scopes granted |
| profile_data | jsonb | Snapshot of GitHub profile |
| rate_limit_remaining | integer | Last observed remaining calls |
| rate_limit_reset_at | timestamptz | Last observed reset time |
| last_synced_at | timestamptz | Last profile sync |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `user_id`, unique `github_user_id`, unique `username`.

RLS: Users can select their account metadata; token fields should not be exposed through client APIs.

### github_repositories

Cached repository metadata.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| github_repo_id | bigint | GitHub repository ID, unique |
| owner_login | text | Repository owner |
| name | text | Repository name |
| full_name | text | `owner/name`, unique |
| description | text | Repository description |
| html_url | text | GitHub URL |
| default_branch | text | Default branch |
| primary_language | text | Primary language |
| languages | jsonb | Language byte counts or percentages |
| topics | text[] | Repository topics |
| stars_count | integer | Stars |
| forks_count | integer | Forks |
| open_issues_count | integer | Open issues |
| watchers_count | integer | Watchers |
| license_key | text | SPDX key if available |
| is_archived | boolean | Archived flag |
| is_fork | boolean | Fork flag |
| pushed_at | timestamptz | Last push |
| github_created_at | timestamptz | GitHub creation time |
| github_updated_at | timestamptz | GitHub update time |
| readme_summary | text | Cached summary |
| health_score | numeric(5,2) | Repository health score |
| difficulty_level | text | Estimated level |
| raw_data | jsonb | Provider snapshot |
| last_synced_at | timestamptz | Sync time |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `github_repo_id`, unique `full_name`, `primary_language`, GIN `topics`, `stars_count`, `pushed_at`, `health_score`.

RLS: Public repository metadata can be readable by authenticated users; writes limited to backend.

### repository_recommendations

Personalized repository recommendations.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| repository_id | uuid | FK to `github_repositories.id` |
| score | numeric(5,2) | Overall match score |
| skill_match_score | numeric(5,2) | Skill compatibility |
| difficulty_score | numeric(5,2) | Difficulty fit |
| activity_score | numeric(5,2) | Repository activity |
| reason | text | Human-readable reason |
| recommendation_factors | jsonb | Explainability data |
| status | text | `active`, `dismissed`, `clicked`, `saved` |
| generated_at | timestamptz | Generation time |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: `(user_id, score desc)`, `(user_id, status)`, unique `(user_id, repository_id)`.

RLS: Users can read and update their own recommendations.

### github_issues

Cached issue metadata.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| repository_id | uuid | FK to `github_repositories.id` |
| github_issue_id | bigint | GitHub issue ID |
| issue_number | integer | Repository issue number |
| title | text | Issue title |
| body | text | Issue body snapshot |
| html_url | text | GitHub URL |
| state | text | `open` or `closed` |
| labels | text[] | Label names |
| author_login | text | Issue author |
| assignee_logins | text[] | Assignees |
| comments_count | integer | Comment count |
| difficulty_level | text | Estimated level |
| estimated_effort_hours | integer | Estimated effort |
| good_first_issue | boolean | Label-derived flag |
| help_wanted | boolean | Label-derived flag |
| raw_data | jsonb | Provider snapshot |
| github_created_at | timestamptz | GitHub creation time |
| github_updated_at | timestamptz | GitHub update time |
| last_synced_at | timestamptz | Sync time |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `(repository_id, github_issue_id)`, `(repository_id, state)`, GIN `labels`, `difficulty_level`, `github_updated_at`.

RLS: Authenticated users can read cached public issues; writes limited to backend.

### issue_recommendations

Personalized issue recommendations.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| issue_id | uuid | FK to `github_issues.id` |
| repository_id | uuid | FK to `github_repositories.id` |
| score | numeric(5,2) | Overall match |
| skill_match_score | numeric(5,2) | Skill compatibility |
| difficulty_score | numeric(5,2) | Difficulty fit |
| freshness_score | numeric(5,2) | Recency/activity |
| reason | text | Explanation |
| recommendation_factors | jsonb | Explainability data |
| status | text | `active`, `dismissed`, `clicked`, `saved` |
| generated_at | timestamptz | Generation time |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: `(user_id, score desc)`, `(user_id, status)`, unique `(user_id, issue_id)`.

RLS: Users can read and update their own rows.

### skill_profiles

Computed user skill model.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id`, unique |
| languages | jsonb | Language scores |
| frameworks | jsonb | Framework scores |
| tools | jsonb | Tooling scores |
| topics | jsonb | Topic scores |
| experience_level | text | Computed level |
| skill_score | numeric(5,2) | Overall score |
| confidence_score | numeric(5,2) | Data confidence |
| source_snapshot | jsonb | Inputs used for analysis |
| analyzed_at | timestamptz | Last analysis time |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `user_id`, `experience_level`, `skill_score`.

RLS: Users can read only their own skill profile; writes by backend.

### learning_roadmaps

Personalized learning plans.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| title | text | Roadmap title |
| goal | text | User goal |
| current_level | text | Starting level |
| target_level | text | Target level |
| roadmap_items | jsonb | Ordered milestones |
| recommended_repositories | jsonb | Repo references |
| estimated_weeks | integer | Estimate |
| status | text | `active`, `completed`, `archived` |
| generated_by | text | AI provider/model |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: `(user_id, status)`, `created_at`.

RLS: Users can manage their own roadmaps.

### contribution_stats

Aggregated contribution metrics per user.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| period_start | date | Aggregation start |
| period_end | date | Aggregation end |
| prs_opened | integer | PRs opened |
| prs_merged | integer | PRs merged |
| issues_opened | integer | Issues opened |
| issues_closed | integer | Issues solved |
| repositories_contributed | integer | Unique repos |
| contribution_streak_days | integer | Streak |
| languages | jsonb | Language counts |
| raw_data | jsonb | Provider snapshot |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: `(user_id, period_start, period_end)`, unique `(user_id, period_start, period_end)`.

RLS: Users can read their own stats; writes by backend.

### saved_repositories

User-saved repositories.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| repository_id | uuid | FK to `github_repositories.id` |
| notes | text | Private notes |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `(user_id, repository_id)`, `(user_id, created_at desc)`.

RLS: Users can manage their own saved repositories.

### saved_issues

User-saved issues.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| issue_id | uuid | FK to `github_issues.id` |
| notes | text | Private notes |
| status | text | `saved`, `in_progress`, `completed`, `dismissed` |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: unique `(user_id, issue_id)`, `(user_id, status)`, `(user_id, created_at desc)`.

RLS: Users can manage their own saved issues.

### notifications

User notifications.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id` |
| type | text | Notification type |
| title | text | Title |
| body | text | Body |
| action_url | text | Optional deep link |
| metadata | jsonb | Extra data |
| read_at | timestamptz | Null means unread |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: `(user_id, read_at)`, `(user_id, created_at desc)`.

RLS: Users can read and mark their own notifications.

### ai_analysis_logs

AI request and response audit log.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | Primary key |
| user_id | uuid | FK to `users.id`, nullable for public cache jobs |
| repository_id | uuid | FK to repositories, nullable |
| issue_id | uuid | FK to issues, nullable |
| analysis_type | text | `repository_summary`, `issue_explanation`, `roadmap`, `contribution_plan`, `skill_gap` |
| provider | text | AI provider |
| model | text | Model name |
| prompt_version | text | Prompt version |
| input_tokens | integer | Token usage |
| output_tokens | integer | Token usage |
| cost_usd | numeric(10,4) | Estimated cost |
| status | text | `pending`, `completed`, `failed` |
| request_payload | jsonb | Sanitized request |
| response_payload | jsonb | Structured response |
| error_message | text | Error details |
| created_at | timestamptz | Insert timestamp |
| updated_at | timestamptz | Update timestamp |

Indexes: `(user_id, created_at desc)`, `(repository_id, analysis_type)`, `(issue_id, analysis_type)`, `status`.

RLS: Users can read their own AI logs if exposed; admin/backend writes only.

## RLS Policy Pattern

For user-owned tables:

```sql
create policy "Users can read own rows"
on table_name for select
using (auth.uid() = user_id);
```

For public cached GitHub metadata, authenticated users may read rows, while only the backend service role writes.

