import { z } from "zod";
import { env } from "../../config/env.js";
import type { AITaskType, AICapability, ReasoningTier } from "../providers/ai-provider.interface.js";

export interface TaskPolicy { requiredCapabilities: AICapability[]; preferredReasoningTier: ReasoningTier; inputTokenBudget: number; outputTokenBudget: number; maxAttempts: number; privateEvidencePermitted: boolean; schema: z.ZodTypeAny; }
const summarySchema=z.object({summary:z.string(),evidenceIds:z.array(z.string()).default([]),facts:z.array(z.string()).default([])});
const synthesisSchema=z.object({status:z.enum(["ready","insufficient_evidence"]),summary:z.string(),cards:z.array(z.unknown())});
export function taskPolicy(type:AITaskType):TaskPolicy {
  const map=["readme_summary","manifest_analysis","file_summary","directory_summary","workflow_analysis","test_analysis","issue_summary","pull_request_summary"].includes(type);
  const verification=type==="grounding_verification";
  const tier:ReasoningTier=map?"fast":verification||type==="timeline_summary"?"balanced":"strong";
  const capabilities:AICapability[]=map?["summarization","structured_output"]:verification?["verification","structured_output"]:[type.includes("mission")?"mission":type.includes("mentor")?"mentor":type.includes("review")?"review":type.includes("timeline")?"timeline":"architecture","structured_output"];
  return {requiredCapabilities:capabilities,preferredReasoningTier:tier,inputTokenBudget:map?env.AI_MAP_INPUT_TOKEN_BUDGET:verification?env.AI_VERIFICATION_INPUT_TOKEN_BUDGET:env.AI_SYNTHESIS_INPUT_TOKEN_BUDGET,outputTokenBudget:map?env.AI_MAP_MAX_OUTPUT_TOKENS:verification?env.AI_VERIFICATION_MAX_OUTPUT_TOKENS:env.AI_SYNTHESIS_MAX_OUTPUT_TOKENS,maxAttempts:env.AI_MAX_PROVIDER_ATTEMPTS,privateEvidencePermitted:true,schema:map?summarySchema:synthesisSchema};
}
