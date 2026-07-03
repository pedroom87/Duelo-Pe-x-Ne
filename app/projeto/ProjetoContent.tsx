"use client";

import { LanguageSelector, useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { VersionInfo } from "@/lib/version";

type ChangelogEntry = {
  version: string;
  summaryKey: MessageKey;
};

type RoadmapGroup = {
  titleKey: MessageKey;
  itemKeys: MessageKey[];
  borderClass: string;
  dotClass: string;
};

const changelogEntries: ChangelogEntry[] = [
  { version: "v0.7.3", summaryKey: "project.changelog.v073" },
  { version: "v0.7.2", summaryKey: "project.changelog.v072" },
  { version: "v0.7.0", summaryKey: "project.changelog.v070" },
  { version: "v0.6.4", summaryKey: "project.changelog.v064" },
  { version: "v0.6.1", summaryKey: "project.changelog.v061" },
];

const roadmapGroups: RoadmapGroup[] = [
  {
    titleKey: "project.inProgressShortTerm",
    borderClass: "border-blue-500/40",
    dotClass: "bg-blue-500",
    itemKeys: [
      "project.roadmap.i18n",
      "project.roadmap.sportIdentity",
      "project.roadmap.userProfile",
    ],
  },
  {
    titleKey: "project.nextSprints",
    borderClass: "border-amber-500/40",
    dotClass: "bg-amber-500",
    itemKeys: [
      "project.roadmap.sportSelection",
      "project.roadmap.goalAssist",
      "project.roadmap.homeAndStadium",
      "project.roadmap.smartAthletes",
    ],
  },
  {
    titleKey: "project.futureVision",
    borderClass: "border-emerald-500/40",
    dotClass: "bg-emerald-500",
    itemKeys: [
      "project.roadmap.multiDuels",
      "project.roadmap.rivalryPlatform",
      "project.roadmap.pwa",
      "project.roadmap.hallOfFame",
      "project.roadmap.almanac",
    ],
  },
];

function formatReleaseDate(value: string) {
  const [yyyy, mm, dd] = value.split("-");

  return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : value;
}

type ProjetoContentProps = {
  versionInfo: VersionInfo;
};

export function ProjetoContent({ versionInfo }: ProjetoContentProps) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-zinc-800 pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">
                {t("common.product")}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Duel Legacy
              </h1>
              <p className="mt-3 text-lg font-semibold text-zinc-300">
                Every Rivalry Deserves a Legacy.
              </p>
              <p className="mt-5 inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-200">
                {t("common.currentChampionship")}: Duelo Pe × Ne
              </p>
            </div>

            <LanguageSelector className="sm:justify-end" />
          </div>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">
              {t("common.currentVersion")}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {t("common.version")}
                </p>
                <p className="mt-2 font-mono text-2xl font-black">
                  v{versionInfo.number}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {t("common.codename")}
                </p>
                <p className="mt-2 text-2xl font-black">
                  {versionInfo.codename}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  {t("common.date")}
                </p>
                <p className="mt-2 font-mono text-2xl font-black">
                  {formatReleaseDate(versionInfo.releasedAt)}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <h2 className="text-lg font-black">{t("common.highlights")}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {versionInfo.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-300"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="rounded-3xl border border-red-900/50 bg-red-950/20 p-5 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-200">
              {t("common.mission")}
            </p>
            <h2 className="mt-4 text-2xl font-black">
              {t("project.missionHeadline")}
            </h2>
            <p className="mt-4 text-zinc-300">{t("project.missionBody")}</p>
          </article>
        </section>

        <section className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">
            {t("project.history")}
          </p>
          <h2 className="mt-2 text-3xl font-black">{t("common.changelog")}</h2>

          <div className="mt-5 grid gap-3">
            {changelogEntries.map((entry) => (
              <div
                key={entry.version}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-mono text-sm font-black text-zinc-100">
                  {entry.version}
                </p>
                <p className="text-sm font-semibold text-zinc-300">
                  {t(entry.summaryKey)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">
            {t("project.evolution")}
          </p>
          <h2 className="mt-2 text-3xl font-black">{t("common.roadmap")}</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {roadmapGroups.map((group) => (
              <article
                key={group.titleKey}
                className={`rounded-3xl border bg-zinc-900 p-5 sm:p-6 ${group.borderClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${group.dotClass}`} />
                  <h3 className="text-xl font-black">{t(group.titleKey)}</h3>
                </div>

                <ul className="mt-5 space-y-3 text-sm font-semibold text-zinc-300">
                  {group.itemKeys.map((itemKey) => (
                    <li key={itemKey} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      <span>{t(itemKey)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
