import { getPlayersWithAliases, getRankingsDataHealthAudit } from "@/lib/players";
import PlayerList from "@/components/jogadores/PlayerList";
import { TeamBadge } from "@/components/teams/TeamBadge";

export default async function Jogadores() {
  const [players, rankingsAudit] = await Promise.all([
    getPlayersWithAliases(),
    getRankingsDataHealthAudit(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <h1 className="text-3xl font-black sm:text-4xl">Jogadores</h1>

      <p className="mt-2 mb-8 text-zinc-400">
        Base oficial do campeonato e aliases para melhorar os rankings.
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        <TeamBadge side="PEDRO" label="Pedro / São Paulo" withMascot />
        <TeamBadge side="NETU" label="Netu / Palmeiras" withMascot />
      </div>

      <PlayerList players={players} rankingsAudit={rankingsAudit} />
    </main>
  );
}
