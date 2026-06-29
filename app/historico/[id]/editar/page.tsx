"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  match_number: number;
  pedro_goals: number;
  netu_goals: number;
  winner: string;
  status?: string;
};

export default function EditarPartida() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulário
  const [pedroGoals, setPedroGoals] = useState(0);
  const [netuGoals, setNetuGoals] = useState(0);
  const [status, setStatus] = useState("OPEN");

  useEffect(() => {
    async function carregarPartida() {
      try {
        const { data, error: err } = await supabase
          .from("matches")
          .select("id, match_number, pedro_goals, netu_goals, winner, status")
          .eq("id", matchId)
          .single();

        if (err || !data) {
          setError("Partida não encontrada");
          setLoading(false);
          return;
        }

        setMatch(data);
        setPedroGoals(data.pedro_goals);
        setNetuGoals(data.netu_goals);
        setStatus(data.status || "OPEN");
      } catch (err: any) {
        setError(`Erro ao carregar: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    carregarPartida();
  }, [matchId]);

  /**
   * Calcula o vencedor automaticamente baseado no placar
   */
  function calcularVencedor(pedro: number, netu: number): string {
    if (pedro > netu) return "PEDRO";
    if (netu > pedro) return "NETU";
    return "EMPATE";
  }

  async function salvarPartida() {
    if (!match) return;

    try {
      setSaving(true);
      const novoWinner = calcularVencedor(pedroGoals, netuGoals);

      const { error: err } = await supabase
        .from("matches")
        .update({
          pedro_goals: pedroGoals,
          netu_goals: netuGoals,
          winner: novoWinner,
          status,
        })
        .eq("id", matchId);

      if (err) throw err;

      alert("Partida atualizada com sucesso!");
      router.push("/historico");
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
        <h1 className="text-4xl font-black">Editar Partida</h1>
        <p className="mt-4 text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (error || !match) {
    return (
      <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
        <h1 className="text-4xl font-black">Editar Partida</h1>
        <p className="mt-4 text-red-400">{error || "Partida não encontrada"}</p>
        <Link href="/historico" className="mt-4 text-blue-400 hover:text-blue-300">
          ← Voltar ao Histórico
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-black">Editar Partida</h1>
        <p className="mt-2 text-zinc-400">Jogo #{match.match_number}</p>

        <div className="mt-8 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          {/* Pedro Goals */}
          <div>
            <label className="block text-sm font-bold text-red-300">
              Gols - São Paulo / Pedro
            </label>
            <input
              type="number"
              min="0"
              value={pedroGoals}
              onChange={(e) => setPedroGoals(parseInt(e.target.value) || 0)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Netu Goals */}
          <div>
            <label className="block text-sm font-bold text-green-300">
              Gols - Palmeiras / Netu
            </label>
            <input
              type="number"
              min="0"
              value={netuGoals}
              onChange={(e) => setNetuGoals(parseInt(e.target.value) || 0)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* Winner Preview */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Vencedor (calculado automaticamente):</p>
            <p className="mt-2 text-2xl font-black">
              {calcularVencedor(pedroGoals, netuGoals)}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-zinc-300">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-zinc-500 focus:outline-none"
            >
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={salvarPartida}
              disabled={saving}
              className="flex-1 rounded-lg bg-green-900/50 border border-green-700 px-6 py-3 font-bold text-green-300 transition hover:bg-green-900/70 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
            <Link
              href="/historico"
              className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-6 py-3 text-center font-bold text-zinc-300 transition hover:bg-zinc-700"
            >
              ← Cancelar
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
