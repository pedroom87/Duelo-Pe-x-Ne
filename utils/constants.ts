export const PROJECT_NAME = "Duelo Pe X Ne";

export const SIDES = {
  PEDRO: {
    owner: "Pedro",
    club: "São Paulo",
    short: "SPFC",
    color: "red",
  },
  NETU: {
    owner: "Netu",
    club: "Palmeiras",
    short: "SEP",
    color: "green",
  },
} as const;

export type TeamSide = keyof typeof SIDES;

export const TEAM_ORDER = ["PEDRO", "NETU"] as const satisfies readonly TeamSide[];

type TeamThemeDefinition = {
  side: TeamSide;
  owner: string;
  club: string;
  short: string;
  identity: string;
  colors: {
    primary: string;
    secondary: string;
    contrast: string;
  };
  mascot: {
    src: string;
    objectPosition: string;
    transform: string;
  };
  classes: {
    text: string;
    mutedText: string;
    border: string;
    panel: string;
    panelStrong: string;
    solid: string;
    solidHover: string;
    ring: string;
  };
};

export const TEAM_THEMES = {
  PEDRO: {
    side: "PEDRO",
    owner: SIDES.PEDRO.owner,
    club: SIDES.PEDRO.club,
    short: SIDES.PEDRO.short,
    identity: "Santo Tricolor",
    colors: {
      primary: "#dc2626",
      secondary: "#111827",
      contrast: "#ffffff",
    },
    mascot: {
      src: "/mascotes/santo-tricolor.png",
      objectPosition: "50% 10%",
      transform: "scale(2.15) translateY(21%)",
    },
    classes: {
      text: "text-red-300",
      mutedText: "text-red-200",
      border: "border-red-800/60",
      panel: "bg-red-950/25",
      panelStrong: "bg-red-900/45",
      solid: "bg-red-700 text-white",
      solidHover: "hover:bg-red-600",
      ring: "ring-red-500/35",
    },
  },
  NETU: {
    side: "NETU",
    owner: SIDES.NETU.owner,
    club: SIDES.NETU.club,
    short: SIDES.NETU.short,
    identity: "Porco Verdao",
    colors: {
      primary: "#16a34a",
      secondary: "#f8fafc",
      contrast: "#ffffff",
    },
    mascot: {
      src: "/mascotes/porco-verdao.png",
      objectPosition: "50% 8%",
      transform: "scale(2.2) translateY(22%)",
    },
    classes: {
      text: "text-green-300",
      mutedText: "text-green-200",
      border: "border-green-800/60",
      panel: "bg-green-950/25",
      panelStrong: "bg-green-900/45",
      solid: "bg-green-700 text-white",
      solidHover: "hover:bg-green-600",
      ring: "ring-green-500/35",
    },
  },
} as const satisfies Record<TeamSide, TeamThemeDefinition>;

export type TeamTheme = (typeof TEAM_THEMES)[TeamSide];

export function getTeamSide(side: string | null | undefined): TeamSide {
  return side === "NETU" ? "NETU" : "PEDRO";
}

export function getTeamTheme(side: string | null | undefined): TeamTheme {
  return TEAM_THEMES[getTeamSide(side)];
}

export function getWinnerSide(winner: string | null | undefined): TeamSide | null {
  if (winner === "PEDRO" || winner === "Pedro") return "PEDRO";
  if (winner === "NETU" || winner === "Netu") return "NETU";

  return null;
}

export function getWinnerLabel(winner: string | null | undefined) {
  const side = getWinnerSide(winner);

  return side ? TEAM_THEMES[side].owner : "Empate";
}
