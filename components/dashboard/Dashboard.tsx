"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccess } from "@/components/auth/AccessContext";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { TeamMascot } from "@/components/teams/TeamMascot";
import {
  getDashboardStats,
  type DashboardStats,
  type VerificationStats,
} from "@/lib/dashboard";
import { LanguageSelector, useI18n } from "@/lib/i18n/client";
import { getNavItemLabel } from "@/lib/i18n/navigation";
import { getVisibleNavItems } from "@/lib/navigation";
import type { VersionInfo } from "@/lib/version";
import { TEAM_ORDER, getTeamTheme, type TeamSide } from "@/utils/constants";


type DashboardProps = {
  versionInfo: VersionInfo;
};

const emptyStats: DashboardStats = {
  total: 0,
  pedroVitorias: 0,
  netuVitorias: 0,
  empates: 0,
};

const emptyVerificationStats: VerificationStats = {
  total: 0,
  verified: 0,
  pending: 0,
};

type StatCard = {
  label: string;
  value: number | string;
  side?: TeamSide;
};

const CHAMPIONSHIP_MASCOTS_IMAGE = "/mascotes/duelo-mascotes.png";

export default function Dashboard({ versionInfo }: DashboardProps) {
  const { profile } = useAccess();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [verificationStats, setVerificationStats] =
    useState<VerificationStats>(emptyVerificationStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navItems = getVisibleNavItems(profile, "dashboard");

  useEffect(() => {
    async function carregarEstatisticas() {
      try {
        const data = await getDashboardStats();

        setStats(data.stats);
        setVerificationStats(data.verificationStats);
        setError(null);
      } catch (err: unknown) {
        console.error("Erro:", err);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }

    carregarEstatisticas();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white sm:pb-0">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <TeamMascot side="PEDRO" size="lg" priority />
              <TeamMascot side="NETU" size="lg" priority />
            </div>
            <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-400 sm:text-sm">
              São Paulo x Palmeiras
            </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Duel Legacy
              </h1>

              <p className="mt-2 text-xs uppercase tracking-[0.35em] text-zinc-400 sm:text-sm">
                Duelo Pe × Ne
              </p>

            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TeamBadge side="PEDRO" label="Pedro" withMascot />
            <TeamBadge side="NETU" label="Netu" withMascot />
            <LanguageSelector />
          </div>
        </header>

        <section className="mb-8 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
          <div className="relative min-h-[26rem] sm:min-h-[23rem] lg:min-h-[20rem]">
            <div className="absolute inset-x-0 top-0 h-60 overflow-hidden lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[54%]">
              <Image
                src={CHAMPIONSHIP_MASCOTS_IMAGE}
                alt="Mascotes do campeonato Duelo Pe × Ne"
                fill
                priority
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover opacity-85"
                style={{
                  objectPosition: "center top",
                  transform: "scale(1.08)",
                  transformOrigin: "top center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-25% via-zinc-950/85 via-60% to-zinc-950 lg:bg-gradient-to-l lg:from-zinc-950/10 lg:via-zinc-950/70 lg:to-zinc-900" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-zinc-950/95 lg:h-44" />
            </div>

            <div className="relative z-10 flex min-h-[26rem] flex-col justify-end p-5 sm:min-h-[23rem] sm:p-8 lg:min-h-[20rem] lg:w-[58%] lg:justify-center">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">
                {t("common.productGlobal")}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Duel Legacy
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/85 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                    {t("common.currentChampionship")}
                  </p>
                  <p className="mt-2 text-xl font-black">Duelo Pe × Ne</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/85 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                    {t("common.rivalry")}
                  </p>
                  <p className="mt-2 text-xl font-black">Pedro × Netu</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-red-800/60 bg-red-950/25 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-200">
                    Pedro
                  </p>
                  <p className="mt-1 font-black text-white">São Paulo</p>
                  <div className="mt-3 grid grid-cols-[1fr_1fr_1fr] gap-1">
                    <span className="h-1 rounded-full bg-red-600" />
                    <span className="h-1 rounded-full bg-white" />
                    <span className="h-1 rounded-full bg-zinc-800" />
                  </div>
                </div>

                <div className="rounded-2xl border border-green-800/60 bg-green-950/25 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-200">
                    Netu
                  </p>
                  <p className="mt-1 font-black text-white">Palmeiras</p>
                  <div className="mt-3 grid grid-cols-[2fr_1fr] gap-1">
                    <span className="h-1 rounded-full bg-green-600" />
                    <span className="h-1 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {TEAM_ORDER.map((side) => {
            const team = getTeamTheme(side);

            return (
              <div
                key={side}
                className={`overflow-hidden rounded-3xl border p-6 sm:p-8 ${team.classes.border} ${team.classes.panel}`}
              >
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className={`text-sm font-bold uppercase ${team.classes.text}`}>
                      {team.owner}
                    </p>
                    <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                      {team.club}
                    </h2>
                    <p className="mt-4 text-zinc-300">{team.identity}</p>
                  </div>
                  <TeamMascot side={side} size="xl" priority />
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {([
            { label: t("dashboard.games"), value: loading ? "-" : stats.total },
            {
              label: t("dashboard.pedroWins"),
              value: loading ? "-" : stats.pedroVitorias,
              side: "PEDRO",
            },
            {
              label: t("dashboard.netuWins"),
              value: loading ? "-" : stats.netuVitorias,
              side: "NETU",
            },
            { label: t("dashboard.draws"), value: loading ? "-" : stats.empates },
          ] satisfies StatCard[]).map((item) => {
            const team = item.side ? getTeamTheme(item.side) : null;

            return (
              <div
                key={item.label}
                className={`rounded-2xl border p-6 ${
                  team
                    ? `${team.classes.border} ${team.classes.panel}`
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-zinc-400">{item.label}</p>
                  {item.side ? <TeamBadge side={item.side} /> : null}
                </div>
                <p className="mt-2 text-3xl font-black">{item.value}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">
                Conferência
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {verificationStats.verified}/{verificationStats.total} conferidas
              </h2>
            </div>
            <div className="text-sm text-zinc-400">
              <p>Conferidas: {verificationStats.verified}</p>
              <p>Pendentes: {verificationStats.pending}</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-green-500"
              style={{
                width: `${
                  verificationStats.total
                    ? (verificationStats.verified / verificationStats.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">
            {t("common.version")}
          </p>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            <p>
              {t("common.currentVersion")}:{" "}
              <span className="font-mono font-bold text-white">
                v{versionInfo.number}
              </span>
            </p>

            <p>
              {t("common.codename")}:{" "}
              <span className="font-mono font-bold text-white">
                {versionInfo.codename}
              </span>
            </p>

            <p>
              {t("common.date")}:{" "}
              <span className="font-mono font-bold text-white">
                {(() => {
                  const [yyyy, mm, dd] = versionInfo.releasedAt.split("-");
                  return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : versionInfo.releasedAt;
                })()}
              </span>
            </p>


            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
                {t("common.highlights")}
              </p>
              <ul className="mt-2 space-y-1">
                {versionInfo.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-zinc-300" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {error && <p className="mt-4 text-xs text-zinc-500">⚠️ {error}</p>}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-left font-bold transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              {getNavItemLabel(item.href, item.label, t)}
            </Link>
          ))}

          <Link
            href="/projeto"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-left transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            <span className="block font-bold">{t("nav.project")}</span>
            <span className="mt-1 block text-sm font-semibold text-zinc-400">
              {t("dashboard.projectDescription")}
            </span>
          </Link>
        </section>
      </section>
    </main>
  );
}
