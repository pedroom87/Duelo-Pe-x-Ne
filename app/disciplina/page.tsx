import { getDisciplineSummary } from "@/lib/discipline";

export default async function Disciplina() {
  try {
    const discipline = await getDisciplineSummary();

    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
        <h1 className="text-3xl font-black sm:text-4xl">Disciplina</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Baseado nos eventos existentes em ordem de partida e sequência.
        </p>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">🟨 Cartões amarelos</h2>
            <div className="mt-4 space-y-3">
              {discipline.yellowCards.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum amarelo registrado.</p>
              )}
              {discipline.yellowCards.map((entry, index) => (
                <div key={`${entry.displayName}-amarelo`} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{index + 1}. {entry.displayName}</p>
                      <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"}</p>
                    </div>
                    <p className="text-2xl font-black">{entry.yellowCards}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">🟥 Cartões vermelhos</h2>
            <div className="mt-4 space-y-3">
              {discipline.redCards.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum vermelho registrado.</p>
              )}
              {discipline.redCards.map((entry, index) => (
                <div key={`${entry.displayName}-vermelho`} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{index + 1}. {entry.displayName}</p>
                      <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"}</p>
                    </div>
                    <p className="text-2xl font-black">{entry.redCards}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">🟨 Pendurados com 2 amarelos</h2>
            <div className="mt-4 space-y-3">
              {discipline.pendingSuspensions.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum jogador pendurado no momento.</p>
              )}
              {discipline.pendingSuspensions.map((entry) => (
                <div key={`${entry.displayName}-pendurado`} className="rounded-xl border border-yellow-800/50 bg-yellow-950/20 px-4 py-3">
                  <p className="font-bold">{entry.displayName}</p>
                  <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"} · 2 amarelos</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-xl font-black">⛔ Suspensos para o próximo jogo</h2>
            <div className="mt-4 space-y-3">
              {discipline.nextGameSuspensions.length === 0 && (
                <p className="text-sm text-zinc-500">Nenhum jogador suspenso no momento.</p>
              )}
              {discipline.nextGameSuspensions.map((entry) => (
                <div key={`${entry.displayName}-suspenso`} className="rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3">
                  <p className="font-bold">{entry.displayName}</p>
                  <p className="text-sm text-zinc-400">{entry.side === "PEDRO" ? "SPFC" : "SEP"} · {entry.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
          <h2 className="text-xl font-black">Limitações desta versão</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            {discipline.notes.map((note) => (
              <li key={note} className="list-disc pl-5">{note}</li>
            ))}
          </ul>
        </section>
      </main>
    );
  } catch (error: any) {
    return <main className="p-10 text-white">Erro: {error?.message || "Erro ao carregar disciplina"}</main>;
  }
}
