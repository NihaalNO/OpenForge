import type {
  GitHubIssueSyncResponse,
  GitHubIssuesResponse,
  GitHubProfileResponse,
  GitHubRepositoriesResponse,
  GitHubRepositoryResponse,
  GitHubRepositorySummary,
  GitHubSyncResponse
} from "@openforge/shared";
import {
  GitHubClient,
  type GitHubIssuePayload,
  type GitHubRepositoryPayload,
  type GitHubUserPayload
} from "../lib/github-client.js";
import { ConflictError, NotFoundError } from "../lib/http-error.js";
import { getSupabaseServiceClient } from "../lib/supabase.js";
import { repositoryIntelligenceService } from "./repository-intelligence.service.js";

interface GitHubAccountRow {
  user_id: string;
  username: string;
  access_token_encrypted: string | null;
}

interface RepositoryRow {
  id: string;
  owner_login: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string | null;
  primary_language: string | null;
  languages: Record<string, number>;
  topics: string[];
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  license_key: string | null;
  is_archived: boolean;
  is_fork: boolean;
  relationship_type?: RepositoryRelationshipType | null;
  parent_repository_full_name?: string | null;
  source?: string | null;
  pushed_at: string | null;
  github_updated_at: string | null;
  last_synced_at: string | null;
  raw_data?: {
    visibility?: string | null;
    private?: boolean | null;
  } | null;
}

interface RepositoryUpsertPayload {
  github_repo_id: number;
  owner_login: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string | null;
  primary_language: string | null;
  languages: Record<string, number>;
  topics: string[];
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  license_key: string | null;
  is_archived: boolean;
  is_fork: boolean;
  relationship_type: RepositoryRelationshipType;
  parent_repository_full_name: string | null;
  source: "github_sync";
  pushed_at: string | null;
  github_created_at: string | null;
  github_updated_at: string | null;
  raw_data: GitHubRepositoryPayload;
  last_synced_at: string;
}

interface IssueRow {
  id: string;
  repository_id: string;
  issue_number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: string[];
  author_login: string | null;
  assignee_logins: string[];
  comments_count: number;
  good_first_issue: boolean;
  help_wanted: boolean;
  github_created_at: string | null;
  github_updated_at: string | null;
  last_synced_at: string | null;
}

interface ContributionGraphqlResponse {
  data?: {
    viewer?: {
      contributionsCollection?: {
        totalCommitContributions: number;
        totalIssueContributions: number;
        totalPullRequestContributions: number;
        totalPullRequestReviewContributions: number;
        restrictedContributionsCount: number;
      };
    };
  };
}

type RepositoryRelationshipType = "owner" | "fork" | "collaborator" | "contributor" | "organization_member";

interface RepositoryWithRelationship {
  repository: GitHubRepositoryPayload;
  relationshipType: RepositoryRelationshipType;
}

interface ContributedRepositoriesGraphqlResponse {
  data?: {
    viewer?: {
      repositoriesContributedTo?: {
        nodes?: Array<{
          name: string;
          owner: {
            login: string;
          };
        } | null>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    };
  };
}

type ContributedRepositoriesConnection = NonNullable<
  NonNullable<NonNullable<ContributedRepositoriesGraphqlResponse["data"]>["viewer"]>["repositoriesContributedTo"]
>;

function toRepositorySummary(row: RepositoryRow): GitHubRepositorySummary {
  const rawVisibility = row.raw_data?.visibility;
  const derivedVisibility = rawVisibility ?? (row.raw_data?.private ? "private" : "public");

  return {
    id: row.id,
    ownerLogin: row.owner_login,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    htmlUrl: row.html_url,
    visibility: derivedVisibility,
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

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput, index: number) => Promise<TOutput>
) {
  const results = new Array<TOutput>(inputs.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < inputs.length) {
      const currentIndex = nextIndex;
      const input = inputs[currentIndex];
      nextIndex += 1;

      if (input === undefined) {
        continue;
      }

      results[currentIndex] = await mapper(input, currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker())
  );

  return results;
}

function getLabelNames(labels: GitHubIssuePayload["labels"]) {
  return labels
    .map((label) => (typeof label === "string" ? label : label.name))
    .filter((label): label is string => Boolean(label));
}

function hasLabel(labels: string[], labelToFind: string) {
  const normalizedLabel = labelToFind.toLowerCase();

  return labels.some((label) => label.toLowerCase().replace(/-/g, " ") === normalizedLabel);
}

function toIssueSummary(row: IssueRow) {
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

export class GitHubService {
  private readonly supabase = getSupabaseServiceClient();

  async getProfile(userId: string): Promise<GitHubProfileResponse> {
    const account = await this.getGitHubAccount(userId);

    return {
      profile: this.toProfileResponse(account)
    };
  }

  async sync(userId: string): Promise<GitHubSyncResponse> {
    const account = await this.getGitHubAccount(userId);
    const client = new GitHubClient(account.access_token_encrypted);
    const profile = await client.rest<GitHubUserPayload>("/user");

    await this.upsertAccountProfile(userId, profile, client);

    const repositories = await this.fetchAuthenticatedRepositories(client, profile.login);
    const syncableRepositories = repositories.filter((item) => !item.repository.archived);
    const [repositorySync, contributionStatsSynced] = await Promise.all([
      this.syncRepositoryPayloads(userId, client, syncableRepositories),
      this.syncContributionStats(userId, client)
    ]);
    const syncedAt = new Date().toISOString();

    return {
      status: "completed",
      profileSynced: true,
      repositoriesSynced: repositorySync.repositoriesSynced,
      repositoryContextsPrepared: repositorySync.repositoryContextsPrepared,
      contributionStatsSynced,
      syncedAt
    };
  }

  async listRepositories(userId: string): Promise<GitHubRepositoriesResponse> {
    const account = await this.getGitHubAccount(userId, false);
    const { data, error } = await this.supabase
      .from("github_repositories")
      .select(
        "id,owner_login,name,full_name,description,html_url,default_branch,primary_language,languages,topics,stars_count,forks_count,open_issues_count,watchers_count,license_key,is_archived,is_fork,relationship_type,parent_repository_full_name,source,pushed_at,github_updated_at,last_synced_at,raw_data"
      )
      .or(
        `owner_login.eq.${account.username},relationship_type.in.(collaborator,contributor,organization_member)`
      )
      .order("github_updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return {
      repositories: (data as RepositoryRow[]).map(toRepositorySummary)
    };
  }

  async getRepository(userId: string, owner: string, repo: string): Promise<GitHubRepositoryResponse> {
    await this.getGitHubAccount(userId, false);

    const repository = await this.getRepositoryRow(owner, repo);

    return {
      repository: toRepositorySummary(repository)
    };
  }

  async listIssues(userId: string, owner: string, repo: string): Promise<GitHubIssuesResponse> {
    await this.getGitHubAccount(userId, false);
    const repository = await this.getRepositoryRow(owner, repo);
    const { data, error } = await this.supabase
      .from("github_issues")
      .select(
        "id,repository_id,issue_number,title,body,html_url,state,labels,author_login,assignee_logins,comments_count,good_first_issue,help_wanted,github_created_at,github_updated_at,last_synced_at"
      )
      .eq("repository_id", repository.id)
      .order("github_updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return {
      issues: (data as IssueRow[]).map(toIssueSummary)
    };
  }

  async syncIssues(userId: string, owner: string, repo: string): Promise<GitHubIssueSyncResponse> {
    const account = await this.getGitHubAccount(userId);
    const client = new GitHubClient(account.access_token_encrypted);
    let repository = await this.findRepositoryRow(owner, repo);

    if (!repository) {
      const repositoryPayload = await client.rest<GitHubRepositoryPayload>(`/repos/${owner}/${repo}`);
      repository = await this.syncRepositoryPayload(
        client,
        repositoryPayload,
        this.getRepositoryRelationship(repositoryPayload, account.username)
      );
    }

    const issuePayloads = await client.rest<GitHubIssuePayload[]>(
      `/repos/${owner}/${repo}/issues?state=open&per_page=100`
    );
    let issuesSynced = 0;

    for (const issuePayload of issuePayloads.filter((issue) => !issue.pull_request)) {
      const labels = getLabelNames(issuePayload.labels);
      const { error } = await this.supabase.from("github_issues").upsert(
        {
          repository_id: repository.id,
          github_issue_id: issuePayload.id,
          issue_number: issuePayload.number,
          title: issuePayload.title,
          body: issuePayload.body,
          html_url: issuePayload.html_url,
          state: issuePayload.state,
          labels,
          author_login: issuePayload.user?.login ?? null,
          assignee_logins: issuePayload.assignees?.map((assignee) => assignee.login) ?? [],
          comments_count: issuePayload.comments,
          good_first_issue: hasLabel(labels, "good first issue"),
          help_wanted: hasLabel(labels, "help wanted"),
          raw_data: issuePayload,
          github_created_at: issuePayload.created_at,
          github_updated_at: issuePayload.updated_at,
          last_synced_at: new Date().toISOString()
        },
        {
          onConflict: "repository_id,github_issue_id"
        }
      );

      if (error) {
        throw error;
      }

      issuesSynced += 1;
    }

    await this.updateRateLimit(account.user_id, client);

    return {
      status: "completed",
      issuesSynced,
      syncedAt: new Date().toISOString()
    };
  }

  private async syncRepositoryPayload(
    client: GitHubClient,
    repository: GitHubRepositoryPayload,
    relationshipType?: RepositoryRelationshipType
  ) {
    const payload = await this.buildRepositoryUpsertPayload(
      client,
      repository,
      relationshipType ?? this.getRepositoryRelationship(repository, repository.owner.login)
    );
    const { data, error } = await this.supabase
      .from("github_repositories")
      .upsert(payload, {
        onConflict: "github_repo_id"
      })
      .select(
        "id,owner_login,name,full_name,description,html_url,default_branch,primary_language,languages,topics,stars_count,forks_count,open_issues_count,watchers_count,license_key,is_archived,is_fork,relationship_type,parent_repository_full_name,source,pushed_at,github_updated_at,last_synced_at,raw_data"
      )
      .single();

    if (error) {
      throw error;
    }

    await this.updateRateLimitByClient(client, repository.owner.login);

    return data as RepositoryRow;
  }

  private async syncRepositoryPayloads(
    userId: string,
    client: GitHubClient,
    repositories: RepositoryWithRelationship[]
  ) {
    if (repositories.length === 0) {
      return {
        repositoriesSynced: 0,
        repositoryContextsPrepared: 0
      };
    }

    const payloads = await mapWithConcurrency(repositories, 8, (item) =>
      this.buildRepositoryUpsertPayload(client, item.repository, item.relationshipType)
    );
    const { data, error } = await this.supabase
      .from("github_repositories")
      .upsert(payloads, {
        onConflict: "github_repo_id"
      })
      .select("id");

    if (error) {
      throw error;
    }

    await this.updateRateLimit(userId, client);

    const repositoryIds = ((data ?? []) as Array<{ id: string }>).map((repository) => repository.id);
    const contextResults = await mapWithConcurrency(repositoryIds, 3, async (repositoryId) => {
      try {
        await repositoryIntelligenceService.buildRepositoryIntelligence(userId, repositoryId);
        return true;
      } catch {
        return false;
      }
    });

    return {
      repositoriesSynced: payloads.length,
      repositoryContextsPrepared: contextResults.filter(Boolean).length
    };
  }

  private async buildRepositoryUpsertPayload(
    client: GitHubClient,
    repository: GitHubRepositoryPayload,
    relationshipType: RepositoryRelationshipType
  ): Promise<RepositoryUpsertPayload> {
    const languages = await client.rest<Record<string, number>>(
      `/repos/${repository.owner.login}/${repository.name}/languages`
    );

    return {
      github_repo_id: repository.id,
      owner_login: repository.owner.login,
      name: repository.name,
      full_name: repository.full_name,
      description: repository.description,
      html_url: repository.html_url,
      default_branch: repository.default_branch,
      primary_language: repository.language,
      languages,
      topics: repository.topics ?? [],
      stars_count: repository.stargazers_count,
      forks_count: repository.forks_count,
      open_issues_count: repository.open_issues_count,
      watchers_count: repository.watchers_count,
      license_key: repository.license?.key ?? null,
      is_archived: repository.archived,
      is_fork: repository.fork,
      relationship_type: repository.fork ? "fork" : relationshipType,
      parent_repository_full_name: repository.parent?.full_name ?? null,
      source: "github_sync",
      pushed_at: repository.pushed_at,
      github_created_at: repository.created_at,
      github_updated_at: repository.updated_at,
      raw_data: repository,
      last_synced_at: new Date().toISOString()
    };
  }

  private async fetchAuthenticatedRepositories(client: GitHubClient, username: string) {
    const affiliatedRepositories = await client.paginate<GitHubRepositoryPayload>(
      "/user/repos?per_page=100&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member"
    );
    const repositoryMap = new Map<number, RepositoryWithRelationship>();

    for (const repository of affiliatedRepositories) {
      repositoryMap.set(repository.id, {
        repository,
        relationshipType: this.getRepositoryRelationship(repository, username)
      });
    }

    const contributedRepositories = await this.fetchContributedRepositories(client);

    for (const repository of contributedRepositories) {
      const existing = repositoryMap.get(repository.id);

      if (!existing) {
        repositoryMap.set(repository.id, {
          repository,
          relationshipType: "contributor"
        });
        continue;
      }

      if (existing.relationshipType !== "owner" && existing.relationshipType !== "fork") {
        repositoryMap.set(repository.id, {
          repository: existing.repository,
          relationshipType: existing.relationshipType === "organization_member" ? "organization_member" : "contributor"
        });
      }
    }

    return [...repositoryMap.values()];
  }

  private getRepositoryRelationship(repository: GitHubRepositoryPayload, username: string): RepositoryRelationshipType {
    if (repository.owner.login === username && repository.fork) {
      return "fork";
    }

    if (repository.owner.login === username) {
      return "owner";
    }

    if (repository.owner.type === "Organization") {
      return "organization_member";
    }

    return "collaborator";
  }

  private async fetchContributedRepositories(client: GitHubClient) {
    const repositories: GitHubRepositoryPayload[] = [];
    let cursor: string | null = null;

    try {
      do {
        const query = `
          query ViewerContributedRepositories($cursor: String) {
            viewer {
              repositoriesContributedTo(
                first: 100
                after: $cursor
                includeUserRepositories: false
                contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
              ) {
                nodes {
                  name
                  owner {
                    login
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        `;
        const response: ContributedRepositoriesGraphqlResponse = await client.graphql<ContributedRepositoriesGraphqlResponse>(query, {
          cursor
        });
        const contributed: ContributedRepositoriesConnection | undefined =
          response.data?.viewer?.repositoriesContributedTo;

        if (!contributed) {
          break;
        }

        for (const node of contributed.nodes ?? []) {
          if (!node) {
            continue;
          }

          const repository = await client.rest<GitHubRepositoryPayload>(
            `/repos/${node.owner.login}/${node.name}`
          );
          repositories.push(repository);
        }

        cursor = contributed.pageInfo.hasNextPage ? contributed.pageInfo.endCursor : null;
      } while (cursor);
    } catch {
      return repositories;
    }

    return repositories;
  }

  private async syncContributionStats(userId: string, client: GitHubClient) {
    const query = `
      query ViewerContributionSummary {
        viewer {
          contributionsCollection {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            restrictedContributionsCount
          }
        }
      }
    `;

    try {
      const response = await client.graphql<ContributionGraphqlResponse>(query);
      const contributions = response.data?.viewer?.contributionsCollection;

      if (!contributions) {
        return false;
      }

      const today = new Date();
      const periodEnd = today.toISOString().slice(0, 10);
      const periodStartDate = new Date(today);
      periodStartDate.setDate(today.getDate() - 365);

      const { error } = await this.supabase.from("contribution_stats").upsert(
        {
          user_id: userId,
          period_start: periodStartDate.toISOString().slice(0, 10),
          period_end: periodEnd,
          prs_opened: contributions.totalPullRequestContributions,
          prs_merged: 0,
          issues_opened: contributions.totalIssueContributions,
          issues_closed: 0,
          repositories_contributed: 0,
          contribution_streak_days: 0,
          languages: {},
          raw_data: contributions
        },
        {
          onConflict: "user_id,period_start,period_end"
        }
      );

      if (error) {
        throw error;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async getGitHubAccount(userId: string, requireToken = true) {
    const { data, error } = await this.supabase
      .from("github_accounts")
      .select("user_id,username,access_token_encrypted,profile_data,last_synced_at,rate_limit_remaining,rate_limit_reset_at")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new ConflictError("GitHub account is not connected", "github_account_not_connected");
    }

    const account = data as GitHubAccountRow & {
      profile_data?: Record<string, unknown>;
      last_synced_at?: string | null;
      rate_limit_remaining?: number | null;
      rate_limit_reset_at?: string | null;
    };

    if (requireToken && !account.access_token_encrypted) {
      throw new ConflictError("GitHub token is missing. Sign in with GitHub again.", "github_token_missing");
    }

    return account as GitHubAccountRow & {
      access_token_encrypted: string;
      profile_data?: Record<string, unknown>;
      last_synced_at?: string | null;
      rate_limit_remaining?: number | null;
      rate_limit_reset_at?: string | null;
    };
  }

  private toProfileResponse(
    account: GitHubAccountRow & {
      profile_data?: Record<string, unknown>;
      last_synced_at?: string | null;
      rate_limit_remaining?: number | null;
      rate_limit_reset_at?: string | null;
    }
  ) {
    const profileData = account.profile_data ?? {};

    return {
      username: account.username,
      name: (profileData.name as string | null | undefined) ?? null,
      avatarUrl: (profileData.avatar_url as string | null | undefined) ?? null,
      bio: (profileData.bio as string | null | undefined) ?? null,
      htmlUrl: (profileData.html_url as string | undefined) ?? `https://github.com/${account.username}`,
      publicRepos: (profileData.public_repos as number | undefined) ?? 0,
      followers: (profileData.followers as number | undefined) ?? 0,
      following: (profileData.following as number | undefined) ?? 0,
      lastSyncedAt: account.last_synced_at ?? null,
      rateLimitRemaining: account.rate_limit_remaining ?? null,
      rateLimitResetAt: account.rate_limit_reset_at ?? null
    };
  }

  private async upsertAccountProfile(userId: string, profile: GitHubUserPayload, client: GitHubClient) {
    const { error } = await this.supabase
      .from("github_accounts")
      .update({
        github_user_id: profile.id,
        username: profile.login,
        profile_data: profile,
        last_synced_at: new Date().toISOString(),
        rate_limit_remaining: client.rateLimit.remaining,
        rate_limit_reset_at: client.rateLimit.resetAt
      })
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  private async getRepositoryRow(owner: string, repo: string) {
    const repository = await this.findRepositoryRow(owner, repo);

    if (!repository) {
      throw new NotFoundError("Repository has not been synced", "repository_not_found");
    }

    return repository;
  }

  private async findRepositoryRow(owner: string, repo: string) {
    const { data, error } = await this.supabase
      .from("github_repositories")
      .select(
        "id,owner_login,name,full_name,description,html_url,default_branch,primary_language,languages,topics,stars_count,forks_count,open_issues_count,watchers_count,license_key,is_archived,is_fork,relationship_type,parent_repository_full_name,source,pushed_at,github_updated_at,last_synced_at,raw_data"
      )
      .eq("owner_login", owner)
      .eq("name", repo)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as RepositoryRow | null;
  }

  private async updateRateLimit(userId: string, client: GitHubClient) {
    const { error } = await this.supabase
      .from("github_accounts")
      .update({
        rate_limit_remaining: client.rateLimit.remaining,
        rate_limit_reset_at: client.rateLimit.resetAt
      })
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  private async updateRateLimitByClient(client: GitHubClient, username: string) {
    const { error } = await this.supabase
      .from("github_accounts")
      .update({
        rate_limit_remaining: client.rateLimit.remaining,
        rate_limit_reset_at: client.rateLimit.resetAt
      })
      .eq("username", username);

    if (error) {
      throw error;
    }
  }
}

export const githubService = new GitHubService();
