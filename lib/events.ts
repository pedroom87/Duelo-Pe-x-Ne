import { supabase } from "./supabase";

type EventType =
  | "GOL"
  | "ASSISTENCIA"
  | "AMARELO"
  | "VERMELHO"
  | "LESAO"
  | "GOL_CONTRA";

type Side = "PEDRO" | "NETU";

/**
 * Registra um evento genérico na partida
 * 
 * Busca match_number antes de inserir para garantir integridade
 */
export async function addEvent(
  matchId: string,
  playerName: string,
  side: Side,
  eventType: EventType
) {
  // 1. Busca a partida para obter match_number
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("match_number")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(`Partida não encontrada (ID: ${matchId})`);
  }

  // 2. Insere o evento com match_number
  const { error } = await supabase.from("events").insert({
    match_id: matchId,
    match_number: match.match_number,
    player_name_raw: playerName,
    side,
    event_type: eventType,
  });

  if (error) throw error;
}

/**
 * Registra um gol
 */
export async function addGoal(
  matchId: string,
  playerName: string,
  side: Side
) {
  return addEvent(matchId, playerName, side, "GOL");
}

/**
 * Registra uma assistência
 */
export async function addAssist(
  matchId: string,
  playerName: string,
  side: Side
) {
  return addEvent(matchId, playerName, side, "ASSISTENCIA");
}

/**
 * Registra um cartão amarelo
 */
export async function addYellowCard(
  matchId: string,
  playerName: string,
  side: Side
) {
  return addEvent(matchId, playerName, side, "AMARELO");
}

/**
 * Registra um cartão vermelho
 */
export async function addRedCard(
  matchId: string,
  playerName: string,
  side: Side
) {
  return addEvent(matchId, playerName, side, "VERMELHO");
}

/**
 * Registra uma lesão
 */
export async function addInjury(
  matchId: string,
  playerName: string,
  side: Side
) {
  return addEvent(matchId, playerName, side, "LESAO");
}

/**
 * Registra um gol contra
 */
export async function addOwnGoal(
  matchId: string,
  playerName: string,
  side: Side
) {
  return addEvent(matchId, playerName, side, "GOL_CONTRA");
}