-- OpenForge addon-07: snapshot-scoped, grounded Workspace module cache.
alter table public.workspace_module_content
  add column if not exists grounded boolean not null default false,
  add column if not exists evidence_coverage numeric(5,4) not null default 0 check (evidence_coverage between 0 and 1);
alter table public.workspace_module_content drop constraint if exists workspace_module_content_user_id_repository_id_module_type_content_version_key;
create unique index if not exists uq_workspace_module_snapshot_cache on public.workspace_module_content(user_id,repository_id,context_snapshot_id,module_type,content_version);
create index if not exists idx_workspace_module_snapshot_lookup on public.workspace_module_content(user_id,repository_id,context_snapshot_id,module_type,content_version,status);
update public.workspace_module_content set status='stale',stale_at=now() where content_version<>'workspace-modules-v2-grounded' or grounded=false;
create unique index if not exists uq_context_snapshot_identity on public.repository_context_snapshots(id,user_id,repository_id);
alter table public.workspace_module_content drop constraint if exists workspace_module_content_context_identity_fkey;
alter table public.workspace_module_content add constraint workspace_module_content_context_identity_fkey foreign key(context_snapshot_id,user_id,repository_id) references public.repository_context_snapshots(id,user_id,repository_id) on delete cascade;
