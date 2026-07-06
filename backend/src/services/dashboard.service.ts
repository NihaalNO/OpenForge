import type {
  DashboardActivityItem,
  DashboardAnalyticsResponse,
  DashboardResponse,
  GitHubProfileResponse,
  GitHubRepositorySummary,
  SavedRepositoriesResponse
} from "@openforge/shared";
import { getCurrentUser } from "../repositories/user.repository.js";
import { getSupabaseServiceClient } from "../lib/supabase.js";

interface RepositoryRow {
  id: string;
  owner_login: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string | null;
  primary_language: string | null;
  languages: Record<string, number> | null;
  topics: string[] | null;
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  license_key: string | null;
  is_archived: boolean;
  is_fork: boolean;
  relationship_type?: "owner" | "fork" | "collaborator" | "contributor" | "organization_member" | null;
  parent_repository_full_name?: string | null;
  source?: string | null;
  pushed_at: string | null;
  github_updated_at: string | null;
  last_synced_at: string | null;
  raw_data?: { visibility?: string | null; private?: boolean | null } | null;
}

function toRepositorySummary(row: RepositoryRow): GitHubRepositorySummary {
  return {
    id: row.id,
    ownerLogin: row.owner_login,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    htmlUrl: row.html_url,
    visibility: row.raw_data?.visibility ?? (row.raw_data?.private ? "private" : "public"),
    defaultBranch: row.default_branch,
    primaryLanguage: row.primary_language,
    languages: row.languages ?? {},
    topics: row.topics ?? [],
    starsCount: row.stars_count,
    forksCount: row.forks_count,
    openIssuesCount: row.open_issues_count,
    watchersCount: row.watchers_count,
    licenseKey: row.license_key,
    isArchived: row.is_archived,
    isFork: row.is_fork,
    relationshipType: row.relationship_type ?? (row.is_fork ? "fork" : "owner"),
    parentRepositoryFullName: row.parent_repository_full_name ?? null,
    source: row.source ?? "github_sync",
    pushedAt: row.pushed_at,
    githubUpdatedAt: row.github_updated_at,
    lastSyncedAt: row.last_synced_at
  };
}

function sumRecord(records: Array<Record<string, number> | null | undefined>) {
  const totals = new Map<string, number>();

  for (const record of records) {
    for (const [key, value] of Object.entries(record ?? {})) {
      totals.set(key, (totals.get(key) ?? 0) + Number(value));
    }
  }

  return [...totals.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function toRoadmapStatus(
  status: string | null | undefined
): "not_generated" | "active" | "completed" | "archived" {
  if (status === "active" || status === "completed" || status === "archived") {
    return status;
  }

  return "not_generated";
}

export class DashboardService {
  private readonly supabase = getSupabaseServiceClient();

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const user = await getCurrentUser(userId);
    const [github, counts, recentActivity] = await Promise.all([
      this.getGitHubProfile(userId),
      this.getCounts(userId),
      this.getRecentActivity(userId)
    ]);

    return {
      user,
      github,
      metrics: {
        ...counts
      },
      recentActivity
    };
  }

  async getAnalytics(userId: string): Promise<DashboardAnalyticsResponse> {
    const { data, error } = await this.supabase
      .from("contribution_stats")
      .select("period_start,period_end,prs_opened,prs_merged,issues_closed,repositories_contributed,contribution_streak_days,languages,raw_data")
      .eq("user_id", userId)
      .order("period_start", { ascending: true })
      .limit(24);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{
      period_start: string;
      prs_opened: number;
      prs_merged: number;
      issues_closed: number;
      repositories_contributed: number;
      contribution_streak_days: number;
      languages: Record<string, number> | null;
      raw_data: { repositories?: Record<string, number> } | null;
    }>;

    const totals = rows.reduce(
      (summary, row) => ({
        pullRequestsOpened: summary.pullRequestsOpened + row.prs_opened,
        pullRequestsMerged: summary.pullRequestsMerged + row.prs_merged,
        issuesSolved: summary.issuesSolved + row.issues_closed,
        repositoriesContributed: summary.repositoriesContributed + row.repositories_contributed,
        contributionStreakDays: Math.max(summary.contributionStreakDays, row.contribution_streak_days)
      }),
      {
        pullRequestsOpened: 0,
        pullRequestsMerged: 0,
        issuesSolved: 0,
        repositoriesContributed: 0,
        contributionStreakDays: 0
      }
    );

    return {
      totals,
      languages: sumRecord(rows.map((row) => row.languages)).slice(0, 8),
      repositories: sumRecord(rows.map((row) => row.raw_data?.repositories)).slice(0, 8),
      weeklyActivity: rows.slice(-8).map((row) => ({
        label: row.period_start,
        prs: row.prs_opened,
        issues: row.issues_closed
      })),
      monthlyActivity: rows.slice(-12).map((row) => ({
        label: row.period_start.slice(0, 7),
        prs: row.prs_opened,
        issues: row.issues_closed
      })),
      contributionHistory: rows.map((row) => ({
        date: row.period_start,
        count: row.prs_opened + row.issues_closed
      }))
    };
  }

  async getSavedRepositories(userId: string): Promise<SavedRepositoriesResponse> {
    const { data, error } = await this.supabase
      .from("saved_repositories")
      .select("id,created_at,repository:github_repositories(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = ((data ?? []) as unknown as Array<{
      id: string;
      created_at: string;
      repository: RepositoryRow | null;
    }>).filter((row) => row.repository);
    const repositories = await Promise.all(
      rows.map(async (row) => ({
          id: row.id,
          savedAt: row.created_at,
          repository: toRepositorySummary(row.repository!)
        }))
    );

    return { repositories };
  }

  private async getGitHubProfile(userId: string): Promise<GitHubProfileResponse["profile"] | null> {
    const { data, error } = await this.supabase
      .from("github_accounts")
      .select("username,profile_data,last_synced_at,rate_limit_remaining,rate_limit_reset_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const profile = data.profile_data as Record<string, unknown>;

    return {
      username: data.username,
      name: typeof profile.name === "string" ? profile.name : null,
      avatarUrl: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
      bio: typeof profile.bio === "string" ? profile.bio : null,
      htmlUrl: typeof profile.html_url === "string" ? profile.html_url : `https://github.com/${data.username}`,
      publicRepos: Number(profile.public_repos ?? 0),
      followers: Number(profile.followers ?? 0),
      following: Number(profile.following ?? 0),
      lastSyncedAt: data.last_synced_at,
      rateLimitRemaining: data.rate_limit_remaining,
      rateLimitResetAt: data.rate_limit_reset_at
    };
  }

  private async getCounts(userId: string) {
    const { data: account, error: accountError } = await this.supabase
      .from("github_accounts")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();

    if (accountError) {
      throw accountError;
    }

    const username = account?.username ?? "";
    const { data: repositories, error: repositoriesError } = await this.supabase
      .from("github_repositories")
      .select("id,owner_login,is_fork,relationship_type")
      .or(`owner_login.eq.${username},relationship_type.in.(collaborator,contributor,organization_member)`);

    if (repositoriesError) {
      throw repositoriesError;
    }

    const repositoryRows = (repositories ?? []) as Array<{
      owner_login: string;
      is_fork: boolean;
      relationship_type: string | null;
    }>;
    const { count: unreadNotifications, error } = await this.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw error;
    }

    const { count: workspaceInsightsGenerated, error: insightsError } = await this.supabase
      .from("repository_intelligence_context")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    if (insightsError) {
      throw insightsError;
    }

    const { data: roadmap, error: roadmapError } = await this.supabase
      .from("learning_roadmaps")
      .select("status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roadmapError) {
      throw roadmapError;
    }

    return {
      totalRepositories: repositoryRows.length,
      ownedRepositories: repositoryRows.filter((repository) => repository.owner_login === username && !repository.is_fork).length,
      forkedRepositories: repositoryRows.filter((repository) => repository.is_fork).length,
      contributedRepositories: repositoryRows.filter((repository) =>
        repository.relationship_type === "collaborator" ||
        repository.relationship_type === "contributor" ||
        repository.relationship_type === "organization_member"
      ).length,
      workspaceInsightsGenerated: workspaceInsightsGenerated ?? 0,
      learningRoadmapStatus: toRoadmapStatus(roadmap?.status),
      unreadNotifications: unreadNotifications ?? 0
    };
  }

  private async getRecentActivity(userId: string): Promise<DashboardActivityItem[]> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("id,type,title,body,created_at")
      .eq("user_id", userId)
      .not("type", "ilike", "%recommendation%")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.body,
      createdAt: row.created_at
    }));
  }

}

export const dashboardService = new DashboardService();

