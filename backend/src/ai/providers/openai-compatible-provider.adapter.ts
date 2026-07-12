import type { AIProviderAdapter, AIProviderId, AIProviderResult, ModelCapabilityProfile, NormalizedAIError, ProviderHealth, ProviderModel, StructuredAIRequest } from "./ai-provider.interface.js";

interface Options { providerId:AIProviderId; apiKey:string|undefined; baseUrl:string; models:ModelCapabilityProfile[]; headers?:Record<string,string>; }
function jsonFrom(text:string){const clean=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/```$/,"");const start=clean.indexOf("{");const end=clean.lastIndexOf("}");if(start<0||end<start)throw Object.assign(new Error("Provider returned invalid JSON"),{code:"invalid_json"});return JSON.parse(clean.slice(start,end+1)) as unknown;}
export class OpenAICompatibleProviderAdapter implements AIProviderAdapter {
  readonly providerId:AIProviderId;
  constructor(protected readonly options:Options){this.providerId=options.providerId;}
  async healthCheck():Promise<ProviderHealth>{return {provider:this.providerId,status:!this.options.models.length?"disabled":this.options.apiKey?"healthy":"misconfigured",consecutiveFailures:0,cooldownUntil:null,lastErrorCode:null,lastCheckedAt:new Date().toISOString()};}
  async listModels(){return this.options.models.map(({provider,modelId})=>({provider,modelId}));}
  estimateCapability(model:ProviderModel){const found=this.options.models.find(x=>x.modelId===model.modelId);if(!found)throw new Error(`Unknown ${this.providerId} model: ${model.modelId}`);return found;}
  async generateStructured<T>(request:StructuredAIRequest<T>):Promise<AIProviderResult<T>>{
    if(!this.options.apiKey)throw Object.assign(new Error(`${this.providerId} API key is not configured`),{status:401});
    const started=Date.now();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),request.timeoutMs);
    try {const response=await fetch(`${this.options.baseUrl.replace(/\/$/,"")}/chat/completions`,{method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${this.options.apiKey}`,"Content-Type":"application/json",...this.options.headers},body:JSON.stringify({model:request.model.modelId,temperature:0.1,max_tokens:request.maxOutputTokens,...(request.model.supportsJsonMode?{response_format:{type:"json_object"}}:{}),messages:[{role:"system",content:request.system},{role:"user",content:`${request.prompt}\n\nReturn JSON matching: ${request.schemaHint}`} ]})});
      const raw=await response.text();if(!response.ok){const retryAfter=response.headers.get("retry-after");throw Object.assign(new Error(raw.slice(0,500)||`${this.providerId} request failed`),{status:response.status,retryAfterMs:retryAfter?Number(retryAfter)*1000:undefined});}
      const payload=JSON.parse(raw) as {model?:string;choices?:Array<{message?:{content?:string}}> ;usage?:{prompt_tokens?:number;completion_tokens?:number}};const content=payload.choices?.[0]?.message?.content;if(!content)throw new Error("Provider returned an empty response");const data=request.schema.parse(jsonFrom(content));
      return {data,provider:this.providerId,requestedModel:request.model.modelId,actualModel:payload.model??request.model.modelId,inputTokens:payload.usage?.prompt_tokens??0,outputTokens:payload.usage?.completion_tokens??0,latencyMs:Date.now()-started};
    } finally {clearTimeout(timer);}
  }
  normalizeError(error:unknown):NormalizedAIError{const e=error as {message?:string;status?:number;code?:string;name?:string;retryAfterMs?:number};const message=e.message??"Unknown provider error";const lower=message.toLowerCase();const code:NormalizedAIError["code"]=e.status===429?"rate_limited":lower.includes("token")&&lower.includes("limit")?"token_limit":e.name==="AbortError"?"timeout":e.code==="invalid_json"||lower.includes("json")?"invalid_json":e.status===401||e.status===403?"authentication":e.status&&e.status>=500?"unavailable":"unknown";return {provider:this.providerId,code,message,retryable:["rate_limited","timeout","invalid_json","unavailable"].includes(code),...(e.retryAfterMs!==undefined?{retryAfterMs:e.retryAfterMs}:{}),...(e.status!==undefined?{status:e.status}:{})};}
}
