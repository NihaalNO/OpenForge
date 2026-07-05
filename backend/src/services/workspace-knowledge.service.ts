import type {
  RepositoryImportance,
  WorkspaceKnowledgePackage,
  WorkspaceKnowledgeResponse
} from "@openforge/shared";
import { env } from "../config/env.js";
import { GitHubClient } from "../lib/github-client.js";
import { ConflictError, HttpError, NotFoundError } from "../lib/http-error.js";
import { getSupabaseServiceClient } from "../lib/supabase.js";

interface GitHubAccountRow {
  user_id: string;
  access_token_encrypted: string | null;
}

interface RepositoryRow {
  id: string;
  owner_login: string;
  name: string;
  full_name: string;
  default_branch: string | null;
  primary_language: string | null;
  languages: Record<string, number> | null;
  topics: string[] | null;
}

interface TreePayload {
  tree: Array<{
    path?: string;
    type?: "blob" | "tree" | string;
    size?: number;
  }>;
  truncated?: boolean;
}

interface ContentsPayload {
  type: string;
  path: string;
  name: string;
  size: number;
  encoding?: string;
  content?: string;
}

interface FileEntry {
  path: string;
  type: "blob" | "tree";
  sizeBytes?: number;
  extension: string | null;
  depth: number;
  category: string;
}

interface FetchedFile {
  path: string;
  name: string;
  sizeBytes: number;
  content: string;
  truncated: boolean;
  secretLike: boolean;
}

const IGNORED_SEGMENTS = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor"
]);

const BINARY_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".eot",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".so",
  ".ttf",
  ".webm",
  ".woff",
  ".woff2",
  ".zip"
]);

const MANIFEST_KINDS = new Map<string, string>([
  ["package.json", "node_package"],
  ["requirements.txt", "python_requirements"],
  ["pyproject.toml", "python_project"],
  ["Pipfile", "python_pipfile"],
  ["poetry.lock", "python_poetry_lock"],
  ["Cargo.toml", "rust_cargo"],
  ["Cargo.lock", "rust_cargo_lock"],
  ["go.mod", "go_module"],
  ["go.sum", "go_sum"],
  ["pom.xml", "java_maven"],
  ["build.gradle", "java_gradle"],
  ["settings.gradle", "java_gradle_settings"],
  ["composer.json", "php_composer"],
  ["Gemfile", "ruby_gemfile"]
]);

const IMPORTANT_FILE_NAMES = new Set([
  ".env.example",
  "Cargo.lock",
  "Cargo.toml",
  "Dockerfile",
  "Gemfile",
  "LICENSE",
  "Pipfile",
  "README.md",
  "build.gradle",
  "composer.json",
  "docker-compose.yml",
  "go.mod",
  "go.sum",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "pom.xml",
  "pyproject.toml",
  "requirements.txt",
  "settings.gradle",
  "tailwind.config.js",
  "tailwind.config.ts",
  "tsconfig.json",
  "vite.config.js",
  "vite.config.ts",
  "yarn.lock"
]);

const ENTRY_POINT_PATTERNS = [
  "frontend/app/page.tsx",
  "frontend/app/layout.tsx",
  "app/page.tsx",
  "app/layout.tsx",
  "pages/index.tsx",
  "pages/index.jsx",
  "src/main.tsx",
  "src/main.jsx",
  "src/App.tsx",
  "src/App.jsx",
  "src/index.ts",
  "src/index.tsx",
  "src/server.ts",
  "src/app.ts",
  "server.js",
  "index.js",
  "main.py",
  "manage.py",
  "app.py",
  "Dockerfile"
];

function uniqueSorted(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getExtension(path: string) {
  const name = path.split("/").pop() ?? path;
  const index = name.lastIndexOf(".");

  return index > 0 ? name.slice(index).toLowerCase() : null;
}

function getBaseName(path: string) {
  return path.split("/").pop() ?? path;
}

function getDepth(path: string) {
  return path.split("/").filter(Boolean).length;
}

function isIgnoredPath(path: string) {
  return path.split("/").some((segment) => IGNORED_SEGMENTS.has(segment));
}

function isBinaryPath(path: string) {
  const extension = getExtension(path);

  return extension ? BINARY_EXTENSIONS.has(extension) : false;
}

function isWorkflowPath(path: string) {
  return /^\.github\/workflows\/.+\.ya?ml$/i.test(path);
}

function isContributingPath(path: string) {
  return /(^|\/)(CONTRIBUTING|CONTRIBUTING\.md)$/i.test(path);
}

function isCodeOfConductPath(path: string) {
  return /(^|\/)(CODE_OF_CONDUCT|CODE_OF_CONDUCT\.md)$/i.test(path);
}

function isLicensePath(path: string) {
  return /(^|\/)(LICENSE|LICENSE\.md|COPYING)$/i.test(path);
}

function isDocPath(path: string) {
  return /^docs\//i.test(path) || /\.(md|mdx|rst)$/i.test(path);
}

function isTestPath(path: string) {
  return /(^|\/)(__tests__|tests?|spec)\//i.test(path) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(path);
}

function categorizePath(path: string, type: "blob" | "tree") {
  if (type === "tree") {
    if (/^(src|app|pages|frontend|backend|lib|server)\b/i.test(path)) return "source";
    if (/^(docs|\.github)\b/i.test(path)) return "project_docs";
    if (isTestPath(`${path}/`)) return "tests";
    if (/^(prisma|supabase|database)\b/i.test(path)) return "data";
    return "directory";
  }

  if (isWorkflowPath(path)) return "ci";
  if (MANIFEST_KINDS.has(getBaseName(path))) return "manifest";
  if (isContributingPath(path) || isCodeOfConductPath(path) || isLicensePath(path) || isDocPath(path)) return "docs";
  if (isTestPath(path)) return "tests";
  if (ENTRY_POINT_PATTERNS.includes(path)) return "entry_point";
  if (/config\.[cm]?[jt]s$|\.config\.[cm]?[jt]s$/i.test(path)) return "config";
  return "source";
}

function getImportance(path: string, category: string): RepositoryImportance {
  if (
    category === "manifest" ||
    category === "ci" ||
    category === "entry_point" ||
    isContributingPath(path) ||
    isLicensePath(path)
  ) {
    return "high";
  }

  if (category === "docs" || category === "tests" || category === "config") {
    return "medium";
  }

  return "low";
}

function getImportantReason(path: string, category: string) {
  if (category === "manifest") return "Dependency or package manager manifest";
  if (category === "ci") return "CI/CD workflow";
  if (category === "entry_point") return "Likely application entry point";
  if (isContributingPath(path)) return "Contribution guidelines";
  if (isLicensePath(path)) return "License metadata";
  if (isCodeOfConductPath(path)) return "Community conduct guidelines";
  if (category === "tests") return "Test structure signal";
  if (category === "docs") return "Project documentation";
  if (category === "config") return "Project configuration";
  return "Repository context file";
}

function decodeContent(payload: ContentsPayload) {
  if (payload.encoding !== "base64" || !payload.content) {
    return "";
  }

  return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString("utf8");
}

function truncateByBytes(content: string, maxBytes: number) {
  const buffer = Buffer.from(content, "utf8");

  if (buffer.byteLength <= maxBytes) {
    return { content, truncated: false, sizeBytes: buffer.byteLength };
  }

  return {
    content: buffer.subarray(0, maxBytes).toString("utf8"),
    truncated: true,
    sizeBytes: buffer.byteLength
  };
}

function hasSecretLikeContent(path: string, content: string) {
  if (/\.env($|\.)/i.test(path) && !/\.env\.example$/i.test(path)) {
    return true;
  }

  return /(api[_-]?key|access[_-]?token|secret|private[_-]?key|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/i.test(
    content
  );
}

function previewContent(content: string, maxLength = 4000) {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function parsePackageJson(content: string) {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const pick = (key: string) =>
      parsed[key] && typeof parsed[key] === "object" ? parsed[key] : undefined;

    return {
      scripts: pick("scripts"),
      dependencies: pick("dependencies"),
      devDependencies: pick("devDependencies"),
      peerDependencies: pick("peerDependencies")
    };
  } catch {
    return undefined;
  }
}

function addIfDependency(dependencies: Set<string>, parsed: Record<string, unknown> | undefined, name: string, label: string) {
  const allDeps = {
    ...((parsed?.dependencies as Record<string, unknown> | undefined) ?? {}),
    ...((parsed?.devDependencies as Record<string, unknown> | undefined) ?? {}),
    ...((parsed?.peerDependencies as Record<string, unknown> | undefined) ?? {})
  };

  if (name in allDeps) {
    dependencies.add(label);
  }
}

export class WorkspaceKnowledgeService {
  private readonly supabase = getSupabaseServiceClient();

  async getWorkspaceKnowledge(userId: string, repositoryId: string): Promise<WorkspaceKnowledgeResponse> {
    const row = await this.getCachedIntelligence(userId, repositoryId);

    if (!row) {
      throw new NotFoundError("Workspace knowledge has not been generated", "workspace_repository_knowledge_not_found");
    }

    return {
      knowledgePackage: row.knowledge_package as WorkspaceKnowledgePackage,
      cached: true,
      workspaceKnowledgeId: row.id
    };
  }

  async generateWorkspaceKnowledge(
    userId: string,
    repositoryId: string,
    regenerate = false
  ): Promise<WorkspaceKnowledgeResponse> {
    const cached = regenerate ? null : await this.getCachedIntelligence(userId, repositoryId);

    if (cached) {
      return {
        knowledgePackage: cached.knowledge_package as WorkspaceKnowledgePackage,
        cached: true,
        workspaceKnowledgeId: cached.id
      };
    }

    const account = await this.getGitHubAccount(userId);
    const repository = await this.getRepository(repositoryId);
    const client = new GitHubClient(account.access_token_encrypted);

    try {
      const knowledgePackage = await this.buildKnowledgePackage(client, repository);
      const { data, error } = await this.supabase
        .from("workspace_repository_knowledge")
        .upsert(
          {
            user_id: userId,
            repository_id: repositoryId,
            provider: "github",
            knowledge_package: knowledgePackage,
            source_limits: knowledgePackage.sourceLimits,
            detected_stack: knowledgePackage.detectedStack,
            contribution_readiness: knowledgePackage.contributionReadiness,
            complexity: knowledgePackage.complexity,
            status: "completed",
            error_message: null,
            generated_at: knowledgePackage.generatedAt
          },
          {
            onConflict: "user_id,repository_id,provider"
          }
        )
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      await this.updateRateLimit(userId, client);

      return {
        knowledgePackage,
        cached: false,
        workspaceKnowledgeId: data.id as string
      };
    } catch (error) {
      await this.supabase.from("workspace_repository_knowledge").upsert(
        {
          user_id: userId,
          repository_id: repositoryId,
          provider: "github",
          knowledge_package: {
            repositoryId,
            fullName: repository.full_name,
            provider: "github",
            error: error instanceof Error ? error.message : "Workspace knowledge generation failed"
          },
          status: "failed",
          error_message: error instanceof Error ? error.message : "Workspace knowledge generation failed"
        },
        { onConflict: "user_id,repository_id,provider" }
      );

      await this.updateRateLimit(userId, client);
      throw error;
    }
  }

  async getLatestKnowledgePackage(userId: string, repositoryId: string) {
    const row = await this.getCachedIntelligence(userId, repositoryId);

    return row?.knowledge_package as WorkspaceKnowledgePackage | undefined;
  }

  private async buildKnowledgePackage(client: GitHubClient, repository: RepositoryRow) {
    const limits = {
      maxTreeEntries: env.REPO_INTEL_MAX_TREE_ENTRIES,
      maxFiles: env.REPO_INTEL_MAX_FILES,
      maxFileBytes: env.REPO_INTEL_MAX_FILE_BYTES,
      maxTotalBytes: env.REPO_INTEL_MAX_TOTAL_BYTES,
      truncated: false
    };
    const defaultBranch = repository.default_branch ?? "HEAD";
    const readme = await this.fetchReadme(client, repository, env.REPO_INTEL_MAX_README_BYTES);
    const treePayload = await client.rest<TreePayload>(
      `/repos/${repository.owner_login}/${repository.name}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
    );
    const entries = this.normalizeTree(treePayload.tree);
    const processedEntries = entries.slice(0, limits.maxTreeEntries);
    const treeTruncated = Boolean(treePayload.truncated) || entries.length > processedEntries.length;
    const importantFiles = this.detectImportantFiles(processedEntries);
    const selectedPaths = this.selectFilesToFetch(importantFiles.map((file) => file.path), readme.path);
    const fetchedFiles = await this.fetchSelectedFiles(client, repository, selectedPaths);
    const detectedStack = this.detectStack(repository, processedEntries, fetchedFiles);
    const docs = this.detectDocs(processedEntries);
    const entryPoints = this.detectEntryPoints(processedEntries, fetchedFiles);
    const testStructure = this.detectTests(processedEntries, fetchedFiles);
    const manifests = this.buildManifests(fetchedFiles);
    const workflowFiles = fetchedFiles
      .filter((file) => isWorkflowPath(file.path))
      .map((file) => ({
        path: file.path,
        name: file.name,
        contentPreview: previewContent(file.content, 2500)
      }));
    const contributionReadiness = this.scoreContributionReadiness(docs, testStructure, workflowFiles, readme.content);
    const complexity = this.scoreComplexity(processedEntries, detectedStack, manifests, testStructure);

    limits.truncated =
      treeTruncated ||
      readme.truncated ||
      fetchedFiles.some((file) => file.truncated) ||
      fetchedFiles.reduce((sum, file) => sum + file.sizeBytes, 0) >= limits.maxTotalBytes;

    return {
      repositoryId: repository.id,
      fullName: repository.full_name,
      provider: "github",
      defaultBranch,
      generatedAt: new Date().toISOString(),
      sourceLimits: limits,
      readme,
      tree: {
        totalEntries: entries.length,
        processedEntries: processedEntries.length,
        truncated: treeTruncated,
        directories: this.detectImportantDirectories(processedEntries),
        importantFiles
      },
      detectedStack,
      manifests,
      docs,
      entryPoints,
      testStructure,
      workflowFiles,
      contributionReadiness,
      complexity,
      raw: {
        selectedFilePaths: fetchedFiles.map((file) => file.path)
      }
    } satisfies WorkspaceKnowledgePackage;
  }

  private async fetchReadme(client: GitHubClient, repository: RepositoryRow, maxBytes: number) {
    try {
      const payload = await client.rest<ContentsPayload>(
        `/repos/${repository.owner_login}/${repository.name}/readme`
      );
      const decoded = decodeContent(payload);
      const truncated = truncateByBytes(decoded, maxBytes);

      return {
        path: payload.path,
        content: truncated.content,
        summaryHint: truncated.content.split("\n").find((line) => line.trim().length > 20)?.slice(0, 240) ?? null,
        sizeBytes: payload.size,
        truncated: truncated.truncated || payload.size > maxBytes
      };
    } catch (error) {
      if (error instanceof HttpError && error.statusCode !== 404) {
        throw error;
      }

      return {
        path: null,
        content: null,
        summaryHint: null,
        sizeBytes: 0,
        truncated: false
      };
    }
  }

  private normalizeTree(entries: TreePayload["tree"]): FileEntry[] {
    return entries
      .filter((entry): entry is Required<Pick<FileEntry, "path" | "type">> & { size?: number } => {
        const type = entry.type === "tree" || entry.type === "blob" ? entry.type : null;

        return Boolean(entry.path && type && !isIgnoredPath(entry.path) && !isBinaryPath(entry.path));
      })
      .map((entry) => {
        const path = entry.path;
        const type = entry.type as "blob" | "tree";

        return {
          path,
          type,
          ...(entry.size === undefined ? {} : { sizeBytes: entry.size }),
          extension: getExtension(path),
          depth: getDepth(path),
          category: categorizePath(path, type)
        };
      });
  }

  private detectImportantDirectories(entries: FileEntry[]) {
    return entries
      .filter((entry) => entry.type === "tree")
      .filter((entry) => getImportance(entry.path, entry.category) !== "low" || entry.depth <= 2)
      .slice(0, 40)
      .map((entry) => ({
        path: entry.path,
        depth: entry.depth,
        category: entry.category,
        importance: getImportance(entry.path, entry.category)
      }));
  }

  private detectImportantFiles(entries: FileEntry[]) {
    return entries
      .filter((entry) => entry.type === "blob")
      .filter((entry) => {
        const name = getBaseName(entry.path);

        return (
          IMPORTANT_FILE_NAMES.has(name) ||
          /^CONTRIBUTING(\.md)?$/i.test(name) ||
          /^CODE_OF_CONDUCT(\.md)?$/i.test(name) ||
          isWorkflowPath(entry.path) ||
          isDocPath(entry.path) ||
          isTestPath(entry.path) ||
          ENTRY_POINT_PATTERNS.includes(entry.path)
        );
      })
      .map((entry) => ({
        path: entry.path,
        type: entry.extension ?? getBaseName(entry.path),
        ...(entry.sizeBytes === undefined ? {} : { sizeBytes: entry.sizeBytes }),
        category: entry.category,
        importance: getImportance(entry.path, entry.category),
        reason: getImportantReason(entry.path, entry.category)
      }))
      .sort((a, b) => this.importanceRank(a.importance) - this.importanceRank(b.importance) || a.path.localeCompare(b.path))
      .slice(0, 100);
  }

  private selectFilesToFetch(paths: string[], readmePath: string | null) {
    const selected = new Set<string>();
    const ranked = paths
      .filter((path) => path !== readmePath)
      .sort((a, b) => this.pathPriority(a) - this.pathPriority(b) || a.localeCompare(b));

    for (const path of ranked) {
      selected.add(path);

      if (selected.size >= env.REPO_INTEL_MAX_FILES) {
        break;
      }
    }

    return [...selected];
  }

  private async fetchSelectedFiles(client: GitHubClient, repository: RepositoryRow, paths: string[]) {
    const files: FetchedFile[] = [];
    let totalBytes = 0;

    for (const path of paths) {
      if (totalBytes >= env.REPO_INTEL_MAX_TOTAL_BYTES) {
        break;
      }

      try {
        const payload = await client.rest<ContentsPayload>(
          `/repos/${repository.owner_login}/${repository.name}/contents/${path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}?ref=${encodeURIComponent(repository.default_branch ?? "HEAD")}`
        );

        if (payload.type !== "file" || payload.size > env.REPO_INTEL_MAX_FILE_BYTES || isBinaryPath(payload.path)) {
          continue;
        }

        const decoded = decodeContent(payload);
        const secretLike = hasSecretLikeContent(payload.path, decoded);
        const allowedBytes = Math.min(env.REPO_INTEL_MAX_FILE_BYTES, env.REPO_INTEL_MAX_TOTAL_BYTES - totalBytes);
        const truncated = truncateByBytes(secretLike ? "[content omitted: possible secret-like values]" : decoded, allowedBytes);

        files.push({
          path: payload.path,
          name: payload.name,
          sizeBytes: payload.size,
          content: truncated.content,
          truncated: truncated.truncated,
          secretLike
        });
        totalBytes += Buffer.byteLength(truncated.content, "utf8");
      } catch (error) {
        if (error instanceof HttpError && error.statusCode !== 404) {
          throw error;
        }

        continue;
      }
    }

    return files;
  }

  private buildManifests(files: FetchedFile[]) {
    return files
      .filter((file) => MANIFEST_KINDS.has(getBaseName(file.path)))
      .map((file) => {
        const parsed = getBaseName(file.path) === "package.json" ? parsePackageJson(file.content) : undefined;

        return {
          path: file.path,
          kind: MANIFEST_KINDS.get(getBaseName(file.path)) ?? "manifest",
          contentPreview: previewContent(file.content, 2500),
          ...(parsed ? { parsed } : {})
        };
      });
  }

  private detectStack(repository: RepositoryRow, entries: FileEntry[], files: FetchedFile[]) {
    const languages = new Set<string>(Object.keys(repository.languages ?? {}));
    const frameworks = new Set<string>();
    const packageManagers = new Set<string>();
    const databases = new Set<string>();
    const testing = new Set<string>();
    const ci = new Set<string>();
    const deployment = new Set<string>();
    const paths = new Set(entries.map((entry) => entry.path));
    const packageJson = files.find((file) => getBaseName(file.path) === "package.json");
    const parsedPackage = packageJson ? parsePackageJson(packageJson.content) : undefined;
    const dependencyLabels = new Set<string>();

    if (repository.primary_language) languages.add(repository.primary_language);
    if (paths.has("package.json")) packageManagers.add("npm");
    if (paths.has("pnpm-lock.yaml")) packageManagers.add("pnpm");
    if (paths.has("yarn.lock")) packageManagers.add("yarn");
    if (paths.has("package-lock.json")) packageManagers.add("npm");
    if (paths.has("requirements.txt") || paths.has("pyproject.toml")) packageManagers.add("pip");
    if (paths.has("poetry.lock")) packageManagers.add("poetry");
    if (paths.has("Cargo.toml")) packageManagers.add("cargo");
    if (paths.has("go.mod")) packageManagers.add("go modules");
    if (paths.has("composer.json")) packageManagers.add("composer");
    if (paths.has("Gemfile")) packageManagers.add("bundler");
    if (paths.has("pom.xml")) packageManagers.add("maven");
    if (paths.has("build.gradle")) packageManagers.add("gradle");

    const dependencyDetectors: Array<[string, string]> = [
      ["next", "Next.js"],
      ["react", "React"],
      ["express", "Express"],
      ["vite", "Vite"],
      ["tailwindcss", "Tailwind CSS"],
      ["@prisma/client", "Prisma"],
      ["@supabase/supabase-js", "Supabase"],
      ["jest", "Jest"],
      ["vitest", "Vitest"],
      ["playwright", "Playwright"],
      ["cypress", "Cypress"]
    ];

    for (const [name, label] of dependencyDetectors) {
      addIfDependency(dependencyLabels, parsedPackage, name, label);
    }

    for (const label of dependencyLabels) {
      if (["Jest", "Vitest", "Playwright", "Cypress"].includes(label)) testing.add(label);
      else if (["Prisma", "Supabase"].includes(label)) databases.add(label);
      else frameworks.add(label);
    }

    if (paths.has("next.config.ts") || paths.has("next.config.js") || paths.has("next.config.mjs") || paths.has("app") || paths.has("pages")) frameworks.add("Next.js");
    if ([...paths].some((path) => /\.(jsx|tsx)$/.test(path))) frameworks.add("React");
    if (paths.has("vite.config.ts") || paths.has("vite.config.js")) frameworks.add("Vite");
    if (paths.has("tailwind.config.ts") || paths.has("tailwind.config.js")) frameworks.add("Tailwind CSS");
    if (paths.has("prisma/schema.prisma")) databases.add("Prisma");
    if (paths.has("manage.py")) frameworks.add("Django");
    if (files.some((file) => /django/i.test(file.content))) frameworks.add("Django");
    if (files.some((file) => /fastapi/i.test(file.content))) frameworks.add("FastAPI");
    if (files.some((file) => /flask/i.test(file.content))) frameworks.add("Flask");
    if (files.some((file) => /laravel/i.test(file.content))) frameworks.add("Laravel");
    if (files.some((file) => /rails/i.test(file.content))) frameworks.add("Rails");
    if ([...paths].some(isWorkflowPath)) ci.add("GitHub Actions");
    if (paths.has("Dockerfile") || paths.has("docker-compose.yml")) deployment.add("Docker");
    if (paths.has("vercel.json")) deployment.add("Vercel");

    for (const framework of testing) {
      frameworks.delete(framework);
    }

    return {
      languages: uniqueSorted(languages),
      frameworks: uniqueSorted(frameworks),
      packageManagers: uniqueSorted(packageManagers),
      databases: uniqueSorted(databases),
      testing: uniqueSorted(testing),
      ci: uniqueSorted(ci),
      deployment: uniqueSorted(deployment)
    };
  }

  private detectDocs(entries: FileEntry[]) {
    const docFiles = uniqueSorted(entries.filter((entry) => entry.type === "blob" && isDocPath(entry.path)).map((entry) => entry.path)).slice(0, 50);

    return {
      hasContributingGuide: entries.some((entry) => isContributingPath(entry.path)),
      hasCodeOfConduct: entries.some((entry) => isCodeOfConductPath(entry.path)),
      hasLicense: entries.some((entry) => isLicensePath(entry.path)),
      docFiles
    };
  }

  private detectEntryPoints(entries: FileEntry[], files: FetchedFile[]) {
    const entryPoints = new Map<string, string>();
    const paths = new Set(entries.map((entry) => entry.path));

    for (const pattern of ENTRY_POINT_PATTERNS) {
      if (paths.has(pattern)) {
        entryPoints.set(pattern, "Known framework or runtime entry point");
      }
    }

    const packageJson = files.find((file) => getBaseName(file.path) === "package.json");
    const parsed = packageJson ? parsePackageJson(packageJson.content) : undefined;
    const scripts = parsed?.scripts as Record<string, unknown> | undefined;

    if (scripts) {
      entryPoints.set("package.json", "Package scripts define project commands");
    }

    return [...entryPoints.entries()].slice(0, 20).map(([path, reason]) => ({ path, reason }));
  }

  private detectTests(entries: FileEntry[], files: FetchedFile[]) {
    const testDirectories = uniqueSorted(
      entries.filter((entry) => entry.type === "tree" && isTestPath(`${entry.path}/`)).map((entry) => entry.path)
    ).slice(0, 30);
    const testFiles = uniqueSorted(
      entries.filter((entry) => entry.type === "blob" && isTestPath(entry.path)).map((entry) => entry.path)
    ).slice(0, 50);
    const detectedFrameworks = this.detectStack(
      {
        id: "",
        owner_login: "",
        name: "",
        full_name: "",
        default_branch: null,
        primary_language: null,
        languages: {},
        topics: []
      },
      entries,
      files
    ).testing;

    return {
      hasTests: testDirectories.length > 0 || testFiles.length > 0 || detectedFrameworks.length > 0,
      testDirectories,
      testFiles,
      detectedFrameworks
    };
  }

  private scoreContributionReadiness(
    docs: WorkspaceKnowledgePackage["docs"],
    tests: WorkspaceKnowledgePackage["testStructure"],
    workflows: WorkspaceKnowledgePackage["workflowFiles"],
    readmeContent: string | null
  ) {
    let score = 20;
    const reasons: string[] = [];
    const blockers: string[] = [];

    if (readmeContent) {
      score += 20;
      reasons.push("README is available");
    } else {
      blockers.push("No README was available through the GitHub API");
    }

    if (docs.hasContributingGuide) {
      score += 20;
      reasons.push("Contribution guide is present");
    } else {
      blockers.push("No contribution guide detected");
    }

    if (docs.hasLicense) {
      score += 10;
      reasons.push("License file detected");
    } else {
      blockers.push("No license file detected");
    }

    if (tests.hasTests) {
      score += 20;
      reasons.push("Tests or test tooling detected");
    } else {
      blockers.push("No tests detected");
    }

    if (workflows.length > 0) {
      score += 10;
      reasons.push("CI workflows detected");
    }

    const boundedScore = Math.min(100, score);

    return {
      score: boundedScore,
      level: boundedScore >= 75 ? "high" : boundedScore >= 45 ? "medium" : "low",
      reasons,
      blockers
    } satisfies WorkspaceKnowledgePackage["contributionReadiness"];
  }

  private scoreComplexity(
    entries: FileEntry[],
    stack: WorkspaceKnowledgePackage["detectedStack"],
    manifests: WorkspaceKnowledgePackage["manifests"],
    tests: WorkspaceKnowledgePackage["testStructure"]
  ) {
    let score = 20;
    const reasons: string[] = [];

    if (entries.length > 1000) {
      score += 30;
      reasons.push("Large repository tree");
    } else if (entries.length > 300) {
      score += 15;
      reasons.push("Moderate repository tree size");
    }

    if (stack.languages.length > 2) {
      score += 15;
      reasons.push("Multiple languages detected");
    }

    if (stack.frameworks.length > 3) {
      score += 15;
      reasons.push("Several frameworks detected");
    }

    if (manifests.length > 4) {
      score += 10;
      reasons.push("Multiple dependency manifests");
    }

    if (tests.hasTests) {
      score += 5;
      reasons.push("Test suite adds setup surface");
    }

    const boundedScore = Math.min(100, score);

    return {
      score: boundedScore,
      level: boundedScore >= 70 ? "advanced" : boundedScore >= 40 ? "intermediate" : "beginner",
      reasons: reasons.length > 0 ? reasons : ["Small deterministic context surface"]
    } satisfies WorkspaceKnowledgePackage["complexity"];
  }

  private pathPriority(path: string) {
    const category = categorizePath(path, "blob");
    let priority = this.importanceRank(getImportance(path, category)) * 100;

    if (MANIFEST_KINDS.has(getBaseName(path))) priority -= 20;
    if (isWorkflowPath(path)) priority -= 15;
    if (ENTRY_POINT_PATTERNS.includes(path)) priority -= 10;
    if (/lock$/i.test(path) || /lock\./i.test(path)) priority += 20;

    return priority;
  }

  private importanceRank(importance: RepositoryImportance) {
    return importance === "high" ? 0 : importance === "medium" ? 1 : 2;
  }

  private async getCachedIntelligence(userId: string, repositoryId: string) {
    const { data, error } = await this.supabase
      .from("workspace_repository_knowledge")
      .select("id,knowledge_package")
      .eq("user_id", userId)
      .eq("repository_id", repositoryId)
      .eq("provider", "github")
      .eq("status", "completed")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as { id: string; knowledge_package: unknown } | null;
  }

  private async getGitHubAccount(userId: string) {
    const { data, error } = await this.supabase
      .from("github_accounts")
      .select("user_id,access_token_encrypted")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new ConflictError("GitHub account is not connected", "github_account_not_connected");
    }

    const account = data as GitHubAccountRow;

    if (!account.access_token_encrypted) {
      throw new ConflictError("GitHub token is missing. Sign in with GitHub again.", "github_token_missing");
    }

    return account as GitHubAccountRow & { access_token_encrypted: string };
  }

  private async getRepository(repositoryId: string) {
    const { data, error } = await this.supabase
      .from("github_repositories")
      .select("id,owner_login,name,full_name,default_branch,primary_language,languages,topics")
      .eq("id", repositoryId)
      .single();

    if (error) {
      throw new NotFoundError("Repository was not found", "repository_not_found");
    }

    return data as RepositoryRow;
  }

  private async updateRateLimit(userId: string, client: GitHubClient) {
    const { error } = await this.supabase
      .from("github_accounts")
      .update({
        rate_limit_remaining: client.rateLimit.remaining,
        rate_limit_reset_at: client.rateLimit.resetAt
      })
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }
}

export const workspaceKnowledgeService = new WorkspaceKnowledgeService();


