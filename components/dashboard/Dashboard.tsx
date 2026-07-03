"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { TeamMascot } from "@/components/teams/TeamMascot";
import {
  getDashboardStats,
  type DashboardStats,
  type VerificationStats,
} from "@/lib/dashboard";
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

const navItems = [
  { label: "Nova Partida", href: "/partidas/nova" },
  { label: "Histórico", href: "/historico" },
  { label: "Rankings", href: "/rankings" },
  { label: "Disciplina", href: "/disciplina" },
  { label: "Jogadores", href: "/jogadores" },
];

type StatCard = {
  label: string;
  value: number | string;
  side?: TeamSide;
};

export default function Dashboard({ versionInfo }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [verificationStats, setVerificationStats] =
    useState<VerificationStats>(emptyVerificationStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              Duelo Pe X Ne
            </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TeamBadge side="PEDRO" label="Pedro" withMascot />
            <TeamBadge side="NETU" label="Netu" withMascot />
          </div>
        </header>

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
            { label: "Jogos", value: loading ? "-" : stats.total },
            {
              label: "Vitórias Pedro",
              value: loading ? "-" : stats.pedroVitorias,
              side: "PEDRO",
            },
            {
              label: "Vitórias Netu",
              value: loading ? "-" : stats.netuVitorias,
              side: "NETU",
            },
            { label: "Empates", value: loading ? "-" : stats.empates },
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
            Versão
          </p>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            <p>
              Versão atual:{" "}
              <span className="font-mono font-bold text-white">
                {versionInfo.version}
              </span>
            </p>
            <p>
              Último commit:{" "}
              <span className="font-mono font-bold text-white">
                {versionInfo.commit ?? "indisponível"}
              </span>
            </p>
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
              {item.label}
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}
