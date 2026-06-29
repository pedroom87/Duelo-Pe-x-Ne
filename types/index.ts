export type Side = "PEDRO" | "NETU";

export type EventType =
  | "GOL"
  | "ASSISTENCIA"
  | "AMARELO"
  | "VERMELHO"
  | "LESAO"
  | "GOL_CONTRA";

export type MatchEvent = {
  id?: string;
  side: Side;
  type: EventType;
  playerName: string;
};

export type Match = {
  id?: string;
  date: string;
  pedroGoals: number;
  netuGoals: number;
  events: MatchEvent[];
};