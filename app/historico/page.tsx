"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccess } from "@/components/auth/AccessContext";
import { TeamBadge } from "@/components/teams/TeamBadge";
import {
  deleteMatch,
  getMatchHistory,
  setMatchVerification,
  type MatchHistoryItem,
} from "@/lib/matches";
import { getTeamTheme, getWinnerLabel, getWinnerSide } from "@/utils/constants";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

export default function Historico() {
  const { canManageAdministrativeActions } = useAccess();
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [updatingVerification, setUpdatingVerification] = useState<string | null>(null);

  async function carregarHistorico() {
    try {
      setLoading(true);
      const data = await getMatchHistory();
      setMatches(data);
      setError(null);
    } catch (err: unknown) {
      setError(`Erro: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  const filteredMatches = matches.filter((match) => {
    if (filter === "pending") return !match.verified;
    if (filter === "verified") return match.verified;
    return true;
  });

  async function toggleVerification(match: MatchHistoryItem) {
    try {
      setUpdatingVerification(match.id);
      await setMatchVerification(match.id, !match.verified);
      setMatches((current) =>
        current.map((item) => (item.id === match.id ? { ...item, verified: !item.verified } : item))
      );
    } catch (err: unknown) {
      alert(`Erro ao atualizar conferência: ${getErrorMessage(err)}`);
    } finally {
      setUpdatingVerification(null);
    }
  }

  async function excluirPartida(id: string, matchNumber: number) {
    if (
      !confirm(
        `Tem certeza que deseja excluir o Jogo #${matchNumber}?\nTodos os eventos também serão deletados.`
      )
    ) {
      return;
    }

    try {
      setDeletando(id);
      await deleteMatch(id);
      setMatches((current) => current.filter((m) => m.id !== id));
      alert(`Jogo #${matchNumber} deletado com sucesso!`);
    } catch (err: unknown) {
      alert(`Erro ao deletar: ${getErrorMessage(err)}`);
      console.error(err);
    } finally {
      setDeletando(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
        <h1 className="text-3xl font-black sm:text-4xl">Histórico</h1>
        <p className="mt-4 text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
        <h1 className="text-3xl font-black sm:text-4xl">Histórico</h1>
        <p className="mt-4 text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <h1 className="text-3xl font-black sm:text-4xl">Histórico</h1>
      <p className="mt-2 text-zinc-400">
        {matches.length} partida{matches.length !== 1 ? "s" : ""} registrada{matches.length !== 1 ? "s" : ""}.
      </p>

      <section className="mt-6 flex flex-wrap gap-2">
        {[
          { key: "all", label: "Todas" },
          { key: "pending", label: "Pendentes" },
          { key: "verified", label: "Conferidas" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key as "all" | "pending" | "verified")}
            className={`rounded-full border px-3 py-2 text-sm ${
              filter === item.key
                ? "border-zinc-600 bg-zinc-800 text-white"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        {filteredMatches.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center text-zinc-400">
            Nenhuma partida registrada ainda.
          </div>
        )}

        {filteredMatches.map((match) => {
          const winnerSide = getWinnerSide(match.winner);
          const winnerTeam = winnerSide ? getTeamTheme(winnerSide) : null;

          return (
          <div
            key={match.id}
            className={`rounded-2xl border bg-zinc-900 p-4 sm:p-5 ${
              winnerTeam ? winnerTeam.classes.border : "border-zinc-800"
            }`}
          >
            <div className="flex-1">
              <p className="text-sm text-zinc-500">
                Jogo #{match.match_number}
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <TeamBadge side="PEDRO" label="Pedro / São Paulo" withMascot />
                  <TeamBadge side="NETU" label="Netu / Palmeiras" withMascot />
                </div>

                <div className="text-3xl font-black sm:text-right">
                  <span className="text-red-300">{match.pedro_goals}</span>
                  <span className="mx-3 text-zinc-500">×</span>
                  <span className="text-green-300">{match.netu_goals}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {winnerSide ? (
                  <TeamBadge
                    side={winnerSide}
                    label={`Vencedor: ${getWinnerLabel(match.winner)}`}
                  />
                ) : (
                  <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-sm font-bold text-zinc-300">
                    Empate
                  </span>
                )}

                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm ${
                  match.verified
                    ? "border-green-800/50 bg-green-950/20 text-green-300"
                    : "border-yellow-800/50 bg-yellow-950/20 text-yellow-300"
                }`}>
                  {match.verified ? "✅ Conferida" : "⚠️ Pendente de conferência"}
                </span>
              </div>
            </div>

            {canManageAdministrativeActions ? (
              <div className="mt-4 flex flex-col gap-2 sm:ml-4 sm:flex-row">
                <button
                  onClick={() => excluirPartida(match.id, match.match_number)}
                  disabled={deletando === match.id}
                  className="rounded-xl border border-red-700 bg-red-900/30 px-4 py-2 text-red-300 transition hover:bg-red-900/50 disabled:opacity-50"
                >
                  {deletando === match.id ? "Deletando..." : "🗑️ Excluir"}
                </button>

                <button
                  type="button"
                  onClick={() => toggleVerification(match)}
                  disabled={updatingVerification === match.id}
                  className={`rounded-xl border px-4 py-2 text-sm transition ${
                    match.verified
                      ? "border-zinc-700 bg-zinc-800 text-zinc-300"
                      : "border-yellow-700 bg-yellow-900/30 text-yellow-200"
                  } disabled:opacity-50`}
                >
                  {updatingVerification === match.id
                    ? "Atualizando..."
                    : match.verified
                      ? "Desmarcar conferência"
                      : "Marcar como conferida"}
                </button>

                <Link
                  href={`/historico/${match.id}/editar`}
                  className="rounded-xl border border-blue-700 bg-blue-900/30 px-4 py-2 text-center text-blue-300 transition hover:bg-blue-900/50"
                >
                  ✏️ Editar
                </Link>
              </div>
            ) : null}
          </div>
        );
        })}
      </section>
    </main>
  );
}
