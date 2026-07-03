import { execFileSync } from "node:child_process";

export type VersionInfo = {
  number: string;
  codename: string;
  releasedAt: string; // YYYY-MM-DD
  commit: string | null;
  highlights: string[];
};

// Valores desta Sprint (Duelo Legacy / 0.6.1)
const VERSION_NUMBER = "0.6.1";
const VERSION_CODENAME = "Modo Visitante";
const VERSION_RELEASED_AT = "2026-07-01";
const VERSION_COMMIT = "01f76af";
const VERSION_HIGHLIGHTS = [
  "Modo visitante público",
  "Login com Supabase Auth",
  "Áreas administrativas protegidas",
];

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

function getCommit(): string | null {
  // Preferir o commit fixado da Sprint para garantir consistência visual.
  if (VERSION_COMMIT) return VERSION_COMMIT;

  const commit = getCommitFromEnv() || getCommitFromGit();
  return commit ? commit.slice(0, 7) : null;
}

export async function getVersionInfo(): Promise<VersionInfo> {
  return {
    number: VERSION_NUMBER,
    codename: VERSION_CODENAME,
    releasedAt: VERSION_RELEASED_AT,
    commit: getCommit(),
    highlights: VERSION_HIGHLIGHTS,
  };
}

