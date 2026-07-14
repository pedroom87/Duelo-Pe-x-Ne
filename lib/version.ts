import { execFileSync } from "node:child_process";

export type VersionInfo = {
  number: string;
  codename: string;
  releasedAt: string; // YYYY-MM-DD
  commit?: string | null;
  highlights: string[];
};

/**
 * Valores desta Sprint (Duel Legacy / 0.9.7)
 */
const VERSION_NUMBER = "0.9.7";
const VERSION_CODENAME = "Investigador de Eventos";
const VERSION_RELEASED_AT = "2026-07-14";
const VERSION_COMMIT = null;
const VERSION_HIGHLIGHTS = [
  "Validador Oficial expandido ate o evento individual",
  "Diagnostico automatico para divergencias de rankings",
  "Causa provavel exibida sem permitir correcao nesta Sprint",
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
  // Nesta Sprint, não queremos exibir commit em "release card".
  // Mantemos a função apenas para compatibilidade interna.
  if (!VERSION_COMMIT) return null;

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
