import Link from "next/link";
import { TeamBadge } from "@/components/teams/TeamBadge";
import { TeamMascot } from "@/components/teams/TeamMascot";
import { TEAM_ORDER, getTeamTheme } from "@/utils/constants";

const items = [
  ["🏠", "Dashboard", "/"],
  ["⚽", "Nova Partida", "/partidas/nova"],
  ["📖", "Histórico", "/historico"],
  ["🏆", "Rankings", "/rankings"],
  ["🟨", "Disciplina", "/disciplina"],
  ["👥", "Jogadores", "/jogadores"],
  ["📥", "Importar Histórico", "/importar-historico"],
];

type SidebarProps = {
  userEmail: string | null;
  onSignOut: () => void;
};

export function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  return (
    <aside className="min-h-screen w-72 border-r border-zinc-800 bg-zinc-950 p-6 text-white">
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-3">
          <TeamMascot side="PEDRO" size="md" priority />
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-black text-zinc-300">
            VS
          </div>
          <TeamMascot side="NETU" size="md" priority />
        </div>
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Sao Paulo x Palmeiras
        </p>
        <h1 className="mt-2 text-2xl font-black">Duelo Pe X Ne</h1>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-1 rounded-full bg-red-600" />
          <div className="h-1 rounded-full bg-green-600" />
        </div>
      </div>

      <nav className="space-y-2">
        {items.map(([icon, label, href]) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-10 space-y-3">
        {TEAM_ORDER.map((side) => {
          const team = getTeamTheme(side);

          return (
            <div
              key={side}
              className={`rounded-2xl border p-4 ${team.classes.border} ${team.classes.panel}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-400">{team.owner}</p>
                  <p className={`font-black ${team.classes.text}`}>{team.club}</p>
                </div>
                <TeamBadge side={side} label={team.short} withMascot />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Logado como
        </p>
        <p className="mt-2 truncate text-sm font-bold text-zinc-200">
          {userEmail ?? "Carregando..."}
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:border-red-700 hover:text-red-200"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
