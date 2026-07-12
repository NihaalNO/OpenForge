-- OpenForge addon-10: repository-scoped, versioned evidence package cache.
create table if not exists public.workspace_evidence_packages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  context_snapshot_id uuid not null references public.repository_context_snapshots(id) on delete cascade,
  head_sha text not null, module_type text not null check(module_type in ('explorer','mission','mentor','review','timeline')),
  query_hash text not null default '', evidence_version integer not null, prompt_version text not null, token_budget integer not null,
  estimated_tokens_used integer not null, evidence_payload jsonb not null, truncated boolean not null default false,
  generated_at timestamptz not null default now(), stale_at timestamptz
);
create unique index if not exists idx_workspace_evidence_cache on public.workspace_evidence_packages(user_id,repository_id,context_snapshot_id,module_type,query_hash,evidence_version,prompt_version);
create index if not exists idx_workspace_evidence_head on public.workspace_evidence_packages(user_id,repository_id,head_sha) where stale_at is null;
alter table public.workspace_evidence_packages enable row level security;
drop policy if exists "Users read own workspace evidence" on public.workspace_evidence_packages;
create policy "Users read own workspace evidence" on public.workspace_evidence_packages for select using (auth.uid()=user_id);
