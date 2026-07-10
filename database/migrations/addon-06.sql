-- OpenForge addon-06: versioned, user-isolated Workspace intelligence.

create table if not exists public.repository_context_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade, provider text not null default 'github',
  default_branch text not null, head_sha text not null, readme_sha text, important_file_shas jsonb not null default '{}'::jsonb,
  context_version text not null, status text not null check (status in ('pending','completed','failed','stale')),
  source_summary jsonb not null default '{}'::jsonb, knowledge_package jsonb not null default '{}'::jsonb,
  limits_applied jsonb not null default '{}'::jsonb, redaction_summary jsonb not null default '{}'::jsonb,
  generated_at timestamptz, stale_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, repository_id, context_version, head_sha)
);
create index if not exists idx_context_snapshots_owner_repo on public.repository_context_snapshots(user_id,repository_id,status);

create table if not exists public.workspace_module_content (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  context_snapshot_id uuid not null references public.repository_context_snapshots(id) on delete cascade,
  module_type text not null check(module_type in ('explorer','mission','mentor','review','timeline')),
  content_version text not null, provider text not null, model text, content_payload jsonb not null,
  status text not null check(status in ('pending','completed','failed','stale')), fallback_used boolean not null default false,
  latency_ms integer, input_tokens integer, output_tokens integer, generated_at timestamptz, stale_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,repository_id,module_type,content_version)
);
create index if not exists idx_workspace_modules_owner_repo on public.workspace_module_content(user_id,repository_id,module_type,status);

create table if not exists public.mentor_learning_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade, concept_key text not null, concept_name text not null,
  understanding_level text not null default 'introduced' check(understanding_level in ('introduced','exploring','understood','maintainer')),
  interaction_count integer not null default 1, last_explored_at timestamptz not null default now(), source_module text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,repository_id,concept_key)
);

create table if not exists public.repository_ingestion_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade, status text not null check(status in ('queued','running','completed','failed')),
  current_stage text not null, progress_percent integer not null default 0 check(progress_percent between 0 and 100), error_message text,
  attempt_count integer not null default 1, started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists idx_one_active_ingestion_job on public.repository_ingestion_jobs(user_id,repository_id) where status in ('queued','running');
create index if not exists idx_ingestion_jobs_owner_repo on public.repository_ingestion_jobs(user_id,repository_id,created_at desc);

do $$ declare t text; begin foreach t in array array['repository_context_snapshots','workspace_module_content','mentor_learning_history','repository_ingestion_jobs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists "Users manage own %s" on public.%I',t,t);
  execute format('create policy "Users manage own %s" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',t,t);
  execute format('drop trigger if exists set_%s_updated_at on public.%I',t,t);
  execute format('create trigger set_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
end loop; end $$;
