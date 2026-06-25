create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key,
  email text unique,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio text,
  location text,
  website_url text,
  experience_level text not null default 'beginner' check (experience_level in ('beginner', 'intermediate', 'advanced')),
  preferred_languages text[] not null default '{}',
  preferred_topics text[] not null default '{}',
  goals jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.github_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  github_user_id bigint not null unique,
  username text not null unique,
  access_token_encrypted text,
  scopes text[] not null default '{}',
  profile_data jsonb not null default '{}'::jsonb,
  rate_limit_remaining integer,
  rate_limit_reset_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.github_repositories (
  id uuid primary key default gen_random_uuid(),
  github_repo_id bigint not null unique,
  owner_login text not null,
  name text not null,
  full_name text not null unique,
  description text,
  html_url text not null,
  default_branch text,
  primary_language text,
  languages jsonb not null default '{}'::jsonb,
  topics text[] not null default '{}',
  stars_count integer not null default 0,
  forks_count integer not null default 0,
  open_issues_count integer not null default 0,
  watchers_count integer not null default 0,
  license_key text,
  is_archived boolean not null default false,
  is_fork boolean not null default false,
  pushed_at timestamptz,
  github_created_at timestamptz,
  github_updated_at timestamptz,
  readme_summary text,
  health_score numeric(5,2),
  difficulty_level text check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  raw_data jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repository_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  score numeric(5,2) not null default 0,
  skill_match_score numeric(5,2),
  difficulty_score numeric(5,2),
  activity_score numeric(5,2),
  reason text,
  recommendation_factors jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'dismissed', 'clicked', 'saved')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repository_id)
);

create table if not exists public.github_issues (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  github_issue_id bigint not null,
  issue_number integer not null,
  title text not null,
  body text,
  html_url text not null,
  state text not null default 'open' check (state in ('open', 'closed')),
  labels text[] not null default '{}',
  author_login text,
  assignee_logins text[] not null default '{}',
  comments_count integer not null default 0,
  difficulty_level text check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  estimated_effort_hours integer,
  good_first_issue boolean not null default false,
  help_wanted boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  github_created_at timestamptz,
  github_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repository_id, github_issue_id)
);

create table if not exists public.issue_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  issue_id uuid not null references public.github_issues(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  score numeric(5,2) not null default 0,
  skill_match_score numeric(5,2),
  difficulty_score numeric(5,2),
  freshness_score numeric(5,2),
  reason text,
  recommendation_factors jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'dismissed', 'clicked', 'saved')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, issue_id)
);

create table if not exists public.skill_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  languages jsonb not null default '{}'::jsonb,
  frameworks jsonb not null default '{}'::jsonb,
  tools jsonb not null default '{}'::jsonb,
  topics jsonb not null default '{}'::jsonb,
  experience_level text not null default 'beginner' check (experience_level in ('beginner', 'intermediate', 'advanced')),
  skill_score numeric(5,2) not null default 0,
  confidence_score numeric(5,2) not null default 0,
  source_snapshot jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  goal text not null,
  current_level text,
  target_level text,
  roadmap_items jsonb not null default '[]'::jsonb,
  recommended_repositories jsonb not null default '[]'::jsonb,
  estimated_weeks integer,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  generated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contribution_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  prs_opened integer not null default 0,
  prs_merged integer not null default 0,
  issues_opened integer not null default 0,
  issues_closed integer not null default 0,
  repositories_contributed integer not null default 0,
  contribution_streak_days integer not null default 0,
  languages jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start, period_end)
);

create table if not exists public.saved_repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repository_id)
);

create table if not exists public.saved_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  issue_id uuid not null references public.github_issues(id) on delete cascade,
  notes text,
  status text not null default 'saved' check (status in ('saved', 'in_progress', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, issue_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  repository_id uuid references public.github_repositories(id) on delete set null,
  issue_id uuid references public.github_issues(id) on delete set null,
  analysis_type text not null check (analysis_type in ('repository_summary', 'issue_explanation', 'roadmap', 'contribution_plan', 'skill_gap')),
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,4) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_created_at on public.users(created_at);
create index if not exists idx_user_profiles_languages on public.user_profiles using gin(preferred_languages);
create index if not exists idx_user_profiles_topics on public.user_profiles using gin(preferred_topics);
create index if not exists idx_github_repositories_primary_language on public.github_repositories(primary_language);
create index if not exists idx_github_repositories_topics on public.github_repositories using gin(topics);
create index if not exists idx_github_repositories_stars on public.github_repositories(stars_count desc);
create index if not exists idx_github_repositories_pushed_at on public.github_repositories(pushed_at desc);
create index if not exists idx_github_repositories_health_score on public.github_repositories(health_score desc);
create index if not exists idx_repository_recommendations_user_score on public.repository_recommendations(user_id, score desc);
create index if not exists idx_repository_recommendations_user_status on public.repository_recommendations(user_id, status);
create index if not exists idx_github_issues_repository_state on public.github_issues(repository_id, state);
create index if not exists idx_github_issues_labels on public.github_issues using gin(labels);
create index if not exists idx_github_issues_difficulty on public.github_issues(difficulty_level);
create index if not exists idx_github_issues_updated_at on public.github_issues(github_updated_at desc);
create index if not exists idx_issue_recommendations_user_score on public.issue_recommendations(user_id, score desc);
create index if not exists idx_issue_recommendations_user_status on public.issue_recommendations(user_id, status);
create index if not exists idx_skill_profiles_experience on public.skill_profiles(experience_level);
create index if not exists idx_skill_profiles_score on public.skill_profiles(skill_score desc);
create index if not exists idx_learning_roadmaps_user_status on public.learning_roadmaps(user_id, status);
create index if not exists idx_learning_roadmaps_created_at on public.learning_roadmaps(created_at desc);
create index if not exists idx_contribution_stats_user_period on public.contribution_stats(user_id, period_start, period_end);
create index if not exists idx_saved_repositories_user_created on public.saved_repositories(user_id, created_at desc);
create index if not exists idx_saved_issues_user_status on public.saved_issues(user_id, status);
create index if not exists idx_saved_issues_user_created on public.saved_issues(user_id, created_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_ai_analysis_logs_user_created on public.ai_analysis_logs(user_id, created_at desc);
create index if not exists idx_ai_analysis_logs_repository_type on public.ai_analysis_logs(repository_id, analysis_type);
create index if not exists idx_ai_analysis_logs_issue_type on public.ai_analysis_logs(issue_id, analysis_type);
create index if not exists idx_ai_analysis_logs_status on public.ai_analysis_logs(status);

drop trigger if exists set_users_updated_at on public.users;
drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
drop trigger if exists set_github_accounts_updated_at on public.github_accounts;
drop trigger if exists set_github_repositories_updated_at on public.github_repositories;
drop trigger if exists set_repository_recommendations_updated_at on public.repository_recommendations;
drop trigger if exists set_github_issues_updated_at on public.github_issues;
drop trigger if exists set_issue_recommendations_updated_at on public.issue_recommendations;
drop trigger if exists set_skill_profiles_updated_at on public.skill_profiles;
drop trigger if exists set_learning_roadmaps_updated_at on public.learning_roadmaps;
drop trigger if exists set_contribution_stats_updated_at on public.contribution_stats;
drop trigger if exists set_saved_repositories_updated_at on public.saved_repositories;
drop trigger if exists set_saved_issues_updated_at on public.saved_issues;
drop trigger if exists set_notifications_updated_at on public.notifications;
drop trigger if exists set_ai_analysis_logs_updated_at on public.ai_analysis_logs;

create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger set_github_accounts_updated_at before update on public.github_accounts for each row execute function public.set_updated_at();
create trigger set_github_repositories_updated_at before update on public.github_repositories for each row execute function public.set_updated_at();
create trigger set_repository_recommendations_updated_at before update on public.repository_recommendations for each row execute function public.set_updated_at();
create trigger set_github_issues_updated_at before update on public.github_issues for each row execute function public.set_updated_at();
create trigger set_issue_recommendations_updated_at before update on public.issue_recommendations for each row execute function public.set_updated_at();
create trigger set_skill_profiles_updated_at before update on public.skill_profiles for each row execute function public.set_updated_at();
create trigger set_learning_roadmaps_updated_at before update on public.learning_roadmaps for each row execute function public.set_updated_at();
create trigger set_contribution_stats_updated_at before update on public.contribution_stats for each row execute function public.set_updated_at();
create trigger set_saved_repositories_updated_at before update on public.saved_repositories for each row execute function public.set_updated_at();
create trigger set_saved_issues_updated_at before update on public.saved_issues for each row execute function public.set_updated_at();
create trigger set_notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();
create trigger set_ai_analysis_logs_updated_at before update on public.ai_analysis_logs for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.github_accounts enable row level security;
alter table public.github_repositories enable row level security;
alter table public.repository_recommendations enable row level security;
alter table public.github_issues enable row level security;
alter table public.issue_recommendations enable row level security;
alter table public.skill_profiles enable row level security;
alter table public.learning_roadmaps enable row level security;
alter table public.contribution_stats enable row level security;
alter table public.saved_repositories enable row level security;
alter table public.saved_issues enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_analysis_logs enable row level security;

drop policy if exists "Users can read own user row" on public.users;
drop policy if exists "Users can update own user row" on public.users;
drop policy if exists "Users can manage own profile" on public.user_profiles;
drop policy if exists "Users can read own github account" on public.github_accounts;
drop policy if exists "Authenticated users can read repositories" on public.github_repositories;
drop policy if exists "Users can manage own repository recommendations" on public.repository_recommendations;
drop policy if exists "Authenticated users can read issues" on public.github_issues;
drop policy if exists "Users can manage own issue recommendations" on public.issue_recommendations;
drop policy if exists "Users can read own skill profile" on public.skill_profiles;
drop policy if exists "Users can manage own roadmaps" on public.learning_roadmaps;
drop policy if exists "Users can read own contribution stats" on public.contribution_stats;
drop policy if exists "Users can manage own saved repositories" on public.saved_repositories;
drop policy if exists "Users can manage own saved issues" on public.saved_issues;
drop policy if exists "Users can manage own notifications" on public.notifications;
drop policy if exists "Users can read own ai logs" on public.ai_analysis_logs;

create policy "Users can read own user row" on public.users for select using (auth.uid() = id);
create policy "Users can update own user row" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can manage own profile" on public.user_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own github account" on public.github_accounts for select using (auth.uid() = user_id);
create policy "Authenticated users can read repositories" on public.github_repositories for select to authenticated using (true);
create policy "Users can manage own repository recommendations" on public.repository_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Authenticated users can read issues" on public.github_issues for select to authenticated using (true);
create policy "Users can manage own issue recommendations" on public.issue_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own skill profile" on public.skill_profiles for select using (auth.uid() = user_id);
create policy "Users can manage own roadmaps" on public.learning_roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own contribution stats" on public.contribution_stats for select using (auth.uid() = user_id);
create policy "Users can manage own saved repositories" on public.saved_repositories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own saved issues" on public.saved_issues for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can read own ai logs" on public.ai_analysis_logs for select using (auth.uid() = user_id);
