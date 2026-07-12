import { env } from "../../config/env.js";
import type { AICapability, AIProviderId, ModelCapabilityProfile, ReasoningTier } from "./ai-provider.interface.js";
const all:AICapability[]=["summarization","classification","structured_output","architecture","mission","mentor","review","timeline","verification"];
function parse(provider:AIProviderId,value:string|undefined,fast:string|undefined,strong:string|undefined,privateAllowed=true):ModelCapabilityProfile[]{const ids=[...(value?.split(",")??[]),fast,strong].map(x=>x?.trim()).filter((x):x is string=>Boolean(x));return [...new Set(ids)].map((modelId,index)=>{const reasoningTier:ReasoningTier=modelId===strong?"strong":modelId===fast?"fast":"balanced";return {provider,modelId,enabled:true,reasoningTier,capabilities:all,contextWindowTokens:128000,recommendedInputTokens:reasoningTier==="fast"?4000:16000,maxOutputTokens:reasoningTier==="fast"?2048:8192,supportsJsonMode:true,supportsJsonSchema:false,priority:100-index,privateRepositoryAllowed:privateAllowed};});}
export function configuredModels(){return [
 ...parse("zai",env.ZAI_MODELS,env.ZAI_DEFAULT_FAST_MODEL,env.ZAI_DEFAULT_REASONING_MODEL),
 ...parse("nvidia",env.NVIDIA_MODELS,env.NVIDIA_DEFAULT_FAST_MODEL,env.NVIDIA_DEFAULT_REASONING_MODEL),
 ...parse("openai",env.OPENAI_MODELS,env.OPENAI_DEFAULT_FAST_MODEL,env.OPENAI_DEFAULT_REASONING_MODEL),
 ...parse("openrouter",env.OPENROUTER_MODELS,env.OPENROUTER_USE_FREE_ROUTER?env.OPENROUTER_FREE_MODEL:undefined,env.OPENROUTER_FALLBACK_MODEL,false),
 ...parse("groq",env.AI_PROVIDER==="groq"?env.AI_DEFAULT_MODEL:undefined,env.AI_DEFAULT_MODEL,undefined)
 ];}
