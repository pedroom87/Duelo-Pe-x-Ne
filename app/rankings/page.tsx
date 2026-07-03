"use client";

import { useEffect, useState } from "react";
import { TeamBadge } from "@/components/teams/TeamBadge";
import {
  getRankings,
  type RankingEventType,
  type RankingSnapshot,
} from "@/lib/rankings";

const tipos: Array<[RankingEventType, string]> = [
  ["GOL", "Artilharia"],
  ["ASSISTENCIA", "Assistências"],
  ["AMARELO", "Amarelos"],
  ["VERMELHO", "Vermelhos"],
  ["LESAO", "Lesões"],
  ["GOL_CONTRA", "Gols contra"],
];

export default function Rankings() {
  const [rankings, setRankings] = useState<RankingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function carregar() {
      try {
        const data = await getRankings();
        setRankings(data);
      } catch (error: unknown) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white">
        Carregando rankings...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <h1 className="text-3xl font-black sm:text-4xl">Rankings</h1>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {tipos.map(([tipo, titulo]) => {
          const entries = rankings?.[tipo] || [];
          const visibleEntries = expanded[tipo] ? entries : entries.slice(0, 5);

          return (
            <div
              key={tipo}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6"
            >
              <h2 className="text-2xl font-black">{titulo}</h2>

              <div className="mt-5 space-y-3">
                {visibleEntries.map((player, index) => (
                  <div
                    key={`${player.key}-${index}`}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      player.side === "PEDRO"
                        ? "border-red-900/50 bg-red-950/20"
                        : "border-green-900/50 bg-green-950/20"
                    }`}
                  >
                    <div>
                      <p className="font-bold">
                        {index + 1}. {player.displayName}
                      </p>
                      <div className="mt-1">
                        <TeamBadge side={player.side} withMascot />
                      </div>
                    </div>

                    <p className="text-2xl font-black">{player.total}</p>
                  </div>
                ))}
              </div>

              {entries.length > 5 ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [tipo]: !current[tipo],
                    }))
                  }
                  className="mt-4 text-sm font-semibold text-blue-300"
                >
                  {expanded[tipo] ? "Mostrar menos" : "Ver todos"}
                </button>
              ) : null}
            </div>
          );
        })}
      </section>
    </main>
  );
}
