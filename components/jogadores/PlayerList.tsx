"use client";

import { useMemo, useState } from "react";

type Player = {
  id: string;
  name: string;
  side: string;
};

interface Props {
  players: Player[];
}

export default function PlayerList({ players }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return players;

    return players.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [players, search]);

  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar jogador..."
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 mb-6"
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

        {filtered.map((player) => (

          <div
            key={player.id}
            className={`rounded-2xl border p-5 transition hover:scale-[1.02] ${
              player.side === "PEDRO"
                ? "border-red-700 bg-red-950/20"
                : "border-green-700 bg-green-950/20"
            }`}
          >

            <h2 className="font-bold text-xl">
              {player.name}
            </h2>

            <p className="text-sm text-zinc-400 mt-1">
              {player.side === "PEDRO"
                ? "São Paulo"
                : "Palmeiras"}
            </p>

          </div>

        ))}

      </div>
    </>
  );
}