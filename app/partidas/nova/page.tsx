"use client";

import { useState } from "react";

type Evento = {
  lado: "PEDRO" | "NETU";
  tipo: "GOL" | "ASSISTENCIA" | "AMARELO" | "VERMELHO" | "LESAO" | "GOL_CONTRA";
  jogador: string;
};

export default function NovaPartida() {
  const [golsPedro, setGolsPedro] = useState("");
  const [golsNetu, setGolsNetu] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [novoEvento, setNovoEvento] = useState<Evento>({
    lado: "PEDRO",
    tipo: "GOL",
    jogador: "",
  });

  function adicionarEvento() {
    if (!novoEvento.jogador.trim()) return;

    setEventos([...eventos, novoEvento]);
    setNovoEvento({ ...novoEvento, jogador: "" });
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Voltar
        </a>

        <h1 className="mt-6 text-4xl font-black">Nova Partida</h1>
        <p className="mt-2 text-zinc-400">
          Registre o placar e os eventos do Duelo Pe X Ne.
        </p>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-red-900/60 bg-red-950/30 p-6">
            <p className="text-sm font-bold text-red-300">Pedro</p>
            <h2 className="text-2xl font-black">São Paulo</h2>
            <input
              value={golsPedro}
              onChange={(e) => setGolsPedro(e.target.value)}
              placeholder="Gols"
              type="number"
              className="mt-6 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
            />
          </div>

          <div className="rounded-3xl border border-green-900/60 bg-green-950/30 p-6">
            <p className="text-sm font-bold text-green-300">Netu</p>
            <h2 className="text-2xl font-black">Palmeiras</h2>
            <input
              value={golsNetu}
              onChange={(e) => setGolsNetu(e.target.value)}
              placeholder="Gols"
              type="number"
              className="mt-6 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-black">Adicionar evento</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <select
              value={novoEvento.lado}
              onChange={(e) =>
                setNovoEvento({
                  ...novoEvento,
                  lado: e.target.value as Evento["lado"],
                })
              }
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            >
              <option value="PEDRO">Pedro / São Paulo</option>
              <option value="NETU">Netu / Palmeiras</option>
            </select>

            <select
              value={novoEvento.tipo}
              onChange={(e) =>
                setNovoEvento({
                  ...novoEvento,
                  tipo: e.target.value as Evento["tipo"],
                })
              }
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            >
              <option value="GOL">⚽ Gol</option>
              <option value="ASSISTENCIA">🎯 Assistência</option>
              <option value="AMARELO">🟨 Amarelo</option>
              <option value="VERMELHO">🟥 Vermelho</option>
              <option value="LESAO">🤕 Lesão</option>
              <option value="GOL_CONTRA">🔵 Gol contra</option>
            </select>

            <input
              value={novoEvento.jogador}
              onChange={(e) =>
                setNovoEvento({ ...novoEvento, jogador: e.target.value })
              }
              placeholder="Nome do jogador"
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
            />
          </div>

          <button
            onClick={adicionarEvento}
            className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-zinc-950 hover:bg-zinc-200"
          >
            Adicionar evento
          </button>
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-black">Eventos da partida</h2>

          <div className="mt-4 space-y-3">
            {eventos.length === 0 && (
              <p className="text-zinc-500">Nenhum evento adicionado ainda.</p>
            )}

            {eventos.map((evento, index) => (
              <div
                key={index}
                className={`rounded-xl border px-4 py-3 ${
                  evento.lado === "PEDRO"
                    ? "border-red-900/60 bg-red-950/20"
                    : "border-green-900/60 bg-green-950/20"
                }`}
              >
                <strong>{evento.jogador}</strong>{" "}
                <span className="text-zinc-400">
                  — {evento.tipo} — {evento.lado === "PEDRO" ? "SPFC" : "SEP"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <button className="mt-8 w-full rounded-2xl bg-red-600 px-6 py-4 text-lg font-black hover:bg-red-500">
          Salvar partida
        </button>
      </div>
    </main>
  );
}