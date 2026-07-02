-- Sprint 0.5.0 hotfix
-- Corrige os fluxos de curadoria de jogadores usados pelo app com chave anon.
-- O erro observado no Supabase foi:
-- code 42501: new row violates row-level security policy for table "player_aliases"

ALTER TABLE public.player_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_aliases_select_all" ON public.player_aliases;
CREATE POLICY "player_aliases_select_all"
ON public.player_aliases
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "player_aliases_insert_all" ON public.player_aliases;
CREATE POLICY "player_aliases_insert_all"
ON public.player_aliases
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "player_aliases_update_all" ON public.player_aliases;
CREATE POLICY "player_aliases_update_all"
ON public.player_aliases
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "player_aliases_delete_all" ON public.player_aliases;
CREATE POLICY "player_aliases_delete_all"
ON public.player_aliases
FOR DELETE
TO anon, authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_aliases TO anon, authenticated;

-- A mesclagem também atualiza events.player_id e remove o jogador origem
-- somente quando ele não possui mais eventos vinculados.
DROP POLICY IF EXISTS "events_update_player_id_for_curadoria" ON public.events;
CREATE POLICY "events_update_player_id_for_curadoria"
ON public.events
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT UPDATE (player_id) ON public.events TO anon, authenticated;

DROP POLICY IF EXISTS "players_delete_without_events_for_curadoria" ON public.players;
CREATE POLICY "players_delete_without_events_for_curadoria"
ON public.players
FOR DELETE
TO anon, authenticated
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.events
    WHERE events.player_id = players.id
  )
);

GRANT DELETE ON public.players TO anon, authenticated;
