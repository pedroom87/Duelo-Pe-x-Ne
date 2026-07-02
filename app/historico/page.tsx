"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteMatch, setMatchVerification } from "@/lib/matches";

type Match = {
  id: string;
  match_number: number;
  pedro_goals: number;
  netu_goals: number;
  winner: string;
  verified: boolean;
};

export default function Historico() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [updatingVerification, setUpdatingVerification] = useState<string | null>(null);

  async function carregarHistorico() {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("matches")
        .select("id, match_number, pedro_goals, netu_goals, winner, verified")
        .order("match_number", { ascending: false });

      if (err) {
        setError(`Erro ao carregar histórico: ${err.message}`);
        return;
      }

      setMatches(data || []);
      setError(null);
    } catch (err: any) {
      setError(`Erro: ${err.message}`);
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

  async function toggleVerification(match: Match) {
    try {
      setUpdatingVerification(match.id);
      await setMatchVerification(match.id, !match.verified);
      setMatches((current) =>
        current.map((item) => (item.id === match.id ? { ...item, verified: !item.verified } : item))
      );
    } catch (err: any) {
      alert(`Erro ao atualizar conferência: ${err.message}`);
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
      setMatches(matches.filter((m) => m.id !== id));
      alert(`Jogo #${matchNumber} deletado com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao deletar: ${err.message}`);
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

        {filteredMatches.map((match: Match) => (
          <div
            key={match.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
          >
            <div className="flex-1">
              <p className="text-sm text-zinc-500">
                Jogo #{match.match_number}
              </p>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-red-300">São Paulo / Pedro</p>
                  <p className="font-bold text-green-300">Palmeiras / Netu</p>
                </div>

                <div className="text-3xl font-black sm:text-right">
                  {match.pedro_goals} × {match.netu_goals}
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-400">
                Vencedor: {match.winner || "Empatado"}
              </p>

              <div className={`mt-3 inline-flex items-center rounded-full border px-3 py-1 text-sm ${
                match.verified
                  ? "border-green-800/50 bg-green-950/20 text-green-300"
                  : "border-yellow-800/50 bg-yellow-950/20 text-yellow-300"
              }`}>
                {match.verified ? "✅ Conferida" : "⚠️ Pendente de conferência"}
              </div>
            </div>

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
          </div>
        ))}
      </section>
    </main>
  );
}