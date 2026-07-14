# Database

Este documento registra apenas o schema conhecido e confirmado pelo codigo e pelas migrations presentes no repositorio. Campos, constraints, indices e politicas que nao aparecem no codigo ficam como a confirmar.

## matches

Campos conhecidos:

- `id`
- `match_number`
- `pedro_goals`
- `netu_goals`
- `winner`
- `status`
- `verified`
- `created_at`

Uso confirmado:

- `match_number` identifica a partida no campeonato.
- `pedro_goals` e `netu_goals` guardam o placar.
- `winner` registra o vencedor.
- `status` usa estados como `OPEN` e `CLOSED`.
- `verified` indica partida conferida.

Obrigatoriedade confirmada:

- `verified` e `boolean NOT NULL DEFAULT false` pela migration `docs/migrations/add_verified_to_matches.sql`.
- Demais constraints e nullability: a confirmar.

## events

Campos conhecidos:

- `id`
- `match_id`
- `match_number`
- `seq`
- `player_id`
- `player_name_raw`
- `side`
- `event_type`
- `source_cell`
- `created_at`

Uso confirmado:

- `match_id` liga o evento a uma partida quando disponivel.
- `match_number` permite auditoria historica mesmo quando a relacao por id nao e suficiente.
- `seq` identifica a ordem/importacao do evento quando disponivel.
- `player_id` liga o evento a `players`; pode ficar ausente em eventos ainda nao reconciliados.
- `player_name_raw` preserva o nome bruto da origem.
- `side` identifica `PEDRO` ou `NETU`.
- `event_type` registra tipos como `GOL`, `ASSISTENCIA`, `AMARELO`, `VERMELHO`, `LESAO` e `GOL_CONTRA`.
- `source_cell` aponta a celula/origem historica quando existe.

Obrigatoriedade e FKs fisicas:

- A confirmar no banco.

## players

Campos conhecidos:

- `id`
- `name`
- `side`

Uso confirmado:

- `name` e o nome oficial exibido.
- `side` identifica o lado do jogador.

Obrigatoriedade e constraints:

- A confirmar no banco.

## player_aliases

Campos conhecidos:

- `id`
- `player_id`
- `alias`
- `normalized_alias`

Uso confirmado:

- `player_id` liga o alias a `players`.
- `alias` guarda o texto exibivel.
- `normalized_alias` guarda a forma normalizada usada para comparacao.

Politicas confirmadas:

- `docs/migrations/fix_player_aliases_rls.sql` habilita RLS e libera select/insert/update/delete para `anon` e `authenticated` nesta tabela.

## Relacionamentos conhecidos

- `events.player_id` aponta logicamente para `players.id`.
- `events.match_id` aponta logicamente para `matches.id`.
- `player_aliases.player_id` aponta logicamente para `players.id`.

FKs fisicas no Supabase: a confirmar.

## Campos alteraveis por curadoria

- `events.player_id`: reconciliacao, reatribuicao e mesclagem de jogadores.
- `player_aliases`: criacao, reatribuicao, atualizacao e remocao de aliases.
- `players`: edicao de nome/lado, mesclagem e remocao somente quando permitido pelo fluxo seguro.
- `matches.verified`: marcacao de partida conferida.

Campos de placar e status de `matches` sao alterados pelo fluxo de partida, nao por auditoria historica direta.

## Fora do escopo conhecido

Nao ha documentacao confirmada aqui para tabelas alem de `matches`, `events`, `players` e `player_aliases`.
