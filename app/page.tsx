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

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pedroVitorias: 0,
    netuVitorias: 0,
    empates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarEstatisticas() {
      try {
        // Busca todas as partidas encerradas
        const { data: matches, error } = await supabase
          .from("matches")
          .select("id, winner, status")
          .eq("status", "CLOSED");

        if (error) {
          console.error("Erro ao carregar estatísticas:", error);
          setLoading(false);
          return;
        }

        if (!matches || matches.length === 0) {
          setStats({ total: 0, pedroVitorias: 0, netuVitorias: 0, empates: 0 });
          setLoading(false);
          return;
        }

        // Calcula as estatísticas
        const total = matches.length;
        const pedroVitorias = matches.filter((m) => m.winner === "PEDRO").length;
        const netuVitorias = matches.filter((m) => m.winner === "NETU").length;
        const empates = matches.filter((m) => m.winner === "" || m.winner === null).length;

        setStats({
          total,
          pedroVitorias,
          netuVitorias,
          empates,
        });
      } catch (err) {
        console.error("Erro:", err);
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">
              São Paulo x Palmeiras
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Duelo Pe X Ne
            </h1>
          </div>

          <div className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
            Pedro × Netu
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-red-900/60 bg-red-950/30 p-8">
            <p className="text-sm font-bold uppercase text-red-300">Pedro</p>
            <h2 className="mt-2 text-3xl font-black">São Paulo</h2>
            <p className="mt-4 text-zinc-300">Tricolor Paulista</p>
          </div>

          <div className="rounded-3xl border border-green-900/60 bg-green-950/30 p-8">
            <p className="text-sm font-bold uppercase text-green-300">Netu</p>
            <h2 className="mt-2 text-3xl font-black">Palmeiras</h2>
            <p className="mt-4 text-zinc-300">Alviverde Imponente</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
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

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5 text-left font-bold transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              {item.label}
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}