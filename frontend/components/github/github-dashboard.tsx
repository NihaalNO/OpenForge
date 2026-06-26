"use client";

import type {
  GitHubProfileResponse,
  GitHubRepositorySummary,
  GitHubSyncResponse
} from "@opensource-compass/shared";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchGitHubProfile,
  fetchGitHubRepositories,
  syncGitHubData
} from "@/lib/api/github";
import { SyncStatus } from "./sync-status";

export function GitHubDashboard() {
  const [profile, setProfile] = useState<GitHubProfileResponse["profile"] | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [syncResult, setSyncResult] = useState<GitHubSyncResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setError(null);
    const [profileResponse, repositoriesResponse] = await Promise.all([
      fetchGitHubProfile(),
      fetchGitHubRepositories()
    ]);

    setProfile(profileResponse.profile);
    setRepositories(repositoriesResponse.repositories);
  }

  async function handleSync() {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncGitHubData();
      setSyncResult(result);
      await loadData();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "GitHub sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    loadData()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load GitHub data");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-5 text-card-foreground">
        <p className="text-sm text-muted-foreground">Loading GitHub data...</p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">GitHub integration</h2>
          <p className="text-sm text-muted-foreground">
            Sync your GitHub profile, repositories, languages, and issue metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {isSyncing ? "Syncing..." : "Sync GitHub"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {syncResult ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-card-foreground">
          Synced {syncResult.repositoriesSynced} repositories at {syncResult.syncedAt}.
        </div>
      ) : null}

      <SyncStatus profile={profile} />

      {profile ? (
        <div className="rounded-lg border bg-card p-5 text-card-foreground">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-14 w-14 rounded-full border"
              />
            ) : null}
            <div>
              <h3 className="text-lg font-medium">{profile.name ?? profile.username}</h3>
              <a
                href={profile.htmlUrl}
                className="text-sm text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                @{profile.username}
              </a>
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Public repos</dt>
              <dd className="font-medium">{profile.publicRepos}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Followers</dt>
              <dd className="font-medium">{profile.followers}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Following</dt>
              <dd className="font-medium">{profile.following}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-5 text-card-foreground">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-medium">Synced repositories</h3>
          <Link href="/app/repositories" className="text-sm font-medium hover:underline">
            View all
          </Link>
        </div>

        {repositories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No repositories synced yet. Run GitHub sync to populate your repository list.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {repositories.slice(0, 5).map((repository) => (
              <li key={repository.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    href={`/app/repositories/${repository.ownerLogin}/${repository.name}`}
                    className="font-medium hover:underline"
                  >
                    {repository.fullName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {repository.primaryLanguage ?? "Unknown language"} · {repository.starsCount} stars
                  </p>
                </div>
                <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  {repository.visibility ?? "public"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

