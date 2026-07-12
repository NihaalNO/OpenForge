import { createHash } from "node:crypto";
import type { RepositoryEvidenceItem, RepositoryEvidencePackage, RepositoryEvidenceType, RepositoryKnowledgePackage, WorkspaceModuleType } from "@openforge/shared";
import { env } from "../config/env.js";
import { budgetAfterSafetyMargin, estimateTokens } from "../utils/token-estimator.js";

export interface WorkspaceEvidenceContext { activeMission?: unknown; selectedModule?: string; mentorQuestion?: string; reviewState?: unknown; timelineEvents?: unknown[]; learningHistory?: unknown[]; collaboration?: Record<string, unknown>; }
export interface EvidenceExtractionIdentity { contextSnapshotId: string; headSha: string; }
const budgets: Record<WorkspaceModuleType, () => number> = { explorer:()=>env.WORKSPACE_EXPLORER_INPUT_TOKEN_BUDGET, mission:()=>env.WORKSPACE_MISSION_INPUT_TOKEN_BUDGET, mentor:()=>env.WORKSPACE_MENTOR_INPUT_TOKEN_BUDGET, review:()=>env.WORKSPACE_REVIEW_INPUT_TOKEN_BUDGET, timeline:()=>env.WORKSPACE_TIMELINE_INPUT_TOKEN_BUDGET };
const words=(value:string)=>new Set(value.toLowerCase().split(/[^a-z0-9_]+/).filter((x)=>x.length>2));
const compact=(value:unknown)=>typeof value==="string"?value:JSON.stringify(value);
const id=(type:string,key:string)=>createHash("sha256").update(`${type}:${key}`).digest("hex").slice(0,16);

export class RepositoryEvidenceExtractorService {
  extract(knowledge: RepositoryKnowledgePackage, moduleType: WorkspaceModuleType, identity: EvidenceExtractionIdentity, context: WorkspaceEvidenceContext = {}): RepositoryEvidencePackage {
    const started=Date.now(); const candidates: RepositoryEvidenceItem[]=[]; const query=words([context.mentorQuestion,context.selectedModule,compact(context.activeMission??"")].filter(Boolean).join(" "));
    const add=(type:RepositoryEvidenceType,title:string,content:unknown,base:number,path?:string,identifier?:string)=>{let value=compact(content);if(!value||value==="{}"||value==="[]")return;let truncated=false;if(value.length>env.WORKSPACE_MAX_EVIDENCE_ITEM_CHARS){value=`${value.slice(0,env.WORKSPACE_MAX_EVIDENCE_ITEM_CHARS-24)}\n[excerpt truncated]`;truncated=true;}const hay=words(`${title} ${path??""} ${value}`);const matches=[...query].filter((term)=>hay.has(term)).length;const score=base+matches*20+(path&&knowledge.entryPoints.some((x)=>x.path===path)?18:0)+(path&&knowledge.testStructure.testFiles.includes(path)?8:0);const draft={id:id(type,path??identifier??title),type,...(path?{path}:{}),...(identifier?{identifier}:{}),title,content:value,relevanceScore:score,sourceSha:identity.headSha,truncated};candidates.push({...draft,estimatedTokens:estimateTokens(JSON.stringify(draft))+4});};

    add("repository_metadata","Repository identity",{fullName:knowledge.fullName,defaultBranch:knowledge.defaultBranch,stack:knowledge.detectedStack,complexity:knowledge.complexity},100);
    if(moduleType==="timeline"){
      for(const [i,event] of (context.timelineEvents??[]).entries())add("timeline_event",`Timeline event ${i+1}`,event,90,undefined,String(i));
      for(const [i,event] of (context.learningHistory??[]).entries())add("learning_history",`Learning history ${i+1}`,event,75,undefined,String(i));
    } else {
      if(knowledge.readme.content)add("readme",knowledge.readme.path??"README",knowledge.readme.summaryHint??knowledge.readme.content,88,knowledge.readme.path??undefined);
      for(const manifest of knowledge.manifests)add("manifest",manifest.path,manifest.parsed??manifest.contentPreview,86,manifest.path);
      for(const entry of knowledge.entryPoints)add("file",entry.path,{summary:entry.reason,category:"entry point"},84,entry.path);
      for(const directory of knowledge.tree.directories)add("directory",directory.path,{category:directory.category,importance:directory.importance},directory.importance==="high"?70:45,directory.path);
      for(const file of knowledge.tree.importantFiles)add(knowledge.testStructure.testFiles.includes(file.path)?"test":"file",file.path,{category:file.category,importance:file.importance,summary:file.reason},file.importance==="high"?68:48,file.path);
      for(const workflow of knowledge.workflowFiles)add("workflow",workflow.path,workflow.contentPreview,moduleType==="explorer"?48:65,workflow.path);
      if(knowledge.docs.docFiles.length)add("documentation","Repository standards",{files:knowledge.docs.docFiles,contributionGuide:knowledge.docs.hasContributingGuide,license:knowledge.docs.hasLicense},moduleType==="mission"||moduleType==="review"?90:55);
      if(knowledge.testStructure.hasTests)add("test","Test structure",knowledge.testStructure,moduleType==="mission"||moduleType==="review"?82:58);
      if((moduleType==="mission"||moduleType==="review"||moduleType==="mentor")&&context.activeMission)add("mission","Active Mission",context.activeMission,100,undefined,"active-mission");
      if(moduleType==="review"&&context.reviewState)add("mission","Deterministic review state",context.reviewState,98,undefined,"review-state");
      if(moduleType==="mentor"&&context.mentorQuestion)add("documentation","Mentor question",context.mentorQuestion,120,undefined,"mentor-question");
      const collaboration=context.collaboration??{};
      if(moduleType==="mission"||moduleType==="review")for(const issue of Array.isArray(collaboration.issues)?collaboration.issues:[])add("issue","Selected issue",issue,94,undefined,compact((issue as {id?:unknown}).id??"issue"));
    }
    const before=candidates.reduce((n,x)=>n+x.estimatedTokens,0); candidates.sort((a,b)=>b.relevanceScore-a.relevanceScore||a.id.localeCompare(b.id));
    const configured=budgets[moduleType](); const promptEnvelopeReservation=estimateTokens(JSON.stringify({repositoryId:knowledge.repositoryId,repositoryFullName:knowledge.fullName,contextSnapshotId:identity.contextSnapshotId,headSha:identity.headSha,moduleType,promptVersion:"workspace-prompt-version",contentVersion:"workspace-content-version"}))+40; const usable=Math.max(0,budgetAfterSafetyMargin(configured,env.WORKSPACE_PROMPT_TOKEN_SAFETY_MARGIN)-promptEnvelopeReservation); const selected:RepositoryEvidenceItem[]=[];let used=0;
    for(const candidate of candidates){if(selected.length>=env.WORKSPACE_MAX_EVIDENCE_ITEMS)break;if(used+candidate.estimatedTokens<=usable){selected.push(candidate);used+=candidate.estimatedTokens;continue;}const remaining=usable-used;if(remaining>=60){const chars=Math.min(candidate.content.length,Math.floor(remaining*2.5));const content=`${candidate.content.slice(0,Math.max(0,chars-24))}\n[excerpt truncated]`;const draft={...candidate,content,truncated:true,estimatedTokens:0};const shortened={...draft,estimatedTokens:estimateTokens(JSON.stringify(draft))+4};if(used+shortened.estimatedTokens<=usable){selected.push(shortened);used+=shortened.estimatedTokens;}}}
    const result={repositoryId:knowledge.repositoryId,repositoryFullName:knowledge.fullName,contextSnapshotId:identity.contextSnapshotId,headSha:identity.headSha,moduleType,tokenBudget:configured,estimatedTokensUsed:used,evidence:selected,omittedEvidenceCount:candidates.length-selected.length,truncated:candidates.length!==selected.length||selected.some((x)=>x.truncated),generatedAt:new Date().toISOString()};
    if(env.NODE_ENV==="development")console.info("Repository evidence extraction",{repository:knowledge.fullName,module:moduleType,candidateEvidenceItems:candidates.length,selectedEvidenceItems:selected.length,estimatedTokensBeforeTrimming:before,estimatedTokensAfterTrimming:used,configuredBudget:configured,truncated:result.truncated,highestRankedEvidencePaths:selected.slice(0,8).map((x)=>x.path??x.identifier),omittedItemCount:result.omittedEvidenceCount,durationMs:Date.now()-started});
    return result;
  }
}
export const repositoryEvidenceExtractorService=new RepositoryEvidenceExtractorService();
