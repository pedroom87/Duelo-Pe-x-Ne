import { supabase } from "./supabase";

export type RankingEventType =
  | "GOL"
  | "ASSISTENCIA"
  | "AMARELO"
  | "VERMELHO"
  | "LESAO"
  | "GOL_CONTRA";

export type RankingEntry = {
  key: string;
  playerId: string | null;
  displayName: string;
  side: "PEDRO" | "NETU";
  total: number;
};

export type RankingSnapshot = Record<RankingEventType, RankingEntry[]>;

type EventRecord = {
  id: string;
  player_id: string | null;
  player_name_raw: string | null;
  side: "PEDRO" | "NETU";
  event_type: RankingEventType;
};

type PlayerRecord = {
  id: string;
  name: string;
  side: string;
};

const rankingTypes: RankingEventType[] = [
  "GOL",
  "ASSISTENCIA",
  "AMARELO",
  "VERMELHO",
  "LESAO",
  "GOL_CONTRA",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDisplayName(
  event: EventRecord,
  playersById: Map<string, PlayerRecord>
) {
  if (event.player_id) {
    const officialPlayer = playersById.get(event.player_id);
    if (officialPlayer?.name) {
      return officialPlayer.name;
    }
  }

  return event.player_name_raw?.trim() || "Jogador sem nome";
}

export async function getRankings() {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, player_id, player_name_raw, side, event_type")
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

  const rankingMap = Object.fromEntries(
    rankingTypes.map((type) => [type, new Map<string, RankingEntry>()])
  ) as Record<RankingEventType, Map<string, RankingEntry>>;

  (events ?? []).forEach((event) => {
    if (!rankingTypes.includes(event.event_type)) {
      return;
    }

    const key = event.player_id
      ? `player:${event.player_id}`
      : `name:${normalizeText(event.player_name_raw || "")}:${event.side}`;

    const currentMap = rankingMap[event.event_type];
    const current = currentMap.get(key) ?? {
      key,
      playerId: event.player_id,
      displayName: getDisplayName(event, playersById),
      side: event.side,
      total: 0,
    };

    current.total += 1;
    currentMap.set(key, current);
  });

  const snapshot = Object.fromEntries(
    rankingTypes.map((type) => [
      type,
      Array.from(rankingMap[type].values()).sort((a, b) => b.total - a.total),
    ])
  ) as RankingSnapshot;

  return snapshot;
}
