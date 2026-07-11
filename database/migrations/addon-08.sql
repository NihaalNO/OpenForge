-- OpenForge addon-08: Groq-only Workspace provenance and legacy invalidation.
alter table public.workspace_module_content
  add column if not exists generation_source text,
  add column if not exists prompt_version text,
  add column if not exists content_hash text,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

create index if not exists idx_workspace_semantic_hash on public.workspace_module_content(module_type,content_hash) where status='completed';

update public.workspace_module_content
set status='stale', stale_at=now()
where content_version <> 'workspace-modules-v3-groq-only'
   or generation_source is distinct from 'groq'
   or provider is distinct from 'groq'
   or grounded is distinct from true
   or jsonb_typeof(content_payload->'cards') is distinct from 'array';

alter table public.workspace_module_content drop constraint if exists workspace_module_content_generation_source_check;
alter table public.workspace_module_content add constraint workspace_module_content_generation_source_check check (generation_source is null or generation_source='groq');
