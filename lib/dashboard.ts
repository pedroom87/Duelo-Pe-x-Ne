import { supabase } from "./supabase";

export type DashboardStats = {
  total: number;
  pedroVitorias: number;
  netuVitorias: number;
  empates: number;
};

export type VerificationStats = {
  total: number;
  verified: number;
  pending: number;
};

type DashboardMatch = {
  id: string;
  winner: string | null;
  pedro_goals: number | null;
  netu_goals: number | null;
  verified: boolean | null;
};

export async function getDashboardStats() {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, winner, pedro_goals, netu_goals, verified");

  if (error) {
    throw error;
  }

  if (!matches || matches.length === 0) {
    return {
      stats: {
        total: 0,
        pedroVitorias: 0,
        netuVitorias: 0,
        empates: 0,
      },
      verificationStats: {
        total: 0,
        verified: 0,
        pending: 0,
      },
    };
  }

  const dashboardMatches = matches as DashboardMatch[];
  const total = dashboardMatches.length;
  const pedroVitorias = dashboardMatches.filter(
    (match) => match.winner === "PEDRO" || match.winner === "Pedro"
  ).length;
  const netuVitorias = dashboardMatches.filter(
    (match) => match.winner === "NETU" || match.winner === "Netu"
  ).length;
  const empates = dashboardMatches.filter(
    (match) =>
      match.pedro_goals === match.netu_goals ||
      match.winner === "EMPATE" ||
      match.winner === "Empate"
  ).length;
  const verified = dashboardMatches.filter((match) => match.verified).length;

  return {
    stats: {
      total,
      pedroVitorias,
      netuVitorias,
      empates,
    },
    verificationStats: {
      total,
      verified,
      pending: total - verified,
    },
  };
}
