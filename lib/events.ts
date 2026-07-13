import { normalizeText } from "./playerIdentity";
import { supabase } from "./supabase";

type EventType =
  | "GOL"
  | "ASSISTENCIA"
  | "AMARELO"
  | "VERMELHO"
  | "LESAO"
  | "GOL_CONTRA";

type Side = "PEDRO" | "NETU";

type LinkUnresolvedEventsParams = {
  normalizedPlayerName: string;
  side: string;
  playerId: string;
};

export type LinkUnresolvedEventsResult = {
  updatedEvents: number;
  playerId: string;
  normalizedPlayerName: string;
  side: string;
};

type LinkableEventRecord = {
  id: string;
  player_id: string | null;
  player_name_raw: string | null;
  side: string | null;
};

type LinkTargetPlayer = {
  id: string;
  side: string;
};

const LINK_EVENTS_BATCH_SIZE = 200;

function getEventIdBatches(ids: string[]) {
  const batches: string[][] = [];

  for (let index = 0; index < ids.length; index += LINK_EVENTS_BATCH_SIZE) {
    batches.push(ids.slice(index, index + LINK_EVENTS_BATCH_SIZE));
  }

  return batches;
}

export async function linkUnresolvedEventsToPlayer({
  normalizedPlayerName,
  side,
  playerId,
}: LinkUnresolvedEventsParams): Promise<LinkUnresolvedEventsResult> {
  const normalizedName = normalizeText(normalizedPlayerName);

  if (!normalizedName) {
    throw new Error("Nome normalizado inválido para vinculação.");
  }

  if (!playerId) {
    throw new Error("Selecione um jogador para vincular os eventos.");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, side")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player) {
    throw new Error("Jogador selecionado não foi encontrado.");
  }

  const targetPlayer = player as LinkTargetPlayer;

  if (
    (side === "PEDRO" || side === "NETU") &&
    targetPlayer.side !== side
  ) {
    throw new Error("O jogador confirmado nÃ£o pertence ao lado destes eventos.");
  }

  let query = supabase
    .from("events")
    .select("id, player_id, player_name_raw, side")
    .is("player_id", null);

  if (side === "PEDRO" || side === "NETU") {
    query = query.eq("side", side);
  } else {
    query = query.is("side", null);
  }

  const { data: events, error: eventsError } = await query;

  if (eventsError) throw eventsError;

  const idsToUpdate = ((events ?? []) as LinkableEventRecord[])
    .filter((event) => normalizeText(event.player_name_raw ?? "") === normalizedName)
    .map((event) => event.id);

  if (idsToUpdate.length === 0) {
    return {
      updatedEvents: 0,
      playerId,
      normalizedPlayerName: normalizedName,
      side,
    };
  }

  let updatedEvents = 0;

  for (const batch of getEventIdBatches(idsToUpdate)) {
    let updateQuery = supabase
      .from("events")
      .update({ player_id: playerId })
      .in("id", batch)
      .is("player_id", null)
      .select("id");

    if (side === "PEDRO" || side === "NETU") {
      updateQuery = updateQuery.eq("side", side);
    } else {
      updateQuery = updateQuery.is("side", null);
    }

    const { data: updated, error: updateError } = await updateQuery;

    if (updateError) throw updateError;

    updatedEvents += updated?.length ?? 0;
  }

  return {
    updatedEvents,
    playerId,
    normalizedPlayerName: normalizedName,
    side,
  };
}

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
