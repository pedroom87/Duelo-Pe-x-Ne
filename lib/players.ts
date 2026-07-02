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

type PlayerUsageEvent = {
  player_id: string | null;
  player_name_raw: string | null;
  side: string;
  match_number: number | null;
};

type PlayerAliasSearchResult = {
  alias: string;
  player_id: string;
  players: Player | Player[] | null;
};

function getAliasPlayer(alias: PlayerAliasSearchResult) {
  if (Array.isArray(alias.players)) {
    return alias.players[0] ?? null;
  }

  return alias.players;
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
export async function createPlayer(name: string, side: "PEDRO" | "NETU"): Promise<Player> {
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
