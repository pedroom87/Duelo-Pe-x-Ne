"use client";

import { useState, useEffect } from "react";
import {
  createMatch,
  getMatch,
  getMatchEvents,
  endMatch,
  deleteMatch,
  type Match,
  type MatchEvent,
} from "@/lib/matches";
import EventModal from "@/components/match/GoalModal";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { TeamMascot } from "@/components/teams/TeamMascot";
import { getTeamTheme } from "@/utils/constants";

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

  async function voltarParaTelaInicial() {
    if (!match) {
      setPartidaIniciada(false);
      return;
    }

    if (events.length === 0) {
      try {
        await deleteMatch(match.id);
      } catch (error) {
        console.error("Erro ao cancelar partida vazia:", error);
      }
    }

    setMatch(null);
    setEvents([]);
    setPartidaIniciada(false);
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

  async function cancelarPartida() {
    if (!match) return;

    if (!confirm("Cancelar a partida aberta? Ela será removida do histórico.")) return;

    try {
      setLoading(true);
      await deleteMatch(match.id);
      setMatch(null);
      setEvents([]);
      setPartidaIniciada(false);
      alert("Partida cancelada com sucesso.");
    } catch (error) {
      alert("Erro ao cancelar partida");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!partida_iniciada) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white sm:p-6">
        <div className="w-full max-w-2xl text-center">
          <div className="mb-6 flex items-center justify-center gap-4">
            <TeamMascot side="PEDRO" size="xl" priority />
            <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-black text-zinc-300">
              VS
            </div>
            <TeamMascot side="NETU" size="xl" priority />
          </div>

          <div className="mb-5 flex flex-wrap justify-center gap-2">
            <TeamBadge side="PEDRO" label="Pedro / São Paulo" withMascot />
            <TeamBadge side="NETU" label="Netu / Palmeiras" withMascot />
          </div>

          <h1 className="mb-4 text-4xl font-black sm:text-5xl">Duelo Pe X Ne</h1>
          <p className="mb-8 text-base text-zinc-400 sm:text-lg">
            Clique no botão abaixo para iniciar uma nova partida
          </p>
          <button
            onClick={iniciarPartida}
            disabled={loading}
            className="w-full rounded-2xl border border-red-600 bg-red-700 px-8 py-6 text-xl font-black shadow-xl shadow-red-950/40 transition hover:bg-red-600 disabled:opacity-50 sm:px-10 sm:py-6 sm:text-2xl"
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
      <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-left">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Jogo #{match.match_number}
              </p>
              <h1 className="mt-2 text-3xl font-black">Placar</h1>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
              <div className="flex items-center justify-end gap-3">
                <div className="text-right">
                  <TeamBadge side="PEDRO" label="Pedro" />
                  <p className="mt-1 text-5xl font-black text-red-300 sm:text-6xl">
                    {match.pedro_goals}
                  </p>
                </div>
                <TeamMascot side="PEDRO" size="md" />
              </div>

              <span className="text-4xl font-black text-zinc-500">×</span>

              <div className="flex items-center justify-start gap-3">
                <TeamMascot side="NETU" size="md" />
                <div className="text-left">
                  <TeamBadge side="NETU" label="Netu" />
                  <p className="mt-1 text-5xl font-black text-green-300 sm:text-6xl">
                    {match.netu_goals}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={voltarParaTelaInicial}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              ← Voltar
            </button>
          </div>

          <p className="mt-3 text-center text-sm text-zinc-400">
            {match.winner === "" && "Empatado"}
            {match.winner === "PEDRO" && "São Paulo na frente"}
            {match.winner === "NETU" && "Palmeiras na frente"}
          </p>
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
              const team = getTeamTheme(event.side);

              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${team.classes.border} ${team.classes.panel}`}
                >
                  <span className="text-2xl">{config.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{event.player_name_raw}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{config.label}</span>
                      <TeamBadge side={team.side} label={team.short} />
                    </div>
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

        {/* Botões de Encerramento */}
        <section className="mb-8 space-y-3">
          <button
            onClick={cancelarPartida}
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-4 text-lg font-bold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50 sm:py-5"
          >
            {loading ? "Cancelando..." : "↩️ Cancelar partida"}
          </button>

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
