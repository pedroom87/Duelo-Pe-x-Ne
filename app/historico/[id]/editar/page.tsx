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
  verified?: boolean;
};

type EventType = "GOL" | "ASSISTENCIA" | "AMARELO" | "VERMELHO" | "LESAO" | "GOL_CONTRA";

type EventItem = {
  id: string;
  player_name_raw: string;
  side: "PEDRO" | "NETU";
  event_type: EventType;
  created_at: string;
};

const eventOptions: { value: EventType; label: string }[] = [
  { value: "GOL", label: "Gol" },
  { value: "ASSISTENCIA", label: "Assistência" },
  { value: "AMARELO", label: "Amarelo" },
  { value: "VERMELHO", label: "Vermelho" },
  { value: "LESAO", label: "Lesão" },
  { value: "GOL_CONTRA", label: "Gol Contra" },
];

export default function EditarPartida() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [draft, setDraft] = useState({ playerName: "", side: "PEDRO" as "PEDRO" | "NETU", eventType: "GOL" as EventType });

  useEffect(() => {
    async function carregarPartida() {
      try {
        const { data, error: err } = await supabase
          .from("matches")
          .select("id, match_number, pedro_goals, netu_goals, winner, status, verified")
          .eq("id", matchId)
          .single();

        if (err || !data) {
          setError("Partida não encontrada");
          setLoading(false);
          return;
        }

        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("id, player_name_raw, side, event_type, created_at")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true });

        if (eventError) throw eventError;

        setMatch(data);
        setEvents((eventData || []) as EventItem[]);
        setStatus(data.status || "OPEN");
      } catch (err: any) {
        setError(`Erro ao carregar: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    carregarPartida();
  }, [matchId]);

  function calcularVencedor(pedro: number, netu: number): string {
    if (pedro > netu) return "PEDRO";
    if (netu > pedro) return "NETU";
    return "EMPATE";
  }

  async function recarregarEventos() {
    const { data, error } = await supabase
      .from("events")
      .select("id, player_name_raw, side, event_type, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (!error) {
      setEvents((data || []) as EventItem[]);
    }
  }

  async function excluirEvento(eventId: string) {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      alert(`Erro ao excluir evento: ${error.message}`);
      return;
    }

    await recarregarEventos();
    await recalcularPlacar();
  }

  async function adicionarEvento() {
    if (!draft.playerName.trim()) {
      alert("Informe o nome do jogador.");
      return;
    }

    const { error } = await supabase.from("events").insert({
      match_id: matchId,
      match_number: match?.match_number,
      player_name_raw: draft.playerName.trim(),
      side: draft.side,
      event_type: draft.eventType,
    });

    if (error) {
      alert(`Erro ao adicionar evento: ${error.message}`);
      return;
    }

    setDraft({ playerName: "", side: "PEDRO", eventType: "GOL" });
    await recarregarEventos();
    await recalcularPlacar();
  }

  async function atualizarEvento(eventId: string, field: keyof EventItem, value: any) {
    const { error } = await supabase.from("events").update({ [field]: value }).eq("id", eventId);
    if (error) {
      alert(`Erro ao atualizar evento: ${error.message}`);
      return;
    }

    await recarregarEventos();
    await recalcularPlacar();
  }

  async function recalcularPlacar() {
    if (!match) return;

    const { data: gols } = await supabase
      .from("events")
      .select("side")
      .eq("match_id", matchId)
      .eq("event_type", "GOL");

    const pedroGoals = gols?.filter((g) => g.side === "PEDRO").length ?? 0;
    const netuGoals = gols?.filter((g) => g.side === "NETU").length ?? 0;
    const winner = pedroGoals > netuGoals ? "PEDRO" : netuGoals > pedroGoals ? "NETU" : "EMPATE";

    const { error } = await supabase
      .from("matches")
      .update({ pedro_goals: pedroGoals, netu_goals: netuGoals, winner, status })
      .eq("id", matchId);

    if (!error && match) {
      setMatch({ ...match, pedro_goals: pedroGoals, netu_goals: netuGoals, winner, status });
    }
  }

  async function salvarPartida() {
    if (!match) return;

    try {
      setSaving(true);
      const novoWinner = calcularVencedor(match.pedro_goals, match.netu_goals);

      const shouldVerify = window.confirm("Marcar esta partida como conferida?");
      const { error: err } = await supabase
        .from("matches")
        .update({
          pedro_goals: match.pedro_goals,
          netu_goals: match.netu_goals,
          winner: novoWinner,
          status,
          verified: shouldVerify,
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
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8 sm:py-10">
        <h1 className="text-3xl font-black sm:text-4xl">Editar Partida</h1>
        <p className="mt-4 text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (error || !match) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 text-white sm:px-8 sm:py-10">
        <h1 className="text-3xl font-black sm:text-4xl">Editar Partida</h1>
        <p className="mt-4 text-red-400">{error || "Partida não encontrada"}</p>
        <Link href="/historico" className="mt-4 text-blue-400 hover:text-blue-300">
          ← Voltar ao Histórico
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black sm:text-4xl">Editar Partida</h1>
        <p className="mt-2 text-zinc-400">Jogo #{match.match_number}</p>

        <div className="mt-8 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">Placar atual</p>
            <p className="mt-2 text-3xl font-black">
              {match.pedro_goals} × {match.netu_goals}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <h2 className="text-lg font-black">Adicionar evento</h2>
            <div className="mt-3 space-y-3">
              <input
                value={draft.playerName}
                onChange={(e) => setDraft((current) => ({ ...current, playerName: e.target.value }))}
                placeholder="Nome do jogador"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={draft.side}
                  onChange={(e) => setDraft((current) => ({ ...current, side: e.target.value as "PEDRO" | "NETU" }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                >
                  <option value="PEDRO">São Paulo / Pedro</option>
                  <option value="NETU">Palmeiras / Netu</option>
                </select>
                <select
                  value={draft.eventType}
                  onChange={(e) => setDraft((current) => ({ ...current, eventType: e.target.value as EventType }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                >
                  {eventOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={adicionarEvento}
                className="rounded-lg bg-blue-900/40 px-4 py-2 font-bold text-blue-300"
              >
                + Adicionar evento
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <h2 className="text-lg font-black">Eventos da partida</h2>
            <div className="mt-3 space-y-2">
              {events.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum evento registrado.</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        value={event.player_name_raw}
                        onChange={(e) => atualizarEvento(event.id, "player_name_raw", e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      />
                      <select
                        value={event.side}
                        onChange={(e) => atualizarEvento(event.id, "side", e.target.value)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      >
                        <option value="PEDRO">SPFC</option>
                        <option value="NETU">SEP</option>
                      </select>
                      <select
                        value={event.event_type}
                        onChange={(e) => atualizarEvento(event.id, "event_type", e.target.value)}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      >
                        {eventOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => excluirEvento(event.id)}
                        className="rounded-lg border border-red-700 px-3 py-2 text-sm text-red-300"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-zinc-500 focus:outline-none"
            >
              <option value="OPEN">OPEN</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button
              onClick={salvarPartida}
              disabled={saving}
              className="flex-1 rounded-lg border border-green-700 bg-green-900/50 px-6 py-3 font-bold text-green-300 transition hover:bg-green-900/70 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
            <Link
              href="/historico"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-3 text-center font-bold text-zinc-300 transition hover:bg-zinc-700"
            >
              ← Cancelar
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
