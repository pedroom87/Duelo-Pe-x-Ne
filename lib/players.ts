import {
  buildPlayerIdentityIndex,
  normalizeText,
  resolvePlayerIdForEvent,
  type AliasIdentity,
  type PlayerIdentity,
} from "./playerIdentity";
import { supabase } from "./supabase";
import historicalImportData from "../public/data/historico-extraido.json";

export interface Player {
  id: string;
  name: string;
  side: string;
}

export type PlayerAlias = {
  id: string;
  player_id: string;
  alias: string;
  normalized_alias: string;
};

export type PendingVinculoStatus = "VINCULO_PENDENTE" | "SEM_EVENTO_PROVAVEL_ENCONTRADO";

export type PendingVinculoProbableSource = {
  key: string; // normalizeText result used to match player_name_raw
  label: string; // e.g. "Nome normalizado" or "Alias normalizado: X"
  count: number; // probable event count
  matchesByAlias: boolean;
};

export type PendingVinculoPlayer = {
  playerId: string;
  linkedEventsCount: number; // events with player_id
  probableEventsCount: number; // events with player_id null + compatible player_name_raw/alias
  status: PendingVinculoStatus;
  probableSources: PendingVinculoProbableSource[];
};

export type PlayerWithAliases = Player & {
  aliases: PlayerAlias[];
};

export type PlayerGlobalSearchAlias = {
  id: string;
  alias: string;
  normalizedAlias: string;
  playerId: string;
  player: DataHealthPlayerSummary | null;
  isOrphan: boolean;
  isInconsistent: boolean;
  diagnostic: string | null;
  relatedPlayers: DataHealthPlayerSummary[];
};

export type PlayerGlobalSearchPlayer = DataHealthPlayerSummary & {
  normalizedName: string;
  aliases: Array<{
    id: string;
    alias: string;
    normalizedAlias: string;
  }>;
  eventsCount: number;
  latestMatchNumber: number;
};

export type PlayerGlobalSearchIndex = {
  players: PlayerGlobalSearchPlayer[];
  aliases: PlayerGlobalSearchAlias[];
};

export type DataHealthLevel = "Excelente" | "Boa" | "Atenção" | "Crítica";

export type DataHealthStatus = {
  label: DataHealthLevel;
  description: string;
};

export type DataHealthPlayerSummary = {
  id: string;
  name: string;
  side: string;
};

export type DataHealthPlayerCandidate = DataHealthPlayerSummary & {
  reason: string;
};

export type UnlinkedEventBreakdown = {
  eventType: string;
  side: string;
  count: number;
};

export type UnlinkedEventSideGroup = {
  side: string;
  count: number;
  breakdown: UnlinkedEventBreakdown[];
  candidates: DataHealthPlayerCandidate[];
};

export type UnlinkedEventNameGroup = {
  normalizedName: string;
  displayName: string;
  count: number;
  breakdown: UnlinkedEventBreakdown[];
  sideGroups: UnlinkedEventSideGroup[];
};

export type AliasConflict = {
  normalizedAlias: string;
  aliasExamples: string[];
  owners: DataHealthPlayerSummary[];
  matchingPlayers: DataHealthPlayerSummary[];
  reason: string;
};

export type PossibleDuplicatePlayerGroup = {
  normalizedName: string;
  reason: string;
  players: DataHealthPlayerSummary[];
  aliases: string[];
};

export type RankingReconciliationSample = {
  id: string;
  rawName: string;
  normalizedName: string;
  eventType: string;
  side: string;
  matchNumber: number | null;
  verified: boolean;
  candidates: DataHealthPlayerCandidate[];
};

export type RankingReconciliationSummary = {
  totalUnlinkedEvents: number;
  verifiedUnlinkedEvents: number;
  unverifiedUnlinkedEvents: number;
  safeCount: number;
  safeVerifiedCount: number;
  ambiguousCount: number;
  noCandidateCount: number;
  samples: {
    safe: RankingReconciliationSample[];
    ambiguous: RankingReconciliationSample[];
    noCandidate: RankingReconciliationSample[];
  };
};

export type HistoricalImportCoverageEventSample = {
  playerNameRaw: string;
  normalizedName: string;
  eventType: string;
  side: string;
  matchNumber: number;
  sourceCell: string | null;
  hasRegisteredPlayer: boolean;
  candidates: DataHealthPlayerSummary[];
};

export type HistoricalImportCoveragePlayerDifference = {
  playerNameRaw: string;
  normalizedName: string;
  side: string;
  expectedEvents: number;
  matchedEvents: number;
  missingEvents: number;
  expectedGoals: number;
  matchedGoals: number;
  missingGoals: number;
  hasRegisteredPlayer: boolean;
  candidates: DataHealthPlayerSummary[];
  samples: HistoricalImportCoverageEventSample[];
};

export type HistoricalImportCoverageMatchDifference = {
  matchNumber: number;
  expectedEvents: number;
  databaseEvents: number;
  matchedEvents: number;
  missingEvents: number;
  samples: HistoricalImportCoverageEventSample[];
};

export type HistoricalImportCoverageSummary = {
  expectedEvents: number;
  databaseEvents: number;
  matchedExpectedEvents: number;
  missingExpectedEvents: number;
  sourceCellExpectedEvents: number;
  sourceCellMatchedEvents: number;
  playersWithDifferenceCount: number;
  matchesWithPossibleIncompleteImportCount: number;
  samples: {
    missingEvents: HistoricalImportCoverageEventSample[];
    playerDifferences: HistoricalImportCoveragePlayerDifference[];
    matchDifferences: HistoricalImportCoverageMatchDifference[];
  };
};

export type OfficialRankingValidationStatus = "OK" | "Divergente";

export type OfficialRankingValidatorRow = {
  key: string;
  playerId: string | null;
  playerName: string;
  side: string;
  historicalGoals: number;
  siteGoals: number;
  difference: number;
  status: OfficialRankingValidationStatus;
  rawHistoricalNames: string[];
  matchedPlayers: DataHealthPlayerSummary[];
  isFeatured: boolean;
};

export type OfficialRankingValidatorSummary = {
  sourceAvailable: boolean;
  totalHistoricalGoals: number;
  totalSiteGoals: number;
  comparedPlayersCount: number;
  divergentPlayersCount: number;
  okPlayersCount: number;
  rows: OfficialRankingValidatorRow[];
};

export type RankingsDataHealthAudit = {
  totalEvents: number;
  eventsWithPlayerId: number;
  eventsWithoutPlayerId: number;
  linkedEventsPercent: number;
  playersCount: number;
  aliasesCount: number;
  aliasConflictsCount: number;
  possibleDuplicateGroupsCount: number;
  health: DataHealthStatus;
  reconciliationSummary: RankingReconciliationSummary;
  importCoverageSummary: HistoricalImportCoverageSummary;
  officialRankingValidator: OfficialRankingValidatorSummary;
  unlinkedEventNames: UnlinkedEventNameGroup[];
  aliasConflicts: AliasConflict[];
  possibleDuplicateGroups: PossibleDuplicatePlayerGroup[];
  hasRelevantIssues: boolean;
};

export type ExistingPlayerDeletionPreview = {
  status: "found";
  player: Player;
  eventsCount: number;
  aliasesCount: number;
  canDelete: boolean;
};

export type DeletedPlayerDeletionPreview = {
  status: "deleted";
  playerId: string;
  eventsCount: 0;
  aliasesCount: 0;
  canDelete: true;
};

export type PlayerDeletionPreview =
  | ExistingPlayerDeletionPreview
  | DeletedPlayerDeletionPreview;

type PlayerUsageEvent = {
  player_id: string | null;
  player_name_raw: string | null;
  side: string;
  match_number: number | null;
};

type PlayerGlobalSearchEvent = {
  player_id: string | null;
  match_number: number | null;
};

type RankingAuditEvent = {
  id: string;
  match_id: string | null;
  match_number: number | null;
  player_id: string | null;
  player_name_raw: string | null;
  side: string | null;
  event_type: string | null;
  source_cell: string | null;
};

type RankingAuditMatch = {
  id: string;
  match_number: number | null;
  verified: boolean | null;
};

type PlayerAliasSearchResult = {
  alias: string;
  player_id: string;
  players: Player | Player[] | null;
};

type HistoricalImportEvent = {
  seq: number;
  side: string;
  eventType: string;
  playerNameRaw: string;
  sourceCell?: string | null;
};

type HistoricalImportMatch = {
  matchNumber: number;
  events: HistoricalImportEvent[];
};

type HistoricalImportData = {
  matches: HistoricalImportMatch[];
};

type ExpectedHistoricalEvent = {
  playerNameRaw: string;
  normalizedName: string;
  eventType: string;
  side: string;
  matchNumber: number;
  sourceCell: string | null;
};

const AUDIT_EVENT_PAGE_SIZE = 1000;
const AUDIT_PREVIEW_LIMIT = 8;
const RECONCILIATION_SAMPLE_LIMIT = 5;
const IMPORT_COVERAGE_SAMPLE_LIMIT = 8;
const IMPORT_COVERAGE_PLAYER_SAMPLE_LIMIT = 3;
const HISTORICAL_IMPORT = historicalImportData as HistoricalImportData;
const OFFICIAL_RANKING_VALIDATOR_GROUPS = [
  {
    key: "official:luis-fabiano:PEDRO",
    canonicalName: "Luis Fabiano / Fabiano",
    side: "PEDRO",
    aliases: ["Luis Fabiano", "L. Fabiano", "L Fabiano", "Fabiano"],
  },
  {
    key: "official:ademilson:PEDRO",
    canonicalName: "Ademilson",
    side: "PEDRO",
    aliases: ["Ademilson"],
  },
] as const;
const OFFICIAL_RANKING_VALIDATOR_FEATURE_ORDER = new Map<string, number>(
  OFFICIAL_RANKING_VALIDATOR_GROUPS.map((group, index) => [group.key, index])
);

function getAliasPlayer(alias: PlayerAliasSearchResult) {
  if (Array.isArray(alias.players)) {
    return alias.players[0] ?? null;
  }

  return alias.players;
}

function addToListMap<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue
) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function getNormalizedAlias(alias: PlayerAlias) {
  return normalizeText(alias.normalized_alias || alias.alias);
}

function playerToSummary(player: Player): DataHealthPlayerSummary {
  return {
    id: player.id,
    name: player.name,
    side: player.side,
  };
}

function unknownPlayerSummary(playerId: string): DataHealthPlayerSummary {
  return {
    id: playerId,
    name: "Alias órfão (jogador não encontrado)",
    side: "-",
  };
}

function sortPlayerSummaries(
  a: DataHealthPlayerSummary,
  b: DataHealthPlayerSummary
) {
  if (a.side !== b.side) return a.side.localeCompare(b.side);
  return a.name.localeCompare(b.name);
}

function uniquePlayerSummaries(players: DataHealthPlayerSummary[]) {
  const byId = new Map<string, DataHealthPlayerSummary>();

  players.forEach((player) => {
    byId.set(player.id, player);
  });

  return Array.from(byId.values()).sort(sortPlayerSummaries);
}

function isKnownPlayerSide(side: string) {
  return side === "PEDRO" || side === "NETU";
}

function isCompatibleReconciliationSide(eventSide: string | null, playerSide: string) {
  if (eventSide === "PEDRO" || eventSide === "NETU") {
    return playerSide === eventSide;
  }

  return true;
}

function getAuditCandidates(params: {
  normalizedName: string;
  side: string;
  players: Player[];
  aliases: PlayerAlias[];
}) {
  const { normalizedName, side, players, aliases } = params;
  const playersById = new Map(players.map((player) => [player.id, player]));
  const reasonsByPlayerId = new Map<string, Set<string>>();

  function addReason(playerId: string, reason: string) {
    const current = reasonsByPlayerId.get(playerId) ?? new Set<string>();
    current.add(reason);
    reasonsByPlayerId.set(playerId, current);
  }

  players.forEach((player) => {
    if (normalizeText(player.name) === normalizedName) {
      addReason(player.id, "nome oficial igual");
    }
  });

  aliases.forEach((alias) => {
    if (getNormalizedAlias(alias) === normalizedName) {
      addReason(alias.player_id, "alias igual");
    }
  });

  return Array.from(reasonsByPlayerId.entries())
    .map(([playerId, reasons]) => {
      const player = playersById.get(playerId);
      if (!player) return null;

      return {
        ...playerToSummary(player),
        reason: Array.from(reasons).join(", "),
      };
    })
    .filter((player): player is DataHealthPlayerCandidate => Boolean(player))
    .sort((a, b) => {
      const aSameSide = isKnownPlayerSide(side) && a.side === side ? 0 : 1;
      const bSameSide = isKnownPlayerSide(side) && b.side === side ? 0 : 1;

      if (aSameSide !== bSameSide) return aSameSide - bSameSide;
      return sortPlayerSummaries(a, b);
  });
}

function getReconciliationCandidates(params: {
  normalizedName: string;
  side: string | null;
  playersById: Map<string, Player>;
  playersByNormalizedName: Map<string, Player[]>;
  aliasesByNormalized: Map<string, PlayerAlias[]>;
}) {
  const {
    normalizedName,
    side,
    playersById,
    playersByNormalizedName,
    aliasesByNormalized,
  } = params;
  const reasonsByPlayerId = new Map<string, Set<string>>();

  function addCandidate(playerId: string, reason: string) {
    const player = playersById.get(playerId);
    if (!player || !isCompatibleReconciliationSide(side, player.side)) return;

    const current = reasonsByPlayerId.get(playerId) ?? new Set<string>();
    current.add(reason);
    reasonsByPlayerId.set(playerId, current);
  }

  (playersByNormalizedName.get(normalizedName) ?? []).forEach((player) => {
    addCandidate(player.id, "nome oficial igual");
  });

  (aliasesByNormalized.get(normalizedName) ?? []).forEach((alias) => {
    addCandidate(alias.player_id, "alias igual");
  });

  return Array.from(reasonsByPlayerId.entries())
    .map(([playerId, reasons]) => {
      const player = playersById.get(playerId);
      if (!player) return null;

      return {
        ...playerToSummary(player),
        reason: Array.from(reasons).join(", "),
      };
    })
    .filter((player): player is DataHealthPlayerCandidate => Boolean(player))
    .sort(sortPlayerSummaries);
}

function getMatchForAuditEvent(params: {
  event: RankingAuditEvent;
  matchesById: Map<string, RankingAuditMatch>;
  matchesByNumber: Map<number, RankingAuditMatch>;
}) {
  const { event, matchesById, matchesByNumber } = params;

  if (event.match_id) {
    const byId = matchesById.get(event.match_id);
    if (byId) return byId;
  }

  if (event.match_number !== null) {
    return matchesByNumber.get(event.match_number) ?? null;
  }

  return null;
}

function buildRankingsReconciliationSummary(
  events: RankingAuditEvent[],
  matches: RankingAuditMatch[],
  players: Player[],
  aliases: PlayerAlias[]
): RankingReconciliationSummary {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const aliasesByNormalized = new Map<string, PlayerAlias[]>();
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const matchesByNumber = new Map(
    matches
      .filter((match) => match.match_number !== null)
      .map((match) => [match.match_number as number, match])
  );

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;
    addToListMap(playersByNormalizedName, normalizedName, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;
    addToListMap(aliasesByNormalized, normalizedAlias, alias);
  });

  const summary: RankingReconciliationSummary = {
    totalUnlinkedEvents: 0,
    verifiedUnlinkedEvents: 0,
    unverifiedUnlinkedEvents: 0,
    safeCount: 0,
    safeVerifiedCount: 0,
    ambiguousCount: 0,
    noCandidateCount: 0,
    samples: {
      safe: [],
      ambiguous: [],
      noCandidate: [],
    },
  };

  events.forEach((event) => {
    if (event.player_id) return;

    const rawName = event.player_name_raw?.trim() || "Jogador sem nome";
    const candidateKey = normalizeText(event.player_name_raw ?? "");
    const normalizedName = candidateKey || "sem-nome";
    const match = getMatchForAuditEvent({
      event,
      matchesById,
      matchesByNumber,
    });
    const verified = Boolean(match?.verified);
    const candidates = candidateKey
      ? getReconciliationCandidates({
          normalizedName: candidateKey,
          side: event.side,
          playersById,
          playersByNormalizedName,
          aliasesByNormalized,
        })
      : [];
    const sample: RankingReconciliationSample = {
      id: event.id,
      rawName,
      normalizedName,
      eventType: event.event_type || "SEM_TIPO",
      side: event.side || "SEM_LADO",
      matchNumber: event.match_number,
      verified,
      candidates,
    };

    summary.totalUnlinkedEvents += 1;

    if (verified) {
      summary.verifiedUnlinkedEvents += 1;
    } else {
      summary.unverifiedUnlinkedEvents += 1;
    }

    if (candidates.length === 1) {
      summary.safeCount += 1;
      if (verified) summary.safeVerifiedCount += 1;
      if (summary.samples.safe.length < RECONCILIATION_SAMPLE_LIMIT) {
        summary.samples.safe.push(sample);
      }
      return;
    }

    if (candidates.length > 1) {
      summary.ambiguousCount += 1;
      if (summary.samples.ambiguous.length < RECONCILIATION_SAMPLE_LIMIT) {
        summary.samples.ambiguous.push(sample);
      }
      return;
    }

    summary.noCandidateCount += 1;
    if (summary.samples.noCandidate.length < RECONCILIATION_SAMPLE_LIMIT) {
      summary.samples.noCandidate.push(sample);
    }
  });

  return summary;
}

function getExpectedHistoricalEvents(): ExpectedHistoricalEvent[] {
  return HISTORICAL_IMPORT.matches.flatMap((match) =>
    match.events.map((event) => {
      const playerNameRaw = event.playerNameRaw.trim() || "Jogador sem nome";

      return {
        playerNameRaw,
        normalizedName: normalizeText(playerNameRaw) || "sem-nome",
        eventType: event.eventType || "SEM_TIPO",
        side: event.side || "SEM_LADO",
        matchNumber: match.matchNumber,
        sourceCell: event.sourceCell?.trim() || null,
      };
    })
  );
}

function getNormalizedSourceCell(sourceCell: string | null | undefined) {
  return sourceCell?.trim().toUpperCase() || null;
}

function getCoverageBaseKey(params: {
  matchNumber: number | null;
  eventType: string | null;
  side: string | null;
  normalizedName: string;
}) {
  return [
    params.matchNumber ?? "SEM_PARTIDA",
    params.eventType || "SEM_TIPO",
    params.side || "SEM_LADO",
    params.normalizedName,
  ].join("|");
}

function getCoverageSourceKey(params: {
  sourceCell: string | null | undefined;
  matchNumber: number | null;
  eventType: string | null;
  side: string | null;
  normalizedName: string;
}) {
  const sourceCell = getNormalizedSourceCell(params.sourceCell);
  if (!sourceCell) return null;

  return `${sourceCell}|${getCoverageBaseKey(params)}`;
}

function getExpectedCoverageBaseKey(event: ExpectedHistoricalEvent) {
  return getCoverageBaseKey({
    matchNumber: event.matchNumber,
    eventType: event.eventType,
    side: event.side,
    normalizedName: event.normalizedName,
  });
}

function getExpectedCoverageSourceKey(event: ExpectedHistoricalEvent) {
  return getCoverageSourceKey({
    sourceCell: event.sourceCell,
    matchNumber: event.matchNumber,
    eventType: event.eventType,
    side: event.side,
    normalizedName: event.normalizedName,
  });
}

function getDatabaseCoverageBaseKey(event: RankingAuditEvent) {
  return getCoverageBaseKey({
    matchNumber: event.match_number,
    eventType: event.event_type,
    side: event.side,
    normalizedName: normalizeText(event.player_name_raw ?? "") || "sem-nome",
  });
}

function getDatabaseCoverageSourceKey(event: RankingAuditEvent) {
  return getCoverageSourceKey({
    sourceCell: event.source_cell,
    matchNumber: event.match_number,
    eventType: event.event_type,
    side: event.side,
    normalizedName: normalizeText(event.player_name_raw ?? "") || "sem-nome",
  });
}

function takeCoverageMatch(
  map: Map<string, RankingAuditEvent[]>,
  key: string | null
) {
  if (!key) return null;

  const matches = map.get(key);
  if (!matches || matches.length === 0) return null;

  return matches.shift() ?? null;
}

function buildCoverageCandidatesIndex(players: Player[], aliases: PlayerAlias[]) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const aliasesByNormalized = new Map<string, PlayerAlias[]>();

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;
    addToListMap(playersByNormalizedName, normalizedName, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;
    addToListMap(aliasesByNormalized, normalizedAlias, alias);
  });

  return {
    playersById,
    playersByNormalizedName,
    aliasesByNormalized,
  };
}

function getCoverageCandidates(params: {
  normalizedName: string;
  side: string;
  playersById: Map<string, Player>;
  playersByNormalizedName: Map<string, Player[]>;
  aliasesByNormalized: Map<string, PlayerAlias[]>;
}) {
  const {
    normalizedName,
    side,
    playersById,
    playersByNormalizedName,
    aliasesByNormalized,
  } = params;
  const candidates = new Map<string, Player>();

  (playersByNormalizedName.get(normalizedName) ?? []).forEach((player) => {
    if (player.side === side) candidates.set(player.id, player);
  });

  (aliasesByNormalized.get(normalizedName) ?? []).forEach((alias) => {
    const player = playersById.get(alias.player_id);
    if (player?.side === side) candidates.set(player.id, player);
  });

  return Array.from(candidates.values()).map(playerToSummary).sort(sortPlayerSummaries);
}

function buildCoverageSample(
  event: ExpectedHistoricalEvent,
  candidateIndex: ReturnType<typeof buildCoverageCandidatesIndex>
): HistoricalImportCoverageEventSample {
  const candidates = getCoverageCandidates({
    normalizedName: event.normalizedName,
    side: event.side,
    ...candidateIndex,
  });

  return {
    playerNameRaw: event.playerNameRaw,
    normalizedName: event.normalizedName,
    eventType: event.eventType,
    side: event.side,
    matchNumber: event.matchNumber,
    sourceCell: event.sourceCell,
    hasRegisteredPlayer: candidates.length > 0,
    candidates,
  };
}

function isAdemilsonCoverageSample(sample: {
  normalizedName: string;
  side: string;
}) {
  return sample.normalizedName === "ademilson" && sample.side === "PEDRO";
}

function limitMissingCoverageSamples(
  samples: HistoricalImportCoverageEventSample[]
) {
  const limited = samples.slice(0, IMPORT_COVERAGE_SAMPLE_LIMIT);
  const ademilsonSample = samples.find(isAdemilsonCoverageSample);

  if (
    ademilsonSample &&
    !limited.some((sample) => sample.sourceCell === ademilsonSample.sourceCell)
  ) {
    if (limited.length >= IMPORT_COVERAGE_SAMPLE_LIMIT) {
      limited[limited.length - 1] = ademilsonSample;
    } else {
      limited.push(ademilsonSample);
    }
  }

  return limited;
}

function limitPlayerCoverageDifferences(
  differences: HistoricalImportCoveragePlayerDifference[]
) {
  const limited = differences.slice(0, IMPORT_COVERAGE_SAMPLE_LIMIT);
  const ademilsonDifference = differences.find(isAdemilsonCoverageSample);

  if (
    ademilsonDifference &&
    !limited.some(
      (difference) =>
        difference.normalizedName === ademilsonDifference.normalizedName &&
        difference.side === ademilsonDifference.side
    )
  ) {
    if (limited.length >= IMPORT_COVERAGE_SAMPLE_LIMIT) {
      limited[limited.length - 1] = ademilsonDifference;
    } else {
      limited.push(ademilsonDifference);
    }
  }

  return limited;
}

type OfficialRankingValidatorGroup =
  (typeof OFFICIAL_RANKING_VALIDATOR_GROUPS)[number];

type OfficialRankingValidatorIdentityIndex = {
  groupCandidatesByKey: Map<string, DataHealthPlayerSummary[]>;
  groupKeyByPlayerId: Map<string, string>;
};

type OfficialRankingValidatorResolution = {
  key: string;
  playerId: string | null;
  playerName: string;
  side: string;
  matchedPlayers: DataHealthPlayerSummary[];
  isFeatured: boolean;
};

type OfficialRankingValidatorDraft = Omit<
  OfficialRankingValidatorRow,
  | "difference"
  | "status"
  | "rawHistoricalNames"
  | "matchedPlayers"
> & {
  rawHistoricalNames: Set<string>;
  matchedPlayers: Map<string, DataHealthPlayerSummary>;
};

function normalizeOfficialValidatorAlias(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function getOfficialValidatorNameKeys(value: string) {
  const keys = new Set<string>();
  const normalized = normalizeText(value);
  const loose = normalizeOfficialValidatorAlias(value);

  if (normalized) keys.add(normalized);
  if (loose) keys.add(loose);

  return keys;
}

function hasOfficialValidatorKeyMatch(
  candidateKeys: Set<string>,
  groupKeys: Set<string>
) {
  for (const key of candidateKeys) {
    if (groupKeys.has(key)) return true;
  }

  return false;
}

function getOfficialValidatorGroupKeys(group: OfficialRankingValidatorGroup) {
  const keys = new Set<string>();

  group.aliases.forEach((alias) => {
    getOfficialValidatorNameKeys(alias).forEach((key) => keys.add(key));
  });

  return keys;
}

function getOfficialValidatorGroupForName(params: {
  name: string;
  side: string | null;
}) {
  const candidateKeys = getOfficialValidatorNameKeys(params.name);

  return (
    OFFICIAL_RANKING_VALIDATOR_GROUPS.find(
      (group) =>
        group.side === params.side &&
        hasOfficialValidatorKeyMatch(
          candidateKeys,
          getOfficialValidatorGroupKeys(group)
        )
    ) ?? null
  );
}

function getOfficialValidatorGroupByKey(key: string) {
  return (
    OFFICIAL_RANKING_VALIDATOR_GROUPS.find((group) => group.key === key) ?? null
  );
}

function buildOfficialRankingValidatorIdentityIndex(
  players: Player[],
  aliases: PlayerAlias[]
): OfficialRankingValidatorIdentityIndex {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const groupCandidatesByKey = new Map<string, DataHealthPlayerSummary[]>();
  const groupKeyByPlayerId = new Map<string, string>();

  OFFICIAL_RANKING_VALIDATOR_GROUPS.forEach((group) => {
    const groupKeys = getOfficialValidatorGroupKeys(group);
    const candidates = new Map<string, Player>();

    players.forEach((player) => {
      if (player.side !== group.side) return;

      if (
        hasOfficialValidatorKeyMatch(
          getOfficialValidatorNameKeys(player.name),
          groupKeys
        )
      ) {
        candidates.set(player.id, player);
      }
    });

    aliases.forEach((alias) => {
      const player = playersById.get(alias.player_id);
      if (!player || player.side !== group.side) return;

      if (
        hasOfficialValidatorKeyMatch(
          getOfficialValidatorNameKeys(alias.normalized_alias || alias.alias),
          groupKeys
        )
      ) {
        candidates.set(player.id, player);
      }
    });

    const summaries = uniquePlayerSummaries(
      Array.from(candidates.values()).map(playerToSummary)
    );

    groupCandidatesByKey.set(group.key, summaries);
    summaries.forEach((player) => {
      groupKeyByPlayerId.set(player.id, group.key);
    });
  });

  return {
    groupCandidatesByKey,
    groupKeyByPlayerId,
  };
}

function resolveOfficialValidatorGroup(params: {
  group: OfficialRankingValidatorGroup;
  identityIndex: OfficialRankingValidatorIdentityIndex;
}): OfficialRankingValidatorResolution {
  const { group, identityIndex } = params;
  const candidates = identityIndex.groupCandidatesByKey.get(group.key) ?? [];

  return {
    key: group.key,
    playerId: candidates[0]?.id ?? null,
    playerName: group.canonicalName,
    side: group.side,
    matchedPlayers: candidates,
    isFeatured: true,
  };
}

function resolveOfficialValidatorPlayer(
  player: DataHealthPlayerSummary
): OfficialRankingValidatorResolution {
  return {
    key: `player:${player.id}`,
    playerId: player.id,
    playerName: player.name,
    side: player.side,
    matchedPlayers: [player],
    isFeatured: false,
  };
}

function resolveOfficialValidatorName(params: {
  name: string;
  normalizedName: string;
  side: string;
}): OfficialRankingValidatorResolution {
  const { name, normalizedName, side } = params;
  const displayName = name.trim() || "Jogador sem nome";

  return {
    key: `name:${normalizedName}:${side}`,
    playerId: null,
    playerName: displayName,
    side,
    matchedPlayers: [],
    isFeatured: false,
  };
}

function resolveHistoricalOfficialValidatorIdentity(params: {
  event: ExpectedHistoricalEvent;
  candidateIndex: ReturnType<typeof buildCoverageCandidatesIndex>;
  identityIndex: OfficialRankingValidatorIdentityIndex;
}): OfficialRankingValidatorResolution {
  const { event, candidateIndex, identityIndex } = params;
  const group = getOfficialValidatorGroupForName({
    name: event.playerNameRaw,
    side: event.side,
  });

  if (group) {
    return resolveOfficialValidatorGroup({ group, identityIndex });
  }

  const candidates = getCoverageCandidates({
    normalizedName: event.normalizedName,
    side: event.side,
    ...candidateIndex,
  });

  if (candidates.length === 1) {
    return resolveOfficialValidatorPlayer(candidates[0]);
  }

  return resolveOfficialValidatorName({
    name: event.playerNameRaw,
    normalizedName: event.normalizedName,
    side: event.side,
  });
}

function resolveDatabaseOfficialValidatorIdentity(params: {
  event: RankingAuditEvent;
  rankingIndex: ReturnType<typeof buildPlayerIdentityIndex>;
  identityIndex: OfficialRankingValidatorIdentityIndex;
}): OfficialRankingValidatorResolution {
  const { event, rankingIndex, identityIndex } = params;
  const eventSide = event.side || "SEM_LADO";
  const resolvedPlayerId = resolvePlayerIdForEvent(
    {
      player_id: event.player_id,
      player_name_raw: event.player_name_raw,
      side: eventSide,
    },
    rankingIndex
  );
  const groupKey = resolvedPlayerId
    ? identityIndex.groupKeyByPlayerId.get(resolvedPlayerId)
    : null;
  const group =
    (groupKey ? getOfficialValidatorGroupByKey(groupKey) : null) ??
    getOfficialValidatorGroupForName({
      name: event.player_name_raw ?? "",
      side: eventSide,
    });

  if (group) {
    return resolveOfficialValidatorGroup({ group, identityIndex });
  }

  if (resolvedPlayerId) {
    const player = rankingIndex.playersById.get(resolvedPlayerId);
    if (player) {
      return resolveOfficialValidatorPlayer(playerToSummary(player));
    }
  }

  const rawName = event.player_name_raw?.trim() || "Jogador sem nome";

  return resolveOfficialValidatorName({
    name: rawName,
    normalizedName: normalizeText(rawName) || "sem-nome",
    side: eventSide,
  });
}

function getOfficialValidatorDraft(
  drafts: Map<string, OfficialRankingValidatorDraft>,
  resolution: OfficialRankingValidatorResolution
) {
  const current = drafts.get(resolution.key);
  if (current) return current;

  const draft: OfficialRankingValidatorDraft = {
    key: resolution.key,
    playerId: resolution.playerId,
    playerName: resolution.playerName,
    side: resolution.side,
    historicalGoals: 0,
    siteGoals: 0,
    isFeatured: resolution.isFeatured,
    rawHistoricalNames: new Set<string>(),
    matchedPlayers: new Map<string, DataHealthPlayerSummary>(),
  };

  resolution.matchedPlayers.forEach((player) => {
    draft.matchedPlayers.set(player.id, player);
  });

  drafts.set(resolution.key, draft);

  return draft;
}

function mergeOfficialValidatorResolution(
  draft: OfficialRankingValidatorDraft,
  resolution: OfficialRankingValidatorResolution
) {
  if (!draft.playerId && resolution.playerId) {
    draft.playerId = resolution.playerId;
  }

  if (resolution.isFeatured) {
    draft.isFeatured = true;
  }

  resolution.matchedPlayers.forEach((player) => {
    draft.matchedPlayers.set(player.id, player);
  });
}

function getOfficialValidatorFeatureOrder(row: OfficialRankingValidatorRow) {
  return OFFICIAL_RANKING_VALIDATOR_FEATURE_ORDER.get(row.key) ?? 999;
}

function buildOfficialRankingValidatorSummary(params: {
  events: RankingAuditEvent[];
  players: Player[];
  aliases: PlayerAlias[];
}): OfficialRankingValidatorSummary {
  const { events, players, aliases } = params;
  const expectedGoalEvents = getExpectedHistoricalEvents().filter(
    (event) => event.eventType === "GOL"
  );
  const candidateIndex = buildCoverageCandidatesIndex(players, aliases);
  const identityIndex = buildOfficialRankingValidatorIdentityIndex(players, aliases);
  const rankingAliases: AliasIdentity[] = aliases.map((alias) => ({
    player_id: alias.player_id,
    normalized_alias: alias.normalized_alias || alias.alias,
  }));
  const rankingIndex = buildPlayerIdentityIndex(players as PlayerIdentity[], rankingAliases);
  const drafts = new Map<string, OfficialRankingValidatorDraft>();

  OFFICIAL_RANKING_VALIDATOR_GROUPS.forEach((group) => {
    const resolution = resolveOfficialValidatorGroup({ group, identityIndex });
    getOfficialValidatorDraft(drafts, resolution);
  });

  expectedGoalEvents.forEach((event) => {
    const resolution = resolveHistoricalOfficialValidatorIdentity({
      event,
      candidateIndex,
      identityIndex,
    });
    const draft = getOfficialValidatorDraft(drafts, resolution);

    mergeOfficialValidatorResolution(draft, resolution);
    draft.historicalGoals += 1;
    draft.rawHistoricalNames.add(event.playerNameRaw);
  });

  events.forEach((event) => {
    if (event.event_type !== "GOL") return;

    const resolution = resolveDatabaseOfficialValidatorIdentity({
      event,
      rankingIndex,
      identityIndex,
    });
    const draft = getOfficialValidatorDraft(drafts, resolution);

    mergeOfficialValidatorResolution(draft, resolution);
    draft.siteGoals += 1;
  });

  const rows = Array.from(drafts.values())
    .map((draft) => {
      const difference = draft.historicalGoals - draft.siteGoals;

      return {
        key: draft.key,
        playerId: draft.playerId,
        playerName: draft.playerName,
        side: draft.side,
        historicalGoals: draft.historicalGoals,
        siteGoals: draft.siteGoals,
        difference,
        status: difference === 0 ? "OK" : "Divergente",
        rawHistoricalNames: Array.from(draft.rawHistoricalNames).sort((a, b) =>
          a.localeCompare(b)
        ),
        matchedPlayers: uniquePlayerSummaries(
          Array.from(draft.matchedPlayers.values())
        ),
        isFeatured: draft.isFeatured,
      } satisfies OfficialRankingValidatorRow;
    })
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;

      if (a.isFeatured && b.isFeatured) {
        return getOfficialValidatorFeatureOrder(a) - getOfficialValidatorFeatureOrder(b);
      }

      if (a.status !== b.status) return a.status === "Divergente" ? -1 : 1;

      const absoluteDiff = Math.abs(b.difference) - Math.abs(a.difference);
      if (absoluteDiff !== 0) return absoluteDiff;

      if (b.historicalGoals !== a.historicalGoals) {
        return b.historicalGoals - a.historicalGoals;
      }

      return a.playerName.localeCompare(b.playerName);
    });
  const divergentPlayersCount = rows.filter(
    (row) => row.status === "Divergente"
  ).length;

  return {
    sourceAvailable: HISTORICAL_IMPORT.matches.length > 0,
    totalHistoricalGoals: expectedGoalEvents.length,
    totalSiteGoals: events.filter((event) => event.event_type === "GOL").length,
    comparedPlayersCount: rows.length,
    divergentPlayersCount,
    okPlayersCount: rows.length - divergentPlayersCount,
    rows,
  };
}

function buildHistoricalImportCoverageSummary(params: {
  events: RankingAuditEvent[];
  players: Player[];
  aliases: PlayerAlias[];
}): HistoricalImportCoverageSummary {
  type PlayerCoverageStats = {
    playerNameRaw: string;
    normalizedName: string;
    side: string;
    expectedEvents: number;
    matchedEvents: number;
    expectedGoals: number;
    matchedGoals: number;
    missingEvents: ExpectedHistoricalEvent[];
  };
  type MatchCoverageStats = {
    matchNumber: number;
    expectedEvents: number;
    databaseEvents: number;
    matchedEvents: number;
    missingEvents: ExpectedHistoricalEvent[];
  };

  const { events, players, aliases } = params;
  const expectedEvents = getExpectedHistoricalEvents();
  const databaseEventsWithSource = new Map<string, RankingAuditEvent[]>();
  const databaseEventsWithoutSource = new Map<string, RankingAuditEvent[]>();
  const candidateIndex = buildCoverageCandidatesIndex(players, aliases);
  const playerStats = new Map<string, PlayerCoverageStats>();
  const matchStats = new Map<number, MatchCoverageStats>();

  events.forEach((event) => {
    if (event.match_number !== null) {
      const current = matchStats.get(event.match_number) ?? {
        matchNumber: event.match_number,
        expectedEvents: 0,
        databaseEvents: 0,
        matchedEvents: 0,
        missingEvents: [],
      };
      current.databaseEvents += 1;
      matchStats.set(event.match_number, current);
    }

    const sourceKey = getDatabaseCoverageSourceKey(event);
    if (sourceKey) {
      addToListMap(databaseEventsWithSource, sourceKey, event);
      return;
    }

    addToListMap(databaseEventsWithoutSource, getDatabaseCoverageBaseKey(event), event);
  });

  let matchedExpectedEvents = 0;
  let sourceCellExpectedEvents = 0;
  let sourceCellMatchedEvents = 0;
  const missingSamples: HistoricalImportCoverageEventSample[] = [];

  expectedEvents.forEach((event) => {
    const playerKey = `${event.normalizedName}:${event.side}`;
    const currentPlayerStats = playerStats.get(playerKey) ?? {
      playerNameRaw: event.playerNameRaw,
      normalizedName: event.normalizedName,
      side: event.side,
      expectedEvents: 0,
      matchedEvents: 0,
      expectedGoals: 0,
      matchedGoals: 0,
      missingEvents: [],
    };
    const currentMatchStats = matchStats.get(event.matchNumber) ?? {
      matchNumber: event.matchNumber,
      expectedEvents: 0,
      databaseEvents: 0,
      matchedEvents: 0,
      missingEvents: [],
    };

    currentPlayerStats.expectedEvents += 1;
    currentMatchStats.expectedEvents += 1;
    if (event.eventType === "GOL") currentPlayerStats.expectedGoals += 1;

    const sourceKey = getExpectedCoverageSourceKey(event);
    const sourceMatch = takeCoverageMatch(databaseEventsWithSource, sourceKey);
    let databaseMatch = sourceMatch;

    if (sourceKey) {
      sourceCellExpectedEvents += 1;
      if (sourceMatch) sourceCellMatchedEvents += 1;
    }

    if (!databaseMatch) {
      databaseMatch = takeCoverageMatch(
        databaseEventsWithoutSource,
        getExpectedCoverageBaseKey(event)
      );
    }

    if (databaseMatch) {
      matchedExpectedEvents += 1;
      currentPlayerStats.matchedEvents += 1;
      currentMatchStats.matchedEvents += 1;
      if (event.eventType === "GOL") currentPlayerStats.matchedGoals += 1;
    } else {
      currentPlayerStats.missingEvents.push(event);
      currentMatchStats.missingEvents.push(event);
      missingSamples.push(buildCoverageSample(event, candidateIndex));
    }

    playerStats.set(playerKey, currentPlayerStats);
    matchStats.set(event.matchNumber, currentMatchStats);
  });

  const playerDifferences = Array.from(playerStats.values())
    .filter((stats) => stats.expectedEvents > stats.matchedEvents)
    .map((stats) => {
      const samples = stats.missingEvents
        .slice(0, IMPORT_COVERAGE_PLAYER_SAMPLE_LIMIT)
        .map((event) => buildCoverageSample(event, candidateIndex));
      const candidates = getCoverageCandidates({
        normalizedName: stats.normalizedName,
        side: stats.side,
        ...candidateIndex,
      });

      return {
        playerNameRaw: stats.playerNameRaw,
        normalizedName: stats.normalizedName,
        side: stats.side,
        expectedEvents: stats.expectedEvents,
        matchedEvents: stats.matchedEvents,
        missingEvents: stats.expectedEvents - stats.matchedEvents,
        expectedGoals: stats.expectedGoals,
        matchedGoals: stats.matchedGoals,
        missingGoals: stats.expectedGoals - stats.matchedGoals,
        hasRegisteredPlayer: candidates.length > 0,
        candidates,
        samples,
      };
    })
    .sort((a, b) => {
      if (b.missingGoals !== a.missingGoals) return b.missingGoals - a.missingGoals;
      if (b.missingEvents !== a.missingEvents) return b.missingEvents - a.missingEvents;
      return a.playerNameRaw.localeCompare(b.playerNameRaw);
    });

  const matchDifferences = Array.from(matchStats.values())
    .filter((stats) => stats.expectedEvents > stats.matchedEvents)
    .map((stats) => ({
      matchNumber: stats.matchNumber,
      expectedEvents: stats.expectedEvents,
      databaseEvents: stats.databaseEvents,
      matchedEvents: stats.matchedEvents,
      missingEvents: stats.expectedEvents - stats.matchedEvents,
      samples: stats.missingEvents
        .slice(0, IMPORT_COVERAGE_PLAYER_SAMPLE_LIMIT)
        .map((event) => buildCoverageSample(event, candidateIndex)),
    }))
    .sort((a, b) => {
      if (b.missingEvents !== a.missingEvents) return b.missingEvents - a.missingEvents;
      return a.matchNumber - b.matchNumber;
    });

  return {
    expectedEvents: expectedEvents.length,
    databaseEvents: events.length,
    matchedExpectedEvents,
    missingExpectedEvents: expectedEvents.length - matchedExpectedEvents,
    sourceCellExpectedEvents,
    sourceCellMatchedEvents,
    playersWithDifferenceCount: playerDifferences.length,
    matchesWithPossibleIncompleteImportCount: matchDifferences.length,
    samples: {
      missingEvents: limitMissingCoverageSamples(missingSamples),
      playerDifferences: limitPlayerCoverageDifferences(playerDifferences),
      matchDifferences: matchDifferences.slice(0, IMPORT_COVERAGE_SAMPLE_LIMIT),
    },
  };
}

function getHealthStatus(linkedEventsPercent: number): DataHealthStatus {
  if (linkedEventsPercent >= 95) {
    return {
      label: "Excelente",
      description: "Rankings com alta confiabilidade.",
    };
  }

  if (linkedEventsPercent >= 80) {
    return {
      label: "Boa",
      description: "Rankings confiáveis, com poucos pontos para revisar.",
    };
  }

  if (linkedEventsPercent >= 50) {
    return {
      label: "Atenção",
      description: "Rankings podem ser afetados por eventos sem vínculo.",
    };
  }

  return {
    label: "Crítica",
    description: "Rankings precisam de curadoria antes de serem confiáveis.",
  };
}

async function getAllRankingAuditEvents(): Promise<RankingAuditEvent[]> {
  const events: RankingAuditEvent[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select("id, match_id, match_number, player_id, player_name_raw, side, event_type, source_cell")
      .order("match_number", { ascending: true })
      .order("seq", { ascending: true })
      .range(from, from + AUDIT_EVENT_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as RankingAuditEvent[];
    events.push(...page);

    if (page.length < AUDIT_EVENT_PAGE_SIZE) break;

    from += AUDIT_EVENT_PAGE_SIZE;
  }

  return events;
}

async function getAllRankingAuditMatches(): Promise<RankingAuditMatch[]> {
  const matches: RankingAuditMatch[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("matches")
      .select("id, match_number, verified")
      .order("match_number", { ascending: true })
      .range(from, from + AUDIT_EVENT_PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as RankingAuditMatch[];
    matches.push(...page);

    if (page.length < AUDIT_EVENT_PAGE_SIZE) break;

    from += AUDIT_EVENT_PAGE_SIZE;
  }

  return matches;
}

function buildUnlinkedEventNameGroups(
  events: RankingAuditEvent[],
  players: Player[],
  aliases: PlayerAlias[]
) {
  type DraftSideGroup = {
    side: string;
    count: number;
    breakdown: Map<string, UnlinkedEventBreakdown>;
  };
  type DraftGroup = {
    normalizedName: string;
    displayName: string;
    count: number;
    breakdown: Map<string, UnlinkedEventBreakdown>;
    sideGroups: Map<string, DraftSideGroup>;
  };

  const groups = new Map<string, DraftGroup>();

  events.forEach((event) => {
    if (event.player_id) return;

    const rawName = event.player_name_raw?.trim() || "Jogador sem nome";
    const normalizedName = normalizeText(rawName) || "sem-nome";
    const current = groups.get(normalizedName) ?? {
      normalizedName,
      displayName: rawName,
      count: 0,
      breakdown: new Map<string, UnlinkedEventBreakdown>(),
      sideGroups: new Map<string, DraftSideGroup>(),
    };

    current.count += 1;

    if (current.displayName === "Jogador sem nome" && rawName !== current.displayName) {
      current.displayName = rawName;
    }

    const eventType = event.event_type || "SEM_TIPO";
    const side = event.side || "SEM_LADO";
    const breakdownKey = `${eventType}:${side}`;
    const currentBreakdown = current.breakdown.get(breakdownKey) ?? {
      eventType,
      side,
      count: 0,
    };

    currentBreakdown.count += 1;
    current.breakdown.set(breakdownKey, currentBreakdown);

    const currentSideGroup = current.sideGroups.get(side) ?? {
      side,
      count: 0,
      breakdown: new Map<string, UnlinkedEventBreakdown>(),
    };
    const sideBreakdownKey = `${eventType}:${side}`;
    const currentSideBreakdown = currentSideGroup.breakdown.get(sideBreakdownKey) ?? {
      eventType,
      side,
      count: 0,
    };

    currentSideGroup.count += 1;
    currentSideBreakdown.count += 1;
    currentSideGroup.breakdown.set(sideBreakdownKey, currentSideBreakdown);
    current.sideGroups.set(side, currentSideGroup);

    groups.set(normalizedName, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      normalizedName: group.normalizedName,
      displayName: group.displayName,
      count: group.count,
      breakdown: Array.from(group.breakdown.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return `${a.side}:${a.eventType}`.localeCompare(`${b.side}:${b.eventType}`);
      }),
      sideGroups: Array.from(group.sideGroups.values())
        .map((sideGroup) => ({
          side: sideGroup.side,
          count: sideGroup.count,
          breakdown: Array.from(sideGroup.breakdown.values()).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.eventType.localeCompare(b.eventType);
          }),
          candidates: getAuditCandidates({
            normalizedName: group.normalizedName,
            side: sideGroup.side,
            players,
            aliases,
          }),
        }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.side.localeCompare(b.side);
        }),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.displayName.localeCompare(b.displayName);
    });
}

function buildAliasConflicts(players: Player[], aliases: PlayerAlias[]) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const aliasesByNormalized = new Map<string, PlayerAlias[]>();

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;
    addToListMap(playersByNormalizedName, normalizedName, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;
    addToListMap(aliasesByNormalized, normalizedAlias, alias);
  });

  const conflicts: AliasConflict[] = [];

  aliasesByNormalized.forEach((items, normalizedAlias) => {
    const ownerIds = Array.from(new Set(items.map((item) => item.player_id)));
    const orphanOwnerIds = ownerIds.filter((playerId) => !playersById.has(playerId));
    const matchingPlayers = playersByNormalizedName.get(normalizedAlias) ?? [];
    const foreignMatches = matchingPlayers.filter(
      (player) => !ownerIds.includes(player.id)
    );
    const reasons: string[] = [];

    if (ownerIds.length > 1) {
      reasons.push("mesmo alias vinculado a jogadores diferentes");
    }

    if (foreignMatches.length > 0) {
      reasons.push("alias também parece nome oficial de outro jogador");
    }

    if (orphanOwnerIds.length > 0) {
      reasons.push("alias órfão: jogador vinculado não encontrado");
    }

    if (reasons.length === 0) return;

    conflicts.push({
      normalizedAlias,
      aliasExamples: Array.from(new Set(items.map((item) => item.alias))).slice(
        0,
        3
      ),
      owners: uniquePlayerSummaries(
        ownerIds.map((playerId) => {
          const player = playersById.get(playerId);
          return player ? playerToSummary(player) : unknownPlayerSummary(playerId);
        })
      ),
      matchingPlayers: uniquePlayerSummaries(foreignMatches.map(playerToSummary)),
      reason: reasons.join("; "),
    });
  });

  return conflicts.sort((a, b) => {
    if (b.owners.length !== a.owners.length) return b.owners.length - a.owners.length;
    return a.normalizedAlias.localeCompare(b.normalizedAlias);
  });
}

function buildPossibleDuplicateGroups(players: Player[], aliases: PlayerAlias[]) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const playersByNormalizedSide = new Map<string, Player[]>();
  const aliasesByNormalized = new Map<string, PlayerAlias[]>();
  const groups = new Map<string, PossibleDuplicatePlayerGroup>();

  function addGroup(params: {
    normalizedName: string;
    reason: string;
    players: Player[];
    aliases?: string[];
  }) {
    const summaries = uniquePlayerSummaries(params.players.map(playerToSummary));
    if (summaries.length < 2) return;

    const key = `${params.normalizedName}:${summaries
      .map((player) => player.id)
      .sort()
      .join("|")}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        normalizedName: params.normalizedName,
        reason: params.reason,
        players: summaries,
        aliases: Array.from(new Set(params.aliases ?? [])).sort(),
      });
      return;
    }

    const reasons = new Set(existing.reason.split("; "));
    reasons.add(params.reason);

    groups.set(key, {
      ...existing,
      reason: Array.from(reasons).join("; "),
      aliases: Array.from(new Set([...existing.aliases, ...(params.aliases ?? [])])).sort(),
    });
  }

  players.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;

    addToListMap(playersByNormalizedName, normalizedName, player);
    addToListMap(playersByNormalizedSide, `${normalizedName}:${player.side}`, player);
  });

  aliases.forEach((alias) => {
    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;
    addToListMap(aliasesByNormalized, normalizedAlias, alias);
  });

  playersByNormalizedSide.forEach((items, key) => {
    if (items.length < 2) return;

    const [normalizedName] = key.split(":");
    addGroup({
      normalizedName,
      reason: "mesmo nome normalizado no mesmo lado",
      players: items,
    });
  });

  aliases.forEach((alias) => {
    const owner = playersById.get(alias.player_id);
    if (!owner) return;

    const normalizedAlias = getNormalizedAlias(alias);
    if (!normalizedAlias) return;

    const relatedPlayers = (playersByNormalizedName.get(normalizedAlias) ?? []).filter(
      (player) => player.id !== owner.id && player.side === owner.side
    );

    if (relatedPlayers.length === 0) return;

    addGroup({
      normalizedName: normalizedAlias,
      reason: "alias aponta para nome de outro jogador do mesmo lado",
      players: [owner, ...relatedPlayers],
      aliases: [alias.alias],
    });
  });

  aliasesByNormalized.forEach((items, normalizedAlias) => {
    const ownerPlayers = uniquePlayerSummaries(
      items
        .map((item) => playersById.get(item.player_id))
        .filter((player): player is Player => Boolean(player))
        .map(playerToSummary)
    );

    const playersBySide = new Map<string, Player[]>();

    ownerPlayers.forEach((owner) => {
      const player = playersById.get(owner.id);
      if (!player) return;
      addToListMap(playersBySide, player.side, player);
    });

    playersBySide.forEach((sidePlayers) => {
      if (sidePlayers.length < 2) return;

      addGroup({
        normalizedName: normalizedAlias,
        reason: "mesmo alias em jogadores do mesmo lado",
        players: sidePlayers,
        aliases: Array.from(new Set(items.map((item) => item.alias))).slice(0, 3),
      });
    });
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (b.players.length !== a.players.length) return b.players.length - a.players.length;
    return a.normalizedName.localeCompare(b.normalizedName);
  });
}

export async function getPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");

  if (error) throw error;

  return data as Player[];
}

export async function getPlayersWithAliases(): Promise<PlayerWithAliases[]> {
  const [{ data: players, error: playersError }, { data: aliases, error: aliasesError }] =
    await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase.from("player_aliases").select("*").order("alias"),
    ]);

  if (playersError) throw playersError;
  if (aliasesError) throw aliasesError;

  const aliasList = (aliases ?? []) as PlayerAlias[];
  const aliasesByPlayerId = new Map<string, PlayerAlias[]>();

  aliasList.forEach((alias) => {
    const current = aliasesByPlayerId.get(alias.player_id) ?? [];
    current.push(alias);
    aliasesByPlayerId.set(alias.player_id, current);
  });

  return ((players ?? []) as Player[]).map((player) => ({
    ...player,
    aliases: aliasesByPlayerId.get(player.id) ?? [],
  }));
}

export async function getPlayerGlobalSearchIndex(): Promise<PlayerGlobalSearchIndex> {
  const [
    { data: players, error: playersError },
    { data: aliases, error: aliasesError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    supabase.from("players").select("id, name, side").order("name"),
    supabase
      .from("player_aliases")
      .select("id, player_id, alias, normalized_alias")
      .order("alias"),
    supabase.from("events").select("player_id, match_number").not("player_id", "is", null),
  ]);

  if (playersError) throw playersError;
  if (aliasesError) throw aliasesError;
  if (eventsError) throw eventsError;

  const playerList = (players ?? []) as Player[];
  const aliasList = (aliases ?? []) as PlayerAlias[];
  const eventList = (events ?? []) as PlayerGlobalSearchEvent[];
  const playersById = new Map(playerList.map((player) => [player.id, player]));
  const playersByNormalizedName = new Map<string, Player[]>();
  const aliasesByPlayerId = new Map<
    string,
    PlayerGlobalSearchPlayer["aliases"]
  >();
  const usageByPlayerId = new Map<
    string,
    Pick<PlayerGlobalSearchPlayer, "eventsCount" | "latestMatchNumber">
  >();

  playerList.forEach((player) => {
    const normalizedName = normalizeText(player.name);
    if (!normalizedName) return;
    addToListMap(playersByNormalizedName, normalizedName, player);
  });

  aliasList.forEach((alias) => {
    const current = aliasesByPlayerId.get(alias.player_id) ?? [];
    current.push({
      id: alias.id,
      alias: alias.alias,
      normalizedAlias: getNormalizedAlias(alias),
    });
    aliasesByPlayerId.set(alias.player_id, current);
  });

  eventList.forEach((event) => {
    if (!event.player_id) return;

    const current = usageByPlayerId.get(event.player_id) ?? {
      eventsCount: 0,
      latestMatchNumber: 0,
    };

    current.eventsCount += 1;
    current.latestMatchNumber = Math.max(
      current.latestMatchNumber,
      Number(event.match_number ?? 0)
    );

    usageByPlayerId.set(event.player_id, current);
  });

  const searchPlayers = playerList.map((player) => {
    const usage = usageByPlayerId.get(player.id) ?? {
      eventsCount: 0,
      latestMatchNumber: 0,
    };

    return {
      ...playerToSummary(player),
      normalizedName: normalizeText(player.name),
      aliases: (aliasesByPlayerId.get(player.id) ?? []).sort((a, b) =>
        a.alias.localeCompare(b.alias)
      ),
      eventsCount: usage.eventsCount,
      latestMatchNumber: usage.latestMatchNumber,
    };
  });

  const searchAliases = aliasList.map((alias) => {
    const player = playersById.get(alias.player_id) ?? null;
    const normalizedAlias = getNormalizedAlias(alias);
    const relatedPlayers = (playersByNormalizedName.get(normalizedAlias) ?? [])
      .filter((relatedPlayer) => relatedPlayer.id !== alias.player_id)
      .map(playerToSummary);
    const isOrphan = !player;
    const isInconsistent = isOrphan || relatedPlayers.length > 0;
    const diagnostic = isOrphan
      ? "Alias órfão: jogador vinculado não encontrado."
      : relatedPlayers.length > 0
        ? "Alias também parece nome oficial de outro jogador."
        : null;

    return {
      id: alias.id,
      alias: alias.alias,
      normalizedAlias,
      playerId: alias.player_id,
      player: player ? playerToSummary(player) : null,
      isOrphan,
      isInconsistent,
      diagnostic,
      relatedPlayers,
    };
  });

  return {
    players: searchPlayers,
    aliases: searchAliases,
  };
}

export async function getRankingsDataHealthAudit(): Promise<RankingsDataHealthAudit> {
  const [
    { data: players, error: playersError },
    { data: aliases, error: aliasesError },
    events,
    matches,
  ] = await Promise.all([
    supabase.from("players").select("id, name, side").order("name"),
    supabase
      .from("player_aliases")
      .select("id, player_id, alias, normalized_alias")
      .order("alias"),
    getAllRankingAuditEvents(),
    getAllRankingAuditMatches(),
  ]);

  if (playersError) throw playersError;
  if (aliasesError) throw aliasesError;

  const playerList = (players ?? []) as Player[];
  const aliasList = (aliases ?? []) as PlayerAlias[];
  const eventsWithPlayerId = events.filter((event) => Boolean(event.player_id)).length;
  const totalEvents = events.length;
  const eventsWithoutPlayerId = totalEvents - eventsWithPlayerId;
  const linkedEventsPercent =
    totalEvents === 0
      ? 100
      : Number(((eventsWithPlayerId / totalEvents) * 100).toFixed(1));
  const unlinkedEventNames = buildUnlinkedEventNameGroups(
    events,
    playerList,
    aliasList
  );
  const reconciliationSummary = buildRankingsReconciliationSummary(
    events,
    matches,
    playerList,
    aliasList
  );
  const importCoverageSummary = buildHistoricalImportCoverageSummary({
    events,
    players: playerList,
    aliases: aliasList,
  });
  const officialRankingValidator = buildOfficialRankingValidatorSummary({
    events,
    players: playerList,
    aliases: aliasList,
  });
  const aliasConflicts = buildAliasConflicts(playerList, aliasList);
  const possibleDuplicateGroups = buildPossibleDuplicateGroups(playerList, aliasList);

  return {
    totalEvents,
    eventsWithPlayerId,
    eventsWithoutPlayerId,
    linkedEventsPercent,
    playersCount: playerList.length,
    aliasesCount: aliasList.length,
    aliasConflictsCount: aliasConflicts.length,
    possibleDuplicateGroupsCount: possibleDuplicateGroups.length,
    health: getHealthStatus(linkedEventsPercent),
    reconciliationSummary,
    importCoverageSummary,
    officialRankingValidator,
    unlinkedEventNames: unlinkedEventNames.slice(0, AUDIT_PREVIEW_LIMIT),
    aliasConflicts: aliasConflicts.slice(0, AUDIT_PREVIEW_LIMIT),
    possibleDuplicateGroups: possibleDuplicateGroups.slice(0, AUDIT_PREVIEW_LIMIT),
    hasRelevantIssues:
      officialRankingValidator.divergentPlayersCount > 0 ||
      importCoverageSummary.missingExpectedEvents > 0 ||
      eventsWithoutPlayerId > 0 ||
      aliasConflicts.length > 0 ||
      possibleDuplicateGroups.length > 0,
  };
}

export async function getPlayerDeletionPreview(
  playerId: string
): Promise<PlayerDeletionPreview> {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, name, side")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) throw playerError;

  if (!player) {
    await deletePlayerAliases(playerId);

    return {
      status: "deleted",
      playerId,
      eventsCount: 0,
      aliasesCount: 0,
      canDelete: true,
    };
  }

  const [{ count: eventsCount, error: eventsError }, { count: aliasesCount, error: aliasesError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id", { head: true, count: "exact" })
        .eq("player_id", playerId),
      supabase
        .from("player_aliases")
        .select("id", { head: true, count: "exact" })
        .eq("player_id", playerId),
    ]);

  if (eventsError) throw eventsError;
  if (aliasesError) throw aliasesError;

  const totalEvents = eventsCount ?? 0;

  return {
    status: "found",
    player: player as Player,
    eventsCount: totalEvents,
    aliasesCount: aliasesCount ?? 0,
    canDelete: totalEvents === 0,
  };
}

export async function deletePlayerSafely(playerId: string) {
  const preview = await getPlayerDeletionPreview(playerId);

  if (preview.status === "deleted") {
    return preview;
  }

  if (!preview.canDelete) {
    throw new Error(
      "Este jogador possui eventos registrados e não pode ser excluído. Utilize a opção Mesclar jogadores."
    );
  }

  await deletePlayerAliases(playerId);

  const { error: playerError } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (playerError) throw playerError;

  await deletePlayerAliases(playerId);

  const { data: deletedPlayer, error: deletedCheckError } = await supabase
    .from("players")
    .select("id, name, side")
    .eq("id", playerId)
    .maybeSingle();

  if (deletedCheckError) throw deletedCheckError;

  if (!deletedPlayer) {
    return preview;
  }

  throw new Error("Não foi possível excluir o jogador.");
}

async function deletePlayerAliases(playerId: string) {
  const { error } = await supabase
    .from("player_aliases")
    .delete()
    .eq("player_id", playerId);

  if (error) throw error;
}

export type PlayerEventUsage = {
  count: number;
  latestMatchNumber: number;
};

export async function getPlayerEventUsageIndex(): Promise<{
  usageByPlayerId: Record<string, PlayerEventUsage>;
  hasAnyEvent: Set<string>;
}> {
  const [{ data: players, error: playersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase
        .from("events")
        .select("player_id, player_name_raw, side, match_number"),
    ]);

  if (playersError) throw playersError;
  if (eventsError) throw eventsError;

  const playerList = (players ?? []) as Player[];
  const eventList = (events ?? []) as PlayerUsageEvent[];
  const byId = new Map(playerList.map((player) => [player.id, player]));

  const usageMap = new Map<string, PlayerEventUsage>();

  eventList.forEach((event) => {
    let playerId: string | null = null;

    if (event.player_id) {
      playerId = event.player_id;
    } else if (event.player_name_raw) {
      const normalizedName = normalizeText(event.player_name_raw);
      if (normalizedName) {
        const matchingPlayer = playerList.find((player) => {
          return (
            normalizeText(player.name) === normalizedName &&
            player.side === event.side
          );
        });

        playerId = matchingPlayer?.id ?? null;
      }
    }

    if (!playerId || !byId.has(playerId)) return;

    const current = usageMap.get(playerId) ?? {
      count: 0,
      latestMatchNumber: 0,
    };

    current.count += 1;
    current.latestMatchNumber = Math.max(
      current.latestMatchNumber,
      Number(event.match_number ?? 0)
    );

    usageMap.set(playerId, current);
  });

  const usageByPlayerId: Record<string, PlayerEventUsage> = {};
  const hasAnyEvent = new Set<string>();

  usageMap.forEach((value, key) => {
    usageByPlayerId[key] = value;
    hasAnyEvent.add(key);
  });

  return { usageByPlayerId, hasAnyEvent };
}

function getResolvedSideConstraints(eventSide: string | null): {
  requiresPedroNetu: boolean;
  allowedSides: Array<string>;
} {
  if (eventSide === "PEDRO" || eventSide === "NETU") {
    return { requiresPedroNetu: true, allowedSides: [eventSide] };
  }

  return { requiresPedroNetu: false, allowedSides: ["PEDRO", "NETU"] };
}

export async function getPendingVinculoIndex(
  players: PlayerWithAliases[]
): Promise<{ byPlayerId: Record<string, PendingVinculoPlayer> }> {
  if (players.length === 0) return { byPlayerId: {} };

  const playerIds = players.map((p) => p.id);
  const playerIdSet = new Set(playerIds);

  // 1) Eventos vinculados (player_id)
  const { data: linkedRows, error: linkedError } = await supabase
    .from("events")
    .select("player_id")
    .in("player_id", playerIds);

  if (linkedError) throw linkedError;

  const linkedCount = new Map<string, number>();
  (linkedRows ?? []).forEach((row) => {
    const playerId = (row as { player_id: string | null }).player_id;
    if (!playerId || !playerIdSet.has(playerId)) return;
    linkedCount.set(playerId, (linkedCount.get(playerId) ?? 0) + 1);
  });

  // 2) Eventos sem vínculo (player_id is null)
  const { data: unresolvedRows, error: unresolvedError } = await supabase
    .from("events")
    .select("player_name_raw, side")
    .is("player_id", null);

  if (unresolvedError) throw unresolvedError;

  type UnresolvedEventRow = {
    player_name_raw: string | null;
    side: string | null;
  };

  const unresolved = (unresolvedRows ?? []) as UnresolvedEventRow[];

  // 3) Indexar chaves (nome normalizado e aliases normalizados) -> playerIds
  const officialKeyToPlayerIds = new Map<string, string[]>();
  const aliasKeyToPlayerIds = new Map<string, string[]>();

  const byPlayerId: Record<string, PendingVinculoPlayer> = {};

  players.forEach((player) => {
    const officialKey = normalizeText(player.name);

    const probableSources: PendingVinculoProbableSource[] = [];

    if (officialKey) {
      probableSources.push({
        key: officialKey,
        label: `Nome normalizado: ${officialKey}`,
        count: 0,
        matchesByAlias: false,
      });

      const current = officialKeyToPlayerIds.get(officialKey) ?? [];
      officialKeyToPlayerIds.set(officialKey, Array.from(new Set([...current, player.id])));
    }

    const distinctAliasKeys = new Map<string, string>(); // key -> normalized label
    (player.aliases ?? []).forEach((a) => {
      const key = normalizeText(a.normalized_alias || a.alias);
      if (!key) return;
      distinctAliasKeys.set(key, `Alias normalizado: ${key}`);
    });

    Array.from(distinctAliasKeys.entries()).forEach(([key, label]) => {
      probableSources.push({
        key,
        label,
        count: 0,
        matchesByAlias: true,
      });

      const current = aliasKeyToPlayerIds.get(key) ?? [];
      aliasKeyToPlayerIds.set(key, Array.from(new Set([...current, player.id])));
    });

    byPlayerId[player.id] = {
      playerId: player.id,
      linkedEventsCount: linkedCount.get(player.id) ?? 0,
      probableEventsCount: 0,
      status: "SEM_EVENTO_PROVAVEL_ENCONTRADO",
      probableSources,
    };
  });

  function eventMatchesPlayerSide(params: { eventSide: string | null; playerSide: string }) {
    const constraints = getResolvedSideConstraints(params.eventSide);
    if (constraints.requiresPedroNetu) return constraints.allowedSides.includes(params.playerSide);
    return true;
  }

  // 4) Computar prováveis
  unresolved.forEach((event) => {
    const eventNorm = normalizeText(event.player_name_raw ?? "");
    if (!eventNorm) return;

    const eventPlayers = new Set<string>();

    const officialMatches = officialKeyToPlayerIds.get(eventNorm) ?? [];
    const aliasMatches = aliasKeyToPlayerIds.get(eventNorm) ?? [];

    officialMatches.forEach((pid) => eventPlayers.add(pid));
    aliasMatches.forEach((pid) => eventPlayers.add(pid));

    eventPlayers.forEach((playerId) => {
      const player = byPlayerId[playerId];
      if (!player) return;

      const playerIdentity = players.find((p) => p.id === playerId);
      if (!playerIdentity) return;

      if (!eventMatchesPlayerSide({ eventSide: event.side, playerSide: playerIdentity.side })) return;

      const source = player.probableSources.find((s) => s.key === eventNorm);
      if (!source) return;

      source.count += 1;
      player.probableEventsCount += 1;
    });
  });

  // 5) Status
  Object.values(byPlayerId).forEach((p) => {
    p.status =
      p.linkedEventsCount === 0 && p.probableEventsCount > 0
        ? "VINCULO_PENDENTE"
        : "SEM_EVENTO_PROVAVEL_ENCONTRADO";
  });

  return { byPlayerId };
}

export async function getPlayersWithRecentUsage() {
  const [{ data: players, error: playersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase
        .from("events")
        .select("player_id, player_name_raw, side, match_number")
        .order("match_number", { ascending: false }),
    ]);

  if (playersError) throw playersError;
  if (eventsError) throw eventsError;

  const playerList = (players ?? []) as Player[];
  const eventList = (events ?? []) as PlayerUsageEvent[];
  const byId = new Map(playerList.map((player) => [player.id, player]));
  const usageMap = new Map<string, { count: number; latestMatchNumber: number }>();

  eventList.forEach((event) => {
    let playerId: string | null = null;

    if (event.player_id) {
      playerId = event.player_id;
    } else if (event.player_name_raw) {
      const normalizedName = normalizeText(event.player_name_raw);
      if (normalizedName) {
        const matchingPlayer = playerList.find((player) => {
          return (
            normalizeText(player.name) === normalizedName &&
            player.side === event.side
          );
        });

        playerId = matchingPlayer?.id ?? null;
      }
    }

    if (!playerId || !byId.has(playerId)) {
      return;
    }

    const current = usageMap.get(playerId) ?? { count: 0, latestMatchNumber: 0 };
    current.count += 1;
    current.latestMatchNumber = Math.max(
      current.latestMatchNumber,
      Number(event.match_number ?? 0)
    );
    usageMap.set(playerId, current);
  });

  return playerList.sort((a, b) => {
    const aUsage = usageMap.get(a.id);
    const bUsage = usageMap.get(b.id);

    const aLatest = aUsage?.latestMatchNumber ?? 0;
    const bLatest = bUsage?.latestMatchNumber ?? 0;

    if (aLatest !== bLatest) {
      return bLatest - aLatest;
    }

    const aCount = aUsage?.count ?? 0;
    const bCount = bUsage?.count ?? 0;

    if (aCount !== bCount) {
      return bCount - aCount;
    }

    return a.name.localeCompare(b.name);
  });
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
  const playerResults = (players ?? []) as Player[];
  const aliasResults = (aliases ?? []) as PlayerAliasSearchResult[];

  playerResults.forEach((player) => map.set(player.id, player));

  aliasResults.forEach((alias) => {
    const player = getAliasPlayer(alias);

    if (player) {
      map.set(player.id, player);
    }
  });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Cria um novo jogador se não existir com o mesmo nome e side
 * Retorna o jogador criado ou existente
 */
export async function createPlayer(
  name: string,
  side: "PEDRO" | "NETU"
): Promise<Player> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Nome do jogador não pode estar vazio");
  }

  // Verifica se já existe jogador com esse nome e side
  const { data: existing, error: checkError } = await supabase
    .from("players")
    .select("*")
    .eq("name", trimmedName)
    .eq("side", side)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw checkError;
  }

  // Se existe, retorna o existente
  if (existing) {
    return existing as Player;
  }

  // Cria novo jogador (apenas com colunas que existem: name, side)
  const { data: newPlayer, error: createError } = await supabase
    .from("players")
    .insert({
      name: trimmedName,
      side,
    })
    .select()
    .single();

  if (createError) throw createError;

  return newPlayer as Player;
}

export async function updatePlayerBasic(
  playerId: string,
  params: { name: string; side: "PEDRO" | "NETU" }
): Promise<Player> {
  const name = params.name.trim();

  if (!playerId) {
    throw new Error("ID do jogador inválido.");
  }
  if (!name) {
    throw new Error("Nome do jogador não pode ficar vazio.");
  }
  if (params.side !== "PEDRO" && params.side !== "NETU") {
    throw new Error("Lado/time inválido.");
  }

  const { data, error } = await supabase
    .from("players")
    .update({
      name,
      side: params.side,
    })
    .eq("id", playerId)
    .select("id, name, side")
    .single();

  if (error) throw error;

  return data as Player;
}
