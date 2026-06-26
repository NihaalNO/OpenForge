"use client";

import type {
  GitHubIssuesResponse,
  GitHubIssueSyncResponse,
  GitHubProfileResponse,
  GitHubRepositoriesResponse,
  GitHubRepositoryResponse,
  GitHubSyncResponse
} from "@opensource-compass/shared";
import { apiRequest } from "./client";

export function fetchGitHubProfile() {
  return apiRequest<GitHubProfileResponse>("/github/profile");
}

export function syncGitHubData() {
  return apiRequest<GitHubSyncResponse>("/github/sync", {
    method: "POST"
  });
}

export function fetchGitHubRepositories() {
  return apiRequest<GitHubRepositoriesResponse>("/github/repositories");
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

export function syncGitHubIssues(owner: string, repo: string) {
  return apiRequest<GitHubIssueSyncResponse>(
    `/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/sync`,
    {
      method: "POST"
    }
  );
}

