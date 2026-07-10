import type { Request,Response } from "express";
import type { WorkspaceModuleType } from "@openforge/shared";
import { NotFoundError,UnauthorizedError } from "../lib/http-error.js";
import { workspaceIntelligenceService } from "../services/workspace-intelligence.service.js";
const user=(req:Request)=>{if(!req.auth)throw new UnauthorizedError();return req.auth.userId;};
const repo=(req:Request)=>{const value=req.params.repositoryId;if(!value)throw new NotFoundError("repositoryId is required");return value;};
const moduleType=(req:Request)=>{const value=req.params.moduleType as WorkspaceModuleType;if(!["explorer","mission","mentor","review","timeline"].includes(value))throw new NotFoundError("Unknown Workspace module");return value;};
export async function prepareWorkspace(req:Request,res:Response){const result=await workspaceIntelligenceService.prepare(user(req),repo(req),Boolean(req.body?.force));res.status(result.accepted?202:200).json(result);}
export async function workspaceStatus(req:Request,res:Response){res.json(await workspaceIntelligenceService.status(user(req),repo(req)));}
export async function workspaceContext(req:Request,res:Response){res.json(await workspaceIntelligenceService.getModule(user(req),repo(req),"explorer"));}
export async function workspaceModule(req:Request,res:Response){res.json(await workspaceIntelligenceService.getModule(user(req),repo(req),moduleType(req)));}
export async function regenerateModule(req:Request,res:Response){res.status(202).json(await workspaceIntelligenceService.prepare(user(req),repo(req),true));}
export async function mentorQuery(req:Request,res:Response){const question=String(req.body?.question??"").trim();if(!question)throw new NotFoundError("A Mentor question is required");const depth=["beginner","standard","maintainer"].includes(req.body?.depth)?req.body.depth:"standard";res.json(await workspaceIntelligenceService.mentorQuery(user(req),repo(req),question,depth,req.body?.sourceModule));}
export async function mentorHistory(req:Request,res:Response){res.json(await workspaceIntelligenceService.history(user(req),repo(req)));}
