# Project Context

## Visao e missao

Duel Legacy e o produto: uma aplicacao para registrar partidas, eventos e estatisticas de confrontos recorrentes com rapidez e historico preservado.

Duelo Pe x Ne e o campeonato atual dentro do produto. O foco pratico continua sendo registrar uma partida real em poucos cliques, com eventos em menos de 5 segundos, e depois homologar rankings historicos com seguranca.

## Conceitos

- Produto: Duel Legacy, a plataforma.
- Campeonato: Duelo Pe x Ne, o conjunto atual de partidas entre Pedro e Netu.
- Partida: registro em `matches`, identificado por `match_number`, placar, vencedor, status e indicador de conferencia.
- Jogador: registro em `players`, com nome e lado (`PEDRO` ou `NETU`).
- Evento: registro em `events`, como gol, assistencia, cartao, lesao ou gol contra.
- Alias: nome alternativo em `player_aliases` usado para ligar nomes brutos de eventos a jogadores oficiais.

## Stack e arquitetura

- Next.js 16, React, TypeScript e Tailwind.
- Supabase como banco.
- Vercel como destino de deploy.
- `app/` contem rotas e telas.
- `components/` contem componentes reutilizaveis.
- `lib/` contem servicos e acesso ao Supabase.
- `types/`, `docs/` e `public/` guardam tipos, documentacao e dados estaticos.

Regra de arquitetura: paginas nao devem acessar Supabase diretamente. A comunicacao com banco deve passar por servicos em `lib/`.

## Estado atual

- A rota `/curadoria` existe e concentra ferramentas administrativas.
- O projeto esta na fase de homologacao dos rankings historicos.
- A fonte historica extraida esta em `public/data/historico-extraido.json`.
- A ultima versao publicada confirmada nesta tarefa e `0.9.8`, commit `df81ede`.
- O repositorio local contem `0.9.9` e commit `378350a`; publicacao a confirmar.

## Rotas principais

- `/`: dashboard.
- `/partidas/nova`: fluxo atual de nova partida.
- `/nova-partida`: rota administrativa/legada a confirmar.
- `/historico`: historico de partidas.
- `/historico/[id]/editar`: edicao administrativa de partida.
- `/rankings`: rankings.
- `/disciplina`: disciplina.
- `/jogadores`: jogadores e aliases.
- `/curadoria`: Centro de Curadoria.
- `/importar-historico`: importacao/consulta do historico extraido.
- `/perfil`, `/login`, `/definir-senha`, `/403` e `/projeto`: rotas de conta, acesso e contexto.

## Fluxo de dados

1. Uma partida e criada em `matches`.
2. Eventos sao registrados em `events`, com `player_name_raw`, `side`, `event_type`, partida e, quando possivel, `player_id`.
3. O placar da partida e atualizado a partir dos eventos.
4. Jogadores oficiais ficam em `players`.
5. Aliases em `player_aliases` ajudam a resolver nomes brutos para jogadores.
6. Rankings devem ser derivados dos eventos vinculados, nao editados diretamente.
7. A curadoria corrige vinculos e identidades quando ha evidencia suficiente.

## Fonte historica

A fonte historica validada vem da planilha original e do JSON extraido em `public/data/historico-extraido.json`. O JSON e usado para auditoria, cobertura da importacao e validacao oficial.

Cobertura maxima conhecida pelo codigo atual: calculada a partir do JSON; no estado recente, cobre ate o jogo `#363`. Confirmar novamente se o JSON for atualizado.

## Partida conferida

`matches.verified` indica uma partida conferida. Partidas conferidas sao usadas como evidencia mais forte nas ferramentas de curadoria e homologacao.

## Centro de Curadoria

O Centro de Curadoria agrupa ferramentas para:

- medir saude dos dados;
- reconciliar eventos sem jogador;
- comparar banco e historico oficial;
- investigar divergencias por evento;
- revisar eventos sem equivalente historico;
- tratar identidades, aliases e duplicidades.

## Regras importantes

- Nao apagar dados historicos.
- Nao alterar banco sem SQL/migration autorizada.
- Nao criar migration sem autorizacao explicita.
- Nao alterar arquivos Excel.
- Nao corrigir rankings diretamente; corrigir eventos, identidades ou aliases.
- Correcoes sensiveis exigem confirmacao manual.
- Aliases nao devem ser sobrescritos automaticamente.
- Eventos posteriores a cobertura do JSON nao devem virar falso positivo contra o historico.

## Proxima fase

Homologar rankings historicos, investigar divergencias reais, reduzir divergencias a zero e preparar a versao 1.0 com a mudanca planejada de endereco na Vercel.
