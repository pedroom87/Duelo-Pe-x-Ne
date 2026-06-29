import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  match_number: number;
  pedro_goals: number;
  netu_goals: number;
  winner: string;
};

export default async function Historico() {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, match_number, pedro_goals, netu_goals, winner")
    .order("match_number", { ascending: false });

  if (error) {
    return (
      <main className="p-10 text-white">
        Erro ao carregar histórico: {error.message}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-8 py-10 text-white">
      <h1 className="text-4xl font-black">Histórico</h1>
      <p className="mt-2 text-zinc-400">
        Partidas importadas da planilha.
      </p>

      <section className="mt-8 space-y-3">
        {matches?.map((match: Match) => (
          <div
            key={match.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="text-sm text-zinc-500">
              Jogo #{match.match_number}
            </p>

            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-red-300">São Paulo / Pedro</p>
                <p className="font-bold text-green-300">Palmeiras / Netu</p>
              </div>

              <div className="text-right text-3xl font-black">
                {match.pedro_goals} × {match.netu_goals}
              </div>
            </div>

            <p className="mt-3 text-sm text-zinc-400">
              Vencedor: {match.winner}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}