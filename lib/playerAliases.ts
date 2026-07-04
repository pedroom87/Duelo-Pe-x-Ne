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
  aliasConflicts?: number;
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

export async function getAliasOwnerByNormalized(
  normalizedAlias: string
): Promise<{ player_id: string } | null> {
  const normalized = normalizeText(normalizedAlias);

  if (!normalized) return null;

  const { data, error } = await supabase
    .from("player_aliases")
    .select("player_id")
    .eq("normalized_alias", normalized)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { player_id: data.player_id as string };
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

  async function transferAliasSafe(params: {
    aliasName: string;
    normalizedAlias: string;
  }) {
    const { aliasName, normalizedAlias } = params;

    const { data: existing, error: existingError } = await supabase
      .from("player_aliases")
      .select("id, player_id")
      .eq("normalized_alias", normalizedAlias)
      .maybeSingle();

    if (existingError) throw existingError;

    if (!existing) {
      await supabase.from("player_aliases").insert({
        player_id: targetPlayerId,
        alias: aliasName,
        normalized_alias: normalizedAlias,
      });
      return { transferred: true, conflict: false };
    }

    if (existing.player_id === targetPlayerId) {
      // Já pertence ao destino: idempotente.
      return { transferred: false, conflict: false };
    }

    if (existing.player_id === sourcePlayerId) {
      // Pertence à origem: move para o destino.
      const { error: updateError } = await supabase
        .from("player_aliases")
        .update({ player_id: targetPlayerId })
        .eq("id", existing.id);

      if (updateError) throw updateError;

      return { transferred: true, conflict: false };
    }

    // Pertence a outro jogador: não sobrescreve.
    return { transferred: false, conflict: true };
  }

  let aliasConflicts = 0;
  let transferredAliasCount = 0;

  const automaticAliasName = sourcePlayer.name.trim();
  const automaticNormalized = normalizeText(automaticAliasName);

  const { data: updatedEvents, error: updateError } = await supabase
    .from("events")
    .update({ player_id: targetPlayerId })
    .eq("player_id", sourcePlayerId)
    .select("id");

  if (updateError) throw updateError;

  if (automaticNormalized) {
    const autoResult = await transferAliasSafe({
      aliasName: automaticAliasName,
      normalizedAlias: automaticNormalized,
    });

    if (autoResult.conflict) aliasConflicts += 1;
    if (autoResult.transferred) transferredAliasCount += 1;
  }

  const { data: sourceAliases, error: sourceAliasesError } = await supabase
    .from("player_aliases")
    .select("alias")
    .eq("player_id", sourcePlayerId);

  if (sourceAliasesError) throw sourceAliasesError;

  const aliasesToTransfer = Array.from(
    new Set(
      ((sourceAliases ?? []) as Array<Pick<PlayerAlias, "alias">>)
        .map((a) => (a.alias ?? "").trim())
        .filter(Boolean)
    )
  );

  for (const alias of aliasesToTransfer) {
    const normalized = normalizeText(alias);
    if (!normalized) continue;

    const result = await transferAliasSafe({
      aliasName: alias,
      normalizedAlias: normalized,
    });

    if (result.conflict) aliasConflicts += 1;
    if (result.transferred) transferredAliasCount += 1;
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
    transferredAliases: transferredAliasCount,
    aliasConflicts: aliasConflicts || undefined,
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
