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

export type WorkspaceModuleType = "explorer" | "mission" | "mentor" | "review" | "timeline";
export type RepositoryEvidenceType = "repository_metadata" | "readme" | "documentation" | "directory" | "file" | "manifest" | "workflow" | "test" | "issue" | "pull_request" | "commit" | "mission" | "timeline_event" | "learning_history";
export interface RepositoryEvidenceItem { id: string; type: RepositoryEvidenceType; path?: string; identifier?: string; title: string; content: string; relevanceScore: number; estimatedTokens: number; sourceSha?: string; truncated: boolean; }
export interface RepositoryEvidencePackage { repositoryId: string; repositoryFullName: string; contextSnapshotId: string; headSha: string; moduleType: WorkspaceModuleType; tokenBudget: number; estimatedTokensUsed: number; evidence: RepositoryEvidenceItem[]; omittedEvidenceCount: number; truncated: boolean; generatedAt: string; }
export type WorkspaceGenerationStatus = "queued" | "processing" | "ready" | "failed" | "stale" | "insufficient_evidence";
export type WorkspaceJobStage = "queued" | "fetching_structure" | "reading_documentation" | "understanding_dependencies" | "mapping_architecture" | "selecting_evidence" | "compressing_context" | "preparing_groq_request" | "preparing_explorer" | "preparing_mission" | "preparing_mentor" | "preparing_review" | "validating_content" | "workspace_ready" | "failed";

export interface WorkspaceStatusResponse {
  ready: boolean;
  stale: boolean;
  job: null | { id: string; status: "queued" | "processing" | "ready" | "failed" | "stale"; stage: WorkspaceJobStage; progressPercent: number; errorCode: string | null; errorMessage: string | null; lastHeartbeatAt: string | null };
  snapshot: null | { id: string; headSha: string; contextVersion: string; generatedAt: string | null; staleAt: string | null };
}

export interface WorkspacePrepareResponse extends WorkspaceStatusResponse { accepted: boolean; }

export interface WorkspaceModuleResponse {
  moduleType: WorkspaceModuleType;
  repositoryId: string;
  repositoryFullName: string;
  contextSnapshotId: string;
  headSha: string;
  payload: Record<string, unknown>;
  status: WorkspaceGenerationStatus;
  stale: boolean;
  fallbackUsed: boolean;
  provider: string;
  model: string | null;
  generatedAt: string | null;
  grounded: boolean;
  evidenceCoverage: number;
  cacheHit: boolean;
  provenance: WorkspaceModuleProvenance;
}

export interface WorkspaceModuleProvenance {
  generationSource: "groq";
  provider: "groq";
  model: string;
  repositoryId: string;
  repositoryFullName: string;
  contextSnapshotId: string;
  headSha: string;
  promptVersion: string;
  contentVersion: string;
  generatedAt: string;
  grounded: boolean;
  evidenceCoverage: number;
  evidenceItemsUsed?: number;
  estimatedInputTokens?: number;
  configuredTokenBudget?: number;
  evidenceTruncated?: boolean;
  generationDurationMs?: number;
}

export interface GeneratedWorkspaceEvidence {
  type: RepositoryEvidenceType | "database_event";
  path?: string;
  identifier?: string;
  explanation: string;
}

export interface GeneratedWorkspaceCard { id: string; title: string; summary: string; details: string[]; evidence: GeneratedWorkspaceEvidence[]; }

export interface MentorQueryResponse {
  answer: string;
  depth: "beginner" | "standard" | "maintainer";
  evidence: string[];
  suggestedQuestions: string[];
  insufficientEvidence: boolean;
  fallbackUsed: boolean;
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
    workspaceInsightsGenerated: number;
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


