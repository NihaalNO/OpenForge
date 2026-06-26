"use client";

import type { ApiErrorResponse } from "@opensource-compass/shared";
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

export async function apiRequest<TResponse>(path: string, init: RequestInit = {}) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  if (data.session?.provider_token) {
    headers.set("x-github-provider-token", data.session.provider_token);
  }

  const response = await fetch(`${frontendEnv.apiUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;

    throw new ApiClientError(
      response.status,
      payload?.error.code ?? "request_failed",
      payload?.error.message ?? "Request failed"
    );
  }

  return (await response.json()) as TResponse;
}
