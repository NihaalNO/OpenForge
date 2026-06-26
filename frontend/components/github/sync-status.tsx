import type { GitHubProfileResponse } from "@opensource-compass/shared";

interface SyncStatusProps {
  profile: GitHubProfileResponse["profile"] | null;
}

export function SyncStatus({ profile }: SyncStatusProps) {
  return (
    <div className="rounded-lg border bg-card p-5 text-card-foreground">
      <h2 className="text-lg font-medium">Sync status</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Last sync</dt>
          <dd className="font-medium">{profile?.lastSyncedAt ?? "Not synced yet"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rate limit</dt>
          <dd className="font-medium">{profile?.rateLimitRemaining ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Rate reset</dt>
          <dd className="font-medium">{profile?.rateLimitResetAt ?? "Unknown"}</dd>
        </div>
      </dl>
    </div>
  );
}

