alter table public.github_repositories
  add column if not exists relationship_type text not null default 'owner'
  check (relationship_type in ('owner', 'fork', 'collaborator', 'contributor', 'organization_member'));

alter table public.github_repositories
  add column if not exists parent_repository_full_name text;

alter table public.github_repositories
  add column if not exists source text not null default 'github_sync';

create index if not exists idx_github_repositories_relationship_type
  on public.github_repositories(relationship_type);

create index if not exists idx_github_repositories_source
  on public.github_repositories(source);
