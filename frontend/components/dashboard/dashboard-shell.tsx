"use client";

import type { GitHubRepositorySummary, RepositoryKnowledgePackage } from "@openforge/shared";
import {
  Bell,
  Bot,
  Check,
  Circle,
  CircleDot,
  Compass,
  FolderGit2,
  Github,
  LayoutDashboard,
  LockKeyhole,
  Map,
  MessageSquareText,
  PanelLeft,
  Route,
  Search,
  Settings,
  ShieldCheck,
  TimerReset
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  fetchGitHubRepository,
  fetchRepositoryContext
} from "@/lib/api/github";
import { cn } from "@/lib/utils";

type WorkspaceStepState = "completed" | "current" | "locked" | "available";

const homeItems = [
  { href: "/app", label: "User Overview", icon: LayoutDashboard }
];

const githubItems = [
  { href: "/app/repositories", label: "Repositories", icon: Github },
  { href: "/app/notifications", label: "Notifications", icon: Bell }
];

const accountItems = [
  { href: "/app/settings", label: "Settings", icon: Settings }
];

const workspaceItems: Array<{
  tab: "map" | "mission" | "mentor" | "review" | "timeline";
  label: string;
  icon: typeof Map;
}> = [
  { tab: "map", label: "Explorer", icon: Map },
  { tab: "mission", label: "Mission", icon: Route },
  { tab: "mentor", label: "Mentor", icon: MessageSquareText },
  { tab: "review", label: "Review", icon: ShieldCheck },
  { tab: "timeline", label: "Timeline", icon: TimerReset }
];

function isActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

function isRepositoryNavActive(pathname: string) {
  return pathname.startsWith("/app/repositories") && !pathname.includes("/workspace");
}

function isMobileActive(pathname: string, href: string) {
  if (href === "/app/contributions") {
    return pathname.startsWith("/app/contributions") || pathname.includes("/workspace");
  }

  if (href === "/app/repositories") {
    return isRepositoryNavActive(pathname);
  }

  return isActive(pathname, href);
}

function getActiveRepositoryFromPath(pathname: string) {
  const match = pathname.match(/^\/app\/repositories\/([^/]+)\/([^/]+)/);
  if (!match?.[1] || !match[2]) return null;

  return {
    owner: decodeURIComponent(match[1]),
    repo: decodeURIComponent(match[2])
  };
}

function getWorkspaceHref(activeRepository: ReturnType<typeof getActiveRepositoryFromPath>, tab: string) {
  if (!activeRepository) return "/app/contributions";

  return `/app/repositories/${encodeURIComponent(activeRepository.owner)}/${encodeURIComponent(activeRepository.repo)}/workspace?tab=${tab}`;
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Not synced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.345, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" }
  ];

  let duration = seconds;

  for (const division of divisions) {
    if (absoluteSeconds < division.amount) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
        Math.round(duration),
        division.unit
      );
    }

    duration /= division.amount;
  }

  return "Not synced";
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeRepositoryData, setActiveRepositoryData] = useState<GitHubRepositorySummary | null>(null);
  const [intelligence, setIntelligence] = useState<RepositoryKnowledgePackage | null>(null);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const activeRepository = useMemo(() => getActiveRepositoryFromPath(pathname), [pathname]);
  const activeWorkspaceTab = searchParams.get("tab") ?? "overview";

  useEffect(() => {
    let active = true;

    if (!activeRepository) {
      setActiveRepositoryData(null);
      setIntelligence(null);
      setRepositoryLoading(false);
      return;
    }

    setRepositoryLoading(true);
    setActiveRepositoryData(null);
    setIntelligence(null);

    fetchGitHubRepository(activeRepository.owner, activeRepository.repo)
      .then(async (response) => {
        if (!active) return;

        setActiveRepositoryData(response.repository);

        try {
          const contextResponse = await fetchRepositoryContext(response.repository.id);
          if (active) {
            setIntelligence(contextResponse.knowledgePackage);
          }
        } catch {
          if (active) {
            setIntelligence(null);
          }
        }
      })
      .catch(() => {
        if (active) {
          setActiveRepositoryData(null);
          setIntelligence(null);
        }
      })
      .finally(() => {
        if (active) {
          setRepositoryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeRepository]);

  const workspaceStepStates = getWorkspaceStepStates({
    activeRepository: Boolean(activeRepository),
    activeWorkspaceTab,
    hasIntelligence: Boolean(intelligence)
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="px-4 py-5">
          <Link
            href="/app"
            className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-semibold outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-violet text-white">
              <Compass className="h-4 w-4" aria-hidden="true" />
            </span>
            OpenForge
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <SidebarSection title="Home">
            {homeItems.map((item) => (
              <SidebarLink key={item.href} href={item.href} icon={item.icon} active={isActive(pathname, item.href)}>
                {item.label}
              </SidebarLink>
            ))}
          </SidebarSection>

          <SidebarSection title="Workspace">
            {workspaceItems.map((item) => (
              <SidebarLink
                key={item.tab}
                href={getWorkspaceHref(activeRepository, item.tab)}
                icon={item.icon}
                active={pathname.includes("/workspace") && activeWorkspaceTab === item.tab}
                stepState={workspaceStepStates[item.tab]}
              >
                {item.label}
              </SidebarLink>
            ))}
          </SidebarSection>

          <SidebarSection title="GitHub">
            {githubItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                active={item.href === "/app/repositories" ? isRepositoryNavActive(pathname) : isActive(pathname, item.href)}
              >
                {item.label}
              </SidebarLink>
            ))}
          </SidebarSection>

          <SidebarSection title="Account">
            {accountItems.map((item) => (
              <SidebarLink key={item.href} href={item.href} icon={item.icon} active={isActive(pathname, item.href)}>
                {item.label}
              </SidebarLink>
            ))}
          </SidebarSection>
        </nav>

        <RepositoryPanel
          repository={activeRepositoryData}
          intelligence={intelligence}
          isLoading={repositoryLoading}
        />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-card">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <PanelLeft className="h-4 w-4 text-muted-foreground lg:hidden" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">OpenForge</p>
                <p className="hidden text-xs text-muted-foreground sm:block">AI-powered contribution workspace</p>
              </div>
            </div>
            <LogoutButton />
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-3 lg:hidden">
            {[...homeItems, { href: "/app/contributions", label: "Workspace", icon: Route }, ...githubItems, ...accountItems].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "min-h-10 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium transition-colors",
                  isMobileActive(pathname, item.href) ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-page px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/70 py-5 first:border-t-0 first:pt-1">
      <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  stepState,
  children
}: {
  href: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  stepState?: WorkspaceStepState;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring/25",
        active
          ? "bg-soft-blue-wash text-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-brand-violet")} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {stepState ? <StepIndicator state={stepState} /> : null}
    </Link>
  );
}

function StepIndicator({ state }: { state: WorkspaceStepState }) {
  if (state === "completed") {
    return <Check className="h-3.5 w-3.5 shrink-0 text-brand-violet" aria-label="Completed" />;
  }

  if (state === "current") {
    return <CircleDot className="h-3.5 w-3.5 shrink-0 text-brand-violet" aria-label="Current step" />;
  }

  if (state === "locked") {
    return <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-label="Locked" />;
  }

  return <Circle className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-label="Available" />;
}

function getWorkspaceStepStates({
  activeRepository,
  activeWorkspaceTab,
  hasIntelligence
}: {
  activeRepository: boolean;
  activeWorkspaceTab: string;
  hasIntelligence: boolean;
}): Record<(typeof workspaceItems)[number]["tab"], WorkspaceStepState> {
  const order = workspaceItems.map((item) => item.tab);
  const currentIndex = order.indexOf(activeWorkspaceTab as (typeof workspaceItems)[number]["tab"]);

  return workspaceItems.reduce(
    (states, item, index) => {
      if (!activeRepository) {
        states[item.tab] = item.tab === "map" ? "available" : "locked";
      } else if (item.tab === activeWorkspaceTab) {
        states[item.tab] = "current";
      } else if (index < currentIndex) {
        states[item.tab] = "completed";
      } else if (!hasIntelligence && item.tab !== "map" && item.tab !== "mentor") {
        states[item.tab] = "locked";
      } else {
        states[item.tab] = "available";
      }

      return states;
    },
    {} as Record<(typeof workspaceItems)[number]["tab"], WorkspaceStepState>
  );
}

function RepositoryPanel({
  repository,
  intelligence,
  isLoading
}: {
  repository: GitHubRepositorySummary | null;
  intelligence: RepositoryKnowledgePackage | null;
  isLoading: boolean;
}) {
  const status = repository?.isArchived ? "Archived" : repository ? "Repository Ready" : "No Repository Selected";
  const intelligenceStatus = intelligence ? "Intelligence Ready" : repository ? "Intelligence Pending" : "Select a repository";

  return (
    <div className="border-t border-border p-4">
      <div className="rounded-xl border border-border bg-background/70 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <FolderGit2 className="h-3.5 w-3.5" aria-hidden="true" />
          Repository
        </div>

        {isLoading ? (
          <div className="mt-4 space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ) : repository ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="truncate text-sm font-semibold text-foreground">{repository.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{repository.primaryLanguage ?? "Language unknown"}</p>
            </div>

            <dl className="space-y-3 text-xs">
              <RepositoryPanelRow label="Status" value={status} />
              <RepositoryPanelRow label="Last Sync" value={formatRelativeTime(repository.lastSyncedAt)} />
              <RepositoryPanelRow
                label="Intelligence"
                value={intelligenceStatus}
                icon={<Bot className="h-3.5 w-3.5 text-brand-violet" aria-hidden="true" />}
              />
            </dl>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground">No active repository</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Open a repository workspace to see sync and intelligence status.
            </p>
            <Link
              href="/app/repositories"
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Browse repositories
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function RepositoryPanelRow({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex max-w-[8.5rem] items-center gap-1.5 text-right font-medium text-foreground">
        {icon}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}
