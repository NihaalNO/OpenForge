import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  GitBranch,
  Github,
  Sparkles,
  Star,
  Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("openforge-card p-6", className)} {...props} />;
}

export function Badge({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span className={cn("openforge-badge", className)} {...props} />;
}

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        variant === "primary" && "openforge-button-primary",
        variant === "secondary" && "openforge-button",
        variant === "ghost" && "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

interface LinkButtonProps {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: ReactNode;
}

export function LinkButton({ className, variant = "secondary", href, children }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        variant === "primary" && "openforge-button-primary",
        variant === "secondary" && "openforge-button",
        variant === "ghost" && "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-foreground">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card className="flex min-h-44 flex-col items-center justify-center text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 text-sm text-destructive">
      {message}
    </Card>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-[24px] border border-border bg-card" />
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number | string;
  icon: typeof Github;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold capitalize text-foreground">{value}</p>
    </Card>
  );
}

export function ProductMockup() {
  const repos = ["vercel/next.js", "supabase/supabase", "storybookjs/storybook"];
  const planItems = ["Inspect auth callback", "Patch route guard", "Add regression check"];

  return (
    <div className="relative mx-auto mt-14 w-full max-w-[1120px] px-4">
      <FloatingBubble className="-left-2 top-10 rotate-[-12deg] md:left-3" icon={<Github className="h-6 w-6" />} />
      <FloatingBubble className="right-0 top-20 rotate-[14deg] md:-right-4" icon={<GitBranch className="h-6 w-6" />} />
      <FloatingBubble className="-bottom-2 left-8 rotate-[10deg]" icon={<Code2 className="h-6 w-6" />} />
      <FloatingBubble className="bottom-8 right-8 rotate-[-10deg]" icon={<Sparkles className="h-6 w-6" />} />
      <FloatingBubble className="left-[48%] top-[-18px] rotate-[18deg]" icon={<Star className="h-5 w-5" />} small />

      <div className="mockup-glow overflow-hidden rounded-[24px] border border-border bg-card-white">
        <div className="grid min-h-[520px] bg-card md:grid-cols-[240px_1fr]">
          <aside className="border-b border-border p-5 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-violet text-white">
                <Github className="h-4 w-4" aria-hidden="true" />
              </span>
              Compass
            </div>
            <div className="mt-8 space-y-2">
              {["Overview", "GitHub Data", "Workspace", "Notifications"].map((item, index) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm",
                    index === 1 ? "bg-soft-blue-wash font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-[24px] bg-soft-blue-wash p-4">
              <p className="text-xs font-medium text-muted-foreground">GitHub sync</p>
              <p className="mt-2 text-2xl font-semibold">Live</p>
              <p className="mt-2 text-sm text-muted-foreground">42 repositories mapped</p>
            </div>
          </aside>

          <section className="p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Contribution workspace</p>
                <h3 className="mt-1 text-2xl font-semibold">Choose the clearest next pull request.</h3>
              </div>
              <Badge className="text-brand-violet">AI plan ready</Badge>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
              <Card className="p-4">
                <p className="text-sm font-semibold">Synced repositories</p>
                <div className="mt-4 space-y-3">
                  {repos.map((repo, index) => (
                    <div key={repo} className="rounded-[15px] border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{repo}</p>
                        <Badge>{index === 0 ? "Owner" : index === 1 ? "Contributor" : "Fork"}</Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-brand-violet" style={{ width: `${82 - index * 13}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-violet text-white">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">AI contribution plan</p>
                    <p className="text-xs text-muted-foreground">Repository-level workflow</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {planItems.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[15px] bg-background p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm font-semibold">Mission timeline</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["TypeScript", "Testing", "Next.js"].map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-semibold">Latest notification</p>
                <p className="mt-3 text-sm text-muted-foreground">Your workspace preparation finished and the plan is ready.</p>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function PlannerProductMockup() {
  const sections = [
    ["Setup", "Clone repository", "Install dependencies", "Run local tests"],
    ["Files to inspect", "app/auth/callback.tsx", "components/auth-guard.tsx", "lib/session.ts"],
    ["Implementation", "Patch redirect state", "Add fallback copy", "Keep OAuth intact"],
    ["Testing", "Auth callback", "Protected redirect", "Regression path"]
  ];

  return (
    <div className="relative mx-auto mt-12 w-full max-w-[1120px] px-4">
      <FloatingBubble className="-left-2 top-16 rotate-[-14deg] md:left-5" icon={<Terminal className="h-6 w-6" />} />
      <FloatingBubble className="right-0 top-24 rotate-[13deg] md:-right-5" icon={<FileText className="h-6 w-6" />} />
      <FloatingBubble className="bottom-10 left-10 rotate-[11deg]" icon={<GitBranch className="h-6 w-6" />} />
      <FloatingBubble className="bottom-16 right-10 rotate-[-13deg]" icon={<BookOpen className="h-6 w-6" />} />
      <FloatingBubble className="left-[50%] top-[-20px] rotate-[16deg]" icon={<Sparkles className="h-5 w-5" />} small />

      <div className="mockup-glow overflow-hidden rounded-[24px] border border-border bg-card-white">
        <div className="grid min-h-[500px] bg-card md:grid-cols-[250px_1fr]">
          <aside className="border-b border-border p-5 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-violet text-white">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              Workspace
            </div>
            <div className="mt-8 space-y-3">
              <div className="rounded-[24px] border border-border bg-background p-4">
                <p className="text-xs font-medium text-muted-foreground">Repository</p>
                <p className="mt-2 text-sm font-semibold">openforge/frontend</p>
                <Badge className="mt-3">TypeScript</Badge>
              </div>
              <div className="rounded-[24px] border border-border bg-background p-4">
                <p className="text-xs font-medium text-muted-foreground">Issue context</p>
                <p className="mt-2 text-sm font-semibold">Repository-level plan</p>
              </div>
              <div className="rounded-[24px] bg-soft-blue-wash p-4">
                <p className="text-xs font-medium text-muted-foreground">Plan status</p>
                <p className="mt-2 text-2xl font-semibold">Ready</p>
                <p className="mt-2 text-sm text-muted-foreground">5 checklists generated</p>
              </div>
            </div>
          </aside>

          <section className="p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Generated contribution plan</p>
                <h3 className="mt-1 text-2xl font-semibold">Ship a focused pull request with less guesswork.</h3>
              </div>
              <Badge className="text-brand-violet">Cached result</Badge>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-violet text-white">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Recommended path</p>
                    <p className="text-xs text-muted-foreground">Setup to pull request</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {["Reproduce the auth redirect locally", "Inspect callback and guard files", "Patch session fallback behavior", "Open a scoped PR with regression notes"].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[15px] bg-background p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet" aria-hidden="true" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid gap-4">
                {sections.slice(0, 2).map(([title, ...items]) => (
                  <Card key={title} className="p-4">
                    <p className="text-sm font-semibold">{title}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {items.map((item) => (
                        <Badge key={item}>{item}</Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {sections.slice(2).map(([title, ...items]) => (
                <Card key={title} className="p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <div className="mt-3 space-y-2">
                    {items.map((item) => (
                      <div key={item} className="rounded-full bg-background px-4 py-2 text-sm text-muted-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FloatingBubble({ icon, className, small = false }: { icon: ReactNode; className: string; small?: boolean }) {
  return (
    <div
      className={cn(
        "absolute z-10 hidden items-center justify-center rounded-full border border-border bg-card text-brand-violet md:flex",
        small ? "h-12 w-12" : "h-16 w-16",
        className
      )}
    >
      {icon}
    </div>
  );
}

export function ArrowIcon() {
  return <ArrowRight className="h-4 w-4" aria-hidden="true" />;
}

