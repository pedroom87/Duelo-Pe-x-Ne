import { getRankings } from "@/lib/rankings";

const tipos = [
  ["GOL", "⚽ Artilharia"],
  ["ASSISTENCIA", "🎯 Assistências"],
  ["AMARELO", "🟨 Amarelos"],
  ["VERMELHO", "🟥 Vermelhos"],
  ["LESAO", "🤕 Lesões"],
  ["GOL_CONTRA", "🔵 Gols contra"],
];

export default async function Rankings() {
  try {
    const rankings = await getRankings();

    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
        <h1 className="text-3xl font-black sm:text-4xl">Rankings</h1>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          {tipos.map(([tipo, titulo]) => (
            <div
              key={tipo}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6"
            >
              <h2 className="text-2xl font-black">{titulo}</h2>

              <div className="mt-5 space-y-3">
                {rankings[tipo as keyof typeof rankings].map((player, index) => (
                  <div
                    key={`${player.key}-${index}`}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      player.side === "PEDRO"
                        ? "border-red-900/50 bg-red-950/20"
                        : "border-green-900/50 bg-green-950/20"
                    }`}
                  >
                    <div>
                      <p className="font-bold">
                        {index + 1}. {player.displayName}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {player.side === "PEDRO" ? "SPFC" : "SEP"}
                      </p>
                    </div>

                    <p className="text-2xl font-black">{player.total}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    );
  } catch (error: any) {
    return <main className="p-10 text-white">Erro: {error?.message || "Erro ao carregar rankings"}</main>;
  }
}