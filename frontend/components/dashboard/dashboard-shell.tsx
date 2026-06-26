"use client";

import {
  Bell,
  BookOpen,
  Bot,
  Compass,
  Github,
  Inbox,
  LayoutDashboard,
  PanelLeft,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

const navItems = [
  { href: "/app", label: "User Overview", icon: LayoutDashboard },
  { href: "/app/repositories", label: "GitHub Data", icon: Github },
  { href: "/app/contributions", label: "AI Planner", icon: Bot },
  { href: "/app/roadmap", label: "Learning Roadmap", icon: BookOpen },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/settings", label: "Settings", icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/80 px-3 py-4 backdrop-blur lg:block">
        <Link href="/app" className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          OpenSource Compass
        </Link>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <PanelLeft className="h-4 w-4 text-muted-foreground lg:hidden" aria-hidden="true" />
              <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground sm:flex">
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Command center
              </div>
            </div>
            <LogoutButton />
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-2 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs ${
                  isActive(pathname, item.href) ? "bg-accent text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
