"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deletePlayerSafely,
  getPlayerGlobalSearchIndex,
  getPlayersWithAliases,
  getPlayerDeletionPreview,
  getRankingsDataHealthAudit,
  updatePlayerBasic,
  type ExistingPlayerDeletionPreview,
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
import { normalizeText } from "@/lib/playerIdentity";
import { formatSupabaseError } from "@/lib/supabaseErrors";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { getTeamSide, getTeamTheme } from "@/utils/constants";

interface Props {
  players: PlayerWithAliases[];
  rankingsAudit: RankingsDataHealthAudit;
  globalSearchIndex: PlayerGlobalSearchIndex;
}

type UnlinkedAuditGroup = RankingsDataHealthAudit["unlinkedEventNames"][number];
type GlobalSearchAlias = PlayerGlobalSearchIndex["aliases"][number];
type ReconciliationSummary = RankingsDataHealthAudit["reconciliationSummary"];
type ReconciliationSample = ReconciliationSummary["samples"]["safe"][number];
type ReconciliationCandidate = ReconciliationSample["candidates"][number];
type ImportCoverageSummary = RankingsDataHealthAudit["importCoverageSummary"];
type OfficialRankingValidatorSummary =
  RankingsDataHealthAudit["officialRankingValidator"];
type OfficialRankingValidatorRow = OfficialRankingValidatorSummary["rows"][number];
type ImportCoverageEventSample =
  ImportCoverageSummary["samples"]["missingEvents"][number];
type ImportCoveragePlayerDifference =
  ImportCoverageSummary["samples"]["playerDifferences"][number];
type ImportCoverageMatchDifference =
  ImportCoverageSummary["samples"]["matchDifferences"][number];

const GLOBAL_SEARCH_SECTION_ID = "busca-global-jogadores";
const CURATION_SECTION_ID = "curadoria-jogadores";

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
          Vinculação em lote será liberada após validação desta auditoria.
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

function getOfficialValidatorStatusClasses(
  status: OfficialRankingValidatorRow["status"]
) {
  return status === "OK"
    ? "border-emerald-700 bg-emerald-950/35 text-emerald-200"
    : "border-red-700 bg-red-950/35 text-red-200";
}

function getOfficialValidatorDifferenceClasses(difference: number) {
  if (difference === 0) return "text-emerald-200";
  return "text-red-200";
}

function OfficialRankingValidatorBlock({
  summary,
}: {
  summary: OfficialRankingValidatorSummary;
}) {
  const cards = [
    {
      label: "Gols no histórico",
      value: formatNumber(summary.totalHistoricalGoals),
    },
    {
      label: "Gols no site/banco",
      value: formatNumber(summary.totalSiteGoals),
    },
    {
      label: "Jogadores comparados",
      value: formatNumber(summary.comparedPlayersCount),
    },
    {
      label: "Divergentes",
      value: formatNumber(summary.divergentPlayersCount),
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
            Compara gols por jogador entre a planilha histórica extraída e o ranking atual do site.
          </p>
        </div>

        <p className="rounded-lg border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-100">
          Correções serão liberadas após validação desta auditoria.
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

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-[0.2em] text-zinc-500">
            <tr>
              <th className="px-3 py-3">Jogador</th>
              <th className="px-3 py-3 text-right">Planilha/histórico</th>
              <th className="px-3 py-3 text-right">Site/banco</th>
              <th className="px-3 py-3 text-right">Diferença</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr
                key={row.key}
                className={`border-t border-zinc-800 ${
                  row.isFeatured ? "bg-cyan-950/25" : "bg-zinc-950/50"
                }`}
              >
                <td className="px-3 py-3 align-top">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words font-bold text-zinc-100">
                        {row.playerName}
                      </p>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                        {formatAuditSide(row.side)}
                      </span>
                      {row.isFeatured ? (
                        <span className="rounded-full border border-cyan-700 bg-cyan-950/50 px-2 py-1 text-xs font-bold text-cyan-100">
                          Destaque
                        </span>
                      ) : null}
                    </div>

                    {row.rawHistoricalNames.length > 0 ? (
                      <p className="mt-1 break-words text-xs text-zinc-500">
                        Histórico: {row.rawHistoricalNames.join(", ")}
                      </p>
                    ) : null}

                    {row.matchedPlayers.length > 0 ? (
                      <p className="mt-1 break-words text-xs text-zinc-500">
                        Cadastro:{" "}
                        {row.matchedPlayers
                          .map(
                            (player) =>
                              `${player.name} (${formatAuditSide(player.side)})`
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 text-right align-top font-bold text-zinc-100">
                  {formatNumber(row.historicalGoals)}
                </td>
                <td className="px-3 py-3 text-right align-top font-bold text-zinc-100">
                  {formatNumber(row.siteGoals)}
                </td>
                <td
                  className={`px-3 py-3 text-right align-top font-black ${getOfficialValidatorDifferenceClasses(
                    row.difference
                  )}`}
                >
                  {formatSignedNumber(row.difference)}
                </td>
                <td className="px-3 py-3 align-top">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${getOfficialValidatorStatusClasses(
                      row.status
                    )}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
}: Props) {
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

      const updatedGlobalIndex = await getPlayerGlobalSearchIndex();
      setGlobalIndex(updatedGlobalIndex);
      setFeedback("Alias salvo.");
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
      const updatedAliases = (await getAliases(playerId)) as PlayerAlias[];
      setAliasesByPlayerId((current) => ({
        ...current,
        [playerId]: sortAliases(updatedAliases),
      }));

      const updatedGlobalIndex = await getPlayerGlobalSearchIndex();
      setGlobalIndex(updatedGlobalIndex);

      setGlobalAliasDrafts((current) => ({ ...current, [playerId]: "" }));
      setFeedback("Alias salvo na busca global.");
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

        <div className="mt-4 grid grid-cols-2 gap-2">
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

        <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
          {status === "VINCULO_PENDENTE"
            ? "Vínculo pendente"
            : "Sem evento provável encontrado"}
        </p>

        {linkedEventsCount === 0 ? (
          <p className="mt-3 rounded-xl border border-yellow-800 bg-yellow-950/25 px-3 py-2 text-xs font-semibold text-yellow-200">
            Eventos vinculados zerados indicam vínculo pendente no histórico importado.
          </p>
        ) : null}

        {probableEventsCount > 0 ? (
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
                href="#auditoria-acionavel"
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

        <button
          type="button"
          onClick={() => abrirExclusao(player.id)}
          disabled={deleteLoadingId === player.id}
          className="mt-4 w-full rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-950/50 disabled:opacity-50"
        >
          {deleteLoadingId === player.id ? "Verificando..." : "Excluir jogador"}
        </button>
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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
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

        <OfficialRankingValidatorBlock summary={officialRankingValidator} />
        <ReconciliationSummaryBlock summary={reconciliation} />
        <ImportCoverageSummaryBlock summary={importCoverage} />

        {!audit.hasRelevantIssues ? (
          <p className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/25 px-4 py-3 text-sm font-semibold text-emerald-200">
            Nenhuma inconsistência relevante encontrada.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <details
              id="auditoria-acionavel"
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

                              <p className="mt-3 rounded-lg border border-blue-800 bg-blue-950/25 px-3 py-2 text-xs font-semibold text-blue-100">
                                Vinculação em lote será liberada após validação desta auditoria.
                              </p>
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

      <section
        id={CURATION_SECTION_ID}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
      >
        <h2 className="text-xl font-black">Curadoria assistida de jogadores</h2>
        <p className="mt-2 text-sm text-zinc-400">
          O sistema sugere suspeitas (com base em nomes e aliases). Nenhuma mesclagem é automática — a decisão final é sua.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
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

        <div className="mt-5 flex items-center justify-between gap-3">
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
          {suspects.length === 0 && pendingPlayers.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-300">
              Nenhuma pendência de curadoria encontrada.
            </div>
          ) : null}

          {suspects.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}

          {showPendingOnly
            ? pendingPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} dim />
              ))
            : null}
        </div>
      </section>

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

      {feedback ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {feedback}
        </p>
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
