import { env } from "../../config/env.js";
import { configuredModels } from "./model-registry.js";
import { OpenAICompatibleProviderAdapter } from "./openai-compatible-provider.adapter.js";
export function createProviderAdapters(){const models=configuredModels();const forProvider=(provider:typeof models[number]["provider"])=>models.filter(x=>x.provider===provider);return [
 new OpenAICompatibleProviderAdapter({providerId:"zai",apiKey:env.ZAI_ENABLED?env.ZAI_API_KEY:undefined,baseUrl:env.ZAI_BASE_URL??"https://api.z.ai/api/paas/v4",models:forProvider("zai")}),
 new OpenAICompatibleProviderAdapter({providerId:"nvidia",apiKey:env.NVIDIA_ENABLED?env.NVIDIA_API_KEY:undefined,baseUrl:env.NVIDIA_BASE_URL,models:forProvider("nvidia")}),
 new OpenAICompatibleProviderAdapter({providerId:"openai",apiKey:env.OPENAI_ENABLED?env.OPENAI_API_KEY:undefined,baseUrl:env.OPENAI_BASE_URL,models:forProvider("openai")}),
 new OpenAICompatibleProviderAdapter({providerId:"openrouter",apiKey:env.OPENROUTER_ENABLED?env.OPENROUTER_API_KEY:undefined,baseUrl:env.OPENROUTER_BASE_URL,models:forProvider("openrouter"),headers:{"HTTP-Referer":env.FRONTEND_URL,"X-Title":"OpenForge"}}),
 new OpenAICompatibleProviderAdapter({providerId:"groq",apiKey:env.GROQ_API_KEY,baseUrl:env.GROQ_BASE_URL,models:forProvider("groq")})];}
