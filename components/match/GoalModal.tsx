"use client";

import { useEffect, useState } from "react";
import { getPlayersWithRecentUsage, createPlayer } from "@/lib/players";
import {
  addGoal,
  addAssist,
  addYellowCard,
  addRedCard,
  addInjury,
  addOwnGoal,
} from "@/lib/events";
import { refreshScore } from "@/lib/matches";

interface Player {
  id: string;
  name: string;
  side: string;
}

type EventType =
  | "GOL"
  | "ASSISTENCIA"
  | "AMARELO"
  | "VERMELHO"
  | "LESAO"
  | "GOL_CONTRA";

interface Props {
  matchId: string;
  eventType: EventType;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const eventConfig = {
  GOL: { title: "Registrar Gol", icon: "⚽", color: "blue" },
  ASSISTENCIA: {
    title: "Registrar Assistência",
    icon: "🎯",
    color: "yellow",
  },
  AMARELO: { title: "Registrar Amarelo", icon: "🟨", color: "yellow" },
  VERMELHO: { title: "Registrar Vermelho", icon: "🟥", color: "red" },
  LESAO: { title: "Registrar Lesão", icon: "🤕", color: "orange" },
  GOL_CONTRA: { title: "Registrar Gol Contra", icon: "🔵", color: "blue" },
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function EventModal({
  matchId,
  eventType,
  open,
  onClose,
  onSaved,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [side, setSide] = useState<"PEDRO" | "NETU">("PEDRO");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    getPlayersWithRecentUsage().then((p) => setPlayers(p));
  }, [open]);

  if (!open) return null;

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = players
    .filter((p) => p.side === side)
    .filter((p) => {
      if (!normalizedSearch) return true;
      return p.name.toLowerCase().includes(normalizedSearch);
    });

  const config = eventConfig[eventType];

  async function criarERegistrar(nome: string) {
    try {
      setLoading(true);

      // Cria o jogador
      const jogador = await createPlayer(nome, side);

      // Registra o evento com o jogador criado
      switch (eventType) {
        case "GOL":
          await addGoal(matchId, jogador.name, side, jogador.id);
          break;
        case "ASSISTENCIA":
          await addAssist(matchId, jogador.name, side, jogador.id);
          break;
        case "AMARELO":
          await addYellowCard(matchId, jogador.name, side, jogador.id);
          break;
        case "VERMELHO":
          await addRedCard(matchId, jogador.name, side, jogador.id);
          break;
        case "LESAO":
          await addInjury(matchId, jogador.name, side, jogador.id);
          break;
        case "GOL_CONTRA":
          await addOwnGoal(matchId, jogador.name, side, jogador.id);
          break;
      }

      // Se for gol ou gol contra, atualiza o placar
      if (eventType === "GOL" || eventType === "GOL_CONTRA") {
        await refreshScore(matchId);
      }

      onSaved();
      onClose();
      setSearch("");
    } catch (error: unknown) {
      console.error("Erro ao criar jogador:", error);
      alert(`Erro: ${getErrorMessage(error, "Desconhecido")}`);
    } finally {
      setLoading(false);
    }
  }

  async function salvar(jogador: Player) {
    try {
      setLoading(true);

      // Registra o evento
      switch (eventType) {
        case "GOL":
          await addGoal(matchId, jogador.name, side, jogador.id);
          break;
        case "ASSISTENCIA":
          await addAssist(matchId, jogador.name, side, jogador.id);
          break;
        case "AMARELO":
          await addYellowCard(matchId, jogador.name, side, jogador.id);
          break;
        case "VERMELHO":
          await addRedCard(matchId, jogador.name, side, jogador.id);
          break;
        case "LESAO":
          await addInjury(matchId, jogador.name, side, jogador.id);
          break;
        case "GOL_CONTRA":
          await addOwnGoal(matchId, jogador.name, side, jogador.id);
          break;
      }

      // Se for gol ou gol contra, atualiza o placar
      if (eventType === "GOL" || eventType === "GOL_CONTRA") {
        await refreshScore(matchId);
      }

      onSaved();
      onClose();
      setSearch("");
    } catch (error: unknown) {
      console.error("Erro ao registrar evento:", error);
      alert(
        `Erro ao registrar evento: ${getErrorMessage(error, "Desconhecido")}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-5 z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-5">
          {config.icon} {config.title}
        </h2>

        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setSide("PEDRO")}
            className={`flex-1 rounded-xl p-3 font-bold transition ${
              side === "PEDRO" ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            São Paulo
          </button>

          <button
            onClick={() => setSide("NETU")}
            className={`flex-1 rounded-xl p-3 font-bold transition ${
              side === "NETU" ? "bg-green-700 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            Palmeiras
          </button>
        </div>

        <input
          className="w-full rounded-xl bg-zinc-800 p-3 mb-4 text-white placeholder-zinc-500"
          placeholder="Digite o jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
        />

        <div className="max-h-72 overflow-auto">
          {filtered.length === 0 && search.trim() === "" && (
            <p className="text-zinc-500 text-center py-4">Nenhum jogador encontrado</p>
          )}

          {filtered.length === 0 && search.trim() !== "" && (
            <div className="space-y-3">
              <p className="text-zinc-500 text-center py-2 text-sm">
                Nenhum jogador encontrado com esse nome
              </p>
              <button
                onClick={() => criarERegistrar(search)}
                disabled={loading}
                className="w-full rounded-lg bg-green-900/50 border border-green-700 p-3 text-green-300 hover:bg-green-900/70 transition disabled:opacity-50 font-bold"
              >
                ➕ Criar jogador: {search}
              </button>
            </div>
          )}

          {filtered.map((player) => (
            <button
              key={player.id}
              onClick={() => salvar(player)}
              disabled={loading}
              className="w-full text-left rounded-lg p-3 hover:bg-zinc-800 transition disabled:opacity-50"
            >
              {player.name}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-zinc-800 p-3 text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
