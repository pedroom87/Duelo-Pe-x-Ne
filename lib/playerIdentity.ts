export type PlayerSide = "PEDRO" | "NETU";

export type PlayerIdentity = {
  id: string;
  name: string;
  side: string;
};

export type AliasIdentity = {
  player_id: string;
  normalized_alias: string;
};

export type PlayerIdentityEvent = {
  player_id: string | null;
  player_name_raw: string | null;
  side: string;
};

export type PlayerIdentityIndex = {
  playersById: Map<string, PlayerIdentity>;
  aliasesByNormalized: Map<string, AliasIdentity[]>;
  playersByNormalizedSide: Map<string, PlayerIdentity[]>;
  playersByNormalizedName: Map<string, PlayerIdentity[]>;
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function addToMapList<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue
) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function uniqueAliasesByPlayerId(aliases: AliasIdentity[]) {
  const unique = new Map<string, AliasIdentity>();

  aliases.forEach((alias) => {
    unique.set(alias.player_id, alias);
  });

  return Array.from(unique.values());
}

export function buildPlayerIdentityIndex(
  players: PlayerIdentity[],
  aliases: AliasIdentity[]
): PlayerIdentityIndex {
  const playersById = new Map<string, PlayerIdentity>();
  const aliasesByNormalized = new Map<string, AliasIdentity[]>();
  const playersByNormalizedSide = new Map<string, PlayerIdentity[]>();
  const playersByNormalizedName = new Map<string, PlayerIdentity[]>();

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);

    playersById.set(player.id, player);
    addToMapList(playersByNormalizedName, normalizedName, player);
    addToMapList(playersByNormalizedSide, `${normalizedName}:${player.side}`, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = normalizeText(alias.normalized_alias);
    if (!normalizedAlias) return;

    addToMapList(aliasesByNormalized, normalizedAlias, alias);
  });

  return {
    playersById,
    aliasesByNormalized,
    playersByNormalizedSide,
    playersByNormalizedName,
  };
}

export function resolvePlayerIdForEvent(
  event: PlayerIdentityEvent,
  index: PlayerIdentityIndex
) {
  if (event.player_id && index.playersById.has(event.player_id)) {
    return event.player_id;
  }

  const normalizedName = normalizeText(event.player_name_raw ?? "");
  if (!normalizedName) {
    return null;
  }

  const aliasCandidates = uniqueAliasesByPlayerId(
    index.aliasesByNormalized.get(normalizedName) ?? []
  ).filter((alias) => index.playersById.has(alias.player_id));
  const aliasWithSameSide = aliasCandidates.find((alias) => {
    const player = index.playersById.get(alias.player_id);
    return player?.side === event.side;
  });

  if (aliasWithSameSide) {
    return aliasWithSameSide.player_id;
  }

  if (aliasCandidates.length === 1) {
    return aliasCandidates[0].player_id;
  }

  const sameSidePlayers =
    index.playersByNormalizedSide.get(`${normalizedName}:${event.side}`) ?? [];
  if (sameSidePlayers.length === 1) {
    return sameSidePlayers[0].id;
  }

  const sameNamePlayers = index.playersByNormalizedName.get(normalizedName) ?? [];
  if (sameNamePlayers.length === 1) {
    return sameNamePlayers[0].id;
  }

  return null;
}
