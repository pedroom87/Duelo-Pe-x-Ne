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

export type ReassignEventsToPlayerResult = {
  updatedEvents: number;
  eventIds: string[];
  targetPlayerId: string;
};

export type EventReviewDetail = {
  id: string;
  eventType: string;
  matchNumber: number | null;
  playerNameRaw: string;
  sourceCell: string | null;
  side: string;
  matchVerified: boolean;
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

type ReassignEventRecord = {
  id: string;
  side: string | null;
};

type EventReviewRecord = {
  id: string;
  match_id: string | null;
  match_number: number | null;
  event_type: string | null;
  player_name_raw: string | null;
  source_cell: string | null;
  side: string | null;
};

type EventReviewMatchRecord = {
  id: string;
  match_number: number | null;
  verified: boolean | null;
};

const LINK_EVENTS_BATCH_SIZE = 200;

function getEventIdBatches(ids: string[]) {
  const batches: string[][] = [];

  for (let index = 0; index < ids.length; index += LINK_EVENTS_BATCH_SIZE) {
    batches.push(ids.slice(index, index + LINK_EVENTS_BATCH_SIZE));
  }

  return batches;
}

export async function reassignEventsToPlayer(params: {
  eventIds: string[];
  targetPlayerId: string;
}): Promise<ReassignEventsToPlayerResult> {
  const eventIds = Array.from(new Set(params.eventIds.filter(Boolean)));
  const { targetPlayerId } = params;

  if (eventIds.length === 0) {
    return {
      updatedEvents: 0,
      eventIds: [],
      targetPlayerId,
    };
  }

  if (!targetPlayerId) {
    throw new Error("Selecione um jogador para receber os eventos.");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, side")
    .eq("id", targetPlayerId)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player) {
    throw new Error("Jogador de destino nao foi encontrado.");
  }

  const targetPlayer = player as LinkTargetPlayer;

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, side")
    .in("id", eventIds);

  if (eventsError) throw eventsError;

  const foundEvents = (events ?? []) as ReassignEventRecord[];
  const foundEventIds = new Set(foundEvents.map((event) => event.id));
  const missingEventIds = eventIds.filter((eventId) => !foundEventIds.has(eventId));

  if (missingEventIds.length > 0) {
    throw new Error("Um ou mais eventos da previa nao foram encontrados.");
  }

  const incompatibleEvent = foundEvents.find(
    (event) =>
      (event.side === "PEDRO" || event.side === "NETU") &&
      event.side !== targetPlayer.side
  );

  if (incompatibleEvent) {
    throw new Error("Ha eventos de outro lado/time nesta resolucao.");
  }

  let updatedEvents = 0;

  for (const batch of getEventIdBatches(eventIds)) {
    const { data: updated, error: updateError } = await supabase
      .from("events")
      .update({ player_id: targetPlayerId })
      .in("id", batch)
      .select("id");

    if (updateError) throw updateError;

    updatedEvents += updated?.length ?? 0;
  }

  return {
    updatedEvents,
    eventIds,
    targetPlayerId,
  };
}

export async function getEventReviewDetails(
  eventIds: string[]
): Promise<EventReviewDetail[]> {
  const ids = Array.from(new Set(eventIds.filter(Boolean)));

  if (ids.length === 0) return [];

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, match_id, match_number, event_type, player_name_raw, source_cell, side")
    .in("id", ids);

  if (eventsError) throw eventsError;

  const eventList = (events ?? []) as EventReviewRecord[];
  const matchIds = Array.from(
    new Set(eventList.map((event) => event.match_id).filter((id): id is string => Boolean(id)))
  );
  const matchNumbers = Array.from(
    new Set(
      eventList
        .map((event) => event.match_number)
        .filter((matchNumber): matchNumber is number => matchNumber !== null)
    )
  );

  const matchesById = new Map<string, EventReviewMatchRecord>();
  const matchesByNumber = new Map<number, EventReviewMatchRecord>();

  if (matchIds.length > 0) {
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, match_number, verified")
      .in("id", matchIds);

    if (matchesError) throw matchesError;

    ((matches ?? []) as EventReviewMatchRecord[]).forEach((match) => {
      matchesById.set(match.id, match);
      if (match.match_number !== null) matchesByNumber.set(match.match_number, match);
    });
  }

  if (matchNumbers.length > 0) {
    const missingMatchNumbers = matchNumbers.filter(
      (matchNumber) => !matchesByNumber.has(matchNumber)
    );

    if (missingMatchNumbers.length > 0) {
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id, match_number, verified")
        .in("match_number", missingMatchNumbers);

      if (matchesError) throw matchesError;

      ((matches ?? []) as EventReviewMatchRecord[]).forEach((match) => {
        matchesById.set(match.id, match);
        if (match.match_number !== null) matchesByNumber.set(match.match_number, match);
      });
    }
  }

  return eventList
    .map((event) => {
      const match =
        (event.match_id ? matchesById.get(event.match_id) : null) ??
        (event.match_number !== null ? matchesByNumber.get(event.match_number) : null);

      return {
        id: event.id,
        eventType: event.event_type || "SEM_TIPO",
        matchNumber: event.match_number,
        playerNameRaw: event.player_name_raw?.trim() || "Jogador sem nome",
        sourceCell: event.source_cell,
        side: event.side || "SEM_LADO",
        matchVerified: Boolean(match?.verified),
      };
    })
    .sort((a, b) => {
      const aMatch = a.matchNumber ?? 0;
      const bMatch = b.matchNumber ?? 0;

      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.playerNameRaw.localeCompare(b.playerNameRaw);
    });
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
