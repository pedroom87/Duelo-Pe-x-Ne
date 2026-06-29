"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Historico = {
  summary: {
    matches: number;
    events: number;
    players: number;
  };
  matches: {
    matchNumber: number;
    pedroGoals: number;
    netuGoals: number;
    winner: string;
    decisionWinner: string;
    penaltyScore: string | null;
    notes: string | null;
    events: {
      seq: number;
      side: string;
      eventType: string;
      playerNameRaw: string;
      sourceCell?: string;
    }[];
  }[];
};

export default function ImportarHistorico() {
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/data/historico-extraido.json")
      .then((res) => res.json())
      .then(setHistorico)
      .catch(() => setStatus("Erro ao carregar o JSON."));
  }, []);

  async function importar() {
    if (!historico) return;

    setStatus("Limpando banco...");

    await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("players").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    setStatus("Importando jogadores...");

    const playerMap = new Map<string, string>();

    const players = new Map<string, { name: string; side: string }>();

    for (const match of historico.matches) {
      for (const event of match.events) {
        const key = `${event.playerNameRaw.trim()}|${event.side}`;
        players.set(key, {
          name: event.playerNameRaw.trim(),
          side: event.side,
        });
      }
    }

    const { data: insertedPlayers, error: playersError } = await supabase
      .from("players")
      .insert(Array.from(players.values()))
      .select();

    if (playersError) {
      setStatus(`Erro ao importar jogadores: ${playersError.message}`);
      return;
    }

    insertedPlayers?.forEach((player) => {
      playerMap.set(`${player.name}|${player.side}`, player.id);
    });

    setStatus("Importando partidas...");

    const { data: insertedMatches, error: matchesError } = await supabase
      .from("matches")
      .insert(
        historico.matches.map((match) => ({
          match_number: match.matchNumber,
          pedro_goals: match.pedroGoals,
          netu_goals: match.netuGoals,
          winner: match.winner,
          decision_winner: match.decisionWinner,
          penalty_score: match.penaltyScore,
          notes: match.notes,
        }))
      )
      .select();

    if (matchesError) {
      setStatus(`Erro ao importar partidas: ${matchesError.message}`);
      return;
    }

    const matchMap = new Map<number, string>();
    insertedMatches?.forEach((match) => {
      matchMap.set(match.match_number, match.id);
    });

    setStatus("Importando eventos...");

    const events = historico.matches.flatMap((match) =>
      match.events.map((event) => ({
        match_id: matchMap.get(match.matchNumber),
        player_id: playerMap.get(`${event.playerNameRaw.trim()}|${event.side}`),
        match_number: match.matchNumber,
        seq: event.seq,
        side: event.side,
        event_type: event.eventType,
        player_name_raw: event.playerNameRaw.trim(),
        source_cell: event.sourceCell ?? null,
      }))
    );

    const { error: eventsError } = await supabase.from("events").insert(events);

    if (eventsError) {
      setStatus(`Erro ao importar eventos: ${eventsError.message}`);
      return;
    }

    setStatus("Importação concluída com sucesso!");
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
      <h1 className="text-4xl font-black">Importar Histórico</h1>
      <p className="mt-2 text-zinc-400">
        Carrega o histórico extraído da planilha para o Supabase.
      </p>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        {!historico && <p>Carregando JSON...</p>}

        {historico && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-zinc-950 p-5">
                <p className="text-zinc-400">Partidas</p>
                <p className="text-3xl font-black">{historico.summary.matches}</p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-5">
                <p className="text-zinc-400">Eventos</p>
                <p className="text-3xl font-black">{historico.summary.events}</p>
              </div>

              <div className="rounded-2xl bg-zinc-950 p-5">
                <p className="text-zinc-400">Jogadores</p>
                <p className="text-3xl font-black">{historico.summary.players}</p>
              </div>
            </div>

            <button
              onClick={importar}
              className="mt-8 rounded-xl bg-red-600 px-6 py-4 font-black hover:bg-red-500"
            >
              Confirmar importação para o Supabase
            </button>
          </>
        )}

        {status && <p className="mt-6 text-zinc-300">{status}</p>}
      </section>
    </main>
  );
}