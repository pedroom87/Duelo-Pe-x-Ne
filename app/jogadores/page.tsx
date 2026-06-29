import { getPlayers } from "@/lib/players";
import PlayerList from "@/components/jogadores/PlayerList";

export default async function Jogadores() {

  const players = await getPlayers();

  return (

    <main className="min-h-screen bg-zinc-950 text-white p-10">

      <h1 className="text-4xl font-black">
        Jogadores
      </h1>

      <p className="text-zinc-400 mt-2 mb-8">
        Base oficial do campeonato
      </p>

      <PlayerList players={players} />

    </main>

  );

}