export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
    github: {
      username: string | null;
      connected: boolean;
      lastSyncedAt: string | null;
    };
  };
}

export interface SessionResponse {
  valid: boolean;
  expiresAt: string | null;
}

export interface LogoutResponse {
  success: boolean;
}

export interface CompleteOnboardingResponse {
  user: CurrentUserResponse["user"];
}

export interface GitHubProfileResponse {
  profile: {
    username: string;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    htmlUrl: string;
    publicRepos: number;
    followers: number;
    following: number;
    lastSyncedAt: string | null;
    rateLimitRemaining: number | null;
    rateLimitResetAt: string | null;
  };
}

export interface GitHubRepositorySummary {
  id: string;
  ownerLogin: string;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  visibility: string | null;
  defaultBranch: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  topics: string[];
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  watchersCount: number;
  licenseKey: string | null;
  isArchived: boolean;
  isFork: boolean;
  pushedAt: string | null;
  githubUpdatedAt: string | null;
  lastSyncedAt: string | null;
}

export interface GitHubRepositoriesResponse {
  repositories: GitHubRepositorySummary[];
}

export interface GitHubRepositoryResponse {
  repository: GitHubRepositorySummary;
}

export interface GitHubIssueSummary {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  state: "open" | "closed";
  labels: string[];
  authorLogin: string | null;
  assigneeLogins: string[];
  commentsCount: number;
  goodFirstIssue: boolean;
  helpWanted: boolean;
  githubCreatedAt: string | null;
  githubUpdatedAt: string | null;
  lastSyncedAt: string | null;
}

export interface GitHubIssuesResponse {
  issues: GitHubIssueSummary[];
}

export interface GitHubSyncResponse {
  status: "completed";
  profileSynced: boolean;
  repositoriesSynced: number;
  contributionStatsSynced: boolean;
  syncedAt: string;
}

export interface GitHubIssueSyncResponse {
  status: "completed";
  issuesSynced: number;
  syncedAt: string;
}
