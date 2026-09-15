import { NextResponse } from "next/server";
import { getGitHubConfig, getRepoInfo } from "@/lib/github/client";
import { readDataFile } from "@/lib/data/store";
import { toErrorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const config = getGitHubConfig();
    const repo = await getRepoInfo(config);
    const { data: metadata } = await readDataFile("metadata", config);

    return NextResponse.json({
      connected: true,
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      repoFullName: repo.fullName,
      repoPrivate: repo.private,
      lastBackupAt: metadata.lastBackupAt,
      lastSyncAt: metadata.lastSyncAt,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
