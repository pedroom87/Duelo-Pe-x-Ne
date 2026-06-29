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
 */
export async function addEvent(
  matchId: string,
  playerName: string,
  side: Side,
  eventType: EventType
) {
  const { error } = await supabase.from("events").insert({
    match_id: matchId,
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