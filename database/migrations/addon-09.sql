-- OpenForge addon-09: durable Workspace generation lifecycle and timeout recovery.
alter table public.repository_ingestion_jobs drop constraint if exists repository_ingestion_jobs_status_check;
alter table public.repository_ingestion_jobs add constraint repository_ingestion_jobs_status_check
  check (status in ('queued','processing','ready','failed','stale'));
alter table public.repository_ingestion_jobs
  add column if not exists error_code text,
  add column if not exists queued_at timestamptz not null default now(),
  add column if not exists failed_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists retry_count integer not null default 0;
drop index if exists public.idx_one_active_ingestion_job;
create unique index if not exists idx_one_active_ingestion_job on public.repository_ingestion_jobs(user_id,repository_id) where status in ('queued','processing');

alter table public.workspace_module_content drop constraint if exists workspace_module_content_status_check;
alter table public.workspace_module_content add constraint workspace_module_content_status_check
  check(status in ('queued','processing','ready','failed','stale','insufficient_evidence'));
alter table public.workspace_module_content
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists queued_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists retry_count integer not null default 0;
update public.workspace_module_content set status='ready', completed_at=coalesce(completed_at,generated_at) where status='completed';
update public.workspace_module_content set status='queued', queued_at=coalesce(queued_at,created_at) where status='pending';
drop index if exists public.idx_workspace_semantic_hash;
create index idx_workspace_semantic_hash on public.workspace_module_content(module_type,content_hash) where status='ready';
