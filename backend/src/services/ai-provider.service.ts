import { ConfigurationError, ExternalServiceError } from "../lib/http-error.js";
import { env } from "../config/env.js";

export interface AiGenerateJsonInput {
  system: string;
  prompt: string;
  schemaHint: string;
}

export interface AiProviderResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

interface ProviderErrorResponse {
  error?: {
    message?: string;
    code?: string;
  } | string;
  message?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

interface OllamaResponse {
  message?: {
    content?: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
}

function extractJson<T>(content: string) {
  const trimmed = content.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const rawJson = fencedJson ?? trimmed;
  const start = rawJson.indexOf("{");
  const end = rawJson.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new ExternalServiceError("AI provider did not return JSON", "ai_invalid_json");
  }

  return JSON.parse(rawJson.slice(start, end + 1)) as T;
}

function requireApiKey(provider: string, apiKey?: string) {
  if (!apiKey) {
    throw new ConfigurationError(`${provider} API key is not configured`);
  }

  return apiKey;
}

async function fetchProvider(provider: string, url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new ExternalServiceError(`${provider} provider is unreachable`, "ai_provider_unreachable", {
      provider,
      cause: error instanceof Error ? error.message : "fetch failed"
    });
  }
}

async function getProviderErrorMessage(response: Response, provider: string) {
  const body = await response.text().catch(() => "");

  if (!body) {
    return `${provider} request failed`;
  }

  try {
    const payload = JSON.parse(body) as ProviderErrorResponse;
    const errorMessage =
      typeof payload.error === "string"
        ? payload.error
        : payload.error?.message ?? payload.message;

    return errorMessage ? `${provider}: ${errorMessage}` : `${provider} request failed`;
  } catch {
    return `${provider}: ${body.slice(0, 240)}`;
  }
}

export class AiProviderService {
  async generateJson<T>(input: AiGenerateJsonInput): Promise<AiProviderResult<T>> {
    if (env.AI_PROVIDER === "gemini") {
      return this.generateGemini<T>(input);
    }

    if (env.AI_PROVIDER === "ollama") {
      return this.generateOllama<T>(input);
    }

    if (env.AI_PROVIDER === "groq") {
      return this.generateOpenAiCompatible<T>(
        input,
        env.GROQ_BASE_URL,
        requireApiKey("Groq", env.GROQ_API_KEY),
        env.AI_DEFAULT_MODEL || "llama-3.1-70b-versatile"
      );
    }

    return this.generateOpenAiCompatible<T>(
      input,
      env.OPENAI_BASE_URL,
      requireApiKey("OpenAI", env.OPENAI_API_KEY),
      env.AI_DEFAULT_MODEL || "gpt-4o-mini"
    );
  }

  private async generateOpenAiCompatible<T>(
    input: AiGenerateJsonInput,
    baseUrl: string,
    apiKey: string,
    model: string
  ): Promise<AiProviderResult<T>> {
    const providerName = env.AI_PROVIDER === "groq" ? "Groq" : "OpenAI";
    const response = await fetchProvider(
      providerName,
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: env.AI_MAX_OUTPUT_TOKENS,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: input.system },
            {
              role: "user",
              content: `${input.prompt}\n\nReturn JSON matching this shape:\n${input.schemaHint}`
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new ExternalServiceError(await getProviderErrorMessage(response, providerName), "ai_provider_failed", {
        provider: providerName,
        status: response.status
      });
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new ExternalServiceError("AI provider returned an empty response", "ai_empty_response");
    }

    return {
      data: extractJson<T>(content),
      model,
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0
    };
  }

  private async generateGemini<T>(input: AiGenerateJsonInput): Promise<AiProviderResult<T>> {
    const model = env.AI_DEFAULT_MODEL || "gemini-1.5-flash";
    const apiKey = requireApiKey("Gemini", env.GEMINI_API_KEY);
    const response = await fetchProvider(
      "Gemini",
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json"
          },
          contents: [
            {
              role: "user",
              parts: [{ text: `${input.system}\n\n${input.prompt}\n\n${input.schemaHint}` }]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new ExternalServiceError(await getProviderErrorMessage(response, "Gemini"), "ai_provider_failed", {
        provider: "Gemini",
        status: response.status
      });
    }

    const payload = (await response.json()) as GeminiResponse;
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new ExternalServiceError("Gemini returned an empty response", "ai_empty_response");
    }

    return {
      data: extractJson<T>(content),
      model,
      inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0
    };
  }

  private async generateOllama<T>(input: AiGenerateJsonInput): Promise<AiProviderResult<T>> {
    const model = env.AI_DEFAULT_MODEL || "llama3.1";
    const response = await fetchProvider("Ollama", `${env.OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: `${input.prompt}\n\n${input.schemaHint}` }
        ]
      })
    });

    if (!response.ok) {
      throw new ExternalServiceError(await getProviderErrorMessage(response, "Ollama"), "ai_provider_failed", {
        provider: "Ollama",
        status: response.status
      });
    }

    const payload = (await response.json()) as OllamaResponse;

    if (!payload.message?.content) {
      throw new ExternalServiceError("Ollama returned an empty response", "ai_empty_response");
    }

    return {
      data: extractJson<T>(payload.message.content),
      model,
      inputTokens: payload.prompt_eval_count ?? 0,
      outputTokens: payload.eval_count ?? 0
    };
  }
}

export const aiProviderService = new AiProviderService();
