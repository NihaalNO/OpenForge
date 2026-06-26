import type { Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../lib/http-error.js";
import { githubService } from "../services/github.service.js";

function requireUserId(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}

function requireRepositoryParams(req: Request) {
  const { owner, repo } = req.params;

  if (!owner || !repo) {
    throw new NotFoundError("Repository route parameters are required", "repository_not_found");
  }

  return { owner, repo };
}

export async function getGitHubProfile(req: Request, res: Response) {
  res.json(await githubService.getProfile(requireUserId(req)));
}

export async function syncGitHub(req: Request, res: Response) {
  res.json(await githubService.sync(requireUserId(req)));
}

export async function listGitHubRepositories(req: Request, res: Response) {
  res.json(await githubService.listRepositories(requireUserId(req)));
}

export async function getGitHubRepository(req: Request, res: Response) {
  const { owner, repo } = requireRepositoryParams(req);

  res.json(await githubService.getRepository(requireUserId(req), owner, repo));
}

export async function listGitHubRepositoryIssues(req: Request, res: Response) {
  const { owner, repo } = requireRepositoryParams(req);

  res.json(await githubService.listIssues(requireUserId(req), owner, repo));
}

export async function syncGitHubRepositoryIssues(req: Request, res: Response) {
  const { owner, repo } = requireRepositoryParams(req);

  res.json(await githubService.syncIssues(requireUserId(req), owner, repo));
}
