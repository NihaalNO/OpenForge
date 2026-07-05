import {
  Bell,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  Github,
  Menu,
  RefreshCw,
  Route,
  Settings,
  Sparkles,
  Star,
  Workflow,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon, Badge, Card, LinkButton, PlannerProductMockup, ProductMockup } from "@/components/common/ui";

const navLinks = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Workspace", "#workspace"],
  ["GitHub Data", "#github-data"]
];

const problems = [
  ["Repository discovery is noisy", "GitHub has endless promising projects, but it is hard to tell which ones fit your current skills."],
  ["Large codebases are intimidating", "The first hour often disappears into folders, setup steps, and unclear ownership."],
  ["Good first issues are hard to judge", "Labels rarely explain the real difficulty, files involved, or testing path."],
  ["Contribution steps are unclear", "Developers need a practical sequence from clone to pull request, not another vague suggestion."]
];

const solutions: Array<[string, string, LucideIcon]> = [
  ["Sync GitHub data", "Bring repositories, languages, topics, and contribution context into one calm workspace.", Github],
  ["Understand repositories", "Summarize structure, signals, and entry points before you spend hours exploring.", Code2],
  ["Open the workspace", "Map workspace knowledge into a mission timeline, mentor prompts, and quality gates.", Sparkles],
  ["Build a learning roadmap", "Turn skill gaps into weekly practice steps tied to real open-source work.", BookOpen]
];

const features: Array<[string, string, LucideIcon]> = [
  ["GitHub Data Workspace", "A focused view of owned, forked, contributed, and organization repositories.", Github],
  ["Workspace Knowledge", "Deterministic context from docs, tests, CI, manifests, and important paths.", Code2],
  ["Contribution Workspace", "Repository-specific missions that turn uncertainty into next actions.", Route],
  ["Learning Roadmap", "Week-by-week skill building shaped by your GitHub profile and target projects.", BookOpen],
  ["Smart Notifications", "Useful updates for syncs, updates, and generated plans without dashboard noise.", Bell],
  ["User Settings & AI Preferences", "Control display, GitHub sync status, provider choices, and output detail.", Settings]
];

const steps = [
  ["01", "Connect GitHub", "Authorize GitHub OAuth and sync your contribution context."],
  ["02", "Select a repository", "Pick a synced repository from the GitHub Data workspace."],
  ["03", "Open Workspace", "Review readiness, repository map, mission, mentor prompts, and quality gate."],
  ["04", "Start contributing", "Work through setup, files, implementation, tests, and PR prep."]
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-violet text-white">
        <Compass className="h-4 w-4" aria-hidden="true" />
      </span>
      OpenForge
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <nav className="mx-auto flex h-20 max-w-page items-center justify-between px-4 lg:px-6">
          <Logo />
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Log in
            </Link>
            <LinkButton href="/login" variant="primary">
              Start with GitHub
              <ArrowIcon />
            </LinkButton>
          </div>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground md:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </header>

      <section className="mx-auto max-w-page px-4 pb-20 pt-16 text-center lg:px-6 lg:pb-24 lg:pt-20">
        <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="h-4 w-4 fill-[#fbbf24] text-[#fbbf24]" aria-hidden="true" />
          ))}
          <span className="ml-2">Built for meaningful first pull requests</span>
        </div>
        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-bold leading-none text-foreground md:text-[60px]">
          Build better open-source contributions with AI.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
          OpenForge is an AI-powered workspace for understanding repositories and contributing to open source.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <LinkButton href="/login" variant="primary">
            Start with GitHub
            <ArrowIcon />
          </LinkButton>
          <a href="#features" className="openforge-button">
            Explore features
          </a>
        </div>
        <ProductMockup />
      </section>

      <section className="px-4 pb-20 lg:px-6">
        <p className="mx-auto max-w-page text-center text-lg text-muted-foreground">
          Built for developers who want their <span className="font-semibold text-brand-violet">first meaningful pull request</span>.
        </p>
      </section>

      <Section eyebrow="The problem" title="Open-source contribution is still too hard to start.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {problems.map(([title, description]) => (
            <Card key={title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                <Workflow className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="The solution" title="A calm workflow from GitHub sync to contribution plan.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {solutions.map(([title, description, Icon]) => (
            <Card key={title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="features" eyebrow="Features" title="Every screen supports the next practical step.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, description, Icon]) => (
            <Card key={title} className="min-h-56">
              <div className="flex items-center justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-blue-wash text-brand-violet">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <Badge>Workspace</Badge>
              </div>
              <h3 className="mt-8 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="github-data" eyebrow="GitHub Data" title="A repository workspace without noisy recommendation gimmicks.">
        <Card className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge>Synced GitHub context</Badge>
            <h3 className="mt-5 text-3xl font-semibold leading-tight">See your real repository surface area.</h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Owned projects, forks, contributed repositories, languages, metadata, and clear actions are organized in one flat workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Owner", "Fork", "Contributor", "Organization"].map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {["openforge/frontend", "supabase/examples", "vercel/turbo"].map((repo) => (
              <div key={repo} className="rounded-[24px] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{repo}</p>
                  <RefreshCw className="h-4 w-4 text-brand-violet" aria-hidden="true" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Open a workspace or generate workspace knowledge.</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section id="workspace" eyebrow="Contribution Workspace" title="A guided repository environment, not another static checklist.">
        <div className="grid gap-4 lg:grid-cols-5">
          {["Overview", "Repository map", "Mission", "Mentor prompts", "Quality gate"].map((item) => (
            <Card key={item} className="p-5">
              <CheckCircle2 className="h-5 w-5 text-brand-violet" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{item}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Clear, scoped guidance grounded in workspace knowledge.</p>
            </Card>
          ))}
        </div>
        <PlannerProductMockup />
      </Section>

      <Section id="how-it-works" eyebrow="How it works" title="From connected GitHub account to an actionable contribution.">
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <Card key={number}>
              <p className="text-sm font-semibold text-brand-violet">{number}</p>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            </Card>
          ))}
        </div>
      </Section>

      <section className="px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-page rounded-[24px] bg-card p-8 text-center md:p-14">
          <h2 className="text-4xl font-semibold leading-tight md:text-[44px]">Ready to make your next contribution?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Connect GitHub, choose a repository, and let OpenForge turn your next pull request into a plan.
          </p>
          <div className="mt-8 flex justify-center">
            <LinkButton href="/login" variant="primary">
              Start with GitHub
              <ArrowIcon />
            </LinkButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between lg:px-6">
          <div>
            <Logo />
            <p className="mt-4 max-w-md leading-6">AI-powered workspace for understanding repositories and contributing to open source.</p>
          </div>
          <div className="flex flex-wrap gap-5">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </div>
          <p>Copyright 2026 OpenForge.</p>
        </div>
      </footer>
    </main>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="px-4 py-20 lg:px-6">
      <div className="mx-auto max-w-page">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight text-foreground md:text-[36px]">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

