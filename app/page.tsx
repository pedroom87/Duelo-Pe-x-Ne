"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Stats = {
  total: number;
  pedroVitorias: number;
  netuVitorias: number;
  empates: number;
};

type VerificationStats = {
  total: number;
  verified: number;
  pending: number;
};

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pedroVitorias: 0,
    netuVitorias: 0,
    empates: 0,
  });
  const [verificationStats, setVerificationStats] = useState<VerificationStats>({
    total: 0,
    verified: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregarEstatisticas() {
      try {
        // Busca TODAS as partidas (sem filtro de status)
        const { data: matches, error: err } = await supabase
          .from("matches")
          .select("id, winner, pedro_goals, netu_goals, verified");

        if (err) {
          console.error("Erro ao carregar estatísticas:", err);
          setError("Erro ao carregar estatísticas");
          setLoading(false);
          return;
        }

        if (!matches || matches.length === 0) {
          setStats({ total: 0, pedroVitorias: 0, netuVitorias: 0, empates: 0 });
          setError(null);
          setLoading(false);
          return;
        }

        // Calcula as estatísticas
        const total = matches.length;
        const pedroVitorias = matches.filter(
          (m) => m.winner === "PEDRO" || m.winner === "Pedro"
        ).length;
        const netuVitorias = matches.filter(
          (m) => m.winner === "NETU" || m.winner === "Netu"
        ).length;
        const empates = matches.filter(
          (m) =>
            m.pedro_goals === m.netu_goals ||
            m.winner === "EMPATE" ||
            m.winner === "Empate"
        ).length;

        setStats({
          total,
          pedroVitorias,
          netuVitorias,
          empates,
        });
        setVerificationStats({
          total,
          verified: matches.filter((m) => m.verified).length,
          pending: matches.filter((m) => !m.verified).length,
        });
        setError(null);
      } catch (err: any) {
        console.error("Erro:", err);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }

    carregarEstatisticas();
  }, []);

  const navItems = [
    { label: "Nova Partida", href: "/partidas/nova" },
    { label: "Histórico", href: "/historico" },
    { label: "Rankings", href: "/rankings" },
    { label: "Disciplina", href: "/disciplina" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white sm:pb-0">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-400 sm:text-sm">
              São Paulo x Palmeiras
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Duelo Pe X Ne
            </h1>
          </div>

          <div className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
            Pedro × Netu
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-red-900/60 bg-red-950/30 p-6 sm:p-8">
            <p className="text-sm font-bold uppercase text-red-300">Pedro</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">São Paulo</h2>
            <p className="mt-4 text-zinc-300">Tricolor Paulista</p>
          </div>

          <div className="rounded-3xl border border-green-900/60 bg-green-950/30 p-6 sm:p-8">
            <p className="text-sm font-bold uppercase text-green-300">Netu</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Palmeiras</h2>
            <p className="mt-4 text-zinc-300">Alviverde Imponente</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Jogos", loading ? "-" : stats.total],
            ["Vitórias Pedro", loading ? "-" : stats.pedroVitorias],
            ["Vitórias Netu", loading ? "-" : stats.netuVitorias],
            ["Empates", loading ? "-" : stats.empates],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">Conferência</p>
              <h2 className="mt-2 text-2xl font-black">{verificationStats.verified}/{verificationStats.total} conferidas</h2>
            </div>
            <div className="text-sm text-zinc-400">
              <p>Conferidas: {verificationStats.verified}</p>
              <p>Pendentes: {verificationStats.pending}</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${verificationStats.total ? (verificationStats.verified / verificationStats.total) * 100 : 0}%` }}
            />
          </div>
        </section>

        {error && (
          <p className="mt-4 text-xs text-zinc-500">
            ⚠️ {error}
          </p>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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