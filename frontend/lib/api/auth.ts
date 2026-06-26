"use client";

import type {
  CompleteOnboardingResponse,
  CurrentUserResponse,
  LogoutResponse,
  SessionResponse
} from "@opensource-compass/shared";
import { apiRequest } from "./client";

export function fetchCurrentUser() {
  return apiRequest<CurrentUserResponse>("/auth/me");
}

export function fetchCurrentSession() {
  return apiRequest<SessionResponse>("/auth/session");
}

export function notifyBackendLogout() {
  return apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST"
  });
}

export function completeOnboarding() {
  return apiRequest<CompleteOnboardingResponse>("/auth/onboarding", {
    method: "PATCH"
  });
}
