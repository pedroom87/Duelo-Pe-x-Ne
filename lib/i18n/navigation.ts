import type { MessageKey, TranslationFunction } from "./messages";

const NAV_LABEL_KEYS_BY_HREF: Record<string, MessageKey> = {
  "/": "nav.dashboard",
  "/partidas/nova": "nav.newMatch",
  "/historico": "nav.history",
  "/rankings": "nav.rankings",
  "/disciplina": "nav.discipline",
  "/jogadores": "nav.players",
  "/curadoria": "nav.curation",
  "/importar-historico": "nav.importHistory",
  "/projeto": "nav.project",
};

export function getNavItemLabel(
  href: string,
  fallback: string,
  t: TranslationFunction
) {
  const key = NAV_LABEL_KEYS_BY_HREF[href];

  return key ? t(key) : fallback;
}
