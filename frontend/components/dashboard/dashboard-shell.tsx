"use client";

import {
  Bell,
  BookOpen,
  Compass,
  Github,
  LayoutDashboard,
  PanelLeft,
  Route,
  Settings
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "User Overview", icon: LayoutDashboard },
  { href: "/app/repositories", label: "GitHub Data", icon: Github },
  { href: "/app/contributions", label: "Workspace", icon: Route },
  { href: "/app/roadmap", label: "Learning Roadmap", icon: BookOpen },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/settings", label: "Settings", icon: Settings }
];

function isActive(pathname: string, href: string) {
  if (href === "/app") {
    return pathname === href;
  }

  if (href === "/app/contributions" && pathname.includes("/workspace")) {
    return true;
  }

  return pathname.startsWith(href);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card px-4 py-5 lg:block">
        <Link href="/app" className="flex items-center gap-2 rounded-full px-2 py-2 text-sm font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-violet text-white">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          OpenForge
        </Link>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-soft-blue-wash text-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-brand-violet")} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium",
                  isActive(pathname, item.href) ? "bg-soft-blue-wash text-foreground" : "text-muted-foreground"
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
