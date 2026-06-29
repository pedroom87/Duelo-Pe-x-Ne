import { supabase } from "./supabase";

export interface Player {
  id: string;
  name: string;
  side: string;
}

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

  if (error) throw error;

  return data as Player[];
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

  players?.forEach((p: any) => map.set(p.id, p));

  aliases?.forEach((a: any) => {
    if (a.players)
      map.set(a.players.id, a.players);
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}