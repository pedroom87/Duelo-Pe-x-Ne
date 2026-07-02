"use client";

import { useState, useEffect } from "react";
import {
  createMatch,
  getMatch,
  getMatchEvents,
  endMatch,
  type Match,
  type MatchEvent,
} from "@/lib/matches";
import EventModal from "@/components/match/GoalModal";

type EventType =
  | "GOL"
  | "ASSISTENCIA"
  | "AMARELO"
  | "VERMELHO"
  | "LESAO"
  | "GOL_CONTRA";

const eventIcons = {
  GOL: { emoji: "⚽", label: "Gol", color: "bg-blue-700" },
  ASSISTENCIA: { emoji: "🎯", label: "Assistência", color: "bg-yellow-700" },
  AMARELO: { emoji: "🟨", label: "Amarelo", color: "bg-yellow-600" },
  VERMELHO: { emoji: "🟥", label: "Vermelho", color: "bg-red-700" },
  LESAO: { emoji: "🤕", label: "Lesão", color: "bg-orange-700" },
  GOL_CONTRA: { emoji: "🔵", label: "Gol Contra", color: "bg-blue-600" },
};

export default function NovaPartida() {
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<EventType>("GOL");
  const [partida_iniciada, setPartidaIniciada] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  // Inicia a partida
  async function iniciarPartida() {
    try {
      setLoading(true);
      const newMatch = await createMatch();
      setMatch(newMatch);
      setPartidaIniciada(true);
      setEvents([]);
    } catch (error) {
      alert("Erro ao iniciar partida");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // Carrega eventos quando modal fecha
  async function carregarEventos() {
    if (!match) return;
    try {
      const matchData = await getMatch(match.id);
      setMatch(matchData);
      const evt = await getMatchEvents(match.id);
      setEvents(evt);
    } catch (error: any) {
      console.error("Erro ao carregar eventos:", error);
      alert(`Erro ao atualizar: ${error?.message || "Desconhecido"}`);
    }
  }

  // Abre o modal para registrar evento
  function abrirEventoModal(tipo: EventType) {
    setSelectedEventType(tipo);
    setModalOpen(true);
  }

  // Encerra a partida
  async function encerrarPartida() {
    if (!match) return;

    if (!confirm("Tem certeza que deseja encerrar a partida?")) return;

    try {
      setFinalizando(true);
      await endMatch(match.id);

      // Recarrega dados
      const matchFinal = await getMatch(match.id);
      setMatch(matchFinal);

      alert("Partida encerrada com sucesso!");
      setPartidaIniciada(false);
      setEvents([]);
    } catch (error) {
      alert("Erro ao encerrar partida");
      console.error(error);
    } finally {
      setFinalizando(false);
    }
  }

  if (!partida_iniciada) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white sm:p-6">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-4 text-4xl font-black sm:text-5xl">Duelo Pe X Ne</h1>
          <p className="mb-8 text-base text-zinc-400 sm:text-lg">
            Clique no botão abaixo para iniciar uma nova partida
          </p>
          <button
            onClick={iniciarPartida}
            disabled={loading}
            className="w-full rounded-2xl bg-red-700 px-8 py-6 text-xl font-black transition hover:bg-red-600 disabled:opacity-50 sm:px-10 sm:py-6 sm:text-2xl"
          >
            {loading ? "Iniciando..." : "▶ Iniciar Partida"}
          </button>
        </div>
      </main>
    );
  }

  if (!match) return null;

  return (
    <main className="min-h-screen bg-zinc-950 pb-24 text-white sm:pb-0">
      {/* Header com Placar */}
      <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Jogo #{match.match_number}
              </p>
              <h1 className="mt-2 text-3xl font-black">Placar</h1>
            </div>

            <div className="text-center">
              <div className="text-5xl font-black sm:text-6xl">
                <span className="text-red-400">{match.pedro_goals}</span>
                <span className="mx-4 text-zinc-500">×</span>
                <span className="text-green-400">{match.netu_goals}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {match.winner === "" && "Empatado"}
                {match.winner === "PEDRO" && "São Paulo na frente"}
                {match.winner === "NETU" && "Palmeiras na frente"}
              </p>
            </div>

            <button
              onClick={() => setPartidaIniciada(false)}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Área Principal */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Botões de Eventos */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-zinc-300">Registrar Evento</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(Object.entries(eventIcons) as Array<[EventType, typeof eventIcons[EventType]]>).map(
              ([tipo, config]) => (
                <button
                  key={tipo}
                  onClick={() => abrirEventoModal(tipo)}
                  className={`${config.color} rounded-xl p-4 text-base font-bold text-white transition hover:opacity-90 hover:scale-[1.01] sm:p-5 sm:text-lg`}
                >
                  <div className="text-2xl mb-1">{config.emoji}</div>
                  <div className="text-sm">{config.label}</div>
                </button>
              )
            )}
          </div>
        </section>

        {/* Lista de Eventos */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 text-zinc-300">Eventos da Partida</h2>
          <div className="space-y-2">
            {events.length === 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-500">
                Nenhum evento registrado ainda
              </div>
            )}

            {events.map((event) => {
              const config = eventIcons[event.event_type as EventType];
              return (
                <div
                  key={event.id}
                  className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
                    event.side === "PEDRO"
                      ? "border-red-900/50 bg-red-950/30"
                      : "border-green-900/50 bg-green-950/30"
                  }`}
                >
                  <span className="text-2xl">{config.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{event.player_name_raw}</p>
                    <p className="text-xs text-zinc-400">
                      {config.label} · {event.side === "PEDRO" ? "SPFC" : "SEP"}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(event.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Botão de Encerramento */}
        <section className="mb-8">
          <button
            onClick={encerrarPartida}
            disabled={finalizando}
            className="w-full rounded-xl bg-red-700 px-6 py-4 text-lg font-bold transition hover:bg-red-600 disabled:opacity-50 sm:py-5"
          >
            {finalizando ? "Encerrando..." : "🏁 Encerrar Partida"}
          </button>
        </section>
      </div>

      {/* Modal de Evento */}
      <EventModal
        matchId={match.id}
        eventType={selectedEventType}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={carregarEventos}
      />
    </main>
  );
}