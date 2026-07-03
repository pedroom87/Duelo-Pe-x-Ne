import { execFileSync } from "node:child_process";

const APP_VERSION = "v0.6.1";

export type VersionInfo = {
  version: string;
  commit: string | null;
};

function getCommitFromEnv() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    null
  );
}

function getCommitFromGit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export async function getVersionInfo(): Promise<VersionInfo> {
  const commit = getCommitFromEnv() || getCommitFromGit();

  return {
    version: APP_VERSION,
    commit: commit ? commit.slice(0, 7) : null,
  };
}
