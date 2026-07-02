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
  suspended: DisciplineEntry[];
  injured: DisciplineEntry[];
  pending: DisciplineEntry[];
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

type DisciplineState = {
  yellowCards: number;
  redCards: number;
  injuries: number;
  suspended: boolean;
  reason: string | null;
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

function getEntryKey(event: EventRecord) {
  return event.player_id
    ? `player:${event.player_id}`
    : `name:${normalizeText(event.player_name_raw || "")}:${event.side}`;
}

export async function getDisciplineSummary(): Promise<DisciplineSummary> {
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, match_number, status")
    .eq("status", "CLOSED")
    .order("match_number", { ascending: true });

  if (matchesError) {
    throw matchesError;
  }

  const closedMatches = (matches ?? []).filter((match) => match.status === "CLOSED");
  if (closedMatches.length === 0) {
    return {
      suspended: [],
      injured: [],
      pending: [],
      notes: ["Ainda não há partidas encerradas para calcular disciplina do próximo jogo."],
    };
  }

  const latestMatchNumber = closedMatches[closedMatches.length - 1].match_number;

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, player_id, player_name_raw, side, event_type, match_number, seq")
    .eq("match_number", latestMatchNumber)
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

  const states = new Map<string, DisciplineState>();

  (events ?? []).forEach((event) => {
    if (!["AMARELO", "VERMELHO", "LESAO"].includes(event.event_type)) {
      return;
    }

    const key = getEntryKey(event);
    const current = states.get(key) ?? {
      yellowCards: 0,
      redCards: 0,
      injuries: 0,
      suspended: false,
      reason: null,
    };

    if (event.event_type === "AMARELO") current.yellowCards += 1;
    if (event.event_type === "VERMELHO") {
      current.redCards += 1;
      current.suspended = true;
      current.reason = "Vermelho";
    }
    if (event.event_type === "LESAO") {
      current.injuries += 1;
      current.suspended = true;
      current.reason = "Lesão";
    }

    if (current.yellowCards >= 3 && !current.suspended) {
      current.suspended = true;
      current.reason = "3 amarelos";
    }

    states.set(key, current);
  });

  const entries = Array.from(states.entries()).map(([key, state]) => {
    const entry: DisciplineEntry = {
      playerId: key.startsWith("player:") ? key.replace("player:", "") : null,
      displayName: key.startsWith("player:")
        ? playersById.get(key.replace("player:", ""))?.name || "Jogador sem nome"
        : key.split(":").slice(2).join(":"),
      side: (events ?? []).find((event) => getEntryKey(event) === key)?.side || "PEDRO",
      yellowCards: state.yellowCards,
      redCards: state.redCards,
      injuries: state.injuries,
      suspended: state.suspended,
      reason: state.reason,
    };

    if (state.yellowCards === 2 && !state.suspended) {
      entry.reason = "2 amarelos";
    }

    return entry;
  });

  const suspended = entries
    .filter((entry) => entry.suspended && entry.reason !== "Lesão")
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const injured = entries
    .filter((entry) => entry.reason === "Lesão")
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const pending = entries
    .filter((entry) => entry.yellowCards === 2 && !entry.suspended)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    suspended,
    injured,
    pending,
    notes: [
      "A disciplina é calculada com base no último jogo encerrado e no próximo número de partida.",
      "Suspensões e lesões deixam de aparecer assim que a próxima partida é registrada.",
    ],
  };
}
