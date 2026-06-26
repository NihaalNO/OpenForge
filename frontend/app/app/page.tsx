import { LogoutButton } from "@/components/auth/logout-button";
import { GitHubDashboard } from "@/components/github/github-dashboard";

export default function AppHomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Protected app
            </p>
            <h1 className="mt-2 text-3xl font-semibold">OpenSource Compass Dashboard</h1>
          </div>
          <LogoutButton />
        </div>

        <GitHubDashboard />
      </section>
    </main>
  );
}
