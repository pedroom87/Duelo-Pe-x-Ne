import { supabase } from "./supabase";

export type DisciplineEntry = {
  playerId: string | null;
  displayName: string;
  side: "PEDRO" | "NETU";
  yellowCards: number;
  redCards: number;
  injuries: number;
  suspended: boolean;
  reason: string | null;
};

export type DisciplineSummary = {
  yellowCards: DisciplineEntry[];
  redCards: DisciplineEntry[];
  pendingSuspensions: DisciplineEntry[];
  nextGameSuspensions: DisciplineEntry[];
  notes: string[];
};

type EventRecord = {
  id: string;
  player_id: string | null;
  player_name_raw: string | null;
  side: "PEDRO" | "NETU";
  event_type: "AMARELO" | "VERMELHO" | "LESAO";
  match_number: number;
  seq: number;
};

type PlayerRecord = {
  id: string;
  name: string;
  side: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDisplayName(event: EventRecord, playersById: Map<string, PlayerRecord>) {
  if (event.player_id) {
    const officialPlayer = playersById.get(event.player_id);
    if (officialPlayer?.name) {
      return officialPlayer.name;
    }
  }

  return event.player_name_raw?.trim() || "Jogador sem nome";
}

export async function getDisciplineSummary(): Promise<DisciplineSummary> {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, player_id, player_name_raw, side, event_type, match_number, seq")
    .order("match_number", { ascending: true })
    .order("seq", { ascending: true });

  if (eventsError) {
    throw eventsError;
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, side");

  if (playersError) {
    throw playersError;
  }

  const playersById = new Map<string, PlayerRecord>();
  (players ?? []).forEach((player) => {
    playersById.set(player.id, player as PlayerRecord);
  });

  const map = new Map<string, DisciplineEntry>();

  (events ?? []).forEach((event) => {
    if (!["AMARELO", "VERMELHO", "LESAO"].includes(event.event_type)) {
      return;
    }

    const key = event.player_id
      ? `player:${event.player_id}`
      : `name:${normalizeText(event.player_name_raw || "")}:${event.side}`;

    const current = map.get(key) ?? {
      playerId: event.player_id,
      displayName: getDisplayName(event, playersById),
      side: event.side,
      yellowCards: 0,
      redCards: 0,
      injuries: 0,
      suspended: false,
      reason: null,
    };

    if (event.event_type === "AMARELO") current.yellowCards += 1;
    if (event.event_type === "VERMELHO") current.redCards += 1;
    if (event.event_type === "LESAO") current.injuries += 1;

    map.set(key, current);
  });

  const entries = Array.from(map.values()).map((entry) => {
    if (entry.redCards > 0) {
      entry.suspended = true;
      entry.reason = "Vermelho";
    } else if (entry.yellowCards >= 3) {
      entry.suspended = true;
      entry.reason = "3 amarelos";
    } else if (entry.yellowCards === 2) {
      entry.reason = "2 amarelos";
    } else if (entry.injuries > 0) {
      entry.reason = "Lesão";
    }

    return entry;
  });

  const yellowCards = entries
    .filter((entry) => entry.yellowCards > 0)
    .sort((a, b) => b.yellowCards - a.yellowCards || a.displayName.localeCompare(b.displayName));

  const redCards = entries
    .filter((entry) => entry.redCards > 0)
    .sort((a, b) => b.redCards - a.redCards || a.displayName.localeCompare(b.displayName));

  const pendingSuspensions = entries
    .filter((entry) => entry.yellowCards === 2 && !entry.redCards)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const nextGameSuspensions = entries
    .filter((entry) => entry.suspended)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    yellowCards,
    redCards,
    pendingSuspensions,
    nextGameSuspensions,
    notes: [
      "Cálculo inicial com base nos eventos existentes ordenados por partida e sequência.",
      "A regra de ciclos de amarelos pode ser ajustada quando o fluxo de partidas ficar mais detalhado.",
    ],
  };
}
