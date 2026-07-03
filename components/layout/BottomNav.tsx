import Link from "next/link";

const items = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "Nova Partida", href: "/partidas/nova", icon: "⚽" },
  { label: "Histórico", href: "/historico", icon: "📖" },
  { label: "Rankings", href: "/rankings", icon: "🏆" },
];

type BottomNavProps = {
  userEmail: string | null;
  onSignOut: () => void;
};

export function BottomNav({ userEmail, onSignOut }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">
        <span className="min-w-0 truncate">{userEmail ?? "Carregando..."}</span>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 font-bold text-zinc-200"
        >
          Sair
        </button>
      </div>
      <div className="mx-auto grid max-w-4xl grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-2 py-3 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
