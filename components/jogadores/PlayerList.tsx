"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deletePlayerSafely,
  getCurationAssistantCandidates,
  getPlayerGlobalSearchIndex,
  getPlayersWithAliases,
  getPlayerDeletionPreview,
  getRankingsDataHealthAudit,
  updatePlayerBasic,
  type ExistingPlayerDeletionPreview,
  type CurationAssistantCandidate,
  type PlayerGlobalSearchIndex,
  type PlayerGlobalSearchPlayer,
  type PlayerAlias,
  type PlayerWithAliases,
  type RankingsDataHealthAudit,
} from "@/lib/players";
import {
  addAlias,
  getAliasOwnerByNormalized,
  getAliases,
  mergePlayers,
  reassignAliasOwner,
} from "@/lib/playerAliases";
import {
  applyGuidedDivergenceCorrection,
  getEventReviewDetails,
  linkUnresolvedEventsToPlayer,
  type EventReviewDetail,
} from "@/lib/events";
import { normalizeText } from "@/lib/playerIdentity";
import { formatSupabaseError } from "@/lib/supabaseErrors";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { getTeamSide, getTeamTheme } from "@/utils/constants";

interface Props {
  players: PlayerWithAliases[];
  rankingsAudit: RankingsDataHealthAudit;
  globalSearchIndex: PlayerGlobalSearchIndex;
  mode?: "players" | "curation";
}

type UnlinkedAuditGroup = RankingsDataHealthAudit["unlinkedEventNames"][number];
type UnlinkedAuditSideGroup = UnlinkedAuditGroup["sideGroups"][number];
type GlobalSearchAlias = PlayerGlobalSearchIndex["aliases"][number];
type ReconciliationSummary = RankingsDataHealthAudit["reconciliationSummary"];
type ReconciliationSample = ReconciliationSummary["samples"]["safe"][number];
type ReconciliationCandidate = ReconciliationSample["candidates"][number];
type ImportCoverageSummary = RankingsDataHealthAudit["importCoverageSummary"];
type HistoricalEquivalentReviewSummary =
  RankingsDataHealthAudit["historicalEquivalentReview"];
type HistoricalEquivalentReviewEvent =
  HistoricalEquivalentReviewSummary["events"][number];
type OfficialRankingValidatorSummary =
  RankingsDataHealthAudit["officialRankingValidator"];
type OfficialRankingValidatorRow = OfficialRankingValidatorSummary["rows"][number];
type OfficialRankingValidatorInvestigationEvent =
  OfficialRankingValidatorRow["investigationEvents"][number];
type ImportCoverageEventSample =
  ImportCoverageSummary["samples"]["missingEvents"][number];
type ImportCoveragePlayerDifference =
  ImportCoverageSummary["samples"]["playerDifferences"][number];
type ImportCoverageMatchDifference =
  ImportCoverageSummary["samples"]["matchDifferences"][number];

const GLOBAL_SEARCH_SECTION_ID = "busca-global-jogadores";
const CURATION_SECTION_ID = "curadoria-jogadores";
const DATA_HEALTH_SECTION_ID = "saude-dos-dados";
const OFFICIAL_VALIDATOR_SECTION_ID = "validador-oficial";
const SAFE_RECONCILIATION_SECTION_ID = "reconciliacao-segura";
const IMPORT_COVERAGE_SECTION_ID = "cobertura-importacao";
const HISTORICAL_EQUIVALENT_REVIEW_SECTION_ID =
  "eventos-sem-equivalente-historico";
const EVENT_INVESTIGATOR_SECTION_ID = "investigador-eventos";

function getEventInvestigatorAnchorId(eventId: string) {
  return `investigador-evento-${eventId}`;
}

type IdentityResolutionPreviewAlias = {
  alias: string;
  normalizedAlias: string;
};

type IdentityResolutionPreviewEvent = {
  id: string;
  expectedPlayerId: string | null;
  matchNumber: number | null;
  seq: number | null;
  playerNameRaw: string;
  eventType: string;
  matchVerified: boolean;
  sourcePlayerLabel: string;
  targetPlayerLabel: string;
};

type IdentityResolutionPreview = {
  rowKey: string;
  rowPlayerName: string;
  targetPlayerId: string;
  targetPlayerName: string;
  targetPlayerSide: string;
  aliasesToCreate: IdentityResolutionPreviewAlias[];
  eventsToMove: IdentityResolutionPreviewEvent[];
  sourcePlayers: string[];
  affectedRankings: string[];
  involvedMatches: Array<number | null>;
  verifiedEventsCount: number;
  expectedImpact: string;
  reviewOnlyEvents: EventReviewDetail[];
  hasExecutableAction: boolean;
  manualReviewReason: string | null;
  historicalGoals: number;
  siteGoals: number;
  difference: number;
};

type IdentityResolutionHistoryItem = {
  id: string;
  rowPlayerName: string;
  targetPlayerName: string;
  aliasesCreated: number;
  aliasesAlreadyPresent: number;
  eventsMoved: number;
  eventsSkipped: number;
  differenceBefore: number;
  differenceAfter: number | null;
  affectedRankings: string[];
  createdAt: string;
};

function buildAliasState(players: PlayerWithAliases[]) {
  return Object.fromEntries(
    players.map((player) => [player.id, player.aliases])
  ) as Record<string, PlayerAlias[]>;
}

function sortAliases(aliases: PlayerAlias[]) {
  return [...aliases].sort((a, b) => a.alias.localeCompare(b.alias));
}

function formatSearchTerm(term: string) {
  return term.trim().toLowerCase();
}

function playerHasStrongDuplicateSignal(params: {
  a: PlayerWithAliases;
  b: PlayerWithAliases;
  aliasesByPlayerId: Record<string, PlayerAlias[]>;
}) {
  const { a, b, aliasesByPlayerId } = params;

  if (a.side !== b.side) return false;

  const aNameNorm = normalizeText(a.name);
  const bNameNorm = normalizeText(b.name);
  if (!aNameNorm || !bNameNorm) return false;

  if (aNameNorm === bNameNorm) return true;

  const aAliases = aliasesByPlayerId[a.id] ?? [];
  const bAliases = aliasesByPlayerId[b.id] ?? [];

  // aliases.normalized_alias == nome normalizado do outro
  if (aAliases.some((al) => normalizeText(al.normalized_alias ?? al.alias) === bNameNorm)) {
    return true;
  }
  if (bAliases.some((al) => normalizeText(al.normalized_alias ?? al.alias) === aNameNorm)) {
    return true;
  }

  return false;
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatEventCountLabel(value: number) {
  return `${formatNumber(value)} ${value === 1 ? "evento" : "eventos"}`;
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatEventType(eventType: string) {
  const labels: Record<string, string> = {
    GOL: "Gol",
    ASSISTENCIA: "Assistência",
    AMARELO: "Amarelo",
    VERMELHO: "Vermelho",
    LESAO: "Lesão",
    GOL_CONTRA: "Gol contra",
    SEM_TIPO: "Sem tipo",
  };

  return labels[eventType] ?? eventType;
}

function formatAuditSide(side: string) {
  if (side === "PEDRO" || side === "NETU") {
    return getTeamTheme(side).short;
  }

  return side === "SEM_LADO" ? "Sem lado" : side;
}

function getHealthClasses(label: RankingsDataHealthAudit["health"]["label"]) {
  if (label === "Excelente") {
    return "border-emerald-700 bg-emerald-950/35 text-emerald-200";
  }

  if (label === "Boa") {
    return "border-blue-700 bg-blue-950/35 text-blue-200";
  }

  if (label === "Atenção") {
    return "border-yellow-700 bg-yellow-950/35 text-yellow-200";
  }

  return "border-red-700 bg-red-950/35 text-red-200";
}

function AuditMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-zinc-100">{value}</p>
      {description ? (
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      ) : null}
    </div>
  );
}

function formatMatchNumber(matchNumber: number | null) {
  return matchNumber === null ? "Partida sem número" : `Jogo #${matchNumber}`;
}

function formatVerificationLabel(verified: boolean) {
  return verified ? "Conferida" : "Não conferida";
}

function formatReconciliationCandidate(candidate: ReconciliationCandidate) {
  return `${candidate.name} (${formatAuditSide(candidate.side)}: ${candidate.reason})`;
}

function ReconciliationSampleList({
  title,
  samples,
  emptyMessage,
}: {
  title: string;
  samples: ReconciliationSample[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-sm font-bold text-zinc-100">{title}</p>

      {samples.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-zinc-100">
                    {sample.rawName}
                  </p>
                  <p className="mt-1 text-zinc-500">
                    normalizado: {sample.normalizedName}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2 py-1 font-bold ${
                    sample.verified
                      ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                      : "border-yellow-700 bg-yellow-950/30 text-yellow-200"
                  }`}
                >
                  {formatVerificationLabel(sample.verified)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-zinc-300">
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  {formatEventType(sample.eventType)}
                </span>
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  {formatAuditSide(sample.side)}
                </span>
                <span className="rounded-full border border-zinc-700 px-2 py-1">
                  {formatMatchNumber(sample.matchNumber)}
                </span>
              </div>

              <p className="mt-3 text-zinc-400">
                Candidatos:{" "}
                {sample.candidates.length > 0
                  ? sample.candidates.map(formatReconciliationCandidate).join(", ")
                  : "Nenhum candidato"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReconciliationSummaryBlock({
  summary,
}: {
  summary: ReconciliationSummary;
}) {
  const cards = [
    {
      label: "Eventos sem player_id",
      value: formatNumber(summary.totalUnlinkedEvents),
    },
    {
      label: "Em partidas conferidas",
      value: formatNumber(summary.verifiedUnlinkedEvents),
    },
    {
      label: "Em partidas não conferidas",
      value: formatNumber(summary.unverifiedUnlinkedEvents),
    },
    {
      label: "Vínculos seguros",
      value: formatNumber(summary.safeCount),
    },
    {
      label: "Seguros conferidos",
      value: formatNumber(summary.safeVerifiedCount),
    },
    {
      label: "Eventos ambíguos",
      value: formatNumber(summary.ambiguousCount),
    },
    {
      label: "Sem candidato",
      value: formatNumber(summary.noCandidateCount),
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-blue-800 bg-blue-950/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-100">
            Reconciliação segura dos rankings
          </h3>
          <p className="mt-2 text-sm text-blue-100">
            Eventos de partidas conferidas sem jogador vinculado podem estar fora dos rankings.
          </p>
        </div>

        <p className="rounded-lg border border-blue-700 bg-blue-950/40 px-3 py-2 text-xs font-bold text-blue-100">
          Reatribuição disponível apenas nos itens com um único destino confirmado.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <AuditMetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <ReconciliationSampleList
          title="Amostras seguras"
          samples={summary.samples.safe}
          emptyMessage="Nenhum evento seguro nesta amostra."
        />
        <ReconciliationSampleList
          title="Amostras ambíguas"
          samples={summary.samples.ambiguous}
          emptyMessage="Nenhum evento ambíguo nesta amostra."
        />
        <ReconciliationSampleList
          title="Amostras sem candidato"
          samples={summary.samples.noCandidate}
          emptyMessage="Nenhum evento sem candidato nesta amostra."
        />
      </div>
    </div>
  );
}

function formatSourceCell(sourceCell: string | null) {
  return sourceCell || "Sem célula";
}

function formatCoverageCandidates(sample: ImportCoverageEventSample) {
  if (!sample.hasRegisteredPlayer) return "Jogador correspondente não cadastrado";

  return sample.candidates
    .map((candidate) => `${candidate.name} (${formatAuditSide(candidate.side)})`)
    .join(", ");
}

function ImportCoverageEventSampleCard({
  sample,
}: {
  sample: ImportCoverageEventSample;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-zinc-100">
            {sample.playerNameRaw}
          </p>
          <p className="mt-1 text-zinc-500">
            normalizado: {sample.normalizedName}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2 py-1 font-bold ${
            sample.hasRegisteredPlayer
              ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
              : "border-red-700 bg-red-950/30 text-red-200"
          }`}
        >
          {sample.hasRegisteredPlayer ? "Jogador cadastrado" : "Sem cadastro"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-zinc-300">
        <span className="rounded-full border border-zinc-700 px-2 py-1">
          {formatEventType(sample.eventType)}
        </span>
        <span className="rounded-full border border-zinc-700 px-2 py-1">
          {formatAuditSide(sample.side)}
        </span>
        <span className="rounded-full border border-zinc-700 px-2 py-1">
          {formatMatchNumber(sample.matchNumber)}
        </span>
        <span className="rounded-full border border-zinc-700 px-2 py-1">
          {formatSourceCell(sample.sourceCell)}
        </span>
      </div>

      <p className="mt-3 text-zinc-400">
        Cadastro: {formatCoverageCandidates(sample)}
      </p>
    </div>
  );
}

function ImportCoveragePlayerDifferenceCard({
  difference,
}: {
  difference: ImportCoveragePlayerDifference;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-bold text-zinc-100">{difference.playerNameRaw}</p>
          <p className="mt-1 text-xs text-zinc-500">
            normalizado: {difference.normalizedName} · {formatAuditSide(difference.side)}
          </p>
        </div>

        <span className="rounded-full border border-red-700 bg-red-950/30 px-2 py-1 text-xs font-bold text-red-200">
          {formatNumber(difference.missingEvents)} ausente(s)
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-xs text-zinc-500">Planilha</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatNumber(difference.expectedEvents)} evento(s)
          </p>
          <p className="text-xs text-zinc-500">
            {formatNumber(difference.expectedGoals)} gol(s)
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-xs text-zinc-500">Banco encontrado</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatNumber(difference.matchedEvents)} evento(s)
          </p>
          <p className="text-xs text-zinc-500">
            {formatNumber(difference.matchedGoals)} gol(s)
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-xs text-zinc-500">Diferença</p>
          <p className="mt-1 font-bold text-red-200">
            {formatNumber(difference.missingEvents)} evento(s)
          </p>
          <p className="text-xs text-red-200">
            {formatNumber(difference.missingGoals)} gol(s)
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Cadastro:{" "}
        {difference.hasRegisteredPlayer
          ? difference.candidates
              .map((candidate) => `${candidate.name} (${formatAuditSide(candidate.side)})`)
              .join(", ")
          : "Jogador correspondente não cadastrado"}
      </p>

      {difference.samples.length > 0 ? (
        <div className="mt-3 space-y-2">
          {difference.samples.map((sample) => (
            <ImportCoverageEventSampleCard
              key={`${sample.matchNumber}-${sample.sourceCell}-${sample.eventType}`}
              sample={sample}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ImportCoverageMatchDifferenceCard({
  difference,
}: {
  difference: ImportCoverageMatchDifference;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-zinc-100">
          {formatMatchNumber(difference.matchNumber)}
        </p>
        <span className="rounded-full border border-yellow-700 bg-yellow-950/30 px-2 py-1 text-xs font-bold text-yellow-200">
          {formatNumber(difference.missingEvents)} ausente(s)
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">Planilha</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatNumber(difference.expectedEvents)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">Banco</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatNumber(difference.databaseEvents)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">Encontrados</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatNumber(difference.matchedEvents)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">Ausentes</p>
          <p className="mt-1 font-bold text-red-200">
            {formatNumber(difference.missingEvents)}
          </p>
        </div>
      </div>

      {difference.samples.length > 0 ? (
        <div className="mt-3 space-y-2">
          {difference.samples.map((sample) => (
            <ImportCoverageEventSampleCard
              key={`${sample.matchNumber}-${sample.sourceCell}-${sample.eventType}`}
              sample={sample}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ImportCoverageSummaryBlock({
  summary,
}: {
  summary: ImportCoverageSummary;
}) {
  const cards = [
    {
      label: "Eventos esperados",
      value: formatNumber(summary.expectedEvents),
    },
    {
      label: "Eventos no banco",
      value: formatNumber(summary.databaseEvents),
    },
    {
      label: "Encontrados",
      value: formatNumber(summary.matchedExpectedEvents),
    },
    {
      label: "Ausentes",
      value: formatNumber(summary.missingExpectedEvents),
    },
    {
      label: "Jogadores divergentes",
      value: formatNumber(summary.playersWithDifferenceCount),
    },
    {
      label: "Partidas incompletas",
      value: formatNumber(summary.matchesWithPossibleIncompleteImportCount),
    },
    {
      label: "Source cells",
      value: `${formatNumber(summary.sourceCellMatchedEvents)}/${formatNumber(
        summary.sourceCellExpectedEvents
      )}`,
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-yellow-800 bg-yellow-950/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-100">
            Cobertura da importação histórica
          </h3>
          <p className="mt-2 text-sm text-yellow-100">
            Compara os eventos esperados da planilha histórica com os eventos existentes no banco.
          </p>
        </div>

        <p className="rounded-lg border border-yellow-700 bg-yellow-950/40 px-3 py-2 text-xs font-bold text-yellow-100">
          Correção/importação dos eventos ausentes será liberada após validação desta auditoria.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <AuditMetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      {summary.missingExpectedEvents === 0 ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/25 px-4 py-3 text-sm font-semibold text-emerald-200">
          A importação histórica cobre todos os eventos esperados da planilha.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <details
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-100">
              <span>Eventos ausentes</span>
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                {formatNumber(summary.missingExpectedEvents)}
              </span>
            </summary>

            <div className="mt-3 space-y-2">
              {summary.samples.missingEvents.map((sample) => (
                <ImportCoverageEventSampleCard
                  key={`${sample.matchNumber}-${sample.sourceCell}-${sample.eventType}`}
                  sample={sample}
                />
              ))}
            </div>
          </details>

          <details
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-100">
              <span>Jogadores com diferença</span>
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                {formatNumber(summary.playersWithDifferenceCount)}
              </span>
            </summary>

            <div className="mt-3 space-y-2">
              {summary.samples.playerDifferences.map((difference) => (
                <ImportCoveragePlayerDifferenceCard
                  key={`${difference.normalizedName}-${difference.side}`}
                  difference={difference}
                />
              ))}
            </div>
          </details>

          <details
            className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
            open
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-100">
              <span>Partidas incompletas</span>
              <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                {formatNumber(summary.matchesWithPossibleIncompleteImportCount)}
              </span>
            </summary>

            <div className="mt-3 space-y-2">
              {summary.samples.matchDifferences.map((difference) => (
                <ImportCoverageMatchDifferenceCard
                  key={difference.matchNumber}
                  difference={difference}
                />
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

type HistoricalEquivalentReviewFilter =
  | "TODOS"
  | HistoricalEquivalentReviewEvent["classification"];

function formatHistoricalEquivalentClassification(
  classification: HistoricalEquivalentReviewEvent["classification"]
) {
  const labels: Record<
    HistoricalEquivalentReviewEvent["classification"],
    string
  > = {
    SEM_EQUIVALENTE: "Sem equivalente",
    EQUIVALENTE_PROVAVEL: "Equivalente provavel",
    MANUAL_POSTERIOR_PROVAVEL: "Manual/posterior provavel",
    INDETERMINADO: "Indeterminado",
  };

  return labels[classification];
}

function getHistoricalEquivalentClassificationClasses(
  classification: HistoricalEquivalentReviewEvent["classification"]
) {
  if (classification === "SEM_EQUIVALENTE") {
    return "border-red-700 bg-red-950/35 text-red-200";
  }

  if (classification === "EQUIVALENTE_PROVAVEL") {
    return "border-emerald-700 bg-emerald-950/30 text-emerald-200";
  }

  if (classification === "MANUAL_POSTERIOR_PROVAVEL") {
    return "border-blue-700 bg-blue-950/30 text-blue-200";
  }

  return "border-yellow-700 bg-yellow-950/30 text-yellow-200";
}

function getHistoricalEquivalentReviewHref(
  event: HistoricalEquivalentReviewEvent
) {
  if (event.eventType === "GOL") {
    return `#${getEventInvestigatorAnchorId(event.id)}`;
  }

  return `#${OFFICIAL_VALIDATOR_SECTION_ID}`;
}

function HistoricalEquivalentReviewEventCard({
  event,
}: {
  event: HistoricalEquivalentReviewEvent;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-1 font-bold ${getHistoricalEquivalentClassificationClasses(
                event.classification
              )}`}
            >
              {formatHistoricalEquivalentClassification(event.classification)}
            </span>
            <span
              className={`rounded-full border px-2 py-1 font-bold ${
                event.matchVerified
                  ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                  : "border-yellow-700 bg-yellow-950/30 text-yellow-200"
              }`}
            >
              {event.matchVerified ? "Partida conferida" : "Nao conferida"}
            </span>
          </div>

          <p className="mt-3 break-words text-sm font-black text-zinc-100">
            {event.playerName}
          </p>
          <p className="mt-1 break-words text-zinc-500">
            player_name_raw: {event.playerNameRaw}
          </p>
          <p className="mt-1 break-all text-zinc-500">event_id: {event.id}</p>
        </div>

        <a
          href={getHistoricalEquivalentReviewHref(event)}
          className="shrink-0 rounded-lg border border-cyan-800 bg-cyan-950/30 px-3 py-2 text-center text-xs font-bold text-cyan-100 transition hover:bg-cyan-950/50"
        >
          Ver no Investigador
        </a>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">event_type</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatEventType(event.eventType)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">partida</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatMatchNumber(event.matchNumber)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">player_id</p>
          <p className="mt-1 break-all font-bold text-zinc-100">
            {event.playerId ?? "sem player_id"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">source_cell</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatSourceCell(event.sourceCell)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <p className="text-zinc-500">side</p>
          <p className="mt-1 font-bold text-zinc-100">
            {formatAuditSide(event.side)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 sm:col-span-2 xl:col-span-3">
          <p className="text-zinc-500">Motivo da classificacao</p>
          <p className="mt-1 font-semibold text-zinc-200">{event.reason}</p>
        </div>
      </div>
    </div>
  );
}

function HistoricalEquivalentReviewBlock({
  summary,
}: {
  summary: HistoricalEquivalentReviewSummary;
}) {
  const [filter, setFilter] =
    useState<HistoricalEquivalentReviewFilter>("TODOS");
  const filters: Array<{
    value: HistoricalEquivalentReviewFilter;
    label: string;
    count: number;
  }> = [
    {
      value: "TODOS",
      label: "Todos",
      count: summary.totalForReview,
    },
    {
      value: "SEM_EQUIVALENTE",
      label: "Sem equivalente",
      count: summary.withoutEquivalentEvents,
    },
    {
      value: "EQUIVALENTE_PROVAVEL",
      label: "Equivalente provavel",
      count: summary.probableEquivalentEvents,
    },
    {
      value: "MANUAL_POSTERIOR_PROVAVEL",
      label: "Manual/posterior provavel",
      count: summary.probableManualEvents,
    },
    {
      value: "INDETERMINADO",
      label: "Indeterminado",
      count: summary.indeterminateEvents,
    },
  ];
  const filteredEvents =
    filter === "TODOS"
      ? summary.events
      : summary.events.filter((event) => event.classification === filter);
  const cards = [
    {
      label: "Total para revisao",
      value: formatNumber(summary.totalForReview),
    },
    {
      label: "Sem equivalente",
      value: formatNumber(summary.withoutEquivalentEvents),
    },
    {
      label: "Equivalentes provaveis",
      value: formatNumber(summary.probableEquivalentEvents),
    },
    {
      label: "Manuais/posteriores",
      value: formatNumber(summary.probableManualEvents),
    },
    {
      label: "Indeterminados",
      value: formatNumber(summary.indeterminateEvents),
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-orange-800 bg-orange-950/15 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-100">
            Eventos sem equivalente historico
          </h3>
          <p className="mt-2 text-sm text-orange-100">
            Fila somente leitura para eventos do banco sem par exato no JSON historico.
          </p>
        </div>

        <p className="rounded-lg border border-orange-700 bg-orange-950/40 px-3 py-2 text-xs font-bold text-orange-100">
          Sem correcao, exclusao ou reatribuicao nesta Sprint.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <AuditMetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
              filter === item.value
                ? "border-orange-600 bg-orange-950/50 text-orange-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {item.label} - {formatNumber(item.count)}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
          Nenhum evento neste filtro.
        </p>
      ) : (
        <div className="mt-4 max-h-[720px] space-y-3 overflow-y-auto pr-1">
          {filteredEvents.map((event) => (
            <HistoricalEquivalentReviewEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function getOfficialValidatorStatusClasses(
  status: OfficialRankingValidatorRow["status"]
) {
  if (status === "OK") {
    return "border-emerald-700 bg-emerald-950/35 text-emerald-200";
  }

  if (status === "Somente posterior") {
    return "border-blue-700 bg-blue-950/35 text-blue-200";
  }

  return "border-red-700 bg-red-950/35 text-red-200";
}

function getOfficialValidatorDifferenceClasses(difference: number) {
  if (difference === 0) return "text-emerald-200";
  return "text-red-200";
}

function formatOfficialValidatorPlayers(row: OfficialRankingValidatorRow) {
  if (row.matchedPlayers.length === 0) return "Sem cadastro vinculado";

  return row.matchedPlayers
    .map((player) => `${player.name} (${formatAuditSide(player.side)})`)
    .join(", ");
}

function formatOfficialValidatorAliases(row: OfficialRankingValidatorRow) {
  if (row.aliases.length === 0) return "Sem alias";

  return row.aliases.map((alias) => alias.alias).join(", ");
}

function formatOfficialValidatorPlayerIds(row: OfficialRankingValidatorRow) {
  const ids = row.matchedPlayers.map((player) => player.id);

  if (ids.length === 0 && row.playerId) ids.push(row.playerId);
  if (ids.length === 0) return "Sem player_id";

  return Array.from(new Set(ids)).join(", ");
}

function formatOfficialValidatorMatches(row: OfficialRankingValidatorRow) {
  if (row.matchNumbers.length === 0) return "Sem partidas";

  return row.matchNumbers.map((matchNumber) => `#${matchNumber}`).join(", ");
}

function formatOfficialValidatorDiagnosis(
  diagnosis: OfficialRankingValidatorInvestigationEvent["diagnosis"]
) {
  const labels: Record<
    OfficialRankingValidatorInvestigationEvent["diagnosis"],
    string
  > = {
    "alias ausente": "Alias ausente",
    identidade: "Identidade",
    "evento excedente": "Evento excedente",
    "evento faltante": "Evento faltante",
    "jogador errado": "Jogador errado",
    "sem diagnostico": "Sem diagnostico",
  };

  return labels[diagnosis];
}

function getOfficialValidatorDiagnosisClasses(
  diagnosis: OfficialRankingValidatorInvestigationEvent["diagnosis"]
) {
  if (diagnosis === "sem diagnostico") {
    return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }

  if (diagnosis === "evento faltante" || diagnosis === "evento excedente") {
    return "border-red-700 bg-red-950/35 text-red-200";
  }

  if (diagnosis === "jogador errado") {
    return "border-orange-700 bg-orange-950/35 text-orange-200";
  }

  return "border-yellow-700 bg-yellow-950/35 text-yellow-200";
}

function formatInvestigationEventId(
  event: OfficialRankingValidatorInvestigationEvent
) {
  return event.eventId ?? event.investigationId;
}

function getOfficialValidatorUnlinkedEventNames(row: OfficialRankingValidatorRow) {
  const byNormalizedName = new Map<string, string>();

  row.databaseEvents.forEach((event) => {
    if (event.playerId) return;

    const normalizedName = normalizeText(event.playerNameRaw);
    if (!normalizedName) return;

    byNormalizedName.set(normalizedName, event.playerNameRaw);
  });

  return Array.from(byNormalizedName.values()).sort((a, b) =>
    a.localeCompare(b)
  );
}

type OfficialRankingValidatorBlockProps = {
  summary: OfficialRankingValidatorSummary;
  players: PlayerWithAliases[];
  onPrepareGuidedCorrection: (
    row: OfficialRankingValidatorRow,
    targetPlayerId?: string
  ) => void;
  loadingKey: string | null;
};

function getOfficialValidatorCandidateNames(row: OfficialRankingValidatorRow) {
  return Array.from(
    new Set(
      [
        row.playerName,
        ...row.rawHistoricalNames,
        ...row.aliases
          .filter((alias) => alias.source === "Grupo oficial")
          .map((alias) => alias.alias),
      ]
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
}

function hasAmbiguousCurationCandidates(
  candidates: CurationAssistantCandidate[]
) {
  if (candidates.length < 2) return false;

  return candidates[0]!.score - candidates[1]!.score <= 8;
}

function getOfficialValidatorGuidedCorrectionState(
  row: OfficialRankingValidatorRow
) {
  if (row.status !== "Divergente") {
    return {
      canPrepare: false,
      reason: "Item sem divergencia homologavel.",
    };
  }

  if (row.difference <= 0) {
    return {
      canPrepare: false,
      reason:
        "Revisao manual necessaria: o site tem evento excedente e esta Sprint nao exclui nem altera dados do evento.",
    };
  }

  if (row.matchedPlayers.length !== 1) {
    return {
      canPrepare: false,
      reason:
        "Revisao manual necessaria: a divergencia nao possui exatamente um jogador destino valido.",
    };
  }

  return {
    canPrepare: true,
    reason:
      "Destino unico encontrado. A previa ainda validara alias e eventos concretos antes de aplicar.",
  };
}

function OfficialRankingValidatorEventList({
  title,
  emptyMessage,
  events,
}: {
  title: string;
  emptyMessage: string;
  events: OfficialRankingValidatorRow["historicalEvents"];
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div
              key={`${event.matchNumber}-${event.seq}-${event.playerNameRaw}-${event.eventType}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
            >
              <p className="font-bold text-zinc-100">{event.playerNameRaw}</p>
              <p className="mt-1 text-zinc-500">
                {formatMatchNumber(event.matchNumber)} · Seq {event.seq} ·{" "}
                {formatEventType(event.eventType)} · {formatAuditSide(event.side)}
              </p>
              <p className="mt-1 text-zinc-500">
                Origem: {formatSourceCell(event.sourceCell)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OfficialRankingValidatorDatabaseEventList({
  title,
  emptyMessage,
  events,
}: {
  title: string;
  emptyMessage: string;
  events: OfficialRankingValidatorRow["databaseEvents"];
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-bold text-zinc-100">
                    {event.playerNameRaw}
                  </p>
                  <p className="mt-1 text-zinc-500">
                    {formatMatchNumber(event.matchNumber)} · Seq{" "}
                    {event.seq ?? "-"} · {formatEventType(event.eventType)} ·{" "}
                    {formatAuditSide(event.side)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 font-bold ${
                    event.playerId
                      ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                      : "border-yellow-700 bg-yellow-950/30 text-yellow-200"
                  }`}
                >
                  {event.playerId ? "Com player_id" : "Sem player_id"}
                </span>
              </div>
              <p className="mt-2 text-zinc-500">Evento ID {event.id}</p>
              <p className="mt-1 text-zinc-500">
                player_id: {event.playerId ?? "sem player_id"} · resolvido:{" "}
                {event.resolvedPlayerId ?? "sem destino"}
              </p>
              <p className="mt-1 text-zinc-500">
                Origem: {formatSourceCell(event.sourceCell)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OfficialRankingValidatorInvestigationList({
  events,
}: {
  events: OfficialRankingValidatorRow["investigationEvents"];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-sm text-zinc-500">
          Nenhum evento relacionado encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Investigacao evento a evento
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Historico e banco na mesma lista, com diagnostico individual.
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
          {formatEventCountLabel(events.length)}
        </span>
      </div>

      <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {events.map((event) => (
          <div
            key={event.investigationId}
            id={
              event.eventId
                ? getEventInvestigatorAnchorId(event.eventId)
                : undefined
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 font-bold text-zinc-200">
                    {event.source}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 font-bold ${getOfficialValidatorDiagnosisClasses(
                      event.diagnosis
                    )}`}
                  >
                    {formatOfficialValidatorDiagnosis(event.diagnosis)}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 font-bold ${
                      event.matchVerified
                        ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                        : "border-yellow-700 bg-yellow-950/30 text-yellow-200"
                    }`}
                  >
                    {event.matchVerified ? "Partida conferida" : "Nao conferida"}
                  </span>
                </div>

                <p className="mt-3 break-words text-sm font-black text-zinc-100">
                  {event.playerNameRaw}
                </p>
                <p className="mt-1 break-all text-zinc-500">
                  event_id: {formatInvestigationEventId(event)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-zinc-500">event_type</p>
                <p className="mt-1 font-bold text-zinc-100">
                  {formatEventType(event.eventType)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-zinc-500">partida</p>
                <p className="mt-1 font-bold text-zinc-100">
                  {formatMatchNumber(event.matchNumber)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-zinc-500">player_id</p>
                <p className="mt-1 break-all font-bold text-zinc-100">
                  {event.playerId ?? "sem player_id"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-zinc-500">source_cell</p>
                <p className="mt-1 font-bold text-zinc-100">
                  {formatSourceCell(event.sourceCell)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-zinc-500">side</p>
                <p className="mt-1 font-bold text-zinc-100">
                  {formatAuditSide(event.side)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                <p className="text-zinc-500">seq</p>
                <p className="mt-1 font-bold text-zinc-100">
                  {event.seq ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 sm:col-span-2">
                <p className="text-zinc-500">Causa provavel</p>
                <p className="mt-1 font-semibold text-zinc-200">
                  {event.probableCause}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfficialRankingValidatorBlock({
  summary,
  players,
  onPrepareGuidedCorrection,
  loadingKey,
}: OfficialRankingValidatorBlockProps) {
  const cards = [
    {
      label: "Cobertura ate",
      value:
        summary.historicalCoverageMaxMatchNumber === null
          ? "-"
          : `#${formatNumber(summary.historicalCoverageMaxMatchNumber)}`,
    },
    {
      label: "Gols no histórico",
      value: formatNumber(summary.totalHistoricalGoals),
    },
    {
      label: "Site na cobertura",
      value: formatNumber(summary.totalSiteGoalsWithinCoverage),
      description: `${formatNumber(summary.totalSiteGoals)} gol(s) no site ao todo`,
    },
    {
      label: "Posteriores",
      value: formatNumber(summary.postCoverageSiteGoals),
    },
    {
      label: "Sem match_number",
      value: formatNumber(summary.unreliableMatchNumberSiteGoals),
    },
    {
      label: "Jogadores comparados",
      value: formatNumber(summary.comparedPlayersCount),
    },
    {
      label: "Divergentes",
      value: formatNumber(summary.divergentPlayersCount),
      description: `${formatNumber(summary.postCoverageOnlyPlayersCount)} somente posterior`,
    },
  ];

  return (
    <div className="mt-5 rounded-xl border border-cyan-800 bg-cyan-950/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-100">
            Validador oficial dos rankings
          </h3>
          <p className="mt-2 text-sm text-cyan-100">
            Divergencias reais podem ser corrigidas somente com destino unico,
            previa e confirmacao manual.
          </p>
          <p className="hidden">
            Divergências viram ações manuais: ver detalhes, confirmar destino e só então executar.
          </p>
        </div>

        <p className="rounded-lg border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-100">
          Nenhuma correção automática será executada.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <AuditMetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      {!summary.sourceAvailable ? (
        <p className="mt-4 rounded-xl border border-yellow-800 bg-yellow-950/25 px-4 py-3 text-sm font-semibold text-yellow-200">
          Histórico extraído não encontrado para esta auditoria.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {summary.rows.map((row) => {
          const guidedCorrection = getOfficialValidatorGuidedCorrectionState(row);
          const correctionLoadingKey = `resolve:${row.key}`;
          const assistantCandidates =
            row.status === "Divergente" &&
            row.difference > 0 &&
            !guidedCorrection.canPrepare
              ? getCurationAssistantCandidates(players, {
                  names: getOfficialValidatorCandidateNames(row),
                  side: row.side,
                })
              : [];
          const hasAmbiguity =
            hasAmbiguousCurationCandidates(assistantCandidates);

          return (
            <details
              key={row.key}
              className={`rounded-xl border p-3 ${
                row.status === "Divergente"
                  ? "border-red-900 bg-zinc-950"
                  : "border-zinc-800 bg-zinc-950"
              }`}
              open={row.status === "Divergente" && row.isFeatured}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-sm font-black text-zinc-100">
                      {row.playerName}
                    </p>
                    <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                      {formatAuditSide(row.side)}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${getOfficialValidatorStatusClasses(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ver detalhes · {formatOfficialValidatorMatches(row)}
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-2 text-right text-xs sm:min-w-[430px]">
                  <div>
                    <p className="text-zinc-500">Histórico</p>
                    <p className="font-black text-zinc-100">
                      {formatNumber(row.historicalGoals)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Site cob.</p>
                    <p className="font-black text-zinc-100">
                      {formatNumber(row.siteGoals)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Posteriores</p>
                    <p className="font-black text-blue-200">
                      {formatNumber(row.postCoverageGoals)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Dif. hom.</p>
                    <p
                      className={`font-black ${getOfficialValidatorDifferenceClasses(
                        row.difference
                      )}`}
                    >
                      {formatSignedNumber(row.difference)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Status</p>
                    <p className="font-black text-zinc-100">{row.status}</p>
                  </div>
                </div>
              </summary>

              <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Cadastro
                      </p>
                      <p className="mt-2 break-words font-semibold text-zinc-200">
                        {formatOfficialValidatorPlayers(row)}
                      </p>
                      <p className="mt-1 break-words text-xs text-zinc-500">
                        {formatOfficialValidatorPlayerIds(row)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Aliases
                      </p>
                      <p className="mt-2 break-words font-semibold text-zinc-200">
                        {formatOfficialValidatorAliases(row)}
                      </p>
                      <p className="mt-1 break-words text-xs text-zinc-500">
                        Histórico:{" "}
                        {row.rawHistoricalNames.length > 0
                          ? row.rawHistoricalNames.join(", ")
                          : "sem nomes"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm lg:col-span-2">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Causa provavel
                      </p>
                      <p className="mt-2 font-semibold text-zinc-200">
                        {row.probableCause}
                      </p>
                    </div>

                    <div className="lg:col-span-2">
                      <OfficialRankingValidatorInvestigationList
                        events={row.investigationEvents}
                      />
                    </div>

                  </div>
                </div>

                <div className="rounded-lg border border-cyan-800 bg-cyan-950/20 p-3">
                  <p className="text-sm font-black text-cyan-100">
                    Investigador
                  </p>

                  <div className="mt-3 rounded-lg border border-cyan-800 bg-zinc-950 px-3 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                    Correcao guiada
                  </div>

                  <p className="mt-3 text-xs text-cyan-100">
                    A escrita so fica disponivel com destino unico, acao concreta
                    e confirmacao explicita.
                  </p>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => onPrepareGuidedCorrection(row)}
                      disabled={
                        !guidedCorrection.canPrepare ||
                        loadingKey !== null
                      }
                      className="w-full rounded-lg bg-cyan-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:opacity-50"
                    >
                      {loadingKey === correctionLoadingKey
                        ? "Preparando..."
                        : guidedCorrection.canPrepare
                          ? "Preparar correcao guiada"
                          : "Revisao manual necessaria"}
                    </button>

                  </div>

                  <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                    {guidedCorrection.reason}
                  </p>

                  {!guidedCorrection.canPrepare &&
                  row.status === "Divergente" &&
                  row.difference > 0 ? (
                    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-zinc-100">
                            Sugestoes de destino
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            O sistema sugere; o administrador decide.
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                          {formatNumber(assistantCandidates.length)}
                        </span>
                      </div>

                      {hasAmbiguity ? (
                        <p className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs font-semibold text-yellow-100">
                          Ha candidatos empatados ou muito proximos. Nenhum destino
                          foi escolhido automaticamente.
                        </p>
                      ) : null}

                      {assistantCandidates.length === 0 ? (
                        <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                          Nenhum candidato encontrado. Se o jogador nao existir no
                          cadastro, crie o jogador fora desta Sprint antes de corrigir.
                        </p>
                      ) : (
                        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                          {assistantCandidates.map((candidate) => (
                            <div
                              key={candidate.playerId}
                              className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="break-words text-sm font-black text-zinc-100">
                                    {candidate.name}
                                  </p>
                                  <p className="mt-1 text-zinc-500">
                                    {formatAuditSide(candidate.side)} - confianca{" "}
                                    {formatNumber(candidate.confidence)}%
                                  </p>
                                  <p className="mt-1 break-words text-zinc-500">
                                    Aliases:{" "}
                                    {candidate.aliases.length > 0
                                      ? candidate.aliases.join(", ")
                                      : "sem aliases"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    onPrepareGuidedCorrection(row, candidate.playerId)
                                  }
                                  disabled={loadingKey !== null}
                                  className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-cyan-600 disabled:opacity-50"
                                >
                                  {loadingKey === correctionLoadingKey
                                    ? "Selecionando..."
                                    : "Selecionar"}
                                </button>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {candidate.positiveReasons.map((reason) => (
                                  <span
                                    key={reason}
                                    className="rounded-full border border-emerald-800 bg-emerald-950/25 px-2 py-1 text-emerald-200"
                                  >
                                    {reason}
                                  </span>
                                ))}
                                {candidate.warnings.map((warning) => (
                                  <span
                                    key={warning}
                                    className="rounded-full border border-yellow-800 bg-yellow-950/25 px-2 py-1 text-yellow-100"
                                  >
                                    {warning}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {row.status !== "Divergente" ? (
                    <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                      Item sem divergência ativa.
                    </p>
                  ) : null}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function getSideSearchValues(side: string) {
  if (side !== "PEDRO" && side !== "NETU") {
    return [side];
  }

  const team = getTeamTheme(side);

  return [side, team.owner, team.club, team.short];
}

function matchesGlobalTerm(term: string, values: Array<string | null | undefined>) {
  if (!term) return false;

  return values.some((value) => {
    if (!value) return false;
    return normalizeText(value).includes(term);
  });
}

function playerMatchesGlobalSearch(
  player: PlayerGlobalSearchPlayer,
  aliases: Array<{ alias: string; normalizedAlias: string }>,
  term: string
) {
  return matchesGlobalTerm(term, [
    player.id,
    player.id.slice(0, 6),
    player.name,
    player.normalizedName,
    ...getSideSearchValues(player.side),
    ...aliases.flatMap((alias) => [alias.alias, alias.normalizedAlias]),
  ]);
}

function aliasMatchesGlobalSearch(alias: GlobalSearchAlias, term: string) {
  return matchesGlobalTerm(term, [
    alias.id,
    alias.id.slice(0, 6),
    alias.alias,
    alias.normalizedAlias,
    alias.playerId,
    alias.playerId.slice(0, 6),
    alias.player?.name,
    alias.player ? normalizeText(alias.player.name) : null,
    alias.player?.side,
    ...(alias.player ? getSideSearchValues(alias.player.side) : []),
    ...alias.relatedPlayers.flatMap((player) => [
      player.name,
      player.side,
      ...getSideSearchValues(player.side),
    ]),
  ]);
}

function toEditablePlayer(player: PlayerGlobalSearchPlayer): PlayerWithAliases {
  return {
    id: player.id,
    name: player.name,
    side: player.side,
    aliases: player.aliases.map((alias) => ({
      id: alias.id,
      player_id: player.id,
      alias: alias.alias,
      normalized_alias: alias.normalizedAlias,
    })),
  };
}

function normalizeSortableName(value: string) {
  return normalizeText(value) ?? "";
}

type AliasReassignmentBlockProps = {
  alias: GlobalSearchAlias;
  playerList: PlayerWithAliases[];
  onReassign: (targetPlayerId: string) => Promise<void>;
};

function AliasReassignmentBlock({
  alias,
  playerList,
  onReassign,
}: AliasReassignmentBlockProps) {
  const normalizedAlias = normalizeSortableName(alias.normalizedAlias);

  const suggestedPlayers = useMemo(() => {
    const direct = playerList.filter(
      (p) => normalizeSortableName(p.name) === normalizedAlias
    );

    const rest = playerList.filter(
      (p) => normalizeSortableName(p.name) !== normalizedAlias
    );

    const sortByName = (a: PlayerWithAliases, b: PlayerWithAliases) =>
      a.name.localeCompare(b.name);

    direct.sort(sortByName);
    rest.sort(sortByName);

    return [...direct, ...rest];
  }, [normalizedAlias, playerList]);

  const initialSelectedId = suggestedPlayers[0]?.id ?? "";
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialSelectedId);

  useEffect(() => {
    setSelectedPlayerId(initialSelectedId);
  }, [initialSelectedId]);

  const selected = playerList.find((p) => p.id === selectedPlayerId);

  const handleReassign = () => {
    if (!selectedPlayerId) return;
    void onReassign(selectedPlayerId);
  };

  return (
    <div className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/25 p-3">
      <p className="text-xs font-bold text-yellow-200">
        {alias.isOrphan ? "Corrigir alias" : "Reatribuir alias"}
      </p>
      <p className="mt-1 text-xs text-yellow-100">
        Reatribuição segura do alias. Você confirma manualmente antes de salvar.
      </p>


      <div className="mt-3 flex flex-col gap-2">
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="min-w-0 rounded-lg border border-yellow-700 bg-zinc-900 px-3 py-3 text-sm text-white"
        >
          {suggestedPlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({formatAuditSide(p.side)})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleReassign}
          disabled={!selected}
          className="rounded-lg bg-yellow-700 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-600 disabled:opacity-50"
        >
          Confirmar reatribuição
        </button>
      </div>
    </div>
  );
}



export default function PlayerList({
  players,
  rankingsAudit,
  globalSearchIndex,
  mode = "players",
}: Props) {
  const isCurationMode = mode === "curation";
  const [playerList, setPlayerList] = useState<PlayerWithAliases[]>(players);
  const [audit, setAudit] = useState<RankingsDataHealthAudit>(rankingsAudit);
  const [globalIndex, setGlobalIndex] =
    useState<PlayerGlobalSearchIndex>(globalSearchIndex);
  const [aliasesByPlayerId, setAliasesByPlayerId] = useState(buildAliasState(players));
  const [globalSearch, setGlobalSearch] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [aliasLoadingId, setAliasLoadingId] = useState<string | null>(null);

  // Busca global (adicionar alias)
  const [globalAliasDrafts, setGlobalAliasDrafts] = useState<
    Record<string, string>
  >({});
  const [globalAliasLoadingId, setGlobalAliasLoadingId] = useState<
    string | null
  >(null);
  const [mergeSourceId, setMergeSourceId] = useState(players[0]?.id ?? "");
  const [mergeTargetId, setMergeTargetId] = useState(players[1]?.id ?? "");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [deletionPreview, setDeletionPreview] =
    useState<ExistingPlayerDeletionPreview | null>(null);

  const [pendingByPlayerId, setPendingByPlayerId] = useState<
    Record<string, {
      linkedEventsCount: number;
      probableEventsCount: number;
      status: "VINCULO_PENDENTE" | "SEM_EVENTO_PROVAVEL_ENCONTRADO";
      probableSources: Array<{
        label: string;
        key: string;
        count: number;
        matchesByAlias: boolean;
      }>;
    }>
  >({});
  const [loadingPending, setLoadingPending] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(true);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edição manual (name/side apenas)
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSide, setEditSide] = useState<"PEDRO" | "NETU">("PEDRO");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [validatorActionLoadingKey, setValidatorActionLoadingKey] =
    useState<string | null>(null);
  const [identityResolutionPreview, setIdentityResolutionPreview] =
    useState<IdentityResolutionPreview | null>(null);
  const [identityResolutionConfirmed, setIdentityResolutionConfirmed] =
    useState(false);
  const [identityResolutionHistory, setIdentityResolutionHistory] = useState<
    IdentityResolutionHistoryItem[]
  >([]);

  useEffect(() => {
    let active = true;

    async function carregarPending() {
      try {
        setLoadingPending(true);

        const { byPlayerId } = await import("@/lib/players").then((m) =>
          m.getPendingVinculoIndex(playerList)
        );

        if (!active) return;
        setPendingByPlayerId(byPlayerId);
      } catch (err) {
        console.error("Erro ao carregar vínculos pendentes:", err);
      } finally {
        if (active) setLoadingPending(false);
      }
    }

    carregarPending();

    return () => {
      active = false;
    };
  }, [playerList]);

  const filtered = useMemo(() => {
    const term = formatSearchTerm(search);
    if (!term) return playerList;

    return playerList.filter((player) => {
      const aliases = aliasesByPlayerId[player.id] ?? [];
      return (
        player.name.toLowerCase().includes(term) ||
        aliases.some((alias) => alias.alias.toLowerCase().includes(term))
      );
    });
  }, [aliasesByPlayerId, playerList, search]);

  const suspectsById = useMemo(() => {
    const byId: Record<string, true> = {};
    const playersById = new Map(playerList.map((p) => [p.id, p]));

    // só considera sinais fortes entre players com mesmo side
    for (let i = 0; i < playerList.length; i++) {
      const a = playerList[i]!;
      for (let j = i + 1; j < playerList.length; j++) {
        const b = playerList[j]!;

        if (!playersById.has(a.id) || !playersById.has(b.id)) continue;

        if (
          playerHasStrongDuplicateSignal({
            a,
            b,
            aliasesByPlayerId,
          })
        ) {
          byId[a.id] = true;
          byId[b.id] = true;
        }
      }
    }

    return byId;
  }, [aliasesByPlayerId, playerList]);

  const suspects = useMemo(() => {
    return filtered.filter((p) => suspectsById[p.id]);
  }, [filtered, suspectsById]);

  const pendingPlayers = useMemo(() => {
    return filtered.filter((p) => {
      const pending = pendingByPlayerId[p.id];
      if (!pending) return false;
      return pending.linkedEventsCount === 0 && pending.probableEventsCount > 0;
    });
  }, [filtered, pendingByPlayerId]);

  const pendingCount = pendingPlayers.length;

  const counts = useMemo(() => {
    const possibleDuplicates = suspects.length;
    const consolidated = Math.max(0, playerList.length - possibleDuplicates);

    return {
      possibleDuplicates,
      pending: pendingCount,
      consolidated,
    };
  }, [pendingCount, playerList.length, suspects.length]);

  const globalSearchResults = useMemo(() => {
    const term = normalizeText(globalSearch);

    if (!term) {
      return {
        players: [] as PlayerGlobalSearchPlayer[],
        aliases: [] as GlobalSearchAlias[],
      };
    }

    const matchedAliases = globalIndex.aliases.filter((alias) =>
      aliasMatchesGlobalSearch(alias, term)
    );
    const matchedPlayerIds = new Set(
      matchedAliases
        .map((alias) => alias.player?.id)
        .filter((playerId): playerId is string => Boolean(playerId))
    );

    const matchedPlayers = globalIndex.players.filter((player) => {
      if (playerMatchesGlobalSearch(player, player.aliases, term)) {
        return true;
      }

      return matchedPlayerIds.has(player.id);
    });

    return {
      players: matchedPlayers.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.side.localeCompare(b.side);
      }),
      aliases: matchedAliases.sort((a, b) => {
        if (Number(a.isOrphan) !== Number(b.isOrphan)) {
          return Number(b.isOrphan) - Number(a.isOrphan);
        }

        return a.alias.localeCompare(b.alias);
      }),
    };
  }, [globalIndex, globalSearch]);

  async function salvarAlias(playerId: string) {
    const alias = (drafts[playerId] || "").trim();
    if (!alias) return;

    try {
      setAliasLoadingId(playerId);
      const savedAlias = await addAlias(playerId, alias);

      setDrafts((current) => ({ ...current, [playerId]: "" }));
      setAliasesByPlayerId((current) => {
        const currentAliases = current[playerId] ?? [];
        const nextAliases = currentAliases.some((item) => item.id === savedAlias.id)
          ? currentAliases
          : sortAliases([...currentAliases, savedAlias]);

        return {
          ...current,
          [playerId]: nextAliases,
        };
      });

      await recarregarJogadores();
      setFeedback("Alias salvo. Rankings e Validador Oficial recalculados.");
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao salvar alias.");
      setFeedback(message);
    } finally {
      setAliasLoadingId(null);
    }
  }

  async function salvarAliasBuscaGlobal(playerId: string) {
    const alias = (globalAliasDrafts[playerId] || "").trim();
    if (!alias) return;

    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) {
      setFeedback("Alias inválido.");
      return;
    }

    try {
      setGlobalAliasLoadingId(playerId);

      const owner = await getAliasOwnerByNormalized(normalizedAlias);

      if (owner?.player_id === playerId) {
        setGlobalAliasDrafts((current) => ({ ...current, [playerId]: "" }));
        setFeedback("Esse alias já está cadastrado para este jogador.");
        return;
      }

      if (owner?.player_id && owner.player_id !== playerId) {
        setFeedback("Conflito: este alias já pertence a outro jogador. Ajuste na curadoria antes.");
        return;
      }

      await addAlias(playerId, alias);

      // Atualiza aliases e busca global para refletir a mudança
      setGlobalAliasDrafts((current) => ({ ...current, [playerId]: "" }));
      await recarregarJogadores();

      setFeedback("Alias salvo na busca global. Rankings e Validador Oficial recalculados.");
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao adicionar alias na busca global.");
      setFeedback(message);
    } finally {
      setGlobalAliasLoadingId(null);
    }
  }

  async function handleMergePlayers() {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;

    const source = playerList.find((player) => player.id === mergeSourceId);
    const target = playerList.find((player) => player.id === mergeTargetId);

    if (!source || !target) return;

    const confirmed = window.confirm(`Mesclar ${source.name} em ${target.name}?`);
    if (!confirmed) return;

    try {
      setMergeLoading(true);
      const result = await mergePlayers({
        sourcePlayerId: mergeSourceId,
        targetPlayerId: mergeTargetId,
      });

      const targetAliases = await getAliases(mergeTargetId);

      setAliasesByPlayerId((current) => {
        const next = {
          ...current,
          [mergeTargetId]: targetAliases,
        };

        if (result.deletedSourcePlayer) {
          delete next[mergeSourceId];
        }

        return next;
      });

      if (result.deletedSourcePlayer) {
        setPlayerList((current) =>
          current.filter((player) => player.id !== mergeSourceId)
        );
        setMergeSourceId(mergeTargetId);

        const nextTarget = playerList.find(
          (player) => player.id !== mergeTargetId && player.id !== mergeSourceId
        );
        setMergeTargetId(nextTarget?.id ?? "");
      }

      setFeedback(
        `Mesclagem concluída: ${result.updatedEvents} evento(s), ${result.transferredAliases} alias(es).`
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao mesclar jogadores.");
      setFeedback(message);
    } finally {
      setMergeLoading(false);
    }
  }

  async function recarregarJogadores() {
    const [updatedPlayers, updatedAudit, updatedGlobalIndex] =
      await Promise.all([
        getPlayersWithAliases(),
        getRankingsDataHealthAudit(),
        getPlayerGlobalSearchIndex(),
      ]);
    const nextSourceId = updatedPlayers[0]?.id ?? "";
    const nextTargetId =
      updatedPlayers.find((player) => player.id !== nextSourceId)?.id ?? "";

    setPlayerList(updatedPlayers);
    setAudit(updatedAudit);
    setGlobalIndex(updatedGlobalIndex);
    setAliasesByPlayerId(buildAliasState(updatedPlayers));
    setMergeSourceId(nextSourceId);
    setMergeTargetId(nextTargetId);

    return {
      players: updatedPlayers,
      audit: updatedAudit,
      globalIndex: updatedGlobalIndex,
    };
  }

  async function handleAddOfficialAliases(
    row: OfficialRankingValidatorRow,
    targetPlayerId: string,
    aliases: OfficialRankingValidatorRow["aliases"]
  ) {
    const target = playerList.find((player) => player.id === targetPlayerId);
    const aliasesToAdd = aliases.filter((alias) => alias.source === "Grupo oficial");

    if (!target || aliasesToAdd.length === 0) return;

    const confirmed = window.confirm(
      `Adicionar ${aliasesToAdd.length} alias(es) em ${target.name} (${formatAuditSide(target.side)}) e recalcular o validador?`
    );
    if (!confirmed) return;

    const loadingKey = `aliases:${row.key}`;

    try {
      setValidatorActionLoadingKey(loadingKey);

      for (const alias of aliasesToAdd) {
        await addAlias(targetPlayerId, alias.alias);
      }

      await recarregarJogadores();
      setFeedback(
        `Alias adicionados para ${target.name}. Rankings e Validador Oficial recalculados.`
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(
        error,
        "Erro ao adicionar aliases oficiais."
      );
      setFeedback(message);
    } finally {
      setValidatorActionLoadingKey(null);
    }
  }

  async function handleLinkConfirmedEvents(
    row: OfficialRankingValidatorRow,
    targetPlayerId: string
  ) {
    const target = playerList.find((player) => player.id === targetPlayerId);
    const eventNames = getOfficialValidatorUnlinkedEventNames(row);

    if (!target || eventNames.length === 0) return;

    const confirmed = window.confirm(
      `Reatribuir eventos sem player_id de ${eventNames.join(", ")} para ${target.name} (${formatAuditSide(target.side)}) e recalcular o validador?`
    );
    if (!confirmed) return;

    const loadingKey = `events:${row.key}`;

    try {
      setValidatorActionLoadingKey(loadingKey);

      let updatedEvents = 0;

      for (const playerName of eventNames) {
        const result = await linkUnresolvedEventsToPlayer({
          normalizedPlayerName: playerName,
          side: row.side,
          playerId: targetPlayerId,
        });

        updatedEvents += result.updatedEvents;
      }

      await recarregarJogadores();
      setFeedback(
        `${formatNumber(updatedEvents)} evento(s) reatribuído(s) para ${target.name}. Rankings e Validador Oficial recalculados.`
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(
        error,
        "Erro ao reatribuir eventos confirmados."
      );
      setFeedback(message);
    } finally {
      setValidatorActionLoadingKey(null);
    }
  }

  async function buildIdentityResolutionPreview(
    row: OfficialRankingValidatorRow,
    selectedTargetPlayerId?: string
  ): Promise<IdentityResolutionPreview | null> {
    const guidedCorrection = getOfficialValidatorGuidedCorrectionState(row);
    if (row.status !== "Divergente" || row.difference <= 0) {
      setFeedback(guidedCorrection.reason);
      return null;
    }

    if (!guidedCorrection.canPrepare && !selectedTargetPlayerId) {
      setFeedback(guidedCorrection.reason);
      return null;
    }

    const targetPlayerId = selectedTargetPlayerId ?? row.matchedPlayers[0]?.id ?? "";
    const target = playerList.find((player) => player.id === targetPlayerId);
    if (!target) return null;

    const playersById = new Map(playerList.map((player) => [player.id, player]));
    const aliasesByNormalized = new Map<string, string>();
    const targetAliasKeys = new Set<string>();
    const targetNameKey = normalizeText(target.name);

    if (targetNameKey) targetAliasKeys.add(targetNameKey);

    playerList.forEach((player) => {
      const playerAliases = aliasesByPlayerId[player.id] ?? [];

      playerAliases.forEach((alias) => {
        const normalizedAlias = normalizeText(alias.normalized_alias || alias.alias);
        if (!normalizedAlias) return;

        aliasesByNormalized.set(normalizedAlias, player.id);
        if (player.id === target.id) targetAliasKeys.add(normalizedAlias);
      });
    });

    const aliasCandidates = [
      ...row.rawHistoricalNames,
      ...row.aliases
        .filter((alias) => alias.source === "Grupo oficial")
        .map((alias) => alias.alias),
    ];
    const aliasesToCreateByKey = new Map<string, IdentityResolutionPreviewAlias>();

    aliasCandidates.forEach((alias) => {
      const aliasName = alias.trim();
      const normalizedAlias = normalizeText(aliasName);
      if (!aliasName || !normalizedAlias) return;
      if (targetAliasKeys.has(normalizedAlias)) return;

      const currentOwnerId = aliasesByNormalized.get(normalizedAlias);
      if (currentOwnerId && currentOwnerId !== target.id) return;

      aliasesToCreateByKey.set(normalizedAlias, {
        alias: aliasName,
        normalizedAlias,
      });
    });

    const maxHistoricalMatchNumber =
      audit.officialRankingValidator.historicalCoverageMaxMatchNumber;
    const candidateTargetKeys = new Set(targetAliasKeys);

    aliasesToCreateByKey.forEach((alias) => {
      candidateTargetKeys.add(alias.normalizedAlias);
    });

    const eventsToMove = row.databaseEvents
      .filter((event) => event.eventType === "GOL")
      .filter((event) => event.playerId !== target.id)
      .filter((event) => {
        if (event.matchNumber === null || maxHistoricalMatchNumber === null) {
          return false;
        }

        return event.matchNumber <= maxHistoricalMatchNumber;
      })
      .filter((event) => {
        if (event.resolvedPlayerId === target.id) return true;

        const normalizedRawName = normalizeText(event.playerNameRaw);
        return candidateTargetKeys.has(normalizedRawName);
      })
      .map((event) => {
        const sourcePlayer = event.playerId
          ? playersById.get(event.playerId)
          : null;
        const sourcePlayerLabel = sourcePlayer
          ? `${sourcePlayer.name} (${formatAuditSide(sourcePlayer.side)})`
          : event.playerId
            ? `Jogador ID ${event.playerId.slice(0, 6)}`
            : "Sem player_id";

        return {
          id: event.id,
          expectedPlayerId: event.playerId,
          matchNumber: event.matchNumber,
          seq: event.seq,
          playerNameRaw: event.playerNameRaw,
          eventType: event.eventType,
          matchVerified: event.matchVerified,
          sourcePlayerLabel,
          targetPlayerLabel: `${target.name} (${formatAuditSide(target.side)})`,
        };
      });

    const affectedRankings = Array.from(
      new Set([
        ...eventsToMove.map((event) => formatEventType(event.eventType)),
        ...(aliasesToCreateByKey.size > 0 ? ["Gols"] : []),
        "Validador Oficial",
      ])
    );
    const hasExecutableAction =
      aliasesToCreateByKey.size > 0 || eventsToMove.length > 0;
    const involvedMatches = Array.from(
      new Set(eventsToMove.map((event) => event.matchNumber))
    ).sort((a, b) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER));
    const verifiedEventsCount = eventsToMove.filter(
      (event) => event.matchVerified
    ).length;
    const expectedImpact = hasExecutableAction
      ? `A divergencia atual e ${formatSignedNumber(
          row.difference
        )}. Apos aplicar, o Validador sera recalculado usando ${formatNumber(
          eventsToMove.length
        )} evento(s) reatribuido(s) e ${formatNumber(
          aliasesToCreateByKey.size
        )} alias(es) novo(s).`
      : "Nenhuma escrita concreta foi encontrada; a divergencia permanece bloqueada para revisao manual.";
    const linkedEventIds = row.databaseEvents
      .filter((event) => event.playerId === target.id)
      .map((event) => event.id);
    const reviewOnlyEvents =
      !hasExecutableAction && row.difference < 0
        ? await getEventReviewDetails(linkedEventIds)
        : [];
    const manualReviewReason =
      !hasExecutableAction && row.difference < 0
        ? `Esta divergência não possui uma correção segura automática. O site tem ${formatEventCountLabel(
            Math.abs(row.difference)
          )} a mais que o histórico.`
        : !hasExecutableAction
          ? "Esta divergência não possui uma alteração real e segura para aplicar."
          : null;

    return {
      rowKey: row.key,
      rowPlayerName: row.playerName,
      targetPlayerId: target.id,
      targetPlayerName: target.name,
      targetPlayerSide: target.side,
      aliasesToCreate: Array.from(aliasesToCreateByKey.values()).sort((a, b) =>
        a.alias.localeCompare(b.alias)
      ),
      eventsToMove,
      sourcePlayers: Array.from(
        new Set(eventsToMove.map((event) => event.sourcePlayerLabel))
      ),
      affectedRankings,
      involvedMatches,
      verifiedEventsCount,
      expectedImpact,
      reviewOnlyEvents,
      hasExecutableAction,
      manualReviewReason,
      historicalGoals: row.historicalGoals,
      siteGoals: row.siteGoals,
      difference: row.difference,
    };
  }

  async function handlePrepareIdentityResolution(
    row: OfficialRankingValidatorRow,
    targetPlayerId?: string
  ) {
    try {
      setValidatorActionLoadingKey(`resolve:${row.key}`);
      const preview = await buildIdentityResolutionPreview(row, targetPlayerId);

      if (!preview) {
        setFeedback("Selecione um destino valido para resolver a divergencia.");
        return;
      }

      setIdentityResolutionPreview(preview);
      setIdentityResolutionConfirmed(false);
      setFeedback(null);
    } catch (error: unknown) {
      const message = formatSupabaseError(
        error,
        "Erro ao preparar a revisao da divergencia."
      );
      setFeedback(message);
    } finally {
      setValidatorActionLoadingKey(null);
    }
  }

  async function applyIdentityResolution() {
    if (!identityResolutionPreview || !identityResolutionConfirmed) return;

    const preview = identityResolutionPreview;
    if (!preview.hasExecutableAction) return;

    const loadingKey = `resolve:${preview.rowKey}`;

    try {
      setValidatorActionLoadingKey(loadingKey);

      const result = await applyGuidedDivergenceCorrection({
        targetPlayerId: preview.targetPlayerId,
        aliasesToCreate: preview.aliasesToCreate,
        eventsToMove: preview.eventsToMove.map((event) => ({
          id: event.id,
          expectedPlayerId: event.expectedPlayerId,
        })),
      });
      const refreshed = await recarregarJogadores();
      const updatedRow =
        refreshed.audit.officialRankingValidator.rows.find(
          (row) => row.key === preview.rowKey
        ) ?? null;
      const differenceAfter = updatedRow?.difference ?? 0;

      const historyItem: IdentityResolutionHistoryItem = {
        id: `${preview.rowKey}:${preview.difference}:${differenceAfter}:${result.updatedEvents}:${result.aliasesCreated}:${result.skippedEvents}`,
        rowPlayerName: preview.rowPlayerName,
        targetPlayerName: preview.targetPlayerName,
        aliasesCreated: result.aliasesCreated,
        aliasesAlreadyPresent: result.aliasesAlreadyPresent,
        eventsMoved: result.updatedEvents,
        eventsSkipped: result.skippedEvents,
        differenceBefore: preview.difference,
        differenceAfter,
        affectedRankings: preview.affectedRankings,
        createdAt: new Date().toLocaleString("pt-BR"),
      };

      setIdentityResolutionHistory((current) => [historyItem, ...current].slice(0, 8));
      setIdentityResolutionPreview(null);
      setIdentityResolutionConfirmed(false);
      setFeedback(
        `${formatNumber(result.updatedEvents)} evento(s) alterado(s), ${formatNumber(
          result.aliasesCreated
        )} alias(es) criado(s). Diferenca: ${formatSignedNumber(
          preview.difference
        )} -> ${formatSignedNumber(differenceAfter)}. Rankings e Validador Oficial recalculados.`
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(
        error,
        "Erro ao resolver divergencia de identidade."
      );
      setFeedback(message);
    } finally {
      setValidatorActionLoadingKey(null);
    }
  }

  async function handleLinkUnlinkedAuditGroup(
    group: UnlinkedAuditGroup,
    sideGroup: UnlinkedAuditSideGroup
  ) {
    if (sideGroup.candidates.length !== 1) {
      setFeedback("A reatribuição exige exatamente um destino confirmado.");
      return;
    }

    const target = sideGroup.candidates[0]!;
    const confirmed = window.confirm(
      `Reatribuir ${sideGroup.count} evento(s) de ${group.displayName} (${formatAuditSide(sideGroup.side)}) para ${target.name} e recalcular o validador?`
    );
    if (!confirmed) return;

    const loadingKey = `audit-events:${group.normalizedName}:${sideGroup.side}`;

    try {
      setValidatorActionLoadingKey(loadingKey);

      const result = await linkUnresolvedEventsToPlayer({
        normalizedPlayerName: group.normalizedName,
        side: sideGroup.side,
        playerId: target.id,
      });

      await recarregarJogadores();
      setFeedback(
        `${formatNumber(result.updatedEvents)} evento(s) reatribuído(s) para ${target.name}. Rankings e Validador Oficial recalculados.`
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(
        error,
        "Erro ao reatribuir eventos da auditoria."
      );
      setFeedback(message);
    } finally {
      setValidatorActionLoadingKey(null);
    }
  }

  async function abrirExclusao(playerId: string) {
    try {
      setDeleteLoadingId(playerId);
      setDeleteConfirmation("");
      const preview = await getPlayerDeletionPreview(playerId);

      if (preview.status === "deleted") {
        await recarregarJogadores();
        setDeletionPreview(null);
        setFeedback("Jogador já foi excluído.");
        return;
      }

      setDeletionPreview(preview);
      setFeedback(null);
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao verificar jogador.");
      setFeedback(message);
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function cancelarExclusao() {
    setDeletionPreview(null);
    setDeleteConfirmation("");
  }

  async function confirmarExclusao() {
    if (!deletionPreview || deleteConfirmation !== deletionPreview.player.name) return;

    try {
      setDeleteLoadingId(deletionPreview.player.id);
      const result = await deletePlayerSafely(deletionPreview.player.id);
      await recarregarJogadores();
      cancelarExclusao();
      setFeedback(
        result.status === "deleted"
          ? "Jogador já foi excluído."
          : "Jogador excluído com sucesso."
      );
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao excluir jogador.");
      setFeedback(message);
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function abrirEdicao(player: Pick<PlayerWithAliases, "id" | "name" | "side">) {
    setEditPlayerId(player.id);
    setEditName(player.name);
    setEditSide(player.side as "PEDRO" | "NETU");
    setEditError(null);
  }

  function PlayerCard({ player, dim }: { player: PlayerWithAliases; dim?: boolean }) {
    const aliases = aliasesByPlayerId[player.id] ?? [];
    const side = getTeamSide(player.side);
    const team = getTeamTheme(side);

    const pending = pendingByPlayerId[player.id];
    const linkedEventsCount = pending?.linkedEventsCount ?? 0;
    const probableEventsCount = pending?.probableEventsCount ?? 0;
    const status =
      pending?.status ?? "SEM_EVENTO_PROVAVEL_ENCONTRADO";

    return (
      <div
        className={`rounded-2xl border p-5 ${team.classes.border} ${team.classes.panel} ${
          dim ? "opacity-90" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Nome oficial
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {player.name}{" "}
              <span className="ml-2 inline-flex text-xs font-semibold text-zinc-500">
                ({player.id.slice(0, 6)})
              </span>
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <TeamBadge side={side} withMascot />
            <button
              type="button"
              onClick={() => abrirEdicao(player)}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              Editar
            </button>
          </div>
        </div>

        <p className="mt-2 text-sm text-zinc-400">{team.club}</p>

        <div
          className={`mt-4 grid grid-cols-2 gap-2 ${
            isCurationMode ? "" : "hidden"
          }`}
        >
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">Vinculados</p>
            <p className="mt-1 font-bold text-zinc-100">
              {formatNumber(linkedEventsCount)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs text-zinc-500">Prováveis</p>
            <p className="mt-1 font-bold text-zinc-100">
              {formatNumber(probableEventsCount)}
            </p>
          </div>
        </div>

        <p
          className={`mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] text-zinc-400 ${
            isCurationMode ? "" : "hidden"
          }`}
        >
          {status === "VINCULO_PENDENTE"
            ? "Vínculo pendente"
            : "Sem evento provável encontrado"}
        </p>

        {isCurationMode && linkedEventsCount === 0 ? (
          <p className="mt-3 rounded-xl border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs font-semibold text-yellow-200">
            Eventos vinculados zerados indicam vínculo pendente no histórico importado.
          </p>
        ) : null}

        {isCurationMode && probableEventsCount > 0 ? (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Fontes prováveis
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(pending?.probableSources ?? []).map((src) => (
                <span
                  key={src.key}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                >
                  {src.label} · {formatNumber(src.count)}
                </span>
              ))}
            </div>

            {!dim ? (
              <a
                href={`#${EVENT_INVESTIGATOR_SECTION_ID}`}
                className="mt-3 inline-flex text-sm font-bold text-blue-300 hover:text-blue-200"
              >
                Ir para auditoria acionável
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Aliases
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {aliases.length === 0 ? (
              <span className="text-sm text-zinc-500">Nenhum alias</span>
            ) : (
              aliases.map((alias) => (
                <span
                  key={alias.id}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300"
                >
                  {alias.alias}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <input
            value={drafts[player.id] || ""}
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [player.id]: event.target.value,
              }))
            }
            placeholder="Novo alias"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm"
          />

          <button
            type="button"
            onClick={() => salvarAlias(player.id)}
            disabled={aliasLoadingId === player.id}
            className="rounded-lg bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {aliasLoadingId === player.id ? "..." : "Salvar"}
          </button>
        </div>

        {isCurationMode ? (
          <button
            type="button"
            onClick={() => abrirExclusao(player.id)}
            disabled={deleteLoadingId === player.id}
            className="mt-4 w-full rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-950/50 disabled:opacity-50"
          >
            {deleteLoadingId === player.id ? "Verificando..." : "Excluir jogador"}
          </button>
        ) : null}
      </div>
    );
  }

  async function fecharModalEdicao() {
    setEditPlayerId(null);
    setEditError(null);
    setEditName("");
    setEditLoading(false);
    setEditSide("PEDRO");
  }

  async function salvarEdicao() {
    if (!editPlayerId) return;

    try {
      setEditLoading(true);
      setEditError(null);

      if (!editName.trim()) {
        setEditError("Nome do jogador é obrigatório.");
        return;
      }

      const trimmed = editName.trim();
      await updatePlayerBasic(editPlayerId, { name: trimmed, side: editSide });

      await recarregarJogadores();
      await fecharModalEdicao();
      setFeedback("Jogador atualizado com sucesso.");
    } catch (error: unknown) {
      const message = formatSupabaseError(error, "Erro ao editar jogador.");
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  }

  const reconciliation = audit.reconciliationSummary;
  const importCoverage = audit.importCoverageSummary;
  const historicalEquivalentReview = audit.historicalEquivalentReview;
  const officialRankingValidator = audit.officialRankingValidator;
  const auditCards = [
    {
      label: "Total de eventos",
      value: formatNumber(audit.totalEvents),
    },
    {
      label: "Com player_id",
      value: formatNumber(audit.eventsWithPlayerId),
    },
    {
      label: "Sem player_id",
      value: formatNumber(audit.eventsWithoutPlayerId),
    },
    {
      label: "% vinculados",
      value: formatPercent(audit.linkedEventsPercent),
      description: audit.health.description,
    },
    {
      label: "Jogadores",
      value: formatNumber(audit.playersCount),
    },
    {
      label: "Aliases",
      value: formatNumber(audit.aliasesCount),
    },
    {
      label: "Conflitos de alias",
      value: formatNumber(audit.aliasConflictsCount),
    },
    {
      label: "Duplicados suspeitos",
      value: formatNumber(audit.possibleDuplicateGroupsCount),
    },
  ];
  const curationPendingCount =
    audit.eventsWithoutPlayerId +
    audit.aliasConflictsCount +
    audit.possibleDuplicateGroupsCount +
    historicalEquivalentReview.criticalReviewEvents +
    officialRankingValidator.divergentPlayersCount +
    importCoverage.missingExpectedEvents;
  const curationToolCards = [
    {
      title: "Saude dos Dados",
      description: "Confiabilidade geral dos dados dos rankings.",
      href: `#${DATA_HEALTH_SECTION_ID}`,
      counterLabel: "pendencias",
      counter: formatNumber(curationPendingCount),
    },
    {
      title: "Validador Oficial",
      description: "Divergencias entre historico e site.",
      href: `#${OFFICIAL_VALIDATOR_SECTION_ID}`,
      counterLabel: "divergentes",
      counter: formatNumber(officialRankingValidator.divergentPlayersCount),
      details: [
        {
          label: "posteriores",
          value: formatNumber(officialRankingValidator.postCoverageSiteGoals),
        },
        {
          label: "somente posterior",
          value: formatNumber(
            officialRankingValidator.postCoverageOnlyPlayersCount
          ),
        },
      ],
    },
    {
      title: "Curadoria de Identidades",
      description: "Duplicados suspeitos e vinculos pendentes.",
      href: `#${CURATION_SECTION_ID}`,
      counterLabel: "pendencias",
      counter: formatNumber(counts.possibleDuplicates + counts.pending),
    },
    {
      title: "Reconciliacao Segura",
      description: "Eventos sem jogador com destino confirmado.",
      href: `#${SAFE_RECONCILIATION_SECTION_ID}`,
      counterLabel: "seguros",
      counter: formatNumber(reconciliation.safeCount),
    },
    {
      title: "Cobertura da Importacao",
      description: "Eventos historicos esperados ainda ausentes.",
      href: `#${IMPORT_COVERAGE_SECTION_ID}`,
      counterLabel: "ausentes",
      counter: formatNumber(importCoverage.missingExpectedEvents),
    },
    {
      title: "Eventos sem equivalente historico",
      description: "Fila de revisao para eventos do banco sem par exato no JSON.",
      href: `#${HISTORICAL_EQUIVALENT_REVIEW_SECTION_ID}`,
      counterLabel: "revisao critica",
      counter: formatNumber(historicalEquivalentReview.criticalReviewEvents),
      details: [
        {
          label: "total",
          value: formatNumber(historicalEquivalentReview.totalForReview),
        },
        {
          label: "sem equivalente",
          value: formatNumber(historicalEquivalentReview.withoutEquivalentEvents),
        },
        {
          label: "equiv. provavel",
          value: formatNumber(historicalEquivalentReview.probableEquivalentEvents),
        },
        {
          label: "manual/posterior",
          value: formatNumber(historicalEquivalentReview.probableManualEvents),
        },
        {
          label: "indeterminado",
          value: formatNumber(historicalEquivalentReview.indeterminateEvents),
        },
      ],
    },
    {
      title: "Investigador de Eventos",
      description: "Eventos sem player_id para revisao manual.",
      href: `#${EVENT_INVESTIGATOR_SECTION_ID}`,
      counterLabel: "sem player_id",
      counter: formatNumber(audit.eventsWithoutPlayerId),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar jogador ou alias..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4"
        />
      </div>

      {!isCurationMode ? (
        <section
          id={GLOBAL_SEARCH_SECTION_ID}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
        >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Busca global de jogadores</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Encontre qualquer jogador cadastrado por nome, alias, nome normalizado, lado ou time.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <span className="font-bold text-zinc-100">
              {formatNumber(globalIndex.players.length)}
            </span>{" "}
            jogadores ·{" "}
            <span className="font-bold text-zinc-100">
              {formatNumber(globalIndex.aliases.length)}
            </span>{" "}
            aliases
          </div>
        </div>

        <input
          value={globalSearch}
          onChange={(event) => setGlobalSearch(event.target.value)}
          placeholder="Buscar por Lucas Moura, Marcos, Palmeiras, SPFC, alias..."
          className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4"
        />

        {!globalSearch.trim() ? (
          <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
            Digite um nome, alias, time ou lado para localizar jogadores consolidados e pendências de alias.
          </p>
        ) : globalSearchResults.players.length === 0 &&
          globalSearchResults.aliases.length === 0 ? (
          <p className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
            Nenhum jogador ou alias encontrado para esta busca.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-zinc-100">
                  Jogadores encontrados
                </p>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {formatNumber(globalSearchResults.players.length)}
                </span>
              </div>

              {globalSearchResults.players.length === 0 ? (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
                  Nenhum jogador cadastrado encontrado. Confira os aliases relacionados ao lado.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {globalSearchResults.players.map((player) => {
                    const side = getTeamSide(player.side);
                    const team = getTeamTheme(side);

                    return (
                      <div
                        key={player.id}
                        className={`rounded-xl border p-4 ${team.classes.border} ${team.classes.panel}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                              Jogador
                            </p>
                            <h3 className="mt-1 break-words text-lg font-black text-zinc-100">
                              {player.name}
                            </h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              ID {player.id.slice(0, 6)} · normalizado:{" "}
                              {player.normalizedName}
                            </p>
                          </div>

                          <TeamBadge side={side} withMascot />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                            <p className="text-xs text-zinc-500">Lado/time</p>
                            <p className="mt-1 font-bold text-zinc-100">
                              {getTeamTheme(player.side).owner} ·{" "}
                              {getTeamTheme(player.side).short}
                            </p>
                          </div>
                          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                            <p className="text-xs text-zinc-500">Eventos</p>
                            <p className="mt-1 font-bold text-zinc-100">
                              {formatNumber(player.eventsCount)}
                            </p>
                          </div>
                        </div>

                        {player.eventsCount === 0 ? (
                          <p className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs font-semibold text-yellow-200">
                            Eventos vinculados zerados indicam vínculo pendente no histórico importado.
                          </p>
                        ) : null}

                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                            Aliases
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {player.aliases.length === 0 ? (
                              <span className="text-sm text-zinc-500">Nenhum alias</span>
                            ) : (
                              player.aliases.map((alias) => (
                                <span
                                  key={alias.id}
                                  className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                                >
                                  {alias.alias}
                                </span>
                              ))
                            )}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              value={globalAliasDrafts[player.id] || ""}
                              onChange={(e) =>
                                setGlobalAliasDrafts((current) => ({
                                  ...current,
                                  [player.id]: e.target.value,
                                }))
                              }
                              placeholder="Adicionar alias"
                              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white"
                              disabled={globalAliasLoadingId === player.id}
                            />

                            <button
                              type="button"
                              onClick={() => salvarAliasBuscaGlobal(player.id)}
                              disabled={globalAliasLoadingId === player.id}
                              className="rounded-lg bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
                            >
                              {globalAliasLoadingId === player.id ? "..." : "Adicionar alias"}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => abrirEdicao(toEditablePlayer(player))}
                          className="mt-4 w-full rounded-lg bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-100 transition hover:bg-zinc-700"
                        >
                          Editar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-zinc-100">
                  Aliases relacionados
                </p>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {formatNumber(globalSearchResults.aliases.length)}
                </span>
              </div>

              {globalSearchResults.aliases.length === 0 ? (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
                  Nenhum alias relacionado encontrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {globalSearchResults.aliases.map((alias) => (
                    <div
                      key={alias.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-zinc-100">{alias.alias}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            normalizado: {alias.normalizedAlias}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-bold ${
                            alias.isInconsistent
                              ? "border-yellow-700 bg-yellow-950/30 text-yellow-200"
                              : "border-zinc-700 text-zinc-300"
                          }`}
                        >
                          {alias.isInconsistent ? "Alias inconsistente" : "Alias ativo"}
                        </span>
                      </div>

                      {alias.isOrphan || alias.isInconsistent ? (
                        <AliasReassignmentBlock
                          alias={alias}
                          playerList={playerList}
                          onReassign={async (targetPlayerId) => {
                            const target = playerList.find((p) => p.id === targetPlayerId);
                            if (!target) {
                              setFeedback("Selecione um jogador válido para reatribuir.");
                              return;
                            }

                            const confirmed = window.confirm(
                              `Reatribuir o alias ${alias.alias} para ${target.name} (${formatAuditSide(target.side)})?`
                            );
                            if (!confirmed) return;

                            try {
                              const result = await reassignAliasOwner({
                                aliasId: alias.id,
                                targetPlayerId,
                              });

                              if (result.status === "no-op") {
                                setFeedback(
                                  `Alias ${alias.alias} já está reatribuído para ${target.name}.`
                                );
                              } else {
                                setFeedback(
                                  `Alias ${alias.alias} reatribuído para ${target.name} com sucesso.`
                                );
                              }

                              await recarregarJogadores();
                              setFeedback((current) =>
                                current
                                  ? `${current} Rankings e Validador Oficial recalculados.`
                                  : "Alias reatribuído. Rankings e Validador Oficial recalculados."
                              );
                            } catch (error: unknown) {
                              const message = formatSupabaseError(
                                error,
                                "Erro ao reatribuir alias."
                              );
                              setFeedback(message);
                            }
                          }}
                        />
                      ) : alias.player ? (
                        <div className="mt-3">
                          <p className="text-xs text-zinc-500">Vinculado a</p>
                          <p className="mt-1 font-semibold text-zinc-200">
                            {alias.player.name} ({formatAuditSide(alias.player.side)}) · ID{" "}
                            {alias.player.id.slice(0, 6)}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              abrirEdicao({
                                id: alias.player!.id,
                                name: alias.player!.name,
                                side: alias.player!.side,
                              })
                            }
                            className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-100 transition hover:bg-zinc-800"
                          >
                            Editar jogador vinculado
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs text-yellow-200">
                          {alias.diagnostic} Aponta para um jogador não encontrado (ID{" "}
                          {alias.playerId.slice(0, 6)}). Use a busca global para confirmar se
                          existe outro cadastro com esse nome antes de corrigir manualmente.
                        </p>
                      )}


                      {alias.player && alias.diagnostic ? (
                        <div className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs text-yellow-200">
                          <p>{alias.diagnostic}</p>
                          {alias.relatedPlayers.length > 0 ? (
                            <p className="mt-1">
                              Também relacionado a:{" "}
                              {alias.relatedPlayers
                                .map(
                                  (player) =>
                                    `${player.name} (${formatAuditSide(player.side)})`
                                )
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </section>
      ) : null}

      {isCurationMode ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black">Centro de Curadoria</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Ferramentas administrativas para revisar divergencias sem alterar regras de negocio.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-800 bg-yellow-950/25 px-4 py-3 text-sm font-bold text-yellow-100">
              {formatNumber(curationPendingCount)} pendencia(s)
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {curationToolCards.map((tool) => (
              <a
                key={tool.href}
                href={tool.href}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-blue-700 hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-zinc-100">
                      {tool.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400">{tool.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-200">
                    {tool.counter}
                  </span>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                  {tool.counterLabel}
                </p>
                {"details" in tool && tool.details ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tool.details.map((detail) => (
                      <span
                        key={detail.label}
                        className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                      >
                        {detail.label}:{" "}
                        <span className="font-bold text-zinc-100">
                          {detail.value}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {isCurationMode ? (
        <section
          id={DATA_HEALTH_SECTION_ID}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
        >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Saúde dos Dados</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Auditoria somente leitura para medir a confiabilidade dos rankings antes de novas correções manuais.
            </p>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${getHealthClasses(
              audit.health.label
            )}`}
          >
            <p className="text-xs uppercase tracking-[0.25em] opacity-80">
              Saúde
            </p>
            <p className="mt-1 text-lg">{audit.health.label}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {auditCards.map((card) => (
            <AuditMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              description={card.description}
            />
          ))}
        </div>

        <div id={OFFICIAL_VALIDATOR_SECTION_ID}>
          <OfficialRankingValidatorBlock
            summary={officialRankingValidator}
            players={playerList}
            onPrepareGuidedCorrection={handlePrepareIdentityResolution}
            loadingKey={validatorActionLoadingKey}
          />
        </div>
        {identityResolutionHistory.length > 0 ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-sm font-black text-zinc-100">
              Histórico desta sessão
            </h3>
            <div className="mt-3 space-y-2">
              {identityResolutionHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
                >
                  <p className="font-bold text-zinc-100">
                    {item.rowPlayerName} → {item.targetPlayerName}
                  </p>
                  <p className="mt-1 text-zinc-500">
                    {item.createdAt} · {formatNumber(item.aliasesCreated)} alias(es) ·{" "}
                    {formatNumber(item.eventsMoved)} evento(s)
                  </p>
                  <p className="mt-1 text-zinc-500">
                    Rankings: {item.affectedRankings.join(", ")}
                  </p>
                  <p className="mt-1 text-zinc-500">
                    Detalhe: {formatNumber(item.aliasesAlreadyPresent)} alias(es)
                    ja existentes, {formatNumber(item.eventsSkipped)} evento(s)
                    ignorado(s). Diferenca:{" "}
                    {formatSignedNumber(item.differenceBefore)} -&gt;{" "}
                    {item.differenceAfter === null
                      ? "linha resolvida"
                      : formatSignedNumber(item.differenceAfter)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div id={SAFE_RECONCILIATION_SECTION_ID}>
          <ReconciliationSummaryBlock summary={reconciliation} />
        </div>
        <div id={IMPORT_COVERAGE_SECTION_ID}>
          <ImportCoverageSummaryBlock summary={importCoverage} />
        </div>
        <div id={HISTORICAL_EQUIVALENT_REVIEW_SECTION_ID}>
          <HistoricalEquivalentReviewBlock summary={historicalEquivalentReview} />
        </div>

        {!audit.hasRelevantIssues ? (
          <p className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/25 px-4 py-3 text-sm font-semibold text-emerald-200">
            Nenhuma inconsistência relevante encontrada.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <details
              id={EVENT_INVESTIGATOR_SECTION_ID}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
              open={audit.eventsWithoutPlayerId > 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-100">
                <span>Eventos sem player_id</span>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {formatNumber(audit.eventsWithoutPlayerId)}
                </span>
              </summary>

              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  Amostra dos nomes brutos mais frequentes, agrupados por nome normalizado.
                </p>

                {audit.unlinkedEventNames.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nenhum evento sem vínculo.</p>
                ) : (
                  audit.unlinkedEventNames.map((group) => (
                    <div
                      key={group.normalizedName}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-zinc-100">{group.displayName}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            normalizado: {group.normalizedName}
                          </p>
                        </div>
                        <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-bold text-zinc-200">
                          {formatNumber(group.count)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.breakdown.map((item) => (
                          <span
                            key={`${group.normalizedName}-${item.eventType}-${item.side}`}
                            className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                          >
                            {formatEventType(item.eventType)} · {formatAuditSide(item.side)} ·{" "}
                            {formatNumber(item.count)}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 space-y-3">
                        {group.sideGroups.map((sideGroup) => {
                          const key = `${group.normalizedName}:${sideGroup.side}`;

                          return (
                            <div
                              key={key}
                              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm font-bold text-zinc-100">
                                    {formatAuditSide(sideGroup.side)} ·{" "}
                                    {formatNumber(sideGroup.count)} evento(s)
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {sideGroup.breakdown.map((item) => (
                                      <span
                                        key={`${key}-${item.eventType}`}
                                        className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                                      >
                                        {formatEventType(item.eventType)} ·{" "}
                                        {formatNumber(item.count)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {sideGroup.candidates.length > 0 ? (
                                <p className="mt-3 text-xs text-zinc-500">
                                  Candidatos:{" "}
                                  {sideGroup.candidates
                                    .map(
                                      (candidate) =>
                                        `${candidate.name} (${formatAuditSide(candidate.side)}: ${candidate.reason})`
                                    )
                                    .join(", ")}
                                </p>
                              ) : (
                                <p className="mt-3 text-xs text-zinc-500">
                                  Nenhum candidato compatível encontrado nesta amostra.
                                </p>
                              )}

                              {sideGroup.candidates.length === 1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleLinkUnlinkedAuditGroup(group, sideGroup)
                                  }
                                  disabled={validatorActionLoadingKey !== null}
                                  className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-3 text-xs font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
                                >
                                  {validatorActionLoadingKey ===
                                  `audit-events:${group.normalizedName}:${sideGroup.side}`
                                    ? "Reatribuindo..."
                                    : "Reatribuir eventos após confirmação"}
                                </button>
                              ) : (
                                <p className="mt-3 rounded-lg border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs font-semibold text-yellow-100">
                                  Resolva manualmente: a reatribuição exige exatamente um destino confirmado.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>

            <details
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
              open={audit.aliasConflictsCount > 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-100">
                <span>Aliases conflitantes</span>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {formatNumber(audit.aliasConflictsCount)}
                </span>
              </summary>

              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  Use a busca global para localizar ou corrigir o jogador. Depois use Editar ou Mesclar jogadores para resolver.{" "}
                  <a
                    href={`#${GLOBAL_SEARCH_SECTION_ID}`}
                    className="font-bold text-blue-300 hover:text-blue-200"
                  >
                    Ir para busca global
                  </a>
                </p>

                {audit.aliasConflicts.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nenhum conflito de alias.</p>
                ) : (
                  audit.aliasConflicts.map((conflict) => (
                    <div
                      key={conflict.normalizedAlias}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm"
                    >
                      <p className="font-bold text-zinc-100">
                        {conflict.aliasExamples.join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        normalizado: {conflict.normalizedAlias}
                      </p>
                      <p className="mt-2 text-xs text-yellow-200">{conflict.reason}</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        Vinculado a:{" "}
                        {conflict.owners
                          .map((player) =>
                            player.side === "-"
                              ? `${player.name} · ID ${player.id.slice(0, 6)}`
                              : `${player.name} (${formatAuditSide(player.side)})`
                          )
                          .join(", ")}
                      </p>
                      {conflict.matchingPlayers.length > 0 ? (
                        <p className="mt-1 text-xs text-zinc-400">
                          Também parece nome de:{" "}
                          {conflict.matchingPlayers
                            .map(
                              (player) => `${player.name} (${formatAuditSide(player.side)})`
                            )
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </details>

            <details
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
              open={audit.possibleDuplicateGroupsCount > 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-100">
                <span>Duplicados suspeitos</span>
                <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                  {formatNumber(audit.possibleDuplicateGroupsCount)}
                </span>
              </summary>

              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  Use Editar ou Mesclar jogadores para resolver.{" "}
                  <a
                    href={`#${CURATION_SECTION_ID}`}
                    className="font-bold text-blue-300 hover:text-blue-200"
                  >
                    Ir para curadoria
                  </a>
                </p>

                {audit.possibleDuplicateGroups.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nenhum duplicado suspeito.</p>
                ) : (
                  audit.possibleDuplicateGroups.map((group) => (
                    <div
                      key={`${group.normalizedName}-${group.players.map((player) => player.id).join("-")}`}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm"
                    >
                      <p className="font-bold text-zinc-100">
                        {group.players
                          .map((player) => `${player.name} (${formatAuditSide(player.side)})`)
                          .join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        normalizado: {group.normalizedName}
                      </p>
                      <p className="mt-2 text-xs text-yellow-200">{group.reason}</p>
                      {group.aliases.length > 0 ? (
                        <p className="mt-2 text-xs text-zinc-400">
                          Alias relacionado: {group.aliases.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>
        )}
        </section>
      ) : null}

      <section
        id={CURATION_SECTION_ID}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
      >
        <h2 className="text-xl font-black">
          {isCurationMode ? "Curadoria de Identidades" : "Lista de jogadores"}
        </h2>
        {!isCurationMode ? (
          <p className="mt-2 text-sm text-zinc-400">
            Gerencie jogadores, edite dados basicos e mantenha aliases consolidados.
          </p>
        ) : null}
        <p className={`mt-2 text-sm text-zinc-400 ${isCurationMode ? "" : "hidden"}`}>
          O sistema sugere suspeitas (com base em nomes e aliases). Nenhuma mesclagem é automática — a decisão final é sua.
        </p>

        <div
          className={`mt-4 grid gap-2 sm:grid-cols-3 ${
            isCurationMode ? "" : "hidden"
          }`}
        >
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
              Possíveis duplicados
            </p>
            <p className="mt-1 text-2xl font-black">{counts.possibleDuplicates}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
              Jogadores com vínculo pendente
            </p>
            <p className="mt-1 text-2xl font-black">
              {loadingPending ? "-" : counts.pending}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
              Consolidados
            </p>
            <p className="mt-1 text-2xl font-black">{counts.consolidated}</p>
          </div>
        </div>

        <div
          className={`mt-5 flex items-center justify-between gap-3 ${
            isCurationMode ? "" : "hidden"
          }`}
        >
          <p className="text-sm font-bold text-zinc-200">Vínculos pendentes</p>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={showPendingOnly}
              onChange={(e) => setShowPendingOnly(e.target.checked)}
              className="h-4 w-4 accent-blue-500"
              disabled={loadingPending}
            />
            Mostrar jogadores com vínculo pendente
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isCurationMode && suspects.length === 0 && pendingPlayers.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
              Nenhuma pendência de curadoria encontrada.
            </div>
          ) : null}

          {isCurationMode
            ? suspects.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))
            : filtered.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}

          {isCurationMode && showPendingOnly
            ? pendingPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} dim />
              ))
            : null}

          {!isCurationMode && filtered.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
              Nenhum jogador encontrado.
            </div>
          ) : null}
        </div>
      </section>

      {!isCurationMode ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <h2 className="text-xl font-black">Mesclagem manual</h2>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm text-zinc-300">
            Origem
            <select
              value={mergeSourceId}
              onChange={(event) => setMergeSourceId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3"
            >
              {playerList.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} - {getTeamTheme(player.side).short}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-zinc-300">
            Destino
            <select
              value={mergeTargetId}
              onChange={(event) => setMergeTargetId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3"
            >
              {playerList.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} - {getTeamTheme(player.side).short}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleMergePlayers}
            disabled={
              mergeLoading ||
              !mergeSourceId ||
              !mergeTargetId ||
              mergeSourceId === mergeTargetId
            }
            className="self-end rounded-lg bg-zinc-800 px-5 py-3 font-bold text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {mergeLoading ? "Mesclando..." : "Mesclar"}
          </button>
        </div>
        </section>
      ) : null}

      {feedback ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {feedback}
        </p>
      ) : null}

      {identityResolutionPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">Resolver divergência</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {identityResolutionPreview.rowPlayerName}
                </p>
              </div>
              <span className="rounded-full border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-100">
                Pré-visualização
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Jogador atual
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-100">
                  {identityResolutionPreview.sourcePlayers.length > 0
                    ? identityResolutionPreview.sourcePlayers.join(", ")
                    : "Sem eventos a mover"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Destino
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-100">
                  {identityResolutionPreview.targetPlayerName} (
                  {formatAuditSide(identityResolutionPreview.targetPlayerSide)})
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Diferença
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-100">
                  {formatNumber(identityResolutionPreview.historicalGoals)} vs{" "}
                  {formatNumber(identityResolutionPreview.siteGoals)} (
                  {formatSignedNumber(identityResolutionPreview.difference)})
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Partidas envolvidas
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-100">
                  {identityResolutionPreview.involvedMatches.length > 0
                    ? identityResolutionPreview.involvedMatches
                        .map(formatMatchNumber)
                        .join(", ")
                    : "Sem eventos a mover"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Conferidas
                </p>
                <p className="mt-2 text-sm font-bold text-zinc-100">
                  {formatNumber(identityResolutionPreview.verifiedEventsCount)} evento(s)
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Impacto esperado
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">
                  {identityResolutionPreview.expectedImpact}
                </p>
              </div>
            </div>

            {identityResolutionPreview.manualReviewReason ? (
              <p className="mt-4 rounded-xl border border-yellow-800 bg-yellow-950/25 px-4 py-3 text-sm font-semibold text-yellow-100">
                {identityResolutionPreview.manualReviewReason}
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-sm font-black text-zinc-100">
                  Alias que será criado
                </p>
                {identityResolutionPreview.aliasesToCreate.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">Nenhum alias novo.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {identityResolutionPreview.aliasesToCreate.map((alias) => (
                      <span
                        key={alias.normalizedAlias}
                        className="rounded-full border border-cyan-700 bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-100"
                      >
                        {alias.alias}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-sm font-black text-zinc-100">
                  Rankings afetados
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {identityResolutionPreview.affectedRankings.map((ranking) => (
                    <span
                      key={ranking}
                      className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                    >
                      {ranking}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-sm font-black text-zinc-100">
                Eventos que serão movidos
              </p>
              {identityResolutionPreview.eventsToMove.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhum evento será movido.</p>
              ) : (
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {identityResolutionPreview.eventsToMove.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-zinc-100">
                            {event.playerNameRaw}
                          </p>
                          <p className="mt-1 text-zinc-500">
                            {formatMatchNumber(event.matchNumber)} · Seq{" "}
                            {event.seq ?? "-"} · {formatEventType(event.eventType)}
                          </p>
                          <p className="mt-1 break-all text-zinc-500">
                            event_id: {event.id} - player_id esperado:{" "}
                            {event.expectedPlayerId ?? "sem player_id"}
                          </p>
                          <p className="mt-1 text-zinc-500">
                            {event.matchVerified
                              ? "Partida conferida"
                              : "Nao conferida"}
                          </p>
                        </div>
                        <p className="text-zinc-500">
                          {event.sourcePlayerLabel} → {event.targetPlayerLabel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {identityResolutionPreview.reviewOnlyEvents.length > 0 ? (
              <div className="mt-4 rounded-xl border border-yellow-800 bg-yellow-950/15 p-3">
                <p className="text-sm font-black text-yellow-100">
                  Eventos vinculados para revisão manual
                </p>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {identityResolutionPreview.reviewOnlyEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-yellow-900/70 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold text-zinc-100">
                            player_name_raw: {event.playerNameRaw}
                          </p>
                          <p className="mt-1 text-zinc-500">
                            event_type: {event.eventType} · partida:{" "}
                            {formatMatchNumber(event.matchNumber)}
                          </p>
                          <p className="mt-1 text-zinc-500">
                            source_cell: {formatSourceCell(event.sourceCell)} · side:{" "}
                            {formatAuditSide(event.side)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 font-bold ${
                            event.matchVerified
                              ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                              : "border-yellow-700 bg-yellow-950/30 text-yellow-200"
                          }`}
                        >
                          {event.matchVerified ? "Partida conferida" : "Não conferida"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {identityResolutionPreview.hasExecutableAction ? (
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-yellow-800 bg-yellow-950/25 p-3 text-sm text-yellow-100">
                <input
                  type="checkbox"
                  checked={identityResolutionConfirmed}
                  onChange={(event) =>
                    setIdentityResolutionConfirmed(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-yellow-500"
                />
                Confirmo explicitamente esta resolução manual.
              </label>
            ) : (
              <p className="mt-5 rounded-xl border border-yellow-800 bg-yellow-950/25 px-4 py-3 text-sm font-bold text-yellow-100">
                Revisão manual necessária.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setIdentityResolutionPreview(null);
                  setIdentityResolutionConfirmed(false);
                }}
                disabled={validatorActionLoadingKey !== null}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={applyIdentityResolution}
                disabled={
                  !identityResolutionPreview.hasExecutableAction ||
                  !identityResolutionConfirmed ||
                  validatorActionLoadingKey !== null ||
                  (identityResolutionPreview.aliasesToCreate.length === 0 &&
                    identityResolutionPreview.eventsToMove.length === 0)
                }
                className="flex-1 rounded-lg bg-cyan-700 px-4 py-3 font-bold text-white transition hover:bg-cyan-600 disabled:opacity-50"
              >
                {validatorActionLoadingKey ===
                `resolve:${identityResolutionPreview.rowKey}`
                  ? "Aplicando..."
                  : identityResolutionPreview.hasExecutableAction
                    ? "Aplicar"
                    : "Revisão manual necessária"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletionPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <h2 className="text-2xl font-black">Excluir jogador</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-zinc-500">Nome:</p>
                <p className="mt-1 text-lg font-bold">{deletionPreview.player.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-zinc-500">Eventos:</p>
                  <p className="mt-1 text-2xl font-black">{deletionPreview.eventsCount}</p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-zinc-500">Aliases:</p>
                  <p className="mt-1 text-2xl font-black">{deletionPreview.aliasesCount}</p>
                </div>
              </div>

              {deletionPreview.eventsCount > 0 ? (
                <p className="rounded-xl border border-yellow-800 bg-yellow-950/30 p-3 text-yellow-200">
                  Este jogador possui eventos registrados e não pode ser excluído.
                  Utilize a opção Mesclar jogadores.
                </p>
              ) : (
                <>
                  <p className="rounded-xl border border-red-800 bg-red-950/30 p-3 text-red-200">
                    ⚠️ Esta ação é permanente.
                  </p>

                  <label className="block text-zinc-300">
                    Para confirmar digite exatamente o nome do jogador.
                    <input
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white"
                      autoFocus
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={cancelarExclusao}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={
                  deletionPreview.eventsCount > 0 ||
                  deleteConfirmation !== deletionPreview.player.name ||
                  deleteLoadingId === deletionPreview.player.id
                }
                className="flex-1 rounded-lg bg-red-700 px-4 py-3 font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoadingId === deletionPreview.player.id ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editPlayerId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-white shadow-2xl">
            <h2 className="text-2xl font-black">Editar jogador</h2>

            <p className="mt-2 text-sm text-zinc-400">
              Esta edição altera apenas <span className="font-semibold text-zinc-200">nome</span> e{" "}
              <span className="font-semibold text-zinc-200">lado</span>. Eventos e aliases permanecem ligados ao mesmo ID.
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <label className="block text-zinc-300">
                Nome
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white"
                  autoFocus
                />
              </label>

              <label className="block text-zinc-300">
                Lado
                <select
                  value={editSide}
                  onChange={(event) => setEditSide(event.target.value as "PEDRO" | "NETU")}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-white"
                >
                  <option value="PEDRO">Pedro (São Paulo)</option>
                  <option value="NETU">Netu (Palmeiras)</option>
                </select>
              </label>

              {editError ? (
                <p className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {editError}
                </p>
              ) : null}

              <p className="rounded-xl border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-200">
                Dica: se já existir outro jogador com o mesmo nome, mantenha o lado correto para reduzir confusões.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={fecharModalEdicao}
                disabled={editLoading}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-bold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvarEdicao}
                disabled={editLoading}
                className="flex-1 rounded-lg bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
              >
                {editLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
