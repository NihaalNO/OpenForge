-- OpenForge addon-04
-- Remove the standalone Learning Roadmap feature storage.

drop policy if exists "Users can manage own roadmaps" on public.learning_roadmaps;

drop trigger if exists set_learning_roadmaps_updated_at on public.learning_roadmaps;

drop index if exists public.idx_learning_roadmaps_user_status;
drop index if exists public.idx_learning_roadmaps_created_at;

alter table if exists public.learning_roadmaps
  drop constraint if exists learning_roadmaps_user_id_fkey;

drop table if exists public.learning_roadmaps cascade;
