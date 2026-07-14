# AI Rules

Regras para agentes trabalhando neste repositorio.

## Antes de iniciar

- Ler `AGENTS.md`.
- Ler `docs/PROJECT_CONTEXT.md`.
- Ler `docs/AI_RULES.md`.
- Ler `docs/ROADMAP.md`.
- Executar `git status --porcelain`.
- Ignorar somente untracked conhecidos quando a tarefa permitir explicitamente.
- Se houver arquivo rastreado alterado fora do escopo, parar e informar.

## Escopo e seguranca

- Nunca usar `git add .`.
- Stage sempre deve ser restrito aos arquivos do escopo.
- Nao alterar arquivos Excel.
- Nao apagar dados.
- Nao criar migration sem autorizacao explicita.
- Nao alterar schema sem autorizacao explicita.
- Nao alterar rankings diretamente.
- Corrigir rankings por identidade, alias, evento ou vinculo rastreavel.
- Nao sobrescrever aliases automaticamente.
- Correcoes sensiveis exigem confirmacao manual.

## Banco e codigo

- Paginas nao devem acessar Supabase diretamente.
- Acesso ao banco deve ficar em `lib/`.
- Reutilizar servicos existentes antes de criar novos fluxos.
- Usar TypeScript.
- Evitar `any`.
- Manter componentes pequenos.

## Build, diff e commit

- Build e obrigatorio para tarefas de codigo ou produto.
- Em tarefa somente de documentacao, build pode ser dispensado quando o pedido disser isso explicitamente.
- Rodar validacoes pedidas pela tarefa, como `git diff --check`.
- Commit e push so depois de build/validacao aplicavel passar.
- Executar `git diff --cached --name-only` antes de commit.
- Nao incluir arquivos fora do escopo no commit.

## Erros conhecidos

- Distinguir erro real de codigo de `EPERM` na pasta `.next`.
- `EPERM` em `.next` costuma indicar lock/cache do ambiente; nao tratar automaticamente como falha de TypeScript.
- Se a build falhar por erro de codigo, corrigir ou reportar com arquivo e linha.

## Uso de agentes e ferramentas

- Usar Codex para tarefas sensiveis de codigo, banco e curadoria.
- Evitar BLACKBOX ou ferramentas opacas em logica critica.
- Nao delegar decisao de dado historico sem evidencias rastreaveis.
- Quando algo nao estiver confirmado, documentar como `a confirmar`.
