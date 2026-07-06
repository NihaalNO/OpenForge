do $$
begin
  if to_regclass('public.repository_recommendations') is not null then
    drop policy if exists "Users can manage own repository recommendations" on public.repository_recommendations;
    drop trigger if exists set_repository_recommendations_updated_at on public.repository_recommendations;
  end if;

  if to_regclass('public.issue_recommendations') is not null then
    drop policy if exists "Users can manage own issue recommendations" on public.issue_recommendations;
    drop trigger if exists set_issue_recommendations_updated_at on public.issue_recommendations;
  end if;

  if to_regclass('public.repository_intelligence') is not null then
    drop policy if exists "Users can read own repository intelligence" on public.repository_intelligence;
    drop policy if exists "Users can manage own repository intelligence" on public.repository_intelligence;
    drop trigger if exists set_repository_intelligence_updated_at on public.repository_intelligence;
  end if;

  if to_regclass('public.saved_issues') is not null then
    drop policy if exists "Users can manage own saved issues" on public.saved_issues;
    drop trigger if exists set_saved_issues_updated_at on public.saved_issues;
  end if;

  if to_regclass('public.ai_analysis_logs') is not null then
    drop policy if exists "Users can read own ai logs" on public.ai_analysis_logs;
    drop trigger if exists set_ai_analysis_logs_updated_at on public.ai_analysis_logs;
  end if;
end $$;

drop index if exists public.idx_repository_recommendations_user_score;
drop index if exists public.idx_repository_recommendations_user_status;
drop index if exists public.idx_issue_recommendations_user_score;
drop index if exists public.idx_issue_recommendations_user_status;
drop index if exists public.idx_repository_intelligence_user_generated;
drop index if exists public.idx_repository_intelligence_repository_status;
drop index if exists public.idx_repository_intelligence_detected_stack;
drop index if exists public.idx_saved_issues_user_status;
drop index if exists public.idx_saved_issues_user_created;
drop index if exists public.idx_ai_analysis_logs_user_created;
drop index if exists public.idx_ai_analysis_logs_repository_type;
drop index if exists public.idx_ai_analysis_logs_issue_type;
drop index if exists public.idx_ai_analysis_logs_status;

drop table if exists public.repository_recommendations;
drop table if exists public.issue_recommendations;
drop table if exists public.repository_intelligence;
drop table if exists public.saved_issues;
drop table if exists public.ai_analysis_logs;

drop index if exists public.idx_github_repositories_health_score;
drop index if exists public.idx_github_issues_difficulty;

alter table public.github_repositories
  drop column if exists health_score,
  drop column if exists difficulty_level;

alter table public.github_issues
  drop column if exists difficulty_level,
  drop column if exists estimated_effort_hours;
