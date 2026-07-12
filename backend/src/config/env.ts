import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  AI_PROVIDER: z.enum(["openai", "gemini", "groq", "ollama"]).default("openai"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  AI_DEFAULT_MODEL: z.string().optional(),
  AI_MAX_INPUT_TOKENS: z.coerce.number().int().positive().default(12000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2000),
  WORKSPACE_JOB_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(900),
  WORKSPACE_EXPLORER_INPUT_TOKEN_BUDGET: z.coerce.number().int().positive().default(2200),
  WORKSPACE_MISSION_INPUT_TOKEN_BUDGET: z.coerce.number().int().positive().default(2600),
  WORKSPACE_MENTOR_INPUT_TOKEN_BUDGET: z.coerce.number().int().positive().default(3000),
  WORKSPACE_REVIEW_INPUT_TOKEN_BUDGET: z.coerce.number().int().positive().default(2200),
  WORKSPACE_TIMELINE_INPUT_TOKEN_BUDGET: z.coerce.number().int().positive().default(1200),
  WORKSPACE_PROMPT_TOKEN_SAFETY_MARGIN: z.coerce.number().min(0).max(0.5).default(0.15),
  WORKSPACE_MAX_EVIDENCE_ITEMS: z.coerce.number().int().positive().default(40),
  WORKSPACE_MAX_EVIDENCE_ITEM_CHARS: z.coerce.number().int().positive().default(4000),
  WORKSPACE_MAX_PROMPT_CHARS: z.coerce.number().int().positive().default(24000),
  WORKSPACE_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(3000),
  REPOSITORY_EVIDENCE_VERSION: z.coerce.number().int().positive().default(1),
  REPO_CONTEXT_MAX_TREE_ENTRIES: z.coerce.number().int().positive().default(10000),
  REPO_CONTEXT_MAX_SELECTED_FILES: z.coerce.number().int().positive().default(150),
  REPO_CONTEXT_MAX_FILE_BYTES: z.coerce.number().int().positive().default(153600),
  REPO_CONTEXT_MAX_TOTAL_BYTES: z.coerce.number().int().positive().default(10485760),
  REPO_CONTEXT_MAX_README_BYTES: z.coerce.number().int().positive().default(153600),
  REPO_CONTEXT_MAX_COMMITS: z.coerce.number().int().positive().default(100),
  REPO_CONTEXT_MAX_ISSUES: z.coerce.number().int().positive().default(100),
  REPO_CONTEXT_MAX_PULL_REQUESTS: z.coerce.number().int().positive().default(100),
  REPO_CONTEXT_MAX_CONTRIBUTORS: z.coerce.number().int().positive().default(100),
  REPO_CONTEXT_MAX_RELEASES: z.coerce.number().int().positive().default(50),
  REPO_INTEL_MAX_TREE_ENTRIES: z.coerce.number().int().positive().default(3000),
  REPO_INTEL_MAX_FILES: z.coerce.number().int().positive().default(25),
  REPO_INTEL_MAX_FILE_BYTES: z.coerce.number().int().positive().default(80 * 1024),
  REPO_INTEL_MAX_TOTAL_BYTES: z.coerce.number().int().positive().default(500 * 1024),
  REPO_INTEL_MAX_README_BYTES: z.coerce.number().int().positive().default(80 * 1024)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid backend environment configuration:");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
