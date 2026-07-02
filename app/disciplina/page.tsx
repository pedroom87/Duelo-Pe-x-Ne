import { getDisciplineSummary } from "@/lib/discipline";

export default async function Disciplina() {
  try {
    const discipline = await getDisciplineSummary();

    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
        <h1 className="text-3xl font-black sm:text-4xl">Disciplina</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Jogadores que não podem jogar o próximo jogo.
        </p>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">⛔ Suspensos</h2>
            <div className="mt-4 space-y-3">
              {discipline.suspended.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum suspenso para o próximo jogo.</p>
              )}
              {discipline.suspended.map((entry) => (
                <div key={`${entry.displayName}-suspenso`} className="rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3">
                  <p className="font-bold">{entry.displayName}</p>
                  <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"} · {entry.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">🤕 Lesionados</h2>
            <div className="mt-4 space-y-3">
              {discipline.injured.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum lesionado para o próximo jogo.</p>
              )}
              {discipline.injured.map((entry) => (
                <div key={`${entry.displayName}-lesionado`} className="rounded-xl border border-orange-800/50 bg-orange-950/20 px-4 py-3">
                  <p className="font-bold">{entry.displayName}</p>
                  <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"} · Lesão</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">🟨 Pendurados</h2>
            <div className="mt-4 space-y-3">
              {discipline.pending.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum jogador pendurado no momento.</p>
              )}
              {discipline.pending.map((entry) => (
                <div key={`${entry.displayName}-pendurado`} className="rounded-xl border border-yellow-800/50 bg-yellow-950/20 px-4 py-3">
                  <p className="font-bold">{entry.displayName}</p>
                  <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"} · 2 amarelos</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
          <h2 className="text-xl font-black">Regra aplicada</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            {discipline.notes.map((note) => (
              <li key={note} className="list-disc pl-5">{note}</li>
            ))}
          </ul>
        </section>
      </main>
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar disciplina";
    return <main className="p-10 text-white">Erro: {message}</main>;
  }
}
