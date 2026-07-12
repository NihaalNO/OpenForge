import { createHash } from "node:crypto";
import type { RepositoryEvidencePackage, RepositoryEvidenceItem } from "@openforge/shared";
import type { AITaskType } from "../providers/ai-provider.interface.js";
export interface MapTask {id:string;taskType:AITaskType;evidence:RepositoryEvidenceItem[];evidenceHash:string;}
function typeFor(item:RepositoryEvidenceItem):AITaskType{return item.type==="readme"?"readme_summary":item.type==="manifest"?"manifest_analysis":item.type==="workflow"?"workflow_analysis":item.type==="test"?"test_analysis":item.type==="issue"?"issue_summary":item.type==="pull_request"?"pull_request_summary":item.type==="directory"?"directory_summary":"file_summary";}
export class TaskDecomposerService {decompose(pkg:RepositoryEvidencePackage):MapTask[]{const groups=new Map<string,RepositoryEvidenceItem[]>();for(const item of pkg.evidence){if(item.type==="repository_metadata")continue;const taskType=typeFor(item);const key=`${taskType}:${item.path??item.id}`;groups.set(key,[...(groups.get(key)??[]),item]);}return [...groups.entries()].map(([id,evidence])=>({id,taskType:typeFor(evidence[0]!),evidence,evidenceHash:createHash("sha256").update(JSON.stringify(evidence.map(e=>[e.id,e.content]))).digest("hex")}));}}
export const taskDecomposerService=new TaskDecomposerService();
