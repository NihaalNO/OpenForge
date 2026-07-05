"use client";

import type {
  GitHubIssuesResponse,
  GitHubProfileResponse,
  GitHubRepositoriesResponse,
  GitHubRepositoryResponse,
  GitHubSyncResponse,
  RepositoryContextResponse
} from "@openforge/shared";
import { apiRequest } from "./client";

let profileCache: GitHubProfileResponse | null = null;
let repositoriesCache: GitHubRepositoriesResponse | null = null;

export type GitHubSyncStatus = "not_synced" | "syncing" | "synced" | "failed";

export function clearGitHubSummaryCache() {
  profileCache = null;
  repositoriesCache = null;
}

export function getGitHubSyncStatus(profile: GitHubProfileResponse["profile"] | null): GitHubSyncStatus {
  return profile?.lastSyncedAt ? "synced" : "not_synced";
}

export async function fetchGitHubProfile(options: { force?: boolean } = {}) {
  if (!options.force && profileCache) {
    return profileCache;
  }

  profileCache = await apiRequest<GitHubProfileResponse>("/github/profile");

  return profileCache;
}

export async function syncGitHubData() {
  clearGitHubSummaryCache();
  const response = await apiRequest<GitHubSyncResponse>("/github/sync", {
    method: "POST"
  });

  clearGitHubSummaryCache();

  return response;
}

export async function fetchGitHubRepositories(options: { force?: boolean } = {}) {
  if (!options.force && repositoriesCache) {
    return repositoriesCache;
  }

  repositoriesCache = await apiRequest<GitHubRepositoriesResponse>("/github/repositories");

  return repositoriesCache;
}

export function fetchGitHubRepository(owner: string, repo: string) {
  return apiRequest<GitHubRepositoryResponse>(
    `/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );
}

export function fetchGitHubIssues(owner: string, repo: string) {
  return apiRequest<GitHubIssuesResponse>(
    `/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`
  );
}

export function fetchRepositoryContext(repositoryId: string) {
  return apiRequest<RepositoryContextResponse>(
    `/repositories/${encodeURIComponent(repositoryId)}/context`
  );
}


