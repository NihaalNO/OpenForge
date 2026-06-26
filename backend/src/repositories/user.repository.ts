import type { User } from "@supabase/supabase-js";
import type { CurrentUserResponse } from "@opensource-compass/shared";
import { getSupabaseServiceClient } from "../lib/supabase.js";

interface GithubIdentityMetadata {
  provider_id?: string;
  user_name?: string;
  preferred_username?: string;
  avatar_url?: string;
  name?: string;
  full_name?: string;
}

function getDisplayName(user: User) {
  return (
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.user_metadata.user_name ??
    user.email?.split("@")[0] ??
    null
  );
}

function getAvatarUrl(user: User) {
  return (user.user_metadata.avatar_url as string | undefined) ?? null;
}

function getGithubMetadata(user: User): GithubIdentityMetadata {
  const identityData = user.identities?.find((identity) => identity.provider === "github")?.identity_data;

  return {
    ...user.user_metadata,
    ...identityData
  } as GithubIdentityMetadata;
}

function getGithubUserId(metadata: GithubIdentityMetadata) {
  const rawProviderId = metadata.provider_id;

  if (!rawProviderId) {
    return null;
  }

  const parsedProviderId = Number(rawProviderId);

  return Number.isSafeInteger(parsedProviderId) ? parsedProviderId : null;
}

function getGithubUsername(metadata: GithubIdentityMetadata) {
  return metadata.user_name ?? metadata.preferred_username ?? null;
}

export async function upsertAuthenticatedUser(
  user: User,
  githubProviderToken?: string | null
): Promise<CurrentUserResponse["user"]> {
  const supabase = getSupabaseServiceClient();
  const githubMetadata = getGithubMetadata(user);
  const githubUserId = getGithubUserId(githubMetadata);
  const githubUsername = getGithubUsername(githubMetadata);

  const userPayload = {
    id: user.id,
    email: user.email ?? null,
    display_name: getDisplayName(user),
    avatar_url: getAvatarUrl(user)
  };

  const { error: userError } = await supabase.from("users").upsert(userPayload, {
    onConflict: "id"
  });

  if (userError) {
    throw userError;
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      experience_level: "beginner",
      preferred_languages: [],
      preferred_topics: [],
      goals: {},
      settings: {
        notifications: {
          recommendations: true,
          issues: true,
          pullRequests: true
        }
      }
    },
    {
      onConflict: "user_id",
      ignoreDuplicates: true
    }
  );

  if (profileError) {
    throw profileError;
  }

  if (githubUserId && githubUsername) {
    const githubAccountPayload: {
      user_id: string;
      github_user_id: number;
      username: string;
      access_token_encrypted?: string;
      scopes: string[];
      profile_data: Record<string, string | null>;
    } = {
      user_id: user.id,
      github_user_id: githubUserId,
      username: githubUsername,
      scopes: ["read:user", "user:email"],
      profile_data: {
        username: githubUsername,
        avatar_url: githubMetadata.avatar_url ?? null,
        name: githubMetadata.full_name ?? githubMetadata.name ?? null
      }
    };

    if (githubProviderToken) {
      githubAccountPayload.access_token_encrypted = githubProviderToken;
    }

    const { error: githubError } = await supabase.from("github_accounts").upsert(
      githubAccountPayload,
      {
        onConflict: "user_id"
      }
    );

    if (githubError) {
      throw githubError;
    }
  }

  return getCurrentUser(user.id);
}

export async function getCurrentUser(userId: string): Promise<CurrentUserResponse["user"]> {
  const supabase = getSupabaseServiceClient();

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id,email,display_name,avatar_url,onboarding_completed")
    .eq("id", userId)
    .single();

  if (userError) {
    throw userError;
  }

  const { data: githubRow, error: githubError } = await supabase
    .from("github_accounts")
    .select("username,last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (githubError) {
    throw githubError;
  }

  return {
    id: userRow.id,
    email: userRow.email,
    displayName: userRow.display_name,
    avatarUrl: userRow.avatar_url,
    onboardingCompleted: userRow.onboarding_completed,
    github: {
      username: githubRow?.username ?? null,
      connected: Boolean(githubRow?.username),
      lastSyncedAt: githubRow?.last_synced_at ?? null
    }
  };
}

export async function completeUserOnboarding(userId: string): Promise<CurrentUserResponse["user"]> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("users")
    .update({
      onboarding_completed: true
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  return getCurrentUser(userId);
}
