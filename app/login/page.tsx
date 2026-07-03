"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamMascot } from "@/components/teams/TeamMascot";
import { getSupabaseBrowserClient } from "@/lib/auth/browser";

function getSafeNextPath() {
  if (typeof window === "undefined") return "/";

  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/login")) return "/";

  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.replace(getSafeNextPath());
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-white">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-4">
          <TeamMascot side="PEDRO" size="lg" priority />
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-black text-zinc-300">
            VS
          </div>
          <TeamMascot side="NETU" size="lg" priority />
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/30">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
            Acesso restrito
          </p>
          <h1 className="mt-3 text-3xl font-black">Duelo Pe X Ne</h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-zinc-300">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-zinc-300">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-green-500"
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-700 px-6 py-4 text-lg font-black text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
