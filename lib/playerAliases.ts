import { supabase } from "./supabase";

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
  const normalized = alias
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

  const { error } = await supabase
    .from("player_aliases")
    .insert({
      player_id: playerId,
      alias,
      normalized_alias: normalized,
    });

  if (error) throw error;
}