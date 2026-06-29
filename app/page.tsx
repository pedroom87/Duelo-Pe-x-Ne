export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-zinc-400">
              São Paulo x Palmeiras
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Duelo Pe X Ne
            </h1>
          </div>

          <div className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
            Pedro × Netu
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-red-900/60 bg-red-950/30 p-8">
            <p className="text-sm font-bold uppercase text-red-300">Pedro</p>
            <h2 className="mt-2 text-3xl font-black">São Paulo</h2>
            <p className="mt-4 text-zinc-300">Tricolor Paulista</p>
          </div>

          <div className="rounded-3xl border border-green-900/60 bg-green-950/30 p-8">
            <p className="text-sm font-bold uppercase text-green-300">Netu</p>
            <h2 className="mt-2 text-3xl font-black">Palmeiras</h2>
            <p className="mt-4 text-zinc-300">Alviverde Imponente</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Jogos", "0"],
            ["Vitórias Pedro", "0"],
            ["Vitórias Netu", "0"],
            ["Empates", "0"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {["Nova Partida", "Histórico", "Rankings", "Disciplina"].map(
            (item) => (
              <button
                key={item}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5 text-left font-bold transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                {item}
              </button>
            )
          )}
        </section>
      </section>
    </main>
  );
}