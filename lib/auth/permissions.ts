export const USER_PROFILES = {
  VISITANTE: "VISITANTE",
  OPERADOR: "OPERADOR",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type UserProfile = keyof typeof USER_PROFILES;

export const USER_PROFILE_LABELS: Record<UserProfile, string> = {
  VISITANTE: "Visitante",
  OPERADOR: "Operador",
  ADMINISTRADOR: "Administrador",
};

const authenticatedExactRoutes = new Set([
  "/partidas/nova",
  "/nova-partida",
  "/jogadores",
  "/importar-historico",
  "/curadoria",
  "/configuracoes",
  "/settings",
]);

const authenticatedRoutePrefixes = [
  "/curadoria/",
  "/configuracoes/",
  "/settings/",
];

function normalizePathname(value: string) {
  const [pathname] = value.split(/[?#]/);
  const normalized = pathname || "/";

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function getSafeNextPath(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/login")) return fallback;

  return value;
}

export function getProfileForUserEmail(email: string | null | undefined): UserProfile {
  return email ? USER_PROFILES.OPERADOR : USER_PROFILES.VISITANTE;
}

export function isAuthenticatedProfile(profile: UserProfile) {
  return profile !== USER_PROFILES.VISITANTE;
}

export function isAdministrativeRoute(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  if (authenticatedExactRoutes.has(normalizedPathname)) {
    return true;
  }

  if (authenticatedRoutePrefixes.some((prefix) => normalizedPathname.startsWith(prefix))) {
    return true;
  }

  return /^\/historico\/[^/]+\/editar(?:\/.*)?$/.test(normalizedPathname);
}

export function canAccessRoute(profile: UserProfile, pathname: string) {
  if (!isAdministrativeRoute(pathname)) return true;

  return isAuthenticatedProfile(profile);
}

export function canSeeAdministrativeActions(profile: UserProfile) {
  return isAuthenticatedProfile(profile);
}
