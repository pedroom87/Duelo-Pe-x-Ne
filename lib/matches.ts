import { supabase } from "./supabase";

export interface MatchEvent {
  id: string;
  match_id: string;
  player_name_raw: string;
  side: "PEDRO" | "NETU";
  event_type:
    | "GOL"
    | "ASSISTENCIA"
    | "AMARELO"
    | "VERMELHO"
    | "LESAO"
    | "GOL_CONTRA";
  created_at: string;
}

export interface Match {
  id: string;
  match_number: number;
  pedro_goals: number;
  netu_goals: number;
  winner: string;
  status: "OPEN" | "CLOSED";
  created_at: string;
}

export async function getNextMatchNumber() {
  const { data } = await supabase
    .from("matches")
    .select("match_number")
    .order("match_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.match_number ?? 0) + 1;
}

export async function createMatch() {
  const number = await getNextMatchNumber();

  const { data, error } = await supabase
    .from("matches")
    .insert({
      match_number: number,
      pedro_goals: 0,
      netu_goals: 0,
      winner: "",
      status: "OPEN",
    })
    .select()
    .single();

  if (error) throw error;

  return data as Match;
}

/**
 * Busca os eventos de uma partida
 */
export async function getMatchEvents(matchId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at");

  if (error) throw error;

  return (data || []) as MatchEvent[];
}

/**
 * Busca os detalhes de uma partida
 */
export async function getMatch(matchId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) throw error;

  return data as Match;
}

/**
 * Atualiza o placar da partida baseado nos gols registrados
 */
export async function refreshScore(matchId: string) {
  const { data } = await supabase
    .from("events")
    .select("side")
    .eq("match_id", matchId)
    .eq("event_type", "GOL");

  const pedro = data?.filter((g) => g.side === "PEDRO").length ?? 0;

  const netu = data?.filter((g) => g.side === "NETU").length ?? 0;

  let winner = "";

  if (pedro > netu) winner = "PEDRO";

  if (netu > pedro) winner = "NETU";

  await supabase
    .from("matches")
    .update({
      pedro_goals: pedro,
      netu_goals: netu,
      winner,
    })
    .eq("id", matchId);
}

/**
 * Encerra a partida
 */
export async function endMatch(matchId: string) {
  // Primeiro atualiza o placar uma última vez
  await refreshScore(matchId);

  // Depois marca como encerrada
  const { error } = await supabase
    .from("matches")
    .update({ status: "CLOSED" })
    .eq("id", matchId);

  if (error) throw error;
}

/**
 * Deleta uma partida e todos seus eventos associados
 */
export async function deleteMatch(matchId: string) {
  // Primeiro deleta todos os eventos da partida
  const { error: eventsError } = await supabase
    .from("events")
    .delete()
    .eq("match_id", matchId);

  if (eventsError) throw eventsError;

  // Depois deleta a partida
  const { error: matchError } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (matchError) throw matchError;
}