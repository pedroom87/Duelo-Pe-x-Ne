"use client";

import { useMemo, useState } from "react";
import type { PlayerAlias, PlayerWithAliases } from "@/lib/players";
import {
  addAlias,
  getAliases,
  mergePlayers,
  recalculateEventPlayerIds,
} from "@/lib/playerAliases";

interface Props {
  players: PlayerWithAliases[];
}

function getSideLabel(side: string) {
  return side === "PEDRO" ? "São Paulo" : "Palmeiras";
}

function getSideShort(side: string) {
  return side === "PEDRO" ? "SPFC" : "SEP";
}

function buildAliasState(players: PlayerWithAliases[]) {
  return Object.fromEntries(
    players.map((player) => [player.id, player.aliases])
  ) as Record<string, PlayerAlias[]>;
}

function sortAliases(aliases: PlayerAlias[]) {
  return [...aliases].sort((a, b) => a.alias.localeCompare(b.alias));
}

export default function PlayerList({ players }: Props) {
  const [playerList, setPlayerList] = useState<PlayerWithAliases[]>(players);
  const [aliasesByPlayerId, setAliasesByPlayerId] = useState(buildAliasState(players));
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [aliasLoadingId, setAliasLoadingId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState(players[0]?.id ?? "");
  const [mergeTargetId, setMergeTargetId] = useState(players[1]?.id ?? "");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return playerList;

    return playerList.filter((player) => {
      const aliases = aliasesByPlayerId[player.id] ?? [];

      return (
        player.name.toLowerCase().includes(term) ||
        aliases.some((alias) => alias.alias.toLowerCase().includes(term))
      );
    });
  }, [aliasesByPlayerId, playerList, search]);

  async function salvarAlias(playerId: string) {
    const alias = (drafts[playerId] || "").trim();
    if (!alias) return;

    try {
      setAliasLoadingId(playerId);
      const savedAlias = await addAlias(playerId, alias);

      setDrafts((current) => ({ ...current, [playerId]: "" }));
      setAliasesByPlayerId((current) => {
        const currentAliases = current[playerId] ?? [];
        const nextAliases = currentAliases.some((item) => item.id === savedAlias.id)
          ? currentAliases
          : sortAliases([...currentAliases, savedAlias]);

        return {
          ...current,
          [playerId]: nextAliases,
        };
      });
      setFeedback("Alias salvo.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar alias.";
      setFeedback(message);
    } finally {
      setAliasLoadingId(null);
    }
  }

  async function handleMergePlayers() {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;

    const source = playerList.find((player) => player.id === mergeSourceId);
    const target = playerList.find((player) => player.id === mergeTargetId);

    if (!source || !target) return;

    const confirmed = window.confirm(`Mesclar ${source.name} em ${target.name}?`);
    if (!confirmed) return;

    try {
      setMergeLoading(true);
      const result = await mergePlayers({
        sourcePlayerId: mergeSourceId,
        targetPlayerId: mergeTargetId,
      });
      const targetAliases = await getAliases(mergeTargetId);

      setAliasesByPlayerId((current) => {
        const next = {
          ...current,
          [mergeTargetId]: targetAliases,
        };

        if (result.deletedSourcePlayer) {
          delete next[mergeSourceId];
        }

        return next;
      });

      if (result.deletedSourcePlayer) {
        setPlayerList((current) =>
          current.filter((player) => player.id !== mergeSourceId)
        );
        setMergeSourceId(mergeTargetId);
        const nextTarget = playerList.find(
          (player) => player.id !== mergeTargetId && player.id !== mergeSourceId
        );
        setMergeTargetId(nextTarget?.id ?? "");
      }

      setFeedback(
        `Mesclagem concluída: ${result.updatedEvents} evento(s), ${result.transferredAliases} alias(es).`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao mesclar jogadores.";
      setFeedback(message);
    } finally {
      setMergeLoading(false);
    }
  }

  async function handleRecalculateRankings() {
    try {
      setRecalculateLoading(true);
      const result = await recalculateEventPlayerIds();
      setFeedback(
        `Recálculo concluído: ${result.updatedEvents}/${result.processedEvents} evento(s) atualizados, ${result.unresolvedEvents} sem vínculo.`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao recalcular rankings.";
      setFeedback(message);
    } finally {
      setRecalculateLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar jogador ou alias..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        />

        <button
          type="button"
          onClick={handleRecalculateRankings}
          disabled={recalculateLoading}
          className="rounded-xl border border-blue-700 bg-blue-900/40 px-5 py-4 font-bold text-blue-200 transition hover:bg-blue-900/60 disabled:opacity-50"
        >
          {recalculateLoading ? "Recalculando..." : "Recalcular Rankings"}
        </button>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
        <h2 className="text-xl font-black">Mesclar jogadores</h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm text-zinc-300">
            Origem
            <select
              value={mergeSourceId}
              onChange={(event) => setMergeSourceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3"
            >
              {playerList.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} - {getSideShort(player.side)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-zinc-300">
            Destino
            <select
              value={mergeTargetId}
              onChange={(event) => setMergeTargetId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3"
            >
              {playerList.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} - {getSideShort(player.side)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleMergePlayers}
            disabled={
              mergeLoading ||
              !mergeSourceId ||
              !mergeTargetId ||
              mergeSourceId === mergeTargetId
            }
            className="self-end rounded-lg bg-zinc-800 px-5 py-3 font-bold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {mergeLoading ? "Mesclando..." : "Mesclar"}
          </button>
        </div>
      </section>

      {feedback ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {feedback}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((player) => {
          const aliases = aliasesByPlayerId[player.id] ?? [];

          return (
            <div
              key={player.id}
              className={`rounded-2xl border p-5 ${
                player.side === "PEDRO"
                  ? "border-red-700 bg-red-950/20"
                  : "border-green-700 bg-green-950/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Nome oficial
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{player.name}</h2>
                </div>

                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
                  {getSideShort(player.side)}
                </span>
              </div>

              <p className="mt-2 text-sm text-zinc-400">{getSideLabel(player.side)}</p>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Aliases
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {aliases.length === 0 ? (
                    <span className="text-sm text-zinc-500">Nenhum alias</span>
                  ) : (
                    aliases.map((alias) => (
                      <span
                        key={alias.id}
                        className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300"
                      >
                        {alias.alias}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <input
                  value={drafts[player.id] || ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [player.id]: event.target.value,
                    }))
                  }
                  placeholder="Novo alias"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm"
                />

                <button
                  type="button"
                  onClick={() => salvarAlias(player.id)}
                  disabled={aliasLoadingId === player.id}
                  className="rounded-lg bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  {aliasLoadingId === player.id ? "..." : "Salvar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
