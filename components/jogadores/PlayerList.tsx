"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deletePlayerSafely,
  getPlayersWithAliases,
  getPlayerDeletionPreview,
  getPlayerEventUsageIndex,
  type ExistingPlayerDeletionPreview,
  type PlayerAlias,
  type PlayerWithAliases,
} from "@/lib/players";
import {
  addAlias,
  getAliases,
  mergePlayers,
  recalculateEventPlayerIds,
} from "@/lib/playerAliases";
import { normalizeText } from "@/lib/playerIdentity";
import { formatSupabaseError } from "@/lib/supabaseErrors";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { getTeamSide, getTeamTheme } from "@/utils/constants";

interface Props {
  players: PlayerWithAliases[];
}

function buildAliasState(players: PlayerWithAliases[]) {
  return Object.fromEntries(
    players.map((player) => [player.id, player.aliases])
  ) as Record<string, PlayerAlias[]>;
}

function sortAliases(aliases: PlayerAlias[]) {
  return [...aliases].sort((a, b) => a.alias.localeCompare(b.alias));
}

function formatSearchTerm(term: string) {
  return term.trim().toLowerCase();
}

function playerHasStrongDuplicateSignal(params: {
  a: PlayerWithAliases;
  b: PlayerWithAliases;
  aliasesByPlayerId: Record<string, PlayerAlias[]>;
}) {
  const { a, b, aliasesByPlayerId } = params;

  if (a.side !== b.side) return false;

  const aNameNorm = normalizeText(a.name);
  const bNameNorm = normalizeText(b.name);
  if (!aNameNorm || !bNameNorm) return false;

  if (aNameNorm === bNameNorm) return true;

  const aAliases = aliasesByPlayerId[a.id] ?? [];
  const bAliases = aliasesByPlayerId[b.id] ?? [];

  // aliases.normalized_alias == nome normalizado do outro
  if (aAliases.some((al) => normalizeText(al.normalized_alias ?? al.alias) === bNameNorm)) {
    return true;
  }
  if (bAliases.some((al) => normalizeText(al.normalized_alias ?? al.alias) === aNameNorm)) {
    return true;
  }

  return false;
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
  const [deletionPreview, setDeletionPreview] =
    useState<ExistingPlayerDeletionPreview | null>(null);

  const [hasAnyEvent, setHasAnyEvent] = useState<Set<string>>(new Set());
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showWithoutEvents, setShowWithoutEvents] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function carregarUso() {
      try {
        setLoadingUsage(true);
        const { hasAnyEvent } = await getPlayerEventUsageIndex();
        if (!active) return;
        setHasAnyEvent(hasAnyEvent);
      } catch (err) {
        console.error("Erro ao carregar uso por player:", err);
      } finally {
        if (active) setLoadingUsage(false);
      }
    }

    carregarUso();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = formatSearchTerm(search);
    if (!term) return playerList;

    return playerList.filter((player) => {
      const aliases = aliasesByPlayerId[player.id] ?? [];
      return (
        player.name.toLowerCase().includes(term) ||
        aliases.some((alias) => alias.alias.toLowerCase().includes(term))
      );
    });
  }, [aliasesByPlayerId, playerList, search]);

  const suspectsById = useMemo(() => {
    const byId: Record<string, true> = {};
    const playersById = new Map(playerList.map((p) => [p.id, p]));

    // só considera sinais fortes entre players com mesmo side
    for (let i = 0; i < playerList.length; i++) {
      const a = playerList[i]!;
      for (let j = i + 1; j < playerList.length; j++) {
        const b = playerList[j]!;

        if (!playersById.has(a.id) || !playersById.has(b.id)) continue;

        if (
          playerHasStrongDuplicateSignal({
            a,
            b,
            aliasesByPlayerId,
          })
        ) {
          byId[a.id] = true;
          byId[b.id] = true;
        }
      }
    }

    return byId;
  }, [aliasesByPlayerId, playerList]);

  const suspects = useMemo(() => {
    return filtered.filter((p) => suspectsById[p.id]);
  }, [filtered, suspectsById]);

  const withoutEvents = useMemo(() => {
    return filtered.filter((p) => !hasAnyEvent.has(p.id));
  }, [filtered, hasAnyEvent]);

  const counts = useMemo(() => {
    const possibleDuplicates = suspects.length;
    const withoutEventsCount = playerList.filter((p) => !hasAnyEvent.has(p.id)).length;

    const consolidated = Math.max(0, playerList.length - possibleDuplicates);

    return {
      possibleDuplicates,
      withoutEvents: withoutEventsCount,
      consolidated,
    };
  }, [hasAnyEvent, playerList, suspects.length]);

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
      const message = formatSupabaseError(error, "Erro ao salvar alias.");
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
      const message = formatSupabaseError(error, "Erro ao mesclar jogadores.");
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
      const message = formatSupabaseError(error, "Erro ao recalcular rankings.");
      setFeedback(message);
    } finally {
      setRecalculateLoading(false);
    }
  }

  async function recarregarJogadores() {
    const updatedPlayers = await getPlayersWithAliases();
    const nextSourceId = updatedPlayers[0]?.id ?? "";
    const nextTargetId =
      updatedPlayers.find((player) => player.id !== nextSourceId)?.id ?? "";

    setPlayerList(updatedPlayers);
    setAliasesByPlayerId(buildAliasState(updatedPlayers));
    setMergeSourceId(nextSourceId);
    setMergeTargetId(nextTargetId);
  }

  async function abrirExclusao(playerId: string) {
    try {
      setDeleteLoadingId(playerId);
      setDeleteConfirmation("");
      const preview = await getPlayerDeletionPreview(playerId);

      if (preview.status === "deleted") {
        await recarregarJogadores();
        setDeletionPreview(null);
        setFeedback("Jogador já foi excluído.");
        return;
      }

      setDeletionPreview(preview);
      setFeedback(null);
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao verificar jogador.");
      setFeedback(message);
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function cancelarExclusao() {
    setDeletionPreview(null);
    setDeleteConfirmation("");
  }

  async function confirmarExclusao() {
    if (!deletionPreview || deleteConfirmation !== deletionPreview.player.name) return;

    try {
      setDeleteLoadingId(deletionPreview.player.id);
      const result = await deletePlayerSafely(deletionPreview.player.id);
      await recarregarJogadores();
      cancelarExclusao();
      setFeedback(
        result.status === "deleted"
          ? "Jogador já foi excluído."
          : "Jogador excluído com sucesso."
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao excluir jogador.");
      setFeedback(message);
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function PlayerCard({ player, dim }: { player: PlayerWithAliases; dim?: boolean }) {
    const aliases = aliasesByPlayerId[player.id] ?? [];
    const side = getTeamSide(player.side);
    const team = getTeamTheme(side);

    return (
      <div
        className={`rounded-2xl border p-5 ${team.classes.border} ${team.classes.panel} ${
          dim ? "opacity-90" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Nome oficial
            </p>
            <h2 className="mt-1 text-xl font-bold">{player.name}</h2>
          </div>

          <TeamBadge side={side} withMascot />
        </div>

        <p className="mt-2 text-sm text-zinc-400">{team.club}</p>

        {dim ? (
          <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            Sem eventos vinculados
          </p>
        ) : null}

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

        <button
          type="button"
          onClick={() => abrirExclusao(player.id)}
          disabled={deleteLoadingId === player.id}
          className="mt-4 w-full rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-950/50 disabled:opacity-50"
        >
          {deleteLoadingId === player.id ? "Verificando..." : "Excluir jogador"}
        </button>
      </div>
    );
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
        <h2 className="text-xl font-black">Curadoria assistida de jogadores</h2>
        <p className="mt-2 text-sm text-zinc-400">
          O sistema sugere suspeitas (com base em nomes e aliases). Nenhuma mesclagem é automática — a decisão final é sua.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
              Possíveis duplicados
            </p>
            <p className="mt-1 text-2xl font-black">{counts.possibleDuplicates}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
              Jogadores sem eventos
            </p>
            <p className="mt-1 text-2xl font-black">
              {loadingUsage ? "-" : counts.withoutEvents}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
              Consolidados
            </p>
            <p className="mt-1 text-2xl font-black">{counts.consolidated}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-zinc-200">Possíveis duplicados</p>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={showWithoutEvents}
              onChange={(e) => setShowWithoutEvents(e.target.checked)}
              className="h-4 w-4 accent-blue-500"
              disabled={loadingUsage}
            />
            Mostrar jogadores sem eventos
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suspects.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
              Nenhuma pendência de curadoria encontrada.
            </div>
          ) : null}

          {suspects.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}

          {showWithoutEvents
            ? withoutEvents.map((player) => (
                <PlayerCard key={player.id} player={player} dim />
              ))
            : null}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
        <h2 className="text-xl font-black">Mesclagem manual</h2>

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
                  {player.name} - {getTeamTheme(player.side).short}
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
                  {player.name} - {getTeamTheme(player.side).short}
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

      {deletionPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <h2 className="text-2xl font-black">Excluir jogador</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-zinc-500">Nome:</p>
                <p className="mt-1 text-lg font-bold">{deletionPreview.player.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-zinc-500">Eventos:</p>
                  <p className="mt-1 text-2xl font-black">{deletionPreview.eventsCount}</p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-zinc-500">Aliases:</p>
                  <p className="mt-1 text-2xl font-black">{deletionPreview.aliasesCount}</p>
                </div>
              </div>

              {deletionPreview.eventsCount > 0 ? (
                <p className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-3 text-yellow-200">
                  Este jogador possui eventos registrados e não pode ser excluído.
                  Utilize a opção Mesclar jogadores.
                </p>
              ) : (
                <>
                  <p className="rounded-xl border border-red-800 bg-red-950/30 p-3 text-red-200">
                    ⚠️ Esta ação é permanente.
                  </p>

                  <label className="block text-zinc-300">
                    Para confirmar digite exatamente o nome do jogador.
                    <input
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white"
                      autoFocus
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={cancelarExclusao}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={
                  deletionPreview.eventsCount > 0 ||
                  deleteConfirmation !== deletionPreview.player.name ||
                  deleteLoadingId === deletionPreview.player.id
                }
                className="flex-1 rounded-lg bg-red-700 px-4 py-3 font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoadingId === deletionPreview.player.id ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
