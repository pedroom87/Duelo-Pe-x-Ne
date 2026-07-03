"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { getSupabaseBrowserClient } from "@/lib/auth/browser";
import {
  canAccessRoute,
  getProfileForUserEmail,
} from "@/lib/auth/permissions";

function formatPasswordErrorMessage(error: unknown): string {
  if (!error) return "Erro ao atualizar senha";

  if (typeof error === "string") return error;

  // Supabase generally returns error objects with message.
  if (typeof error === "object" && "message" in error) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === "string" && maybe.trim().length > 0) return maybe;
  }

  return "Erro ao atualizar senha";
}

export default function DefinirSenhaPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  useEffect(() => {
    let active = true;

    async function verificarAutenticacao() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;

        const userEmail = data.user?.email ?? null;
        const profile = getProfileForUserEmail(userEmail);
        const currentPath = "/definir-senha";

        if (!canAccessRoute(profile, currentPath)) {
          router.replace("/login");
          router.refresh();
        }
      } catch {
        router.replace("/login");
        router.refresh();
      } finally {
        if (active) setLoading(false);
      }
    }

    verificarAutenticacao();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const senha = novaSenha.trim();
    const confirmar = confirmarSenha.trim();

    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateError) {
        setError(formatPasswordErrorMessage(updateError));
        return;
      }

      setSuccess("Senha atualizada com sucesso!");
      // Redireciona para o Dashboard depois de atualizar.
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(formatPasswordErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
        <div className="text-sm text-zinc-400">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-black">Definir/alterar senha</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Usuários convidados precisam definir uma senha para conseguir logar
          novamente.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="block">
            <span className="text-sm font-bold text-zinc-300">Nova senha</span>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              required
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-green-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-zinc-300">Confirmar senha</span>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              autoComplete="new-password"
              required
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-green-500"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-xl border border-green-800 bg-green-950/30 px-4 py-3 text-sm text-green-200">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-700 px-6 py-4 text-lg font-black text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar senha"}
          </button>

          <button
            type="button"
            onClick={() => router.replace("/")}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-6 py-4 text-lg font-black text-zinc-200 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            Voltar
          </button>
        </form>
      </section>
    </main>
  );
}

