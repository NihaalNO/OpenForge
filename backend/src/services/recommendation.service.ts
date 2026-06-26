import type {
  AnalyzeSkillsResponse,
  GitHubIssueSummary,
  GitHubRepositorySummary,
  RecommendedIssue,
  RecommendedIssuesResponse,
  RecommendedRepositoriesResponse,
  RecommendedRepository,
  SavedIssueResponse,
  SavedRepositoryResponse,
  SkillProfileSummary
} from "@opensource-compass/shared";
import { ConflictError } from "../lib/http-error.js";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { skillAnalysisService } from "./skill-analysis.service.js";

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
  health_score: number | null;
  difficulty_level: string | null;
  raw_data?: { visibility?: string | null; private?: boolean | null } | null;
}

interface IssueRow {
  id: string;
  repository_id: string;
  issue_number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: string[] | null;
  author_login: string | null;
  assignee_logins: string[] | null;
  comments_count: number;
  difficulty_level: string | null;
  estimated_effort_hours: number | null;
  good_first_issue: boolean;
  help_wanted: boolean;
  github_created_at: string | null;
  github_updated_at: string | null;
  last_synced_at: string | null;
}

interface RepoRecommendationRow {
  id: string;
  repository_id: string;
  score: number;
  skill_match_score: number | null;
  difficulty_score: number | null;
  activity_score: number | null;
  reason: string | null;
  status: string;
}

interface IssueRecommendationRow {
  id: string;
  issue_id: string;
  repository_id: string;
  score: number;
  skill_match_score: number | null;
  difficulty_score: number | null;
  freshness_score: number | null;
  reason: string | null;
  status: string;
}

interface RecommendationFilters {
  language?: string;
  difficulty?: string;
  health?: string;
  label?: string;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function daysSince(date: string | null) {
  if (!date) {
    return 365;
  }

  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86_400_000);
}

function languageScore(skillProfile: SkillProfileSummary, repository: RepositoryRow) {
  const languageScores = skillProfile.languages;
  const primaryLanguageScore = repository.primary_language
    ? languageScores[repository.primary_language] ?? 0
    : 0;
  const languageOverlap = Object.keys(repository.languages ?? {}).reduce(
    (sum, language) => sum + (languageScores[language] ?? 0),
    0
  );

  return clampScore(primaryLanguageScore * 0.75 + Math.min(languageOverlap, 100) * 0.25);
}

function topicScore(skillProfile: SkillProfileSummary, repository: RepositoryRow) {
  const topics = repository.topics ?? [];

  if (topics.length === 0) {
    return 20;
  }

  const score = topics.reduce((sum, topic) => sum + (skillProfile.topics[topic] ?? 0), 0);

  return clampScore(Math.min(score / Math.max(topics.length, 1), 100));
}

function activityScore(repository: RepositoryRow) {
  const age = daysSince(repository.pushed_at ?? repository.github_updated_at);

  if (age <= 30) {
    return 100;
  }

  if (age <= 90) {
    return 75;
  }

  if (age <= 180) {
    return 45;
  }

  return 20;
}

function popularityScore(repository: RepositoryRow) {
  return clampScore(Math.log10(repository.stars_count + 1) * 22 + Math.log10(repository.forks_count + 1) * 15);
}

function openIssueScore(repository: RepositoryRow) {
  if (repository.open_issues_count >= 3 && repository.open_issues_count <= 80) {
    return 100;
  }

  if (repository.open_issues_count > 80) {
    return 70;
  }

  return repository.open_issues_count > 0 ? 60 : 20;
}

function difficultyScore(level: string | null, userLevel: string) {
  if (!level) {
    return 70;
  }

  if (level === userLevel) {
    return 100;
  }

  if (userLevel === "advanced" && level === "intermediate") {
    return 85;
  }

  if (userLevel === "intermediate" && level === "beginner") {
    return 85;
  }

  return 45;
}

function estimateRepositoryDifficulty(repository: RepositoryRow) {
  const complexity = Math.log10(repository.stars_count + repository.forks_count + 1);

  if (complexity > 4 || Object.keys(repository.languages ?? {}).length > 6) {
    return "advanced";
  }

  if (complexity > 2 || Object.keys(repository.languages ?? {}).length > 3) {
    return "intermediate";
  }

  return "beginner";
}

function repositoryHealth(repository: RepositoryRow, beginnerIssueScore: number) {
  return clampScore(
    activityScore(repository) * 0.35 +
      popularityScore(repository) * 0.25 +
      openIssueScore(repository) * 0.2 +
      beginnerIssueScore * 0.2
  );
}

function labelMatchScore(labels: string[]) {
  const normalized = labels.map((label) => label.toLowerCase());
  let score = 20;

  if (normalized.some((label) => label.includes("good first issue"))) {
    score += 35;
  }
  if (normalized.some((label) => label.includes("help wanted"))) {
    score += 25;
  }
  if (normalized.some((label) => label.includes("documentation") || label.includes("docs"))) {
    score += 15;
  }
  if (normalized.some((label) => label.includes("bug") || label.includes("enhancement"))) {
    score += 10;
  }

  return clampScore(score);
}

function issueFreshnessScore(issue: IssueRow) {
  const age = daysSince(issue.github_updated_at ?? issue.github_created_at);

  if (age <= 14) {
    return 100;
  }
  if (age <= 60) {
    return 75;
  }
  if (age <= 180) {
    return 45;
  }
  return 25;
}

function commentScore(issue: IssueRow) {
  if (issue.comments_count <= 3) {
    return 100;
  }
  if (issue.comments_count <= 10) {
    return 70;
  }
  return 35;
}

function estimateIssueDifficulty(issue: IssueRow) {
  const labels = issue.labels ?? [];

  if (issue.good_first_issue || labels.some((label) => label.toLowerCase().includes("documentation"))) {
    return "beginner";
  }

  if (issue.comments_count > 10 || (issue.body?.length ?? 0) > 2000) {
    return "advanced";
  }

  return "intermediate";
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

function toIssueSummary(row: IssueRow): GitHubIssueSummary {
  return {
    id: row.id,
    repositoryId: row.repository_id,
    number: row.issue_number,
    title: row.title,
    body: row.body,
    htmlUrl: row.html_url,
    state: row.state,
    labels: row.labels ?? [],
    authorLogin: row.author_login,
    assigneeLogins: row.assignee_logins ?? [],
    commentsCount: row.comments_count,
    goodFirstIssue: row.good_first_issue,
    helpWanted: row.help_wanted,
    githubCreatedAt: row.github_created_at,
    githubUpdatedAt: row.github_updated_at,
    lastSyncedAt: row.last_synced_at
  };
}

export class RecommendationService {
  private readonly supabase = getSupabaseServiceClient();

  async analyzeSkills(userId: string): Promise<AnalyzeSkillsResponse> {
    await this.assertGitHubSynced(userId);
    const skillProfile = await skillAnalysisService.analyzeUser(userId);
    const repositoryRecommendationsGenerated = await this.generateRepositoryRecommendations(userId, skillProfile);
    const issueRecommendationsGenerated = await this.generateIssueRecommendations(userId, skillProfile);

    return {
      skillProfile,
      repositoryRecommendationsGenerated,
      issueRecommendationsGenerated
    };
  }

  async getSkillProfile(userId: string) {
    await this.assertGitHubSynced(userId);

    return {
      skillProfile: await skillAnalysisService.getSkillProfile(userId)
    };
  }

  async getRepositoryRecommendations(userId: string, filters: RecommendationFilters) {
    await this.assertGitHubSynced(userId);
    const skillProfile = await this.ensureSkillProfile(userId);
    await this.generateRepositoryRecommendations(userId, skillProfile);
    const recommendations = await this.readRepositoryRecommendations(userId, filters);

    return { recommendations };
  }

  async getIssueRecommendations(userId: string, filters: RecommendationFilters) {
    await this.assertGitHubSynced(userId);
    const skillProfile = await this.ensureSkillProfile(userId);
    await this.generateIssueRecommendations(userId, skillProfile);
    const recommendations = await this.readIssueRecommendations(userId, filters);

    return { recommendations };
  }

  async saveRepository(userId: string, repositoryId: string): Promise<SavedRepositoryResponse> {
    const { error } = await this.supabase.from("saved_repositories").upsert(
      {
        user_id: userId,
        repository_id: repositoryId
      },
      { onConflict: "user_id,repository_id" }
    );

    if (error) {
      throw error;
    }

    await this.supabase
      .from("repository_recommendations")
      .update({ status: "saved" })
      .eq("user_id", userId)
      .eq("repository_id", repositoryId);

    return { saved: true, repositoryId };
  }

  async unsaveRepository(userId: string, repositoryId: string): Promise<SavedRepositoryResponse> {
    const { error } = await this.supabase
      .from("saved_repositories")
      .delete()
      .eq("user_id", userId)
      .eq("repository_id", repositoryId);

    if (error) {
      throw error;
    }

    await this.supabase
      .from("repository_recommendations")
      .update({ status: "active" })
      .eq("user_id", userId)
      .eq("repository_id", repositoryId);

    return { saved: false, repositoryId };
  }

  async saveIssue(userId: string, issueId: string): Promise<SavedIssueResponse> {
    const { error } = await this.supabase.from("saved_issues").upsert(
      {
        user_id: userId,
        issue_id: issueId,
        status: "saved"
      },
      { onConflict: "user_id,issue_id" }
    );

    if (error) {
      throw error;
    }

    await this.supabase
      .from("issue_recommendations")
      .update({ status: "saved" })
      .eq("user_id", userId)
      .eq("issue_id", issueId);

    return { saved: true, issueId };
  }

  async unsaveIssue(userId: string, issueId: string): Promise<SavedIssueResponse> {
    const { error } = await this.supabase
      .from("saved_issues")
      .delete()
      .eq("user_id", userId)
      .eq("issue_id", issueId);

    if (error) {
      throw error;
    }

    await this.supabase
      .from("issue_recommendations")
      .update({ status: "active" })
      .eq("user_id", userId)
      .eq("issue_id", issueId);

    return { saved: false, issueId };
  }

  private async ensureSkillProfile(userId: string) {
    return (await skillAnalysisService.getSkillProfile(userId)) ?? skillAnalysisService.analyzeUser(userId);
  }

  private async assertGitHubSynced(userId: string) {
    const { data, error } = await this.supabase
      .from("github_accounts")
      .select("last_synced_at")
      .eq("user_id", userId)
      .single();

    if (error || !data?.last_synced_at) {
      throw new ConflictError(
        "Sync your GitHub account to generate recommendations.",
        "github_not_synced"
      );
    }
  }

  private async generateRepositoryRecommendations(userId: string, skillProfile: SkillProfileSummary) {
    const repositories = await this.getRepositoriesForUser(userId);
    const issuesByRepository = await this.getIssueStatsByRepository();
    let generated = 0;

    for (const repository of repositories) {
      const beginnerIssueScore = issuesByRepository.get(repository.id) ?? 20;
      const difficultyLevel = repository.difficulty_level ?? estimateRepositoryDifficulty(repository);
      const skillMatchScore = clampScore(languageScore(skillProfile, repository) * 0.7 + topicScore(skillProfile, repository) * 0.3);
      const repoActivityScore = activityScore(repository);
      const repoHealth = repository.health_score ?? repositoryHealth(repository, beginnerIssueScore);
      const score = clampScore(
        skillMatchScore * 0.35 +
          repoActivityScore * 0.2 +
          popularityScore(repository) * 0.15 +
          openIssueScore(repository) * 0.1 +
          beginnerIssueScore * 0.1 +
          repoHealth * 0.1
      );
      const repositoryDifficultyScore = difficultyScore(difficultyLevel, skillProfile.experienceLevel);
      const saved = await this.isRepositorySaved(userId, repository.id);

      const { error } = await this.supabase.from("repository_recommendations").upsert(
        {
          user_id: userId,
          repository_id: repository.id,
          score,
          skill_match_score: skillMatchScore,
          difficulty_score: repositoryDifficultyScore,
          activity_score: repoActivityScore,
          reason: `${repository.primary_language ?? "Repository"} project with ${score}% deterministic match.`,
          recommendation_factors: {
            languageScore: languageScore(skillProfile, repository),
            topicScore: topicScore(skillProfile, repository),
            popularityScore: popularityScore(repository),
            openIssueScore: openIssueScore(repository),
            beginnerIssueScore,
            healthScore: repoHealth
          },
          status: saved ? "saved" : "active",
          generated_at: new Date().toISOString()
        },
        { onConflict: "user_id,repository_id" }
      );

      if (error) {
        throw error;
      }

      generated += 1;
    }

    return generated;
  }

  private async generateIssueRecommendations(userId: string, skillProfile: SkillProfileSummary) {
    const issues = await this.getIssuesWithRepositories(userId);
    let generated = 0;

    for (const { issue, repository } of issues) {
      const labels = issue.labels ?? [];
      const issueDifficulty = issue.difficulty_level ?? estimateIssueDifficulty(issue);
      const skillMatchScore = languageScore(skillProfile, repository);
      const issueLabelScore = labelMatchScore(labels);
      const freshnessScore = issueFreshnessScore(issue);
      const commentsScore = commentScore(issue);
      const issueDifficultyScore = difficultyScore(issueDifficulty, skillProfile.experienceLevel);
      const score = clampScore(
        skillMatchScore * 0.3 +
          issueLabelScore * 0.3 +
          freshnessScore * 0.15 +
          commentsScore * 0.1 +
          issueDifficultyScore * 0.15
      );
      const saved = await this.isIssueSaved(userId, issue.id);

      const { error } = await this.supabase.from("issue_recommendations").upsert(
        {
          user_id: userId,
          issue_id: issue.id,
          repository_id: repository.id,
          score,
          skill_match_score: skillMatchScore,
          difficulty_score: issueDifficultyScore,
          freshness_score: freshnessScore,
          reason: `${labels.slice(0, 2).join(", ") || "Open"} issue with ${score}% deterministic match.`,
          recommendation_factors: {
            labelScore: issueLabelScore,
            freshnessScore,
            commentScore: commentsScore,
            languageScore: skillMatchScore
          },
          status: saved ? "saved" : "active",
          generated_at: new Date().toISOString()
        },
        { onConflict: "user_id,issue_id" }
      );

      if (error) {
        throw error;
      }

      generated += 1;
    }

    return generated;
  }

  private async getRepositoriesForUser(userId: string) {
    const { data: account, error: accountError } = await this.supabase
      .from("github_accounts")
      .select("username")
      .eq("user_id", userId)
      .single();

    if (accountError) {
      throw accountError;
    }

    const { data, error } = await this.supabase
      .from("github_repositories")
      .select(
        "id,owner_login,name,full_name,description,html_url,default_branch,primary_language,languages,topics,stars_count,forks_count,open_issues_count,watchers_count,license_key,is_archived,is_fork,relationship_type,parent_repository_full_name,source,pushed_at,github_updated_at,last_synced_at,health_score,difficulty_level,raw_data"
      )
      .or(
        `owner_login.eq.${account.username},relationship_type.in.(collaborator,contributor,organization_member)`
      )
      .eq("is_archived", false);

    if (error) {
      throw error;
    }

    return data as RepositoryRow[];
  }

  private async getIssueStatsByRepository() {
    const { data, error } = await this.supabase
      .from("github_issues")
      .select("repository_id,labels,good_first_issue,help_wanted");

    if (error) {
      throw error;
    }

    const scores = new Map<string, number>();

    for (const issue of data as Array<{ repository_id: string; labels: string[] | null; good_first_issue: boolean; help_wanted: boolean }>) {
      const labels = issue.labels ?? [];
      const score = labelMatchScore(labels) + (issue.good_first_issue ? 20 : 0) + (issue.help_wanted ? 10 : 0);
      scores.set(issue.repository_id, Math.max(scores.get(issue.repository_id) ?? 0, clampScore(score)));
    }

    return scores;
  }

  private async getIssuesWithRepositories(userId: string) {
    const repositories = await this.getRepositoriesForUser(userId);
    const repositoryMap = new Map(repositories.map((repository) => [repository.id, repository]));

    if (repositories.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("github_issues")
      .select(
        "id,repository_id,issue_number,title,body,html_url,state,labels,author_login,assignee_logins,comments_count,difficulty_level,estimated_effort_hours,good_first_issue,help_wanted,github_created_at,github_updated_at,last_synced_at"
      )
      .in("repository_id", repositories.map((repository) => repository.id))
      .eq("state", "open");

    if (error) {
      throw error;
    }

    return (data as IssueRow[])
      .map((issue) => ({ issue, repository: repositoryMap.get(issue.repository_id) }))
      .filter((item): item is { issue: IssueRow; repository: RepositoryRow } => Boolean(item.repository));
  }

  private async readRepositoryRecommendations(
    userId: string,
    filters: RecommendationFilters
  ): Promise<RecommendedRepositoriesResponse["recommendations"]> {
    const { data: recommendationRows, error } = await this.supabase
      .from("repository_recommendations")
      .select("id,repository_id,score,skill_match_score,difficulty_score,activity_score,reason,status")
      .eq("user_id", userId)
      .order("score", { ascending: false });

    if (error) {
      throw error;
    }

    const repositories = await this.getRepositoriesForUser(userId);
    const repositoryMap = new Map(repositories.map((repository) => [repository.id, repository]));
    const savedRepositoryIds = await this.getSavedRepositoryIds(userId);

    return (recommendationRows as RepoRecommendationRow[])
      .map((recommendation): RecommendedRepository | null => {
        const repository = repositoryMap.get(recommendation.repository_id);

        if (!repository) {
          return null;
        }

        return {
          id: recommendation.id,
          score: Number(recommendation.score),
          skillMatchScore: Number(recommendation.skill_match_score ?? 0),
          difficultyScore: Number(recommendation.difficulty_score ?? 0),
          activityScore: Number(recommendation.activity_score ?? 0),
          reason: recommendation.reason,
          status: recommendation.status,
          isSaved: savedRepositoryIds.has(repository.id),
          repository: {
            ...toRepositorySummary(repository),
            healthScore: repository.health_score,
            difficultyLevel: repository.difficulty_level ?? estimateRepositoryDifficulty(repository)
          }
        };
      })
      .filter((item): item is RecommendedRepository => Boolean(item))
      .filter((item) => !filters.language || item.repository.primaryLanguage === filters.language)
      .filter((item) => !filters.difficulty || item.repository.difficultyLevel === filters.difficulty)
      .filter((item) => {
        if (!filters.health) {
          return true;
        }
        const healthScore = item.repository.healthScore ?? 0;

        return filters.health === "high" ? healthScore >= 70 : healthScore < 70;
      });
  }

  private async readIssueRecommendations(
    userId: string,
    filters: RecommendationFilters
  ): Promise<RecommendedIssuesResponse["recommendations"]> {
    const { data: recommendationRows, error } = await this.supabase
      .from("issue_recommendations")
      .select("id,issue_id,repository_id,score,skill_match_score,difficulty_score,freshness_score,reason,status")
      .eq("user_id", userId)
      .order("score", { ascending: false });

    if (error) {
      throw error;
    }

    const issuePairs = await this.getIssuesWithRepositories(userId);
    const issueMap = new Map(issuePairs.map((pair) => [pair.issue.id, pair]));
    const savedIssueIds = await this.getSavedIssueIds(userId);

    return (recommendationRows as IssueRecommendationRow[])
      .map((recommendation): RecommendedIssue | null => {
        const pair = issueMap.get(recommendation.issue_id);

        if (!pair) {
          return null;
        }

        return {
          id: recommendation.id,
          score: Number(recommendation.score),
          skillMatchScore: Number(recommendation.skill_match_score ?? 0),
          difficultyScore: Number(recommendation.difficulty_score ?? 0),
          freshnessScore: Number(recommendation.freshness_score ?? 0),
          reason: recommendation.reason,
          status: recommendation.status,
          isSaved: savedIssueIds.has(pair.issue.id),
          issue: {
            ...toIssueSummary(pair.issue),
            difficultyLevel: pair.issue.difficulty_level ?? estimateIssueDifficulty(pair.issue),
            estimatedEffortHours: pair.issue.estimated_effort_hours,
            repository: {
              id: pair.repository.id,
              fullName: pair.repository.full_name,
              ownerLogin: pair.repository.owner_login,
              name: pair.repository.name,
              primaryLanguage: pair.repository.primary_language
            }
          }
        };
      })
      .filter((item): item is RecommendedIssue => Boolean(item))
      .filter((item) => !filters.language || item.issue.repository.primaryLanguage === filters.language)
      .filter((item) => !filters.difficulty || item.issue.difficultyLevel === filters.difficulty)
      .filter((item) => !filters.label || item.issue.labels.some((label) => label.toLowerCase().includes(filters.label!.toLowerCase())));
  }

  private async getSavedRepositoryIds(userId: string) {
    const { data, error } = await this.supabase
      .from("saved_repositories")
      .select("repository_id")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return new Set((data as Array<{ repository_id: string }>).map((row) => row.repository_id));
  }

  private async getSavedIssueIds(userId: string) {
    const { data, error } = await this.supabase.from("saved_issues").select("issue_id").eq("user_id", userId);

    if (error) {
      throw error;
    }

    return new Set((data as Array<{ issue_id: string }>).map((row) => row.issue_id));
  }

  private async isRepositorySaved(userId: string, repositoryId: string) {
    return (await this.getSavedRepositoryIds(userId)).has(repositoryId);
  }

  private async isIssueSaved(userId: string, issueId: string) {
    return (await this.getSavedIssueIds(userId)).has(issueId);
  }
}

export const recommendationService = new RecommendationService();
