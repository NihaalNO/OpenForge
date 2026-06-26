import { RepositoryDetail } from "@/components/github/repository-detail";

export default async function RepositoryExplorerPage({
  params
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return <RepositoryDetail owner={decodeURIComponent(owner)} repo={decodeURIComponent(repo)} />;
}
