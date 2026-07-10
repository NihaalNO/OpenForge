import { ExternalServiceError, RateLimitError, UnauthorizedError } from "./http-error.js";

export interface GitHubRateLimitState {
  remaining: number | null;
  resetAt: string | null;
}

export interface GitHubUserPayload {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepositoryPayload {
  id: number;
  owner: {
    login: string;
    type?: "User" | "Organization";
  };
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  visibility?: string;
  private: boolean;
  default_branch: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  license: {
    key: string;
  } | null;
  archived: boolean;
  fork: boolean;
  parent?: {
    full_name?: string | null;
  } | null;
  pushed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GitHubIssuePayload {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  labels: Array<string | { name?: string | null }>;
  user: {
    login: string;
  } | null;
  assignees?: Array<{ login: string }>;
  comments: number;
  created_at: string | null;
  updated_at: string | null;
  pull_request?: unknown;
}

export class GitHubClient {
  private readonly baseUrl = "https://api.github.com";
  private rateLimitState: GitHubRateLimitState = {
    remaining: null,
    resetAt: null
  };

  constructor(private readonly token: string) {}

  get rateLimit() {
    return this.rateLimitState;
  }

  async rest<T>(path: string, init: RequestInit = {}) {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...init.headers
      }
        });
      } catch (error) {
        if (attempt === 2) throw new ExternalServiceError("GitHub API is unreachable", "github_unreachable", { path, cause: error instanceof Error ? error.message : "fetch failed" });
      }
      if (response && response.status < 500) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
    if (!response) throw new ExternalServiceError("GitHub API is unreachable", "github_unreachable", { path });

    this.updateRateLimit(response);

    if (response.status === 401) {
      throw new UnauthorizedError("GitHub token is missing, expired, or revoked");
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");

      if (remaining === "0" || response.status === 429) {
        throw new RateLimitError("GitHub rate limit exceeded", {
          remaining: this.rateLimitState.remaining,
          resetAt: this.rateLimitState.resetAt
        });
      }
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      throw new ExternalServiceError(payload?.message ?? "GitHub API request failed", "github_request_failed", {
        status: response.status,
        path,
        payload
      });
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  }

  async paginate<T>(path: string, init: RequestInit = {}) {
    const results: T[] = [];
    let page = 1;

    while (true) {
      const separator = path.includes("?") ? "&" : "?";
      const pagePath = `${path}${separator}page=${page}`;
      const payload = await this.rest<T[]>(pagePath, init);

      results.push(...payload);

      if (payload.length < 100) {
        break;
      }

      page += 1;
    }

    return results;
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}) {
    return this.rest<T>("/graphql", {
      method: "POST",
      body: JSON.stringify({ query, variables })
    });
  }

  private updateRateLimit(response: Response) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    const reset = response.headers.get("x-ratelimit-reset");

    this.rateLimitState = {
      remaining: remaining ? Number(remaining) : this.rateLimitState.remaining,
      resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : this.rateLimitState.resetAt
    };
  }
}
