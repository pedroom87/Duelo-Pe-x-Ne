import { getPlayersWithAliases } from "@/lib/players";
import PlayerList from "@/components/jogadores/PlayerList";

export default async function Jogadores() {
  const players = await getPlayersWithAliases();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <h1 className="text-3xl font-black sm:text-4xl">Jogadores</h1>

      <p className="mt-2 mb-8 text-zinc-400">
        Base oficial do campeonato e aliases para melhorar os rankings.
      </p>

      <PlayerList players={players} />
    </main>
  );
}
