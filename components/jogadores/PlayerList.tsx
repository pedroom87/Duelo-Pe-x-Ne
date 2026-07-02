"use client";

import { useEffect, useMemo, useState } from "react";
import { addAlias, getAliases, mergePlayers } from "@/lib/playerAliases";

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
  const [playerList, setPlayerList] = useState<Player[]>(players);
  const [search, setSearch] = useState("");
  const [aliases, setAliases] = useState<Record<string, AliasRecord[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [managedPlayerId, setManagedPlayerId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [deleteSourcePlayer, setDeleteSourcePlayer] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);

  useEffect(() => {
    setPlayerList(players);
  }, [players]);

  const filtered = useMemo(() => {
    if (!search) return playerList;

    return playerList.filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [playerList, search]);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao salvar alias.";
      setFeedback((current) => ({ ...current, [playerId]: message }));
    } finally {
      setLoading((current) => ({ ...current, [playerId]: false }));
    }
  }

  async function abrirGerenciamento(player: Player) {
    setManagedPlayerId(player.id);
    setMergeSourceId(player.id);

    const otherPlayer = playerList.find((candidate) => candidate.id !== player.id);
    setMergeTargetId(otherPlayer?.id ?? "");
    setDeleteSourcePlayer(false);
    await carregarAliases(player.id);
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
      await mergePlayers({
        sourcePlayerId: mergeSourceId,
        targetPlayerId: mergeTargetId,
        deleteSourcePlayer,
      });

      setFeedback((current) => ({ ...current, [target.id]: "Jogadores mesclados com sucesso." }));
      setManagedPlayerId(target.id);
      setMergeSourceId(target.id);
      setMergeTargetId(target.id);

      if (deleteSourcePlayer) {
        setPlayerList((current) => current.filter((player) => player.id !== source.id));
      }

      await carregarAliases(target.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao mesclar jogadores.";
      setFeedback((current) => ({ ...current, [target.id]: message }));
    } finally {
      setMergeLoading(false);
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
        {filtered.map((player) => {
          const isManaged = managedPlayerId === player.id;

          return (
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
                onClick={() => abrirGerenciamento(player)}
                className="mt-4 text-sm font-semibold text-blue-300"
              >
                Gerenciar
              </button>

              {isManaged ? (
                <div className="mt-4 space-y-4 rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Nome oficial</p>
                    <p className="mt-1 font-semibold">{player.name}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Time</p>
                    <p className="mt-1 font-semibold">
                      {player.side === "PEDRO" ? "São Paulo" : "Palmeiras"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Aliases</p>
                    <div className="mt-2 space-y-2">
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
                  </div>

                  <div className="flex gap-2">
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

                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 p-3">
                    <p className="text-sm font-semibold">Mesclar jogador</p>

                    <div className="mt-3 space-y-2">
                      <label className="block text-sm text-zinc-300">
                        Origem
                        <select
                          value={mergeSourceId}
                          onChange={(e) => setMergeSourceId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                        >
                          {playerList.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm text-zinc-300">
                        Destino
                        <select
                          value={mergeTargetId}
                          onChange={(e) => setMergeTargetId(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                        >
                          {playerList.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={deleteSourcePlayer}
                          onChange={(e) => setDeleteSourcePlayer(e.target.checked)}
                        />
                        Excluir jogador origem se não houver mais eventos
                      </label>

                      <button
                        type="button"
                        onClick={handleMergePlayers}
                        disabled={mergeLoading || !mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
                        className="w-full rounded-lg bg-blue-900/40 px-3 py-2 text-sm font-semibold text-blue-300 disabled:opacity-50"
                      >
                        {mergeLoading ? "Mesclando..." : "Mesclar jogadores"}
                      </button>
                    </div>
                  </div>

                  {feedback[player.id] ? (
                    <p className="text-xs text-zinc-400">{feedback[player.id]}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}