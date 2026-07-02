"use client";

import { useMemo, useState } from "react";
import { addAlias, getAliases } from "@/lib/playerAliases";

type Player = {
  id: string;
  name: string;
  side: string;
};

type AliasRecord = {
  id: string;
  alias: string;
  normalized_alias: string;
};

interface Props {
  players: Player[];
}

export default function PlayerList({ players }: Props) {
  const [search, setSearch] = useState("");
  const [aliases, setAliases] = useState<Record<string, AliasRecord[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!search) return players;

    return players.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [players, search]);

  async function carregarAliases(playerId: string) {
    if (aliases[playerId]) return;

    const data = await getAliases(playerId);
    setAliases((current) => ({ ...current, [playerId]: data as AliasRecord[] }));
  }

  async function salvarAlias(playerId: string) {
    const alias = (drafts[playerId] || "").trim();
    if (!alias) return;

    try {
      setLoading((current) => ({ ...current, [playerId]: true }));
      await addAlias(playerId, alias);
      setDrafts((current) => ({ ...current, [playerId]: "" }));
      setAliases((current) => ({
        ...current,
        [playerId]: [
          ...(current[playerId] || []),
          { id: `${playerId}-${alias}`, alias, normalized_alias: alias.toLowerCase() },
        ],
      }));
      setFeedback((current) => ({ ...current, [playerId]: "Alias adicionado." }));
    } catch (error: any) {
      setFeedback((current) => ({ ...current, [playerId]: error?.message || "Erro ao salvar alias." }));
    } finally {
      setLoading((current) => ({ ...current, [playerId]: false }));
    }
  }

  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar jogador..."
        className="mb-6 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((player) => (
          <div
            key={player.id}
            className={`rounded-2xl border p-5 transition hover:scale-[1.02] ${
              player.side === "PEDRO"
                ? "border-red-700 bg-red-950/20"
                : "border-green-700 bg-green-950/20"
            }`}
          >
            <h2 className="text-xl font-bold">{player.name}</h2>

            <p className="mt-1 text-sm text-zinc-400">
              {player.side === "PEDRO" ? "São Paulo" : "Palmeiras"}
            </p>

            <button
              type="button"
              onClick={() => carregarAliases(player.id)}
              className="mt-4 text-sm font-semibold text-blue-300"
            >
              Ver aliases
            </button>

            <div className="mt-4 space-y-2">
              {(aliases[player.id] || []).length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum alias cadastrado.</p>
              ) : (
                aliases[player.id].map((alias) => (
                  <div key={alias.id} className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm">
                    {alias.alias}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={drafts[player.id] || ""}
                onChange={(e) => setDrafts((current) => ({ ...current, [player.id]: e.target.value }))}
                placeholder="Novo alias"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => salvarAlias(player.id)}
                disabled={loading[player.id]}
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold"
              >
                {loading[player.id] ? "..." : "Salvar"}
              </button>
            </div>

            {feedback[player.id] ? (
              <p className="mt-2 text-xs text-zinc-400">{feedback[player.id]}</p>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}