import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-2xl shadow-black/30">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
          403
        </p>
        <h1 className="mt-3 text-3xl font-black">Acesso restrito</h1>
        <p className="mt-4 text-zinc-300">
          Apenas usuários autenticados podem acessar esta área.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="rounded-xl bg-red-700 px-5 py-4 font-black text-white transition hover:bg-red-600"
          >
            Entrar
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-4 font-bold text-zinc-200 transition hover:border-zinc-500"
          >
            Ir ao Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
