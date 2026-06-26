import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  GitBranch,
  Github,
  LineChart,
  ListChecks,
  Search,
  Sparkles,
  Star,
  Target,
  Wand2
} from "lucide-react";
import Link from "next/link";

const problemCards = [
  "Developers do not know which repositories match their current skills.",
  "Good First Issues are hard to evaluate without reading the whole codebase.",
  "Large projects feel intimidating before the first useful pull request.",
  "Beginners rarely get a clear contribution plan after discovering an issue."
];

const solutionCards = [
  { title: "GitHub profile analysis", description: "Convert synced repositories, languages, and topics into a clear skill profile.", icon: Github },
  { title: "Repository matching", description: "Rank open-source projects by skill match, health, activity, and beginner friendliness.", icon: Target },
  { title: "Issue ranking", description: "Surface issues with useful labels, lower ambiguity, and realistic effort estimates.", icon: ListChecks },
  { title: "AI understanding", description: "Summarize repositories and issues in practical contributor language.", icon: Bot },
  { title: "Contribution planning", description: "Generate setup, implementation, testing, and pull request checklists.", icon: GitBranch },
  { title: "Learning roadmap", description: "Turn recommendations into a focused weekly developer growth path.", icon: BookOpen }
];

const features = [
  ["Repository Recommendations", "Skill-aware project ranking with match scores, topics, stars, activity, and repo health."],
  ["Issue Recommendations", "Beginner-friendly issue discovery with labels, difficulty, freshness, and estimated effort."],
  ["AI Repository Summary", "Plain-language architecture and contribution entry points for unfamiliar codebases."],
  ["AI Issue Explanation", "Required knowledge, likely files, suggested approach, and learning outcome."],
  ["Contribution Planner", "A practical path from local setup to a clean pull request."],
  ["Learning Roadmap", "Weekly growth steps based on current skills and open-source targets."],
  ["Contribution Dashboard", "Saved work, sync status, analytics, notifications, and recent AI outputs."]
];

const steps = [
  ["01", "Connect GitHub", "Sync your public profile, repositories, languages, topics, and issues."],
  ["02", "Analyze Skills", "Build a deterministic skill profile before any AI layer is used."],
  ["03", "Get Recommendations", "Review ranked repositories and issues with clear reasons."],
  ["04", "Start Contributing", "Use AI explanations and plans to move from idea to pull request."]
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Compass className="h-4 w-4" aria-hidden="true" />
      </span>
      OpenSource Compass
    </Link>
  );
}

function HeroMockup() {
  return (
    <div className="linear-card relative overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="rounded-md border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">GitHub analysis</p>
            <p className="text-sm font-medium">nihaal/open-source-compass</p>
          </div>
          <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
            synced
          </span>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Skill match</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold">92%</span>
                <span className="pb-1 text-xs text-muted-foreground">TypeScript / React</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div className="h-full w-[92%] rounded-full bg-primary" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Recommended repository</p>
              <p className="mt-2 text-sm font-medium">cal.com/cal.com</p>
              <p className="mt-1 text-xs text-muted-foreground">Healthy repo / active issues / strong topic overlap</p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium">AI contribution plan</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This issue likely touches the onboarding flow and form state. Start by reproducing the bug,
              inspect the route guard, then add a focused regression check before opening a PR.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {["Likely files", "Setup steps", "PR checklist"].map((label) => (
                <div key={label} className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="linear-card overflow-hidden">
      <div className="grid min-h-[360px] md:grid-cols-[220px_1fr]">
        <aside className="border-b border-border bg-card p-4 md:border-b-0 md:border-r">
          <Logo />
          <div className="mt-6 space-y-2">
            {["Overview", "Recommendations", "Issues", "Saved", "Analytics"].map((item, index) => (
              <div
                key={item}
                className={`rounded-md px-3 py-2 text-sm ${index === 0 ? "bg-accent text-foreground" : "text-muted-foreground"}`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Sync", "Complete"],
              ["Match", "92%"],
              ["Saved", "12"],
              ["PRs", "7"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-sm font-medium">Repository recommendations</p>
              <div className="mt-4 space-y-3">
                {["supabase/supabase", "withastro/astro", "shadcn-ui/ui"].map((repo, index) => (
                  <div key={repo} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                    <span className="text-sm">{repo}</span>
                    <span className="text-sm text-primary">{92 - index * 7}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-sm font-medium">AI plan</p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {["Clone and run tests", "Inspect route state", "Patch guarded redirect", "Open focused PR"].map((task) => (
                  <div key={task} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    {task}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {["Product", "Features", "How it works", "AI", "GitHub"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="transition hover:text-foreground">
                {item}
              </a>
            ))}
          </div>
          <Link href="/login" className="linear-button-primary">
            Get Started
          </Link>
        </nav>
      </header>

      <section id="product" className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-28">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              AI-powered contribution intelligence
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              Find your next open-source contribution with AI.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              OpenSource Compass analyzes your GitHub profile, understands your skills,
              recommends beginner-friendly repositories and issues, and guides you from
              discovery to pull request.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="linear-button-primary px-4 py-2.5">
                Start with GitHub
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#features" className="linear-button px-4 py-2.5">
                Explore Features
              </a>
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground">The problem</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Open source discovery is still noisy.</h2>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {problemCards.map((problem) => (
            <div key={problem} className="linear-card p-5">
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{problem}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-y border-border bg-card/35">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground">The solution</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">A contribution workflow built for developers.</h2>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {solutionCards.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="linear-card p-5">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-14 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, description]) => (
              <div key={title} className="rounded-lg border border-border bg-background p-4">
                <span className="rounded-md border border-border px-2 py-1 text-xs text-primary">Feature</span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm text-muted-foreground">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">From GitHub profile to first useful PR.</h2>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <div key={number} className="linear-card p-5">
              <p className="text-sm text-primary">{number}</p>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ai" className="border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm text-muted-foreground">AI intelligence</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">AI where it helps, deterministic scoring where it matters.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The recommendation engine starts with transparent signals. AI then explains repositories,
              clarifies issues, detects skill gaps, and turns next steps into a contribution plan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Repository summaries", "Issue explanations", "Skill gap detection", "Contribution plans", "Learning roadmap"].map((item) => (
              <div key={item} className="linear-card p-4">
                <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="github" className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Dashboard preview</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Everything converges in one developer dashboard.</h2>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-primary" aria-hidden="true" /> Saved repos</span>
            <span className="inline-flex items-center gap-2"><LineChart className="h-4 w-4 text-primary" aria-hidden="true" /> Growth stats</span>
            <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" /> Match scores</span>
          </div>
        </div>
        <DashboardPreview />
      </section>

      <section className="border-y border-border bg-card/35">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center lg:px-8">
          <h2 className="text-4xl font-semibold tracking-tight">Start contributing smarter.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Connect GitHub, understand your skills, and move toward contributions with less guesswork.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="linear-button-primary px-4 py-2.5">
              Get Started with GitHub
            </Link>
            <a href="#features" className="linear-button px-4 py-2.5">
              View Features
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <Logo />
          <p className="mt-3 max-w-md">AI-powered open-source discovery, recommendations, and contribution guidance.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {["Features", "GitHub", "Privacy", "Terms"].map((item) => (
            <a key={item} href="#" className="transition hover:text-foreground">
              {item}
            </a>
          ))}
        </div>
        <p>(c) 2026 OpenSource Compass.</p>
      </footer>
    </main>
  );
}
