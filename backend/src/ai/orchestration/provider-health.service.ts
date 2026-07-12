import { env } from "../../config/env.js";
import type { AIProviderId, NormalizedAIError, ProviderHealth } from "../providers/ai-provider.interface.js";
export class ProviderHealthService {
  private states=new Map<string,ProviderHealth>();
  private key(provider:AIProviderId,model?:string){return `${provider}:${model??"*"}`;}
  get(provider:AIProviderId,model?:string):ProviderHealth{return this.states.get(this.key(provider,model))??{provider,...(model?{modelId:model}:{}),status:"healthy",consecutiveFailures:0,cooldownUntil:null,lastErrorCode:null,lastCheckedAt:new Date().toISOString()};}
  recordSuccess(provider:AIProviderId,model:string){this.states.set(this.key(provider,model),{provider,modelId:model,status:"healthy",consecutiveFailures:0,cooldownUntil:null,lastErrorCode:null,lastCheckedAt:new Date().toISOString()});}
  recordFailure(provider:AIProviderId,model:string,error:NormalizedAIError){const failures=this.get(provider,model).consecutiveFailures+1;const cooldown=error.code==="rate_limited"||failures>=2;const ms=error.retryAfterMs??env.AI_PROVIDER_COOLDOWN_SECONDS*1000;this.states.set(this.key(provider,model),{provider,modelId:model,status:error.code==="rate_limited"?"rate_limited":cooldown?"unavailable":"degraded",consecutiveFailures:failures,cooldownUntil:cooldown?new Date(Date.now()+ms).toISOString():null,lastErrorCode:error.code,lastCheckedAt:new Date().toISOString()});}
  isAvailable(provider:AIProviderId,model:string){const state=this.get(provider,model);return !state.cooldownUntil||Date.parse(state.cooldownUntil)<=Date.now();}
  snapshot(){return [...this.states.values()];}
}
export const providerHealthService=new ProviderHealthService();
