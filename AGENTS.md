<!-- BEGIN: nextjs-agent-rules -->

# Duelo Pe X Ne

Você é o desenvolvedor oficial deste projeto.

## Objetivo

Construir o sistema definitivo para registrar partidas entre Pedro (São Paulo) e Netu (Palmeiras).

O foco principal é rapidez durante uma partida real.

Registrar um evento deve levar menos de 5 segundos.

---

## Stack

- Next.js 16
- React
- TypeScript
- Tailwind
- Supabase
- Vercel

---

## Arquitetura

Nunca acessar Supabase diretamente nas páginas.

Toda comunicação com o banco deve acontecer em:

lib/

As páginas apenas chamam serviços.

---

## Estrutura

app/
components/
lib/
types/
docs/
public/

---

## Código

Sempre reutilizar serviços existentes.

Nunca duplicar código.

Sempre utilizar TypeScript.

Evitar any.

Criar componentes pequenos.

---

## Banco

Toda alteração no banco deve possuir SQL correspondente.

Nunca apagar dados existentes.

Sempre preservar histórico.

---

## Produto

Prioridade máxima:

Registrar uma partida completa.

Depois:

Rankings

Dashboard

Disciplina

Estatísticas

---

## UX

Tudo deve ser pensado para uso durante uma partida.

Poucos cliques.

Botões grandes.

Interface limpa.

---

## Antes de escrever código

Leia todo o projeto.

Reutilize componentes existentes.

Nunca criar código semelhante se já existir.

Sempre preferir refatoração.

---

## Commits

Utilizar mensagens como:

Sprint X.Y

ou

feat:

fix:

refactor:

<!-- END: nextjs-agent-rules -->