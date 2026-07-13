import {
  getPlayerGlobalSearchIndex,
  getPlayersWithAliases,
  getRankingsDataHealthAudit,
} from "@/lib/players";
import PlayerList from "@/components/jogadores/PlayerList";

export default async function Curadoria() {
  const [players, rankingsAudit, globalSearchIndex] = await Promise.all([
    getPlayersWithAliases(),
    getRankingsDataHealthAudit(),
    getPlayerGlobalSearchIndex(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <h1 className="text-3xl font-black sm:text-4xl">Centro de Curadoria</h1>

      <p className="mt-2 mb-8 text-zinc-400">
        Area administrativa para resolver pendencias de dados com confirmacao manual.
      </p>

      <PlayerList
        players={players}
        rankingsAudit={rankingsAudit}
        globalSearchIndex={globalSearchIndex}
        mode="curation"
      />
    </main>
  );
}
