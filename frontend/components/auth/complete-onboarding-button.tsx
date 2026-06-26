"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeOnboarding } from "@/lib/api/auth";

export function CompleteOnboardingButton() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompleteOnboarding() {
    setIsCompleting(true);
    setError(null);

    try {
      await completeOnboarding();
      router.replace("/app");
      router.refresh();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Unable to complete onboarding"
      );
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={handleCompleteOnboarding}
        disabled={isCompleting}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCompleting ? "Opening dashboard..." : "Continue to dashboard"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
