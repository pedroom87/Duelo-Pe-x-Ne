import { getVersionInfo } from "@/lib/version";

type ChangelogEntry = {
  version: string;
  summary: string;
};

type RoadmapGroup = {
  title: string;
  items: string[];
  borderClass: string;
  dotClass: string;
};

const changelogEntries: ChangelogEntry[] = [
  { version: "v0.7.0", summary: "Rebranding base para Duel Legacy" },
  { version: "v0.6.4", summary: "Definir/alterar senha do usuário" },
  { version: "v0.6.1", summary: "Modo Visitante" },
  { version: "v0.6.0", summary: "Login com Supabase Auth" },
  { version: "v0.5.0", summary: "Curadoria de jogadores" },
];

const roadmapGroups: RoadmapGroup[] = [
  {
    title: "Em andamento / Curto prazo",
    borderClass: "border-blue-500/40",
    dotClass: "bg-blue-500",
    items: [
      "Internacionalização: Português, Inglês e Espanhol",
      "Identidade visual por esporte",
      "Perfil de usuário com foto",
    ],
  },
  {
    title: "Próximas Sprints",
    borderClass: "border-amber-500/40",
    dotClass: "bg-amber-500",
    items: [
      "Seleção de esporte",
      "Assistência integrada ao gol",
      "Mandante e estádio",
      "Cadastro inteligente de atletas",
    ],
  },
  {
    title: "Visão futura",
    borderClass: "border-emerald-500/40",
    dotClass: "bg-emerald-500",
    items: [
      "Multi-duelos",
      "Plataforma para amigos criarem suas rivalidades",
      "PWA instalável no celular",
      "Hall da Fama",
      "Almanaque do Duelo",
    ],
  },
];

function formatReleaseDate(value: string) {
  const [yyyy, mm, dd] = value.split("-");

  return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : value;
}

export default async function Projeto() {
  const versionInfo = await getVersionInfo();

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-24 text-white sm:px-8 sm:py-10 sm:pb-0">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-zinc-800 pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-zinc-500">
            Produto
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Duel Legacy
          </h1>
          <p className="mt-3 text-lg font-semibold text-zinc-300">
            Every Rivalry Deserves a Legacy.
          </p>
          <p className="mt-5 inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-zinc-200">
            Campeonato atual: Duelo Pe × Ne
          </p>
        </header>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-400">
              Versão atual
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  Versão
                </p>
                <p className="mt-2 font-mono text-2xl font-black">
                  v{versionInfo.number}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  Codinome
                </p>
                <p className="mt-2 text-2xl font-black">
                  {versionInfo.codename}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  Data
                </p>
                <p className="mt-2 font-mono text-2xl font-black">
                  {formatReleaseDate(versionInfo.releasedAt)}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <h2 className="text-lg font-black">Principais novidades</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {versionInfo.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-300"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="rounded-3xl border border-red-900/50 bg-red-950/20 p-5 sm:p-7">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-200">
              Missão
            </p>
            <h2 className="mt-4 text-2xl font-black">
              Preservar rivalidades como legado.
            </h2>
            <p className="mt-4 text-zinc-300">
              Preservar a história de rivalidades através de estatísticas,
              memórias, rankings e legado.
            </p>
          </article>
        </section>

        <section className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">
            Histórico
          </p>
          <h2 className="mt-2 text-3xl font-black">Changelog</h2>

          <div className="mt-5 grid gap-3">
            {changelogEntries.map((entry) => (
              <div
                key={entry.version}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-mono text-sm font-black text-zinc-100">
                  {entry.version}
                </p>
                <p className="text-sm font-semibold text-zinc-300">
                  {entry.summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-500">
            Evolução
          </p>
          <h2 className="mt-2 text-3xl font-black">Roadmap</h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {roadmapGroups.map((group) => (
              <article
                key={group.title}
                className={`rounded-3xl border bg-zinc-900 p-5 sm:p-6 ${group.borderClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${group.dotClass}`} />
                  <h3 className="text-xl font-black">{group.title}</h3>
                </div>

                <ul className="mt-5 space-y-3 text-sm font-semibold text-zinc-300">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
