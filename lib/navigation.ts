import {
  canSeeAdministrativeActions,
  type UserProfile,
} from "@/lib/auth/permissions";

export type NavigationPlacement = "sidebar" | "bottomNav" | "dashboard";

export type AppNavItem = {
  label: string;
  href: string;
  icon: string;
  requiresAuth: boolean;
  placements: NavigationPlacement[];
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: "🏠",
    requiresAuth: false,
    placements: ["sidebar", "bottomNav"],
  },
  {
    label: "Nova Partida",
    href: "/partidas/nova",
    icon: "⚽",
    requiresAuth: true,
    placements: ["sidebar", "bottomNav", "dashboard"],
  },
  {
    label: "Histórico",
    href: "/historico",
    icon: "📖",
    requiresAuth: false,
    placements: ["sidebar", "bottomNav", "dashboard"],
  },
  {
    label: "Rankings",
    href: "/rankings",
    icon: "🏆",
    requiresAuth: false,
    placements: ["sidebar", "bottomNav", "dashboard"],
  },
  {
    label: "Disciplina",
    href: "/disciplina",
    icon: "🟨",
    requiresAuth: false,
    placements: ["sidebar", "bottomNav", "dashboard"],
  },
  {
    label: "Jogadores",
    href: "/jogadores",
    icon: "👥",
    requiresAuth: true,
    placements: ["sidebar", "dashboard"],
  },
  {
    label: "Importar Histórico",
    href: "/importar-historico",
    icon: "📥",
    requiresAuth: true,
    placements: ["sidebar"],
  },
  {
    label: "Projeto",
    href: "/projeto",
    icon: "🧭",
    requiresAuth: false,
    placements: ["sidebar"],
  },
];

export function getVisibleNavItems(
  profile: UserProfile,
  placement: NavigationPlacement
) {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.placements.includes(placement)) return false;
    if (!item.requiresAuth) return true;

    return canSeeAdministrativeActions(profile);
  });
}
