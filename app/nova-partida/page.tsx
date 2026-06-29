"use client";

import { useState } from "react";
import { createMatch } from "@/lib/matches";
import GoalModal from "@/components/match/GoalModal";

export default function NovaPartida() {
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [pedroGoals, setPedroGoals] = useState(0);
  const [netuGoals, setNetuGoals] = useState(0);

  const [goalModalOpen, setGoalModalOpen] = useState(false);

  async function iniciarPartida() {
    try {
      setLoading(true);

      const match = await createMatch();

      setMatchId(match.id);

      setPedroGoals(0);
      setNetuGoals(0);

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function atualizarPlacar() {

    // Por enquanto apenas soma visualmente.
    // Na próxima Sprint vamos buscar direto do banco.

    setPedroGoals((g) => g + 1);

  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      {!matchId ? (

        <div className="flex h-screen items-center justify-center">

          <button
            onClick={iniciarPartida}
            disabled={loading}
            className="rounded-xl bg-red-700 px-10 py-6 text-2xl font-bold"
          >
            {loading ? "Criando..." : "▶ Iniciar Partida"}
          </button>

        </div>

      ) : (

        <div className="mx-auto max-w-3xl p-8">

          <h1 className="text-center text-5xl font-black">

            🔴 {pedroGoals} × {netuGoals} 🟢

          </h1>

          <div className="mt-12 grid grid-cols-3 gap-5">

            <button
              onClick={() => setGoalModalOpen(true)}
              className="rounded-xl bg-zinc-800 p-8 text-5xl hover:bg-zinc-700"
            >
              ⚽
            </button>

            <button className="rounded-xl bg-zinc-800 p-8 text-5xl hover:bg-zinc-700">
              🎯
            </button>

            <button className="rounded-xl bg-zinc-800 p-8 text-5xl hover:bg-zinc-700">
              🟨
            </button>

            <button className="rounded-xl bg-zinc-800 p-8 text-5xl hover:bg-zinc-700">
              🟥
            </button>

            <button className="rounded-xl bg-zinc-800 p-8 text-5xl hover:bg-zinc-700">
              🤕
            </button>

            <button className="rounded-xl bg-zinc-800 p-8 text-5xl hover:bg-zinc-700">
              🔵
            </button>

          </div>

          <div className="mt-10 rounded-xl bg-zinc-900 p-6">

            <h2 className="mb-4 text-2xl font-bold">

              Timeline

            </h2>

            <p className="text-zinc-500">

              Nenhum evento registrado.

            </p>

          </div>

          <button
            className="mt-8 w-full rounded-xl bg-blue-700 py-5 text-xl font-bold"
          >
            🏁 Encerrar Partida
          </button>

        </div>

      )}

      {matchId && (

        <GoalModal
          matchId={matchId}
          open={goalModalOpen}
          onClose={() => setGoalModalOpen(false)}
          onSaved={atualizarPlacar}
        />

      )}

    </main>
  );
}