import type { RepositoryEvidencePackage, RepositoryKnowledgePackage } from "@openforge/shared";
import { validateGeneratedPayload } from "../../services/workspace-grounding.js";
export interface VerificationResult {valid:boolean;issues:string[];payload:ReturnType<typeof validateGeneratedPayload>|null;}
export class GroundingVerifierService {verify(input:unknown,knowledge:RepositoryKnowledgePackage,evidence:RepositoryEvidencePackage,collaboration:Record<string,unknown>={}):VerificationResult{try{return {valid:true,issues:[],payload:validateGeneratedPayload(input,knowledge,collaboration,evidence)};}catch(error){return {valid:false,issues:[error instanceof Error?error.message:"Grounding validation failed"],payload:null};}}}
export const groundingVerifierService=new GroundingVerifierService();
