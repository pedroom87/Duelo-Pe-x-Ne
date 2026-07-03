"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/auth/browser";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      setError(null);

      const { data } = await supabase.auth.getUser();
      if (!active) return;

      if (!data.user) {
        router.replace("/login");
        router.refresh();
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function handleSalvar() {
    setError(null);
    setSuccess(null);

    const senha = novaSenha.trim();
    const confirma = confirmarSenha.trim();

    if (senha.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirma) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Senha atualizada com sucesso.");

      // Voltar para o Dashboard
      router.replace("/");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar a senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <section className="w-full max-w-md">
        <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/30">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
            Conta
          </p>
          <h1 className="mt-3 text-3xl font-black">Definir/alterar senha</h1>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-zinc-300">Nova senha</span>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-red-500"
                disabled={loading}
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
                minLength={6}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-4 text-base text-white outline-none transition focus:border-red-500"
                disabled={loading}
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
              type="button"
              onClick={handleSalvar}
              disabled={loading}
              className="w-full rounded-xl bg-red-700 px-6 py-4 text-lg font-black text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

