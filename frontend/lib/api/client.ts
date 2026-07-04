"use client";

import type { ApiErrorResponse } from "@openforge/shared";
import { frontendEnv } from "../env";
import { getSupabaseBrowserClient } from "../supabase/client";

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (window.location.pathname === "/login") {
    return;
  }

  window.location.assign(`/login?next=${encodeURIComponent(currentPath)}`);
}

async function getSessionTokens(options: { refresh?: boolean } = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = options.refresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession();

  if (!options.refresh && !data.session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();

    return {
      accessToken: refreshed.data.session?.access_token ?? null,
      providerToken: refreshed.data.session?.provider_token ?? null
    };
  }

  return {
    accessToken: data.session?.access_token ?? null,
    providerToken: data.session?.provider_token ?? null
  };
}

async function sendRequest(path: string, init: RequestInit, options: { refresh?: boolean } = {}) {
  const tokens = await getSessionTokens(options);
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");

  if (!tokens.accessToken) {
    await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    redirectToLogin();

    throw new ApiClientError(
      401,
      "unauthorized",
      "Your session expired. Please sign in again to continue."
    );
  }

  headers.set("Authorization", `Bearer ${tokens.accessToken}`);

  if (tokens.providerToken) {
    headers.set("x-github-provider-token", tokens.providerToken);
  }

  return fetch(`${frontendEnv.apiUrl}${path}`, {
    ...init,
    headers
  });
}

export async function apiRequest<TResponse>(path: string, init: RequestInit = {}) {
  let response = await sendRequest(path, init);

  if (response.status === 401) {
    response = await sendRequest(path, init, { refresh: true });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const message = payload?.error.message ?? "Request failed";

    if (response.status === 401) {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
      redirectToLogin();

      throw new ApiClientError(
        response.status,
        payload?.error.code ?? "unauthorized",
        "Your session expired. Please sign in again to continue."
      );
    }

    throw new ApiClientError(
      response.status,
      payload?.error.code ?? "request_failed",
      message
    );
  }

  return (await response.json()) as TResponse;
}
