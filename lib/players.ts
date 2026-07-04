import { normalizeText } from "./playerIdentity";
import { supabase } from "./supabase";

export interface Player {
  id: string;
  name: string;
  side: string;
}

export type PlayerAlias = {
  id: string;
  player_id: string;
  alias: string;
  normalized_alias: string;
};

export type PlayerWithAliases = Player & {
  aliases: PlayerAlias[];
};

export type DataHealthLevel = "Excelente" | "Boa" | "Atenção" | "Crítica";

export type DataHealthStatus = {
  label: DataHealthLevel;
  description: string;
};

export type DataHealthPlayerSummary = {
  id: string;
  name: string;
  side: string;
};

export type DataHealthPlayerCandidate = DataHealthPlayerSummary & {
  reason: string;
};

export type UnlinkedEventBreakdown = {
  eventType: string;
  side: string;
  count: number;
};

export type UnlinkedEventSideGroup = {
  side: string;
  count: number;
  breakdown: UnlinkedEventBreakdown[];
  candidates: DataHealthPlayerCandidate[];
};

export type UnlinkedEventNameGroup = {
  normalizedName: string;
  displayName: string;
  count: number;
  breakdown: UnlinkedEventBreakdown[];
  sideGroups: UnlinkedEventSideGroup[];
};

export type AliasConflict = {
  normalizedAlias: string;
  aliasExamples: string[];
  owners: DataHealthPlayerSummary[];
  matchingPlayers: DataHealthPlayerSummary[];
  reason: string;
};

export type PossibleDuplicatePlayerGroup = {
  normalizedName: string;
  reason: string;
  players: DataHealthPlayerSummary[];
  aliases: string[];
};

export type RankingsDataHealthAudit = {
  totalEvents: number;
  eventsWithPlayerId: number;
  eventsWithoutPlayerId: number;
  linkedEventsPercent: number;
  playersCount: number;
  aliasesCount: number;
  aliasConflictsCount: number;
  possibleDuplicateGroupsCount: number;
  health: DataHealthStatus;
  unlinkedEventNames: UnlinkedEventNameGroup[];
  aliasConflicts: AliasConflict[];
  possibleDuplicateGroups: PossibleDuplicatePlayerGroup[];
  hasRelevantIssues: boolean;
};

export type ExistingPlayerDeletionPreview = {
  status: "found";
  player: Player;
  eventsCount: number;
  aliasesCount: number;
  canDelete: boolean;
};

export type DeletedPlayerDeletionPreview = {
  status: "deleted";
  playerId: string;
  eventsCount: 0;
  aliasesCount: 0;
  canDelete: true;
};

export type PlayerDeletionPreview =
  | ExistingPlayerDeletionPreview
  | DeletedPlayerDeletionPreview;

type PlayerUsageEvent = {
  player_id: string | null;
  player_name_raw: string | null;
  side: string;
  match_number: number | null;
};

type RankingAuditEvent = {
  id: string;
  player_id: string | null;
  player_name_raw: string | null;
  side: string | null;
  event_type: string | null;
};

type PlayerAliasSearchResult = {
  alias: string;
  player_id: string;
  players: Player | Player[] | null;
};

const AUDIT_EVENT_PAGE_SIZE = 1000;
const AUDIT_PREVIEW_LIMIT = 8;

function getAliasPlayer(alias: PlayerAliasSearchResult) {
  if (Array.isArray(alias.players)) {
    return alias.players[0] ?? null;
  }

  return alias.players;
}

function addToListMap<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue
) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function getNormalizedAlias(alias: PlayerAlias) {
  return normalizeText(alias.normalized_alias || alias.alias);
}

function playerToSummary(player: Player): DataHealthPlayerSummary {
  return {
    id: player.id,
    name: player.name,
    side: player.side,
  };
}

function unknownPlayerSummary(playerId: string): DataHealthPlayerSummary {
  return {
    id: playerId,
    name: "Jogador não encontrado",
    side: "-",
  };
}

function sortPlayerSummaries(
  a: DataHealthPlayerSummary,
  b: DataHealthPlayerSummary
) {
  if (a.side !== b.side) return a.side.localeCompare(b.side);
  return a.name.localeCompare(b.name);
}

function uniquePlayerSummaries(players: DataHealthPlayerSummary[]) {
  const byId = new Map<string, DataHealthPlayerSummary>();

  players.forEach((player) => {
    byId.set(player.id, player);
  });

  return Array.from(byId.values()).sort(sortPlayerSummaries);
}

function isKnownPlayerSide(side: string) {
  return side === "PEDRO" || side === "NETU";
}

function getAuditCandidates(params: {
  normalizedName: string;
  side: string;
  players: Player[];
  aliases: PlayerAlias[];
}) {
  const { normalizedName, side, players, aliases } = params;
  const playersById = new Map(players.map((player) => [player.id, player]));
  const reasonsByPlayerId = new Map<string, Set<string>>();

  function addReason(playerId: string, reason: string) {
    const current = reasonsByPlayerId.get(playerId) ?? new Set<string>();
    current.add(reason);
    reasonsByPlayerId.set(playerId, current);
  }

  players.forEach((player) => {
    if (normalizeText(player.name) === normalizedName) {
      addReason(player.id, "nome oficial igual");
    }
  });

  aliases.forEach((alias) => {
    if (getNormalizedAlias(alias) === normalizedName) {
      addReason(alias.player_id, "alias igual");
    }
  });

  return Array.from(reasonsByPlayerId.entries())
    .map(([playerId, reasons]) => {
      const player = playersById.get(playerId);
      if (!player) return null;

      return {
        ...playerToSummary(player),
        reason: Array.from(reasons).join(", "),
      };
    })
    .filter((player): player is DataHealthPlayerCandidate => Boolean(player))
    .sort((a, b) => {
      const aSameSide = isKnownPlayerSide(side) && a.side === side ? 0 : 1;
      const bSameSide = isKnownPlayerSide(side) && b.side === side ? 0 : 1;

      if (aSameSide !== bSameSide) return aSameSide - bSameSide;
      return sortPlayerSummaries(a, b);
    });
}

function getHealthStatus(linkedEventsPercent: number): DataHealthStatus {
  if (linkedEventsPercent >= 95) {
    return {
      label: "Excelente",
      description: "Rankings com alta confiabilidade.",
    };
  }

  if (linkedEventsPercent >= 80) {
    return {
      label: "Boa",
      description: "Rankings confiáveis, com poucos pontos para revisar.",
    };
  }

  if (linkedEventsPercent >= 50) {
    return {
      label: "Atenção",
      description: "Rankings podem ser afetados por eventos sem vínculo.",
    };
  }

  return {
    label: "Crítica",
    description: "Rankings precisam de curadoria antes de serem confiáveis.",
  };
}

async function getAllRankingAuditEvents(): Promise<RankingAuditEvent[]> {
  const events: RankingAuditEvent[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select("id, player_id, player_name_raw, side, event_type")
      .order("match_number", { ascending: true })
      .order("seq", { ascending: true })
      .range(from, from + AUDIT_EVENT_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as RankingAuditEvent[];
    events.push(...page);

    if (page.length < AUDIT_EVENT_PAGE_SIZE) break;

    from += AUDIT_EVENT_PAGE_SIZE;
  }

  return events;
}

function buildUnlinkedEventNameGroups(
  events: RankingAuditEvent[],
  players: Player[],
  aliases: PlayerAlias[]
) {
  type DraftSideGroup = {
    side: string;
    count: number;
    breakdown: Map<string, UnlinkedEventBreakdown>;
  };
  type DraftGroup = {
    normalizedName: string;
    displayName: string;
    count: number;
    breakdown: Map<string, UnlinkedEventBreakdown>;
    sideGroups: Map<string, DraftSideGroup>;
  };

  const groups = new Map<string, DraftGroup>();

  events.forEach((event) => {
    if (event.player_id) return;

    const rawName = event.player_name_raw?.trim() || "Jogador sem nome";
    const normalizedName = normalizeText(rawName) || "sem-nome";
    const current = groups.get(normalizedName) ?? {
      normalizedName,
      displayName: rawName,
      count: 0,
      breakdown: new Map<string, UnlinkedEventBreakdown>(),
      sideGroups: new Map<string, DraftSideGroup>(),
    };

    current.count += 1;

    if (current.displayName === "Jogador sem nome" && rawName !== current.displayName) {
      current.displayName = rawName;
    }

    const eventType = event.event_type || "SEM_TIPO";
    const side = event.side || "SEM_LADO";
    const breakdownKey = `${eventType}:${side}`;
    const currentBreakdown = current.breakdown.get(breakdownKey) ?? {
      eventType,
      side,
      count: 0,
    };

    currentBreakdown.count += 1;
    current.breakdown.set(breakdownKey, currentBreakdown);

    const currentSideGroup = current.sideGroups.get(side) ?? {
      side,
      count: 0,
      breakdown: new Map<string, UnlinkedEventBreakdown>(),
    };
    const sideBreakdownKey = `${eventType}:${side}`;
    const currentSideBreakdown = currentSideGroup.breakdown.get(sideBreakdownKey) ?? {
      eventType,
      side,
      count: 0,
    };

    currentSideGroup.count += 1;
    currentSideBreakdown.count += 1;
    currentSideGroup.breakdown.set(sideBreakdownKey, currentSideBreakdown);
    current.sideGroups.set(side, currentSideGroup);

    groups.set(normalizedName, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      normalizedName: group.normalizedName,
      displayName: group.displayName,
      count: group.count,
      breakdown: Array.from(group.breakdown.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return `${a.side}:${a.eventType}`.localeCompare(`${b.side}:${b.eventType}`);
      }),
      sideGroups: Array.from(group.sideGroups.values())
        .map((sideGroup) => ({
          side: sideGroup.side,
          count: sideGroup.count,
          breakdown: Array.from(sideGroup.breakdown.values()).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.eventType.localeCompare(b.eventType);
          }),
          candidates: getAuditCandidates({
            normalizedName: group.normalizedName,
            side: sideGroup.side,
            players,
            aliases,
          }),
        }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.side.localeCompare(b.side);
        }),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.displayName.localeCompare(b.displayName);
    });
}

function buildAliasConflicts(players: Player[], aliases: PlayerAlias[]) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const aliasesByNormalized = new Map<string, PlayerAlias[]>();

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;
    addToListMap(playersByNormalizedName, normalizedName, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;
    addToListMap(aliasesByNormalized, normalizedAlias, alias);
  });

  const conflicts: AliasConflict[] = [];

  aliasesByNormalized.forEach((items, normalizedAlias) => {
    const ownerIds = Array.from(new Set(items.map((item) => item.player_id)));
    const matchingPlayers = playersByNormalizedName.get(normalizedAlias) ?? [];
    const foreignMatches = matchingPlayers.filter(
      (player) => !ownerIds.includes(player.id)
    );
    const reasons: string[] = [];

    if (ownerIds.length > 1) {
      reasons.push("mesmo alias vinculado a jogadores diferentes");
    }

    if (foreignMatches.length > 0) {
      reasons.push("alias também parece nome oficial de outro jogador");
    }

    if (reasons.length === 0) return;

    conflicts.push({
      normalizedAlias,
      aliasExamples: Array.from(new Set(items.map((item) => item.alias))).slice(
        0,
        3
      ),
      owners: uniquePlayerSummaries(
        ownerIds.map((playerId) => {
          const player = playersById.get(playerId);
          return player ? playerToSummary(player) : unknownPlayerSummary(playerId);
        })
      ),
      matchingPlayers: uniquePlayerSummaries(foreignMatches.map(playerToSummary)),
      reason: reasons.join("; "),
    });
  });

  return conflicts.sort((a, b) => {
    if (b.owners.length !== a.owners.length) return b.owners.length - a.owners.length;
    return a.normalizedAlias.localeCompare(b.normalizedAlias);
  });
}

function buildPossibleDuplicateGroups(players: Player[], aliases: PlayerAlias[]) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const playersByNormalizedSide = new Map<string, Player[]>();
  const aliasesByNormalized = new Map<string, PlayerAlias[]>();
  const groups = new Map<string, PossibleDuplicatePlayerGroup>();

  function addGroup(params: {
    normalizedName: string;
    reason: string;
    players: Player[];
    aliases?: string[];
  }) {
    const summaries = uniquePlayerSummaries(params.players.map(playerToSummary));
    if (summaries.length < 2) return;

    const key = `${params.normalizedName}:${summaries
      .map((player) => player.id)
      .sort()
      .join("|")}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        normalizedName: params.normalizedName,
        reason: params.reason,
        players: summaries,
        aliases: Array.from(new Set(params.aliases ?? [])).sort(),
      });
      return;
    }

    const reasons = new Set(existing.reason.split("; "));
    reasons.add(params.reason);

    groups.set(key, {
      ...existing,
      reason: Array.from(reasons).join("; "),
      aliases: Array.from(new Set([...existing.aliases, ...(params.aliases ?? [])])).sort(),
    });
  }

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;

    addToListMap(playersByNormalizedName, normalizedName, player);
    addToListMap(playersByNormalizedSide, `${normalizedName}:${player.side}`, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;
    addToListMap(aliasesByNormalized, normalizedAlias, alias);
  });

  playersByNormalizedSide.forEach((items, key) => {
    if (items.length < 2) return;

    const [normalizedName] = key.split(":");
    addGroup({
      normalizedName,
      reason: "mesmo nome normalizado no mesmo lado",
      players: items,
    });
  });

  aliases.forEach((alias) => {
    const owner = playersById.get(alias.player_id);
    if (!owner) return;

    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;

    const relatedPlayers = (playersByNormalizedName.get(normalizedAlias) ?? []).filter(
      (player) => player.id !== owner.id && player.side === owner.side
    );

    if (relatedPlayers.length === 0) return;

    addGroup({
      normalizedName: normalizedAlias,
      reason: "alias aponta para nome de outro jogador do mesmo lado",
      players: [owner, ...relatedPlayers],
      aliases: [alias.alias],
    });
  });

  aliasesByNormalized.forEach((items, normalizedAlias) => {
    const ownerPlayers = uniquePlayerSummaries(
      items
        .map((item) => playersById.get(item.player_id))
        .filter((player): player is Player => Boolean(player))
        .map(playerToSummary)
    );

    const playersBySide = new Map<string, Player[]>();

    ownerPlayers.forEach((owner) => {
      const player = playersById.get(owner.id);
      if (!player) return;
      addToListMap(playersBySide, player.side, player);
    });

    playersBySide.forEach((sidePlayers) => {
      if (sidePlayers.length < 2) return;

      addGroup({
        normalizedName: normalizedAlias,
        reason: "mesmo alias em jogadores do mesmo lado",
        players: sidePlayers,
        aliases: Array.from(new Set(items.map((item) => item.alias))).slice(0, 3),
      });
    });
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (b.players.length !== a.players.length) return b.players.length - a.players.length;
    return a.normalizedName.localeCompare(b.normalizedName);
  });
}

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

  if (error) throw error;

  return data as Player[];
}

export async function getPlayersWithAliases(): Promise<PlayerWithAliases[]> {
  const [{ data: players, error: playersError }, { data: aliases, error: aliasesError }] =
    await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase.from("player_aliases").select("*").order("alias"),
    ]);

  if (playersError) throw playersError;
  if (aliasesError) throw aliasesError;

  const aliasList = (aliases ?? []) as PlayerAlias[];
  const aliasesByPlayerId = new Map<string, PlayerAlias[]>();

  aliasList.forEach((alias) => {
    const current = aliasesByPlayerId.get(alias.player_id) ?? [];
    current.push(alias);
    aliasesByPlayerId.set(alias.player_id, current);
  });

  return ((players ?? []) as Player[]).map((player) => ({
    ...player,
    aliases: aliasesByPlayerId.get(player.id) ?? [],
  }));
}

export async function getRankingsDataHealthAudit(): Promise<RankingsDataHealthAudit> {
  const [
    { data: players, error: playersError },
    { data: aliases, error: aliasesError },
    events,
  ] = await Promise.all([
    supabase.from("players").select("id, name, side").order("name"),
    supabase
      .from("player_aliases")
      .select("id, player_id, alias, normalized_alias")
      .order("alias"),
    getAllRankingAuditEvents(),
  ]);

  if (playersError) throw playersError;
  if (aliasesError) throw aliasesError;

  const playerList = (players ?? []) as Player[];
  const aliasList = (aliases ?? []) as PlayerAlias[];
  const eventsWithPlayerId = events.filter((event) => Boolean(event.player_id)).length;
  const totalEvents = events.length;
  const eventsWithoutPlayerId = totalEvents - eventsWithPlayerId;
  const linkedEventsPercent =
    totalEvents === 0
      ? 100
      : Number(((eventsWithPlayerId / totalEvents) * 100).toFixed(1));
  const unlinkedEventNames = buildUnlinkedEventNameGroups(
    events,
    playerList,
    aliasList
  );
  const aliasConflicts = buildAliasConflicts(playerList, aliasList);
  const possibleDuplicateGroups = buildPossibleDuplicateGroups(playerList, aliasList);

  return {
    totalEvents,
    eventsWithPlayerId,
    eventsWithoutPlayerId,
    linkedEventsPercent,
    playersCount: playerList.length,
    aliasesCount: aliasList.length,
    aliasConflictsCount: aliasConflicts.length,
    possibleDuplicateGroupsCount: possibleDuplicateGroups.length,
    health: getHealthStatus(linkedEventsPercent),
    unlinkedEventNames: unlinkedEventNames.slice(0, AUDIT_PREVIEW_LIMIT),
    aliasConflicts: aliasConflicts.slice(0, AUDIT_PREVIEW_LIMIT),
    possibleDuplicateGroups: possibleDuplicateGroups.slice(0, AUDIT_PREVIEW_LIMIT),
    hasRelevantIssues:
      eventsWithoutPlayerId > 0 ||
      aliasConflicts.length > 0 ||
      possibleDuplicateGroups.length > 0,
  };
}

export async function getPlayerDeletionPreview(
  playerId: string
): Promise<PlayerDeletionPreview> {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, name, side")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) throw playerError;

  if (!player) {
    await deletePlayerAliases(playerId);

    return {
      status: "deleted",
      playerId,
      eventsCount: 0,
      aliasesCount: 0,
      canDelete: true,
    };
  }

  const [{ count: eventsCount, error: eventsError }, { count: aliasesCount, error: aliasesError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id", { head: true, count: "exact" })
        .eq("player_id", playerId),
      supabase
        .from("player_aliases")
        .select("id", { head: true, count: "exact" })
        .eq("player_id", playerId),
    ]);

  if (eventsError) throw eventsError;
  if (aliasesError) throw aliasesError;

  const totalEvents = eventsCount ?? 0;

  return {
    status: "found",
    player: player as Player,
    eventsCount: totalEvents,
    aliasesCount: aliasesCount ?? 0,
    canDelete: totalEvents === 0,
  };
}

export async function deletePlayerSafely(playerId: string) {
  const preview = await getPlayerDeletionPreview(playerId);

  if (preview.status === "deleted") {
    return preview;
  }

  if (!preview.canDelete) {
    throw new Error(
      "Este jogador possui eventos registrados e não pode ser excluído. Utilize a opção Mesclar jogadores."
    );
  }

  await deletePlayerAliases(playerId);

  const { error: playerError } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (playerError) throw playerError;

  await deletePlayerAliases(playerId);

  const { data: deletedPlayer, error: deletedCheckError } = await supabase
    .from("players")
    .select("id, name, side")
    .eq("id", playerId)
    .maybeSingle();

  if (deletedCheckError) throw deletedCheckError;

  if (!deletedPlayer) {
    return preview;
  }

  throw new Error("Não foi possível excluir o jogador.");
}

async function deletePlayerAliases(playerId: string) {
  const { error } = await supabase
    .from("player_aliases")
    .delete()
    .eq("player_id", playerId);

  if (error) throw error;
}

export type PlayerEventUsage = {
  count: number;
  latestMatchNumber: number;
};

export async function getPlayerEventUsageIndex(): Promise<{
  usageByPlayerId: Record<string, PlayerEventUsage>;
  hasAnyEvent: Set<string>;
}> {
  const [{ data: players, error: playersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase
        .from("events")
        .select("player_id, player_name_raw, side, match_number"),
    ]);

  if (playersError) throw playersError;
  if (eventsError) throw eventsError;

  const playerList = (players ?? []) as Player[];
  const eventList = (events ?? []) as PlayerUsageEvent[];
  const byId = new Map(playerList.map((player) => [player.id, player]));

  const usageMap = new Map<string, PlayerEventUsage>();

  eventList.forEach((event) => {
    let playerId: string | null = null;

    if (event.player_id) {
      playerId = event.player_id;
    } else if (event.player_name_raw) {
      const normalizedName = normalizeText(event.player_name_raw);
      if (normalizedName) {
        const matchingPlayer = playerList.find((player) => {
          return (
            normalizeText(player.name) === normalizedName &&
            player.side === event.side
          );
        });

        playerId = matchingPlayer?.id ?? null;
      }
    }

    if (!playerId || !byId.has(playerId)) return;

    const current = usageMap.get(playerId) ?? {
      count: 0,
      latestMatchNumber: 0,
    };

    current.count += 1;
    current.latestMatchNumber = Math.max(
      current.latestMatchNumber,
      Number(event.match_number ?? 0)
    );

    usageMap.set(playerId, current);
  });

  const usageByPlayerId: Record<string, PlayerEventUsage> = {};
  const hasAnyEvent = new Set<string>();

  usageMap.forEach((value, key) => {
    usageByPlayerId[key] = value;
    hasAnyEvent.add(key);
  });

  return { usageByPlayerId, hasAnyEvent };
}

export async function getPlayersWithRecentUsage() {
  const [{ data: players, error: playersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase
        .from("events")
        .select("player_id, player_name_raw, side, match_number")
        .order("match_number", { ascending: false }),
    ]);

  if (playersError) throw playersError;
  if (eventsError) throw eventsError;

  const playerList = (players ?? []) as Player[];
  const eventList = (events ?? []) as PlayerUsageEvent[];
  const byId = new Map(playerList.map((player) => [player.id, player]));
  const usageMap = new Map<string, { count: number; latestMatchNumber: number }>();

  eventList.forEach((event) => {
    let playerId: string | null = null;

    if (event.player_id) {
      playerId = event.player_id;
    } else if (event.player_name_raw) {
      const normalizedName = normalizeText(event.player_name_raw);
      if (normalizedName) {
        const matchingPlayer = playerList.find((player) => {
          return (
            normalizeText(player.name) === normalizedName &&
            player.side === event.side
          );
        });

        playerId = matchingPlayer?.id ?? null;
      }
    }

    if (!playerId || !byId.has(playerId)) {
      return;
    }

    const current = usageMap.get(playerId) ?? { count: 0, latestMatchNumber: 0 };
    current.count += 1;
    current.latestMatchNumber = Math.max(
      current.latestMatchNumber,
      Number(event.match_number ?? 0)
    );
    usageMap.set(playerId, current);
  });

  return playerList.sort((a, b) => {
    const aUsage = usageMap.get(a.id);
    const bUsage = usageMap.get(b.id);

    const aLatest = aUsage?.latestMatchNumber ?? 0;
    const bLatest = bUsage?.latestMatchNumber ?? 0;

    if (aLatest !== bLatest) {
      return bLatest - aLatest;
    }

    const aCount = aUsage?.count ?? 0;
    const bCount = bUsage?.count ?? 0;

    if (aCount !== bCount) {
      return bCount - aCount;
    }

    return a.name.localeCompare(b.name);
  });
}

export async function searchPlayers(search: string) {
  const term = search.trim();

  if (!term) return [];

  const { data: aliases } = await supabase
    .from("player_aliases")
    .select(`
      alias,
      player_id,
      players(
        id,
        name,
        side
      )
    `)
    .ilike("normalized_alias", `%${term.toLowerCase()}%`);

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .ilike("name", `%${term}%`);

  const map = new Map<string, Player>();
  const playerResults = (players ?? []) as Player[];
  const aliasResults = (aliases ?? []) as PlayerAliasSearchResult[];

  playerResults.forEach((player) => map.set(player.id, player));

  aliasResults.forEach((alias) => {
    const player = getAliasPlayer(alias);

    if (player) {
      map.set(player.id, player);
    }
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Cria um novo jogador se não existir com o mesmo nome e side
 * Retorna o jogador criado ou existente
 */
export async function createPlayer(
  name: string,
  side: "PEDRO" | "NETU"
): Promise<Player> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Nome do jogador não pode estar vazio");
  }

  // Verifica se já existe jogador com esse nome e side
  const { data: existing, error: checkError } = await supabase
    .from("players")
    .select("*")
    .eq("name", trimmedName)
    .eq("side", side)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw checkError;
  }

  // Se existe, retorna o existente
  if (existing) {
    return existing as Player;
  }

  // Cria novo jogador (apenas com colunas que existem: name, side)
  const { data: newPlayer, error: createError } = await supabase
    .from("players")
    .insert({
      name: trimmedName,
      side,
    })
    .select()
    .single();

  if (createError) throw createError;

  return newPlayer as Player;
}

export async function updatePlayerBasic(
  playerId: string,
  params: { name: string; side: "PEDRO" | "NETU" }
): Promise<Player> {
  const name = params.name.trim();

  if (!playerId) {
    throw new Error("ID do jogador inválido.");
  }
  if (!name) {
    throw new Error("Nome do jogador não pode ficar vazio.");
  }
  if (params.side !== "PEDRO" && params.side !== "NETU") {
    throw new Error("Lado/time inválido.");
  }

  const { data, error } = await supabase
    .from("players")
    .update({
      name,
      side: params.side,
    })
    .eq("id", playerId)
    .select("id, name, side")
    .single();

  if (error) throw error;

  return data as Player;
}
