import Link from "next/link";

const items = [
  ["🏠", "Dashboard", "/"],
  ["⚽", "Nova Partida", "/partidas/nova"],
  ["📖", "Histórico", "/historico"],
  ["🏆", "Rankings", "/rankings"],
  ["🟨", "Disciplina", "/disciplina"],
  ["👥", "Jogadores", "/jogadores"],
  ["📥", "Importar Histórico", "/importar-historico"],
];

export function Sidebar() {
  return (
    <aside className="min-h-screen w-72 border-r border-zinc-800 bg-zinc-950 p-6 text-white">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          São Paulo x Palmeiras
        </p>
        <h1 className="mt-2 text-2xl font-black">Duelo Pe X Ne</h1>
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

      <div className="mt-10 rounded-2xl border border-red-900/50 bg-red-950/20 p-4">
        <p className="text-sm text-zinc-400">Pedro</p>
        <p className="font-black text-red-300">São Paulo</p>
      </div>

      <div className="mt-3 rounded-2xl border border-green-900/50 bg-green-950/20 p-4">
        <p className="text-sm text-zinc-400">Netu</p>
        <p className="font-black text-green-300">Palmeiras</p>
      </div>
    </aside>
  );
}
