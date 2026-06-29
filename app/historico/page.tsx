"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteMatch } from "@/lib/matches";

type Match = {
  id: string;
  match_number: number;
  pedro_goals: number;
  netu_goals: number;
  winner: string;
};

export default function Historico() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);

  async function carregarHistorico() {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("matches")
        .select("id, match_number, pedro_goals, netu_goals, winner")
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
      <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
        <h1 className="text-4xl font-black">Histórico</h1>
        <p className="mt-4 text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
        <h1 className="text-4xl font-black">Histórico</h1>
        <p className="mt-4 text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
      <h1 className="text-4xl font-black">Histórico</h1>
      <p className="mt-2 text-zinc-400">
        {matches.length} partida{matches.length !== 1 ? "s" : ""} registrada{matches.length !== 1 ? "s" : ""}.
      </p>

      <section className="mt-8 space-y-3">
        {matches.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center text-zinc-400">
            Nenhuma partida registrada ainda.
          </div>
        )}

        {matches.map((match: Match) => (
          <div
            key={match.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 flex items-center justify-between"
          >
            <div className="flex-1">
              <p className="text-sm text-zinc-500">
                Jogo #{match.match_number}
              </p>

              <div className="mt-2 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-red-300">São Paulo / Pedro</p>
                  <p className="font-bold text-green-300">Palmeiras / Netu</p>
                </div>

                <div className="text-right text-3xl font-black">
                  {match.pedro_goals} × {match.netu_goals}
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-400">
                Vencedor: {match.winner || "Empatado"}
              </p>
            </div>

            <button
              onClick={() => excluirPartida(match.id, match.match_number)}
              disabled={deletando === match.id}
              className="ml-4 rounded-xl bg-red-900/30 border border-red-700 px-4 py-2 text-red-300 hover:bg-red-900/50 transition disabled:opacity-50"
            >
              {deletando === match.id ? "Deletando..." : "🗑️ Excluir"}
            </button>

            <Link
              href={`/historico/${match.id}/editar`}
              className="ml-2 rounded-xl bg-blue-900/30 border border-blue-700 px-4 py-2 text-blue-300 hover:bg-blue-900/50 transition"
            >
              ✏️ Editar
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}