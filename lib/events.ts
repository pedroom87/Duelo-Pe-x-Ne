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
 * Busca match_number e calcula seq antes de inserir para garantir integridade
 */
export async function addEvent(
  matchId: string,
  playerName: string,
  side: Side,
  eventType: EventType,
  playerId?: string
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

  // 2. Busca todos os eventos da partida para calcular seq
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("seq")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1);

  if (eventsError) {
    throw new Error(`Erro ao buscar eventos da partida: ${eventsError.message}`);
  }

  // 3. Calcula o novo seq
  const newSeq = (events && events.length > 0) ? events[0].seq + 1 : 1;

  // 4. Insere o evento com match_number e seq
  const { error } = await supabase.from("events").insert({
    match_id: matchId,
    match_number: match.match_number,
    seq: newSeq,
    player_id: playerId ?? null,
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
  side: Side,
  playerId?: string
) {
  return addEvent(matchId, playerName, side, "GOL", playerId);
}

/**
 * Registra uma assistência
 */
export async function addAssist(
  matchId: string,
  playerName: string,
  side: Side,
  playerId?: string
) {
  return addEvent(matchId, playerName, side, "ASSISTENCIA", playerId);
}

/**
 * Registra um cartão amarelo
 */
export async function addYellowCard(
  matchId: string,
  playerName: string,
  side: Side,
  playerId?: string
) {
  return addEvent(matchId, playerName, side, "AMARELO", playerId);
}

/**
 * Registra um cartão vermelho
 */
export async function addRedCard(
  matchId: string,
  playerName: string,
  side: Side,
  playerId?: string
) {
  return addEvent(matchId, playerName, side, "VERMELHO", playerId);
}

/**
 * Registra uma lesão
 */
export async function addInjury(
  matchId: string,
  playerName: string,
  side: Side,
  playerId?: string
) {
  return addEvent(matchId, playerName, side, "LESAO", playerId);
}

/**
 * Registra um gol contra
 */
export async function addOwnGoal(
  matchId: string,
  playerName: string,
  side: Side,
  playerId?: string
) {
  return addEvent(matchId, playerName, side, "GOL_CONTRA", playerId);
}
