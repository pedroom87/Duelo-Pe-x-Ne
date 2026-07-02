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
  event_type: string;
};

type PlayerRecord = {
  id: string;
  name: string;
  side: string;
};

type AliasRecord = {
  id: string;
  player_id: string;
  alias: string;
  normalized_alias: string;
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
  playersById: Map<string, PlayerRecord>,
  resolvedPlayerId: string | null
) {
  if (resolvedPlayerId) {
    const officialPlayer = playersById.get(resolvedPlayerId);
    if (officialPlayer?.name) {
      return officialPlayer.name;
    }
  }

  if (event.player_id) {
    const officialPlayer = playersById.get(event.player_id);
    if (officialPlayer?.name) {
      return officialPlayer.name;
    }
  }

  return event.player_name_raw?.trim() || "Jogador sem nome";
}

function resolvePlayerId(
  event: EventRecord,
  playersById: Map<string, PlayerRecord>,
  aliasesByNormalized: Map<string, string>
) {
  if (event.player_id) {
    return event.player_id;
  }

  const normalizedName = normalizeText(event.player_name_raw || "");
  if (!normalizedName) {
    return null;
  }

  const aliasMatch = aliasesByNormalized.get(normalizedName);
  if (aliasMatch) {
    return aliasMatch;
  }

  const officialMatch = Array.from(playersById.values()).find((player) => {
    if (normalizeText(player.name) !== normalizedName) {
      return false;
    }

    return player.side === event.side;
  });

  if (officialMatch) {
    return officialMatch.id;
  }

  const fallbackMatch = Array.from(playersById.values()).find((player) => {
    return normalizeText(player.name) === normalizedName;
  });

  return fallbackMatch?.id ?? null;
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

  const { data: aliases, error: aliasesError } = await supabase
    .from("player_aliases")
    .select("id, player_id, alias, normalized_alias");

  if (aliasesError) {
    throw aliasesError;
  }

  const playersById = new Map<string, PlayerRecord>();
  (players ?? []).forEach((player) => {
    playersById.set(player.id, player as PlayerRecord);
  });

  const aliasesByNormalized = new Map<string, string>();
  (aliases ?? []).forEach((alias) => {
    aliasesByNormalized.set(alias.normalized_alias, alias.player_id);
  });

  const rankingMap = Object.fromEntries(
    rankingTypes.map((type) => [type, new Map<string, RankingEntry>()])
  ) as Record<RankingEventType, Map<string, RankingEntry>>;

  (events ?? []).forEach((event) => {
    const eventType = event.event_type as RankingEventType;

    if (!rankingTypes.includes(eventType)) {
      return;
    }

    const resolvedPlayerId = resolvePlayerId(event, playersById, aliasesByNormalized);

    const key = resolvedPlayerId
      ? `player:${resolvedPlayerId}`
      : `name:${normalizeText(event.player_name_raw || "")}:${event.side}`;

    const currentMap = rankingMap[eventType];
    const current = currentMap.get(key) ?? {
      key,
      playerId: resolvedPlayerId,
      displayName: getDisplayName(event, playersById, resolvedPlayerId),
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
