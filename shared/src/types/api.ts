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
  relationshipType: "owner" | "fork" | "collaborator" | "contributor" | "organization_member";
  parentRepositoryFullName: string | null;
  source: string;
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
  repositoryContextsPrepared: number;
  contributionStatsSynced: boolean;
  syncedAt: string;
}

export interface GitHubIssueSyncResponse {
  status: "completed";
  issuesSynced: number;
  syncedAt: string;
}

export type RepositoryImportance = "high" | "medium" | "low";

export interface RepositoryKnowledgePackage {
  repositoryId: string;
  fullName: string;
  provider: "github";
  defaultBranch: string;
  generatedAt: string;
  sourceLimits: {
    maxTreeEntries: number;
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
    truncated: boolean;
  };
  readme: {
    path: string | null;
    content: string | null;
    summaryHint?: string | null;
    sizeBytes: number;
    truncated: boolean;
  };
  tree: {
    totalEntries: number;
    processedEntries: number;
    truncated: boolean;
    directories: Array<{
      path: string;
      depth: number;
      category: string;
      importance: RepositoryImportance;
    }>;
    importantFiles: Array<{
      path: string;
      type: string;
      sizeBytes?: number;
      category: string;
      importance: RepositoryImportance;
      reason: string;
    }>;
  };
  detectedStack: {
    languages: string[];
    frameworks: string[];
    packageManagers: string[];
    databases: string[];
    testing: string[];
    ci: string[];
    deployment: string[];
  };
  manifests: Array<{
    path: string;
    kind: string;
    contentPreview: string;
    parsed?: Record<string, unknown>;
  }>;
  docs: {
    hasContributingGuide: boolean;
    hasCodeOfConduct: boolean;
    hasLicense: boolean;
    docFiles: string[];
  };
  entryPoints: Array<{
    path: string;
    reason: string;
  }>;
  testStructure: {
    hasTests: boolean;
    testDirectories: string[];
    testFiles: string[];
    detectedFrameworks: string[];
  };
  workflowFiles: Array<{
    path: string;
    name: string;
    contentPreview: string;
  }>;
  contributionReadiness: {
    score: number;
    level: "low" | "medium" | "high";
    reasons: string[];
    blockers: string[];
  };
  complexity: {
    score: number;
    level: "beginner" | "intermediate" | "advanced";
    reasons: string[];
  };
  raw: {
    selectedFilePaths: string[];
  };
}

export interface RepositoryContextResponse {
  knowledgePackage: RepositoryKnowledgePackage;
  cached: boolean;
  repositoryContextId: string;
}

export interface SkillProfileSummary {
  id: string;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  skillScore: number;
  confidenceScore: number;
  languages: Record<string, number>;
  frameworks: Record<string, number>;
  tools: Record<string, number>;
  topics: Record<string, number>;
  analyzedAt: string | null;
}

export interface SkillProfileResponse {
  skillProfile: SkillProfileSummary | null;
}

export interface AnalyzeSkillsResponse {
  skillProfile: SkillProfileSummary;
  repositoryRecommendationsGenerated: number;
  issueRecommendationsGenerated: number;
}

export interface RecommendedRepository {
  id: string;
  score: number;
  skillMatchScore: number;
  difficultyScore: number;
  activityScore: number;
  reason: string | null;
  status: string;
  isSaved: boolean;
  repository: GitHubRepositorySummary & {
    healthScore: number | null;
    difficultyLevel: string | null;
  };
}

export interface RecommendedRepositoriesResponse {
  recommendations: RecommendedRepository[];
}

export interface RecommendedIssue {
  id: string;
  score: number;
  skillMatchScore: number;
  difficultyScore: number;
  freshnessScore: number;
  reason: string | null;
  status: string;
  isSaved: boolean;
  issue: GitHubIssueSummary & {
    difficultyLevel: string | null;
    estimatedEffortHours: number | null;
    repository: {
      id: string;
      fullName: string;
      ownerLogin: string;
      name: string;
      primaryLanguage: string | null;
    };
  };
}

export interface RecommendedIssuesResponse {
  recommendations: RecommendedIssue[];
}

export interface SavedRepositoryResponse {
  saved: boolean;
  repositoryId: string;
}

export interface SavedIssueResponse {
  saved: boolean;
  issueId: string;
}

export interface AiIssueExplanation {
  summary: string;
  requiredKnowledge: string[];
  likelyFiles: string[];
  suggestedApproach: string[];
  difficultyEstimate: "beginner" | "intermediate" | "advanced";
  learningOutcome: string;
}

export interface AiLearningRoadmap {
  currentSkills: string[];
  missingSkills: string[];
  weeklyRoadmap: Array<{
    week: number;
    focus: string;
    tasks: string[];
  }>;
  suggestedRepositories: string[];
  suggestedIssues: string[];
}

export interface AiContributionPlan {
  taskPlan: string[];
  setupChecklist: string[];
  implementationChecklist: string[];
  testingChecklist: string[];
  pullRequestChecklist: string[];
}

export interface AiAnalysisResponse<TPayload> {
  analysis: TPayload;
  cached: boolean;
  logId: string;
}

export interface AiLogSummary {
  id: string;
  analysisType: string;
  provider: string;
  model: string;
  status: string;
  createdAt: string;
}

export interface AiLogsResponse {
  logs: AiLogSummary[];
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface DashboardResponse {
  user: CurrentUserResponse["user"];
  github: GitHubProfileResponse["profile"] | null;
  metrics: {
    totalRepositories: number;
    ownedRepositories: number;
    forkedRepositories: number;
    contributedRepositories: number;
    contributionPlansGenerated: number;
    learningRoadmapStatus: "not_generated" | "active" | "completed" | "archived";
    unreadNotifications: number;
  };
  recentActivity: DashboardActivityItem[];
}

export interface DashboardAnalyticsResponse {
  totals: {
    pullRequestsOpened: number;
    pullRequestsMerged: number;
    issuesSolved: number;
    repositoriesContributed: number;
    contributionStreakDays: number;
  };
  languages: Array<{ name: string; value: number }>;
  repositories: Array<{ name: string; value: number }>;
  weeklyActivity: Array<{ label: string; prs: number; issues: number }>;
  monthlyActivity: Array<{ label: string; prs: number; issues: number }>;
  contributionHistory: Array<{ date: string; count: number }>;
}

export interface SavedRepositoryItem {
  id: string;
  savedAt: string;
  repository: GitHubRepositorySummary;
}

export interface SavedRepositoriesResponse {
  repositories: SavedRepositoryItem[];
}

export interface SavedIssueItem {
  id: string;
  savedAt: string;
  status: string;
  issue: GitHubIssueSummary & {
    cachedAiExplanation: AiIssueExplanation | null;
    repository: {
      id: string;
      fullName: string;
      ownerLogin: string;
      name: string;
      primaryLanguage: string | null;
    };
  };
}

export interface SavedIssuesResponse {
  issues: SavedIssueItem[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
}

export interface NotificationMutationResponse {
  success: boolean;
}

export interface AppSettings {
  displayName: string | null;
  theme: "system" | "light" | "dark";
  timezone: string;
  github: {
    username: string | null;
    connected: boolean;
    lastSyncedAt: string | null;
  };
  ai: {
    defaultProvider: "openai" | "gemini" | "groq" | "ollama";
    preferredModel: string | null;
    outputLength: "short" | "balanced" | "detailed";
    cachePreference: "reuse" | "regenerate";
  };
}

export interface SettingsResponse {
  settings: AppSettings;
}


