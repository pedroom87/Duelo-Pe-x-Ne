import { supabase } from "./supabase";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function getAliases(playerId: string) {
  const { data, error } = await supabase
    .from("player_aliases")
    .select("*")
    .eq("player_id", playerId)
    .order("alias");

  if (error) throw error;

  return data;
}

export async function addAlias(playerId: string, alias: string) {
  const normalized = normalizeText(alias);

  const { data: existingAlias, error: existingError } = await supabase
    .from("player_aliases")
    .select("id")
    .eq("player_id", playerId)
    .eq("normalized_alias", normalized)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingAlias) return;

  const { error } = await supabase
    .from("player_aliases")
    .insert({
      player_id: playerId,
      alias,
      normalized_alias: normalized,
    });

  if (error) throw error;
}

export async function mergePlayers({
  sourcePlayerId,
  targetPlayerId,
  deleteSourcePlayer = false,
}: {
  sourcePlayerId: string;
  targetPlayerId: string;
  deleteSourcePlayer?: boolean;
}) {
  if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) {
    throw new Error("Jogadores de origem e destino precisam ser diferentes.");
  }

  const { data: sourcePlayer, error: sourceError } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", sourcePlayerId)
    .single();

  if (sourceError) throw sourceError;

  const { data: targetPlayer, error: targetError } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", targetPlayerId)
    .single();

  if (targetError) throw targetError;

  const { error: updateError } = await supabase
    .from("events")
    .update({ player_id: targetPlayerId })
    .eq("player_id", sourcePlayerId);

  if (updateError) throw updateError;

  const aliasName = sourcePlayer?.name?.trim();
  if (aliasName) {
    const normalizedAlias = normalizeText(aliasName);
    const { data: existingAlias, error: aliasCheckError } = await supabase
      .from("player_aliases")
      .select("id")
      .eq("player_id", targetPlayerId)
      .eq("normalized_alias", normalizedAlias)
      .maybeSingle();

    if (aliasCheckError) throw aliasCheckError;

    if (!existingAlias) {
      const { error: aliasError } = await supabase
        .from("player_aliases")
        .insert({
          player_id: targetPlayerId,
          alias: aliasName,
          normalized_alias: normalizedAlias,
        });

      if (aliasError) throw aliasError;
    }
  }

  if (deleteSourcePlayer) {
    const { count, error: eventsCountError } = await supabase
      .from("events")
      .select("id", { head: true, count: "exact" })
      .eq("player_id", sourcePlayerId);

    if (eventsCountError) throw eventsCountError;

    if ((count ?? 0) === 0) {
      const { error: deleteError } = await supabase
        .from("players")
        .delete()
        .eq("id", sourcePlayerId);

      if (deleteError) throw deleteError;
    }
  }

  return {
    sourcePlayer,
    targetPlayer,
  };
}