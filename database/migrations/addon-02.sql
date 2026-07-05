create table if not exists public.repository_intelligence_context (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  provider text not null default 'github',
  knowledge_package jsonb not null,
  source_limits jsonb,
  detected_stack jsonb,
  contribution_readiness jsonb,
  complexity jsonb,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  error_message text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repository_id, provider)
);

do $$
begin
  if to_regclass('public.repository_intelligence') is not null then
    insert into public.repository_intelligence_context (
      id,
      user_id,
      repository_id,
      provider,
      knowledge_package,
      source_limits,
      detected_stack,
      contribution_readiness,
      complexity,
      status,
      error_message,
      generated_at,
      created_at,
      updated_at
    )
    select
      id,
      user_id,
      repository_id,
      provider,
      knowledge_package,
      source_limits,
      detected_stack,
      contribution_readiness,
      complexity,
      status,
      error_message,
      generated_at,
      created_at,
      updated_at
    from public.repository_intelligence
    on conflict (user_id, repository_id, provider)
    do update set
      knowledge_package = excluded.knowledge_package,
      source_limits = excluded.source_limits,
      detected_stack = excluded.detected_stack,
      contribution_readiness = excluded.contribution_readiness,
      complexity = excluded.complexity,
      status = excluded.status,
      error_message = excluded.error_message,
      generated_at = excluded.generated_at,
      updated_at = now();
  end if;
end $$;

create index if not exists idx_repository_intelligence_context_user_generated
  on public.repository_intelligence_context(user_id, generated_at desc);

create index if not exists idx_repository_intelligence_context_repository_status
  on public.repository_intelligence_context(repository_id, status);

create index if not exists idx_repository_intelligence_context_detected_stack
  on public.repository_intelligence_context using gin(detected_stack);

drop trigger if exists set_repository_intelligence_context_updated_at on public.repository_intelligence_context;
create trigger set_repository_intelligence_context_updated_at
  before update on public.repository_intelligence_context
  for each row
  execute function public.set_updated_at();

alter table public.repository_intelligence_context enable row level security;

drop policy if exists "Users can read own repository context" on public.repository_intelligence_context;
drop policy if exists "Users can manage own repository context" on public.repository_intelligence_context;
drop policy if exists "Users can read own workspace knowledge" on public.repository_intelligence_context;
drop policy if exists "Users can manage own workspace knowledge" on public.repository_intelligence_context;

create policy "Users can read own repository context"
  on public.repository_intelligence_context
  for select
  using (auth.uid() = user_id);

create policy "Users can manage own repository context"
  on public.repository_intelligence_context
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

delete from public.ai_analysis_logs
where analysis_type = 'repository_summary';

alter table public.ai_analysis_logs
  drop constraint if exists ai_analysis_logs_analysis_type_check;

alter table public.ai_analysis_logs
  add constraint ai_analysis_logs_analysis_type_check
  check (analysis_type in ('issue_explanation', 'roadmap', 'contribution_plan', 'skill_gap'));

do $$
begin
  if to_regclass('public.repository_intelligence') is not null then
    drop trigger if exists set_repository_intelligence_updated_at on public.repository_intelligence;
  end if;
end $$;

drop table if exists public.repository_intelligence;

