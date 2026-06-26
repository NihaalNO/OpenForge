import { AuthGuard } from "@/components/auth/auth-guard";
import { CompleteOnboardingButton } from "@/components/auth/complete-onboarding-button";
import { LogoutButton } from "@/components/auth/logout-button";

export default function OnboardingPage() {
  return (
    <AuthGuard requireOnboardingComplete={false}>
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <section className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Onboarding
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Your profile is connected</h1>
            </div>
            <LogoutButton />
          </div>

          <div className="rounded-lg border bg-card p-5 text-card-foreground">
            <h2 className="text-lg font-medium">Next step</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your GitHub account is connected. Continue to the dashboard to sync your GitHub
              profile and repositories.
            </p>
            <CompleteOnboardingButton />
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
