import {
  buildPlayerIdentityIndex,
  normalizeText,
  resolvePlayerIdForEvent,
  type AliasIdentity,
  type PlayerIdentity,
  type PlayerIdentityEvent,
} from "./playerIdentity";
import { supabase } from "./supabase";

export type PlayerAlias = {
  id: string;
  player_id: string;
  alias: string;
  normalized_alias: string;
};

type MergePlayersParams = {
  sourcePlayerId: string;
  targetPlayerId: string;
};

type PlayerRecord = PlayerIdentity;

type EventRecord = PlayerIdentityEvent & {
  id: string;
};

export type MergePlayersResult = {
  sourcePlayer: PlayerRecord;
  targetPlayer: PlayerRecord;
  updatedEvents: number;
  transferredAliases: number;
  deletedSourcePlayer: boolean;
};

export type RecalculateRankingsResult = {
  processedEvents: number;
  updatedEvents: number;
  unresolvedEvents: number;
};

export async function getAliases(playerId: string): Promise<PlayerAlias[]> {
  const { data, error } = await supabase
    .from("player_aliases")
    .select("*")
    .eq("player_id", playerId)
    .order("alias");

  if (error) throw error;

  return (data ?? []) as PlayerAlias[];
}

export async function addAlias(
  playerId: string,
  alias: string
): Promise<PlayerAlias> {
  const aliasName = alias.trim();
  const normalized = normalizeText(aliasName);

  if (!aliasName || !normalized) {
    throw new Error("Alias não pode estar vazio.");
  }

  const { data: existingAlias, error: existingError } = await supabase
    .from("player_aliases")
    .select("*")
    .eq("player_id", playerId)
    .eq("normalized_alias", normalized)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingAlias) return existingAlias as PlayerAlias;

  const { data, error } = await supabase
    .from("player_aliases")
    .insert({
      player_id: playerId,
      alias: aliasName,
      normalized_alias: normalized,
    })
    .select("*")
    .single();

  if (error) throw error;

  return data as PlayerAlias;
}

export async function mergePlayers({
  sourcePlayerId,
  targetPlayerId,
}: MergePlayersParams): Promise<MergePlayersResult> {
  if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) {
    throw new Error("Jogadores de origem e destino precisam ser diferentes.");
  }

  const { data: sourcePlayer, error: sourceError } = await supabase
    .from("players")
    .select("id, name, side")
    .eq("id", sourcePlayerId)
    .single();

  if (sourceError) throw sourceError;

  const { data: targetPlayer, error: targetError } = await supabase
    .from("players")
    .select("id, name, side")
    .eq("id", targetPlayerId)
    .single();

  if (targetError) throw targetError;

  const { data: sourceAliases, error: sourceAliasesError } = await supabase
    .from("player_aliases")
    .select("*")
    .eq("player_id", sourcePlayerId);

  if (sourceAliasesError) throw sourceAliasesError;

  const { data: updatedEvents, error: updateError } = await supabase
    .from("events")
    .update({ player_id: targetPlayerId })
    .eq("player_id", sourcePlayerId)
    .select("id");

  if (updateError) throw updateError;

  const aliasesToTransfer = Array.from(
    new Set(
      [
        sourcePlayer.name,
        ...((sourceAliases ?? []) as PlayerAlias[]).map((alias) => alias.alias),
      ]
        .map((alias) => alias.trim())
        .filter(Boolean)
    )
  );

  for (const alias of aliasesToTransfer) {
    await addAlias(targetPlayerId, alias);
  }

  const { count, error: eventsCountError } = await supabase
    .from("events")
    .select("id", { head: true, count: "exact" })
    .eq("player_id", sourcePlayerId);

  if (eventsCountError) throw eventsCountError;

  let deletedSourcePlayer = false;

  if ((count ?? 0) === 0) {
    const { error: deleteAliasesError } = await supabase
      .from("player_aliases")
      .delete()
      .eq("player_id", sourcePlayerId);

    if (deleteAliasesError) throw deleteAliasesError;

    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", sourcePlayerId);

    if (deleteError) throw deleteError;

    deletedSourcePlayer = true;
  }

  return {
    sourcePlayer: sourcePlayer as PlayerRecord,
    targetPlayer: targetPlayer as PlayerRecord,
    updatedEvents: updatedEvents?.length ?? 0,
    transferredAliases: aliasesToTransfer.length,
    deletedSourcePlayer,
  };
}

export async function recalculateEventPlayerIds(): Promise<RecalculateRankingsResult> {
  const [
    { data: events, error: eventsError },
    { data: players, error: playersError },
    { data: aliases, error: aliasesError },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, player_id, player_name_raw, side")
      .order("match_number", { ascending: true })
      .order("seq", { ascending: true }),
    supabase.from("players").select("id, name, side"),
    supabase.from("player_aliases").select("player_id, normalized_alias"),
  ]);

  if (eventsError) throw eventsError;
  if (playersError) throw playersError;
  if (aliasesError) throw aliasesError;

  const eventList = (events ?? []) as EventRecord[];
  const index = buildPlayerIdentityIndex(
    (players ?? []) as PlayerIdentity[],
    (aliases ?? []) as AliasIdentity[]
  );

  let updatedEvents = 0;
  let unresolvedEvents = 0;

  for (const event of eventList) {
    const resolvedPlayerId = resolvePlayerIdForEvent(event, index);

    if (!resolvedPlayerId) {
      unresolvedEvents += 1;
      continue;
    }

    if (resolvedPlayerId === event.player_id) {
      continue;
    }

    const { error } = await supabase
      .from("events")
      .update({ player_id: resolvedPlayerId })
      .eq("id", event.id);

    if (error) throw error;

    updatedEvents += 1;
  }

  return {
    processedEvents: eventList.length,
    updatedEvents,
    unresolvedEvents,
  };
}
