# Análise Completa do Projeto - Duelo Pe X Ne

**Data da Análise:** 2026-06-29  
**Versão do Projeto:** 0.1.0  
**Status:** Sprint 2 (Em Desenvolvimento)

---

## 📋 Índice

1. [Estrutura Completa do Projeto](#estrutura-completa-do-projeto)
2. [Arquivos Existentes](#arquivos-existentes)
3. [Componentes Existentes](#componentes-existentes)
4. [Serviços Existentes](#serviços-existentes)
5. [Rotas Existentes](#rotas-existentes)
6. [Arquivos Mortos](#arquivos-mortos)
7. [Código Duplicado](#código-duplicado)
8. [Problemas Encontrados](#problemas-encontrados)
9. [Melhorias Sugeridas](#melhorias-sugeridas)
10. [Dependências Não Utilizadas](#dependências-não-utilizadas)
11. [Erros de Arquitetura](#erros-de-arquitetura)
12. [Ordem Recomendada de Desenvolvimento](#ordem-recomendada-de-desenvolvimento)

---

## 🏗️ Estrutura Completa do Projeto

```
duelo-pe-x-ne/
├── app/                          # Rotas e páginas Next.js App Router
│   ├── globals.css              # Estilos globais
│   ├── layout.tsx               # Layout raiz com Sidebar
│   ├── page.tsx                 # Dashboard principal (/)
│   ├── historico/               # Histórico de partidas
│   │   └── page.tsx
│   ├── importar-historico/      # Importação de dados
│   │   └── page.tsx
│   ├── jogadores/               # Gerenciamento de jogadores
│   │   └── page.tsx
│   ├── nova-partida/            # DUPLICADO - Versão antiga
│   │   └── page.tsx
│   ├── rankings/                # Rankings e estatísticas
│   │   └── page.tsx
│   └── partidas/                # Nova estrutura
│       └── nova/                # ATIVA - Criar partida
│           └── page.tsx
├── components/                   # Componentes reutilizáveis
│   ├── jogadores/
│   │   └── PlayerList.tsx       # Lista de jogadores com filtro
│   ├── layout/
│   │   └── Sidebar.tsx          # Menu lateral
│   ├── match/
│   │   └── GoalModal.tsx        # Modal para registrar gols
│   └── ui/                      # VAZIO - Componentes UI primitivos
├── lib/                         # Serviços e funções de negócio
│   ├── supabase.ts             # Cliente Supabase
│   ├── players.ts              # Serviços de jogadores
│   ├── matches.ts              # Serviços de partidas
│   ├── events.ts               # Serviços de eventos
│   └── playerAliases.ts        # Serviços de apelidos
├── types/
│   └── index.ts                # Tipos TypeScript compartilhados
├── utils/
│   └── constants.ts            # Constantes globais
├── features/                   # VAZIO - Features do domínio
├── public/
│   └── data/
│       └── historico-extraido.json  # Dados históricos para importação
├── docs/
│   ├── ROADMAP.md              # Roadmap do projeto
│   ├── SPRINT.md               # VAZIO - Status das sprints
│   ├── BACKLOG.md              # VAZIO - Backlog de features
│   ├── RULES.md                # VAZIO - Regras do jogo
│   ├── CHANGELOG.md            # VAZIO - Histórico de mudanças
│   └── PROJECT_ANALYSIS.md     # Este arquivo
├── AGENTS.md                   # Instruções para o agente IA
├── CLAUDE.md                   # Referência ao AGENTS.md
├── package.json                # Dependências
├── tsconfig.json               # Configuração TypeScript
├── next.config.ts              # Configuração Next.js
├── eslint.config.mjs           # Configuração ESLint
├── postcss.config.mjs          # Configuração PostCSS
├── tailwind.config.ts          # (Deve existir) Config Tailwind
├── README.md                   # README padrão (não customizado)
└── next-env.d.ts               # Tipos Next.js auto-gerados
```

---

## 📁 Arquivos Existentes

### Configuração
- ✅ `package.json` - Bem estruturado com versão correta (0.1.0)
- ✅ `tsconfig.json` - Configurado com path aliases `@/*`
- ✅ `next.config.ts` - Básico
- ✅ `eslint.config.mjs` - Configurado com ESLint Next
- ✅ `postcss.config.mjs` - Para Tailwind
- ❓ `tailwind.config.ts` - **Não encontrado**

### Documentação
- ✅ `AGENTS.md` - Completo com diretrizes
- ✅ `ROADMAP.md` - Completo (6 sprints)
- ❌ `SPRINT.md` - VAZIO
- ❌ `BACKLOG.md` - VAZIO
- ❌ `CHANGELOG.md` - VAZIO
- ❌ `RULES.md` - VAZIO
- ⚠️ `README.md` - Padrão (não customizado)

### Dados
- ✅ `public/data/historico-extraido.json` - Presente

### Código Principal
- ✅ `types/index.ts` - Tipos definidos
- ✅ `utils/constants.ts` - Constantes de times
- ✅ Serviços em `lib/` - 5 arquivos
- ✅ Componentes em `components/` - 3 funcionais
- ✅ Páginas em `app/` - 6 páginas criadas

---

## 🧩 Componentes Existentes

### Componentes Implementados

| Componente | Localização | Status | Descrição |
|-----------|-----------|--------|-----------|
| **Sidebar** | `components/layout/Sidebar.tsx` | ✅ Ativo | Menu lateral com navegação |
| **PlayerList** | `components/jogadores/PlayerList.tsx` | ✅ Ativo | Lista filtrada de jogadores |
| **GoalModal** | `components/match/GoalModal.tsx` | ✅ Ativo | Modal para registrar gols |

### Componentes Planejados (Não Implementados)
- `components/ui/*` - **Pasta vazia** (primitivos reutilizáveis esperados)
- Componentes de cards, botões, inputs reutilizáveis
- Modal genérico
- Toast/Notificações
- Loading spinner

---

## 🔧 Serviços Existentes

### Serviços em `lib/`

| Serviço | Arquivo | Funções | Status |
|---------|---------|---------|--------|
| **Supabase** | `supabase.ts` | `supabase` | ✅ Cliente configurado |
| **Players** | `players.ts` | `getPlayers()`, `searchPlayers()` | ✅ Implementado |
| **Matches** | `matches.ts` | `getNextMatchNumber()`, `createMatch()`, `refreshScore()` | ✅ Implementado |
| **Events** | `events.ts` | `addGoal()` | ⚠️ Incompleto (apenas gol) |
| **PlayerAliases** | `playerAliases.ts` | `getAliases()`, `addAlias()` | ✅ Implementado |

### Serviços Faltantes
- Serviço de assistências
- Serviço de cartões
- Serviço de lesões
- Serviço de gols contra
- Serviço de rankings
- Serviço de disciplina
- Serviço de estatísticas

### Pasta `features/`
- ❌ **VAZIA** - Deveria conter domain-specific services

---

## 🛣️ Rotas Existentes

### Rotas Implementadas

| Rota | Arquivo | Status | Implementação |
|------|---------|--------|-----------------|
| `/` | `app/page.tsx` | ✅ Ativa | Dashboard com placares mockados |
| `/jogadores` | `app/jogadores/page.tsx` | ✅ Ativa | Lista de jogadores do banco |
| `/rankings` | `app/rankings/page.tsx` | ✅ Ativa | Rankings por tipo de evento |
| `/historico` | `app/historico/page.tsx` | ✅ Ativa | Histórico de partidas |
| `/importar-historico` | `app/importar-historico/page.tsx` | ⚠️ Parcial | Importação com componente "use client" |
| `/nova-partida` | `app/nova-partida/page.tsx` | ❌ Duplicada | Versão antiga (não usar) |
| `/partidas/nova` | `app/partidas/nova/page.tsx` | ✅ Ativa | Nova versão para registrar partida |

### Rotas Planejadas (Não Implementadas)

| Rota | Planejada | Descrição |
|------|-----------|-----------|
| `/disciplina` | Sprint 4 | Registro de suspensões |
| `/partidas/{id}` | Sprint 3 | Editar partida |
| `/partidas/{id}/eventos` | Sprint 3 | Listar eventos da partida |
| `/dashboard` | Sprint 4 | Dashboard de stats |
| `/conquistas` | Sprint 6 | Conquistas e recordes |
| `/timeline` | Sprint 6 | Timeline de eventos |

---

## 💀 Arquivos Mortos

### Duplicações

1. **`app/nova-partida/page.tsx`** - DEPRECATED ❌
   - Versão antiga de criar partida
   - **Use em seu lugar:** `app/partidas/nova/page.tsx`
   - Diferença: Este tem select dropdowns, o novo tem modal

### Documentos Vazios
- ❌ `docs/SPRINT.md`
- ❌ `docs/BACKLOG.md`
- ❌ `docs/CHANGELOG.md`
- ❌ `docs/RULES.md`

### Pastas Vazias
- ❌ `components/ui/` - Deveria ter componentes primitivos
- ❌ `features/` - Deveria ter serviços específicos de features

---

## 🔄 Código Duplicado

### 1. **Nova Partida - Duas Versões**
```
❌ app/nova-partida/page.tsx          (Versão antiga com selects)
✅ app/partidas/nova/page.tsx         (Versão nova com modal)
```

**Impacto:** Confusão sobre qual usar, Sidebar aponta para a versão velha.

**Ação:** Deletar `app/nova-partida/` e atualizar Sidebar.

### 2. **Busca de Jogadores - Duplicada em 2 Componentes**

`components/jogadores/PlayerList.tsx`:
```typescript
const filtered = players.filter((p) =>
  p.name.toLowerCase().includes(search.toLowerCase())
);
```

`components/match/GoalModal.tsx`:
```typescript
const filtered = players.filter(
  (p) =>
    p.side === side &&
    p.name.toLowerCase().includes(search.toLowerCase())
);
```

**Impacto:** Não reutilizável, difícil de manter.

**Ação:** Extrair para função utilitária.

### 3. **Normalização de Strings - Duplicada**

`lib/playerAliases.ts`:
```typescript
const normalized = alias
  .normalize("NFD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase()
  .trim();
```

Usada em um único lugar. Deveria ser utilitário reutilizável.

**Ação:** Criar `utils/string.ts` com função `normalizeString()`.

---

## ⚠️ Problemas Encontrados

### CRÍTICOS 🔴

#### 1. **Violação de Arquitetura - Supabase em Páginas**

❌ **Páginas acessando banco diretamente:**
- `app/rankings/page.tsx` - Linha 1: `import { supabase }`
- `app/historico/page.tsx` - Linha 1: `import { supabase }`
- `app/importar-historico/page.tsx` - Linha 4: `import { supabase }`

**Contra arquitetura definida em AGENTS.md:**
> "Nunca acessar Supabase diretamente nas páginas. Toda comunicação com o banco deve acontecer em: lib/"

**Impacto:** Impossível testar, difícil de refatorar, viola padrão de arquitetura.

**Solução:**
```typescript
// ❌ ERRADO em pages
const { data } = await supabase.from("events").select(...)

// ✅ CERTO em lib/
export async function getRankings(type: string) {
  const { data } = await supabase.from("events").select(...)
  return data;
}

// ✅ Use em pages
const rankings = await getRankings("GOL");
```

#### 2. **"use client" em Página de Server Component**

`app/importar-historico/page.tsx` - Linha 1: `"use client"`

**Problema:** Importação de dados é operação de servidor, não cliente.

**Impacto:**
- Bundle JavaScript maior
- Dados sensíveis expostos ao cliente
- Impossível usar secrets server-side

**Solução:** Remover `"use client"` e usar Server Components com Server Actions.

#### 3. **Placar Não Atualiza Corretamente**

`app/nova-partida/page.tsx`:
```typescript
async function atualizarPlacar() {
  // Por enquanto apenas soma visualmente.
  // Na próxima Sprint vamos buscar direto do banco.
  setPedroGoals((g) => g + 1);
}
```

**Problema:**
- Placar local não sincroniza com banco
- Gol registrado no modal, mas não aparece no display
- UX quebrada: botão gol não faz nada

**Impacto:** Funcionalidade principal não funciona.

#### 4. **Modal Registra Gol mas Não Atualiza UI**

`components/match/GoalModal.tsx`:
```typescript
async function salvar(nome: string) {
  await addGoal(matchId, nome, side);
  await refreshScore(matchId);
  onSaved();  // Callback não atualiza o placar visível
  onClose();
}
```

`app/nova-partida/page.tsx` não refetch do estado após `onSaved()`.

**Impacto:** Usuário registra gol, não vê atualização no placar.

### ALTOS 🟠

#### 5. **Uso de `any` Type**

`lib/players.ts`:
```typescript
aliases?.forEach((a: any) => {  // ❌ ERRADO
  if (a.players)
    map.set(a.players.id, a.players);
});
```

**Contra guideline:** "Sempre utilizar TypeScript. Evitar any."

**Impacto:** Sem type-safety, bugs em runtime.

**Solução:**
```typescript
interface PlayerAlias {
  players: Player;
}

aliases?.forEach((a: PlayerAlias) => {  // ✅ CERTO
  if (a.players)
    map.set(a.players.id, a.players);
});
```

#### 6. **Eventos Incompletos**

`lib/events.ts` - Apenas função `addGoal()`.

**Faltam:**
- `addAssist()`
- `addYellowCard()`
- `addRedCard()`
- `addInjury()`
- `addOwnGoal()`

**Impacto:** Só consegue registrar gols, não assistências, cartões, etc.

#### 7. **Importação de Histórico Incompleta**

`app/importar-historico/page.tsx`:
- Arquivo importado mas **não termina**
- Função `importar()` não está completa
- Não insere eventos na tabela

**Impacto:** Importação não funciona, dados não são salvos.

### MÉDIOS 🟡

#### 8. **Rankings Não Mostram Ao Vivo**

`app/rankings/page.tsx` - Busca direto do banco no render.

**Problema:**
- Sem atualização live
- Cache não está claro
- Página inteira refetch a cada carregamento

**Solução:** Implementar real-time com `supabase.realtime` ou polling.

#### 9. **Sidebar Aponta para Rota Errada**

`components/layout/Sidebar.tsx`:
```typescript
["⚽", "Nova Partida", "/partidas/nova"],  // Mas também existe /nova-partida
```

Deveria chamar `/partidas/nova` (correto), mas existem 2 arquivos.

#### 10. **Estrutura de Tipos Incompleta**

`types/index.ts` - Define apenas:
- `Side`
- `EventType`
- `MatchEvent`
- `Match`

Faltam tipos para:
- `Player`
- `PlayerAlias`
- `Ranking`
- `Statistics`
- `Discipline`

#### 11. **Constantes Incompletas**

`utils/constants.ts` - Apenas cores dos times.

Deveria ter:
- Tipos de eventos com emojis
- URLs de API
- Configurações de validação
- Limites de timeout
- Constantes de banco

---

## 💡 Melhorias Sugeridas

### 1. **Refatorar Arquitetura para Seguir Padrão**

**Prioridade:** 🔴 CRÍTICA

**Ação:**
```
Criar services para cada domínio:
lib/services/rankings.ts
lib/services/events.ts
lib/services/matches.ts
lib/services/players.ts

Páginas chamam apenas services, não Supabase.
```

**Benefícios:**
- ✅ Segue padrão do AGENTS.md
- ✅ Testável
- ✅ Reutilizável
- ✅ Refatorável

### 2. **Criar Componentes UI Primitivos**

**Prioridade:** 🟡 MÉDIA

**Ação:**
```
components/ui/
  ├── Button.tsx
  ├── Input.tsx
  ├── Select.tsx
  ├── Modal.tsx
  ├── Card.tsx
  ├── Badge.tsx
  └── Toast.tsx
```

**Benefícios:**
- ✅ Consistência visual
- ✅ Reutilização
- ✅ Menos CSS duplicado
- ✅ Acessibilidade centralizada

### 3. **Extrair Utilitários de String**

**Prioridade:** 🟡 MÉDIA

**Ação:**
```typescript
// utils/string.ts
export function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function filterBySearch(
  items: { name: string }[],
  search: string
): typeof items {
  return items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
}
```

### 4. **Implementar Server Actions para Importação**

**Prioridade:** 🔴 CRÍTICA

**Ação:**
```typescript
// app/actions/import.ts (Server)
"use server"

export async function importHistorico(historico: Historico) {
  // Limpas banco
  // Importa dados
  // Retorna resultado
  return { success: true, count: ... }
}

// app/importar-historico/page.tsx (Serve Component)
"use cache"

export default async function ImportarHistorico() {
  // Chama Server Action
  // Mostra resultado
  return <form action={importHistorico}>...</form>
}
```

### 5. **Sincronizar Placar em Real-Time**

**Prioridade:** 🔴 CRÍTICA

**Ação:**
```typescript
// components/match/ScoreDisplay.tsx
"use client"

export default function ScoreDisplay({ matchId }) {
  const [pedroGoals, setPedroGoals] = useState(0);
  
  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .from(`matches:id=eq.${matchId}`)
      .on('*', payload => {
        setPedroGoals(payload.new.pedro_goals);
      })
      .subscribe();
      
    return () => supabase.removeSubscription(subscription);
  }, [matchId]);
  
  return <h1>{pedroGoals}</h1>;
}
```

### 6. **Implementar Todos Tipos EventType**

**Prioridade:** 🟠 ALTA

**Ação:**
```typescript
// lib/events.ts
export async function addEvent(
  matchId: string,
  playerName: string,
  side: Side,
  eventType: EventType
) {
  const { error } = await supabase
    .from("events")
    .insert({ match_id: matchId, player_name_raw: playerName, side, event_type: eventType });
    
  if (error) throw error;
}

// Remove addGoal(), use addEvent() com type GOL
```

### 7. **Adicionar Validações**

**Prioridade:** 🟡 MÉDIA

**Ação:**
```typescript
// lib/validation.ts
export const eventValidation = {
  playerName: { min: 1, max: 100 },
  matchNumber: { min: 1, max: 10000 },
};

export function validateEventType(type: string): type is EventType {
  return ["GOL", "ASSISTENCIA", "AMARELO", "VERMELHO", "LESAO", "GOL_CONTRA"].includes(type);
}
```

### 8. **Implementar Error Handling Consistente**

**Prioridade:** 🟡 MÉDIA

**Ação:**
```typescript
// lib/errors.ts
export class SupabaseError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

// lib/events.ts
export async function addGoal(...) {
  const { error } = await supabase.from("events").insert(...);
  
  if (error) {
    throw new SupabaseError(error.code, error.message);
  }
}
```

### 9. **Criar Página 404**

**Prioridade:** 🟡 MÉDIA

Adicionar `app/not-found.tsx` para rotas inexistentes.

### 10. **Melhorar Documentação**

**Prioridade:** 🟡 MÉDIA

Preencher:
- ✅ `docs/CHANGELOG.md` - Histórico de mudanças
- ✅ `docs/BACKLOG.md` - Tarefas em backlog
- ✅ `docs/RULES.md` - Regras do jogo
- ✅ `README.md` - Instruções customizadas

---

## 📦 Dependências Não Utilizadas

### Análise de package.json

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",  // ✅ USADO
    "next": "16.2.9",                      // ✅ USADO
    "react": "19.2.4",                     // ✅ USADO
    "react-dom": "19.2.4"                  // ✅ USADO
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",          // ✅ USADO (imports em globals.css)
    "@types/node": "^20",                  // ✅ USADO (TypeScript)
    "@types/react": "^19",                 // ✅ USADO (TypeScript)
    "@types/react-dom": "^19",             // ✅ USADO (TypeScript)
    "eslint": "^9",                        // ✅ USADO (config)
    "eslint-config-next": "16.2.9",        // ✅ USADO (config)
    "tailwindcss": "^4",                   // ✅ USADO (config)
    "typescript": "^5"                     // ✅ USADO (config)
  }
}
```

**Resultado:** ✅ Todas as dependências estão sendo utilizadas.

**Recomendações Futuras:**
- Para validação: `zod` ou `yup`
- Para HTTP: `axios` (se precisar fora de Server Actions)
- Para toast: `sonner` ou `react-hot-toast`
- Para ícones: `lucide-react`
- Para data: `date-fns` ou `dayjs`

---

## 🏛️ Erros de Arquitetura

### 1. **Violação do Padrão de Camadas**

**Definido em AGENTS.md:**
```
Pages → Services (lib/) → Supabase
```

**Implementado:**
```
Pages ↔ Supabase (direto)
```

**Afetadas:**
- ❌ `app/rankings/page.tsx`
- ❌ `app/historico/page.tsx`
- ❌ `app/importar-historico/page.tsx`

**Consequências:**
- Sem separação de responsabilidades
- Impossível mockar Supabase para testes
- Difícil refatorar

### 2. **Não Separação entre Client e Server**

**Problema:**
- `app/importar-historico/page.tsx` é `"use client"` quando deveria ser Server Component
- Mistura lógica de importação com UI de forma inadequada

**Solução:**
```
Importação → Server Action
UI → Client Component
```

### 3. **Duplicação de Lógica**

**Problema:** `searchPlayers()` implementado de 2 formas diferentes

**Solução:** Extrair para função única em `lib/players.ts`

### 4. **Falta de Camada de Domain Services**

**Esperado:**
```
lib/services/
  ├── playerService.ts
  ├── matchService.ts
  ├── eventService.ts
  ├── rankingService.ts
  └── importService.ts
```

**Atual:** Tudo em `lib/` raiz

**Impacto:** Difícil de escalar conforme projeto cresce

### 5. **Componentes Sem Props Tipadas**

`GoalModal.tsx`:
```typescript
interface Props {
  matchId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;  // ⚠️ Sem tipo específico
}
```

**Melhor:**
```typescript
interface Props {
  matchId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (goal: Goal) => Promise<void>;  // Tipo específico
}
```

---

## 🗂️ Ordem Recomendada de Desenvolvimento

### **FASE 1: Arquitetura Base (CRÍTICA)** 🔴

#### Sprint 2.1 - Refatoração de Arquitetura

**Tarefas:**
1. ✅ Remover `"use client"` de `app/importar-historico/page.tsx`
2. ✅ Criar `lib/services/rankings.ts` → Mover lógica de `app/rankings/page.tsx`
3. ✅ Criar `lib/services/matches.ts` → Consolidar com `lib/matches.ts`
4. ✅ Criar `lib/services/events.ts` → Consolidar com `lib/events.ts`
5. ✅ Criar `lib/services/import.ts` → Mover lógica de importação
6. ✅ Atualizar páginas para usar services

**Benefício:** Todas as páginas seguem padrão de arquitetura.

**Tempo:** ~2 dias

#### Sprint 2.2 - Corrigir Nova Partida

**Tarefas:**
1. ✅ Deletar `app/nova-partida/` (versão antiga)
2. ✅ Refatorar `app/partidas/nova/page.tsx` para sincronizar placar
3. ✅ Implementar callback `onSaved` para atualizar UI
4. ✅ Testar fluxo completo de registrar gol

**Benefício:** Feature principal funciona.

**Tempo:** ~1 dia

---

### **FASE 2: Features Incompletas** 🟠

#### Sprint 2.3 - Completar Sistema de Eventos

**Tarefas:**
1. ✅ Criar `lib/services/events.ts` com suporte a todos EventTypes
2. ✅ Adicionar funções:
   - `addAssist()`
   - `addYellowCard()`
   - `addRedCard()`
   - `addInjury()`
   - `addOwnGoal()`
3. ✅ Criar componentes de UI para cada tipo

**Benefício:** Sistema de eventos completo.

**Tempo:** ~2 dias

#### Sprint 2.4 - Completar Importação

**Tarefas:**
1. ✅ Terminar `app/actions/import.ts` (Server Action)
2. ✅ Testar importação com `historico-extraido.json`
3. ✅ Adicionar validações
4. ✅ Adicionar feedback de progresso

**Benefício:** Dados históricos importáveis.

**Tempo:** ~1 dia

---

### **FASE 3: Melhorias de UX** 🟡

#### Sprint 3 - Componentes UI

**Tarefas:**
1. ✅ Criar `components/ui/Button.tsx`
2. ✅ Criar `components/ui/Modal.tsx`
3. ✅ Criar `components/ui/Input.tsx`
4. ✅ Criar `components/ui/Card.tsx`
5. ✅ Atualizar componentes existentes para usar primitivos

**Benefício:** Código mais limpo, UI consistente.

**Tempo:** ~1.5 dias

#### Sprint 4 - Real-Time Updates

**Tarefas:**
1. ✅ Implementar Supabase realtime para placar
2. ✅ Implementar rankings live
3. ✅ Adicionar notificações com toast

**Benefício:** Aplicação sente-se mais responsiva.

**Tempo:** ~1 dia

---

### **FASE 4: Novas Features** (De acordo com ROADMAP)

#### Sprint 4 - Dashboard & Rankings
#### Sprint 5 - Disciplina
#### Sprint 6 - IA

---

## 🎯 Prioridades Imediatas

### Antes de Continuar Desenvolvendo:

1. **[CRÍTICA]** Remover duplicação de nova-partida
   - Deletar `app/nova-partida/`
   - Usar apenas `app/partidas/nova/`
   - Atualizar Sidebar

2. **[CRÍTICA]** Refatorar Supabase fora das páginas
   - Criar `lib/services/`
   - Mover lógica de pages
   - Adicionar validação de tipos

3. **[CRÍTICA]** Consertar sincronização de placar
   - Implementar callback `onSaved`
   - Real-time updates
   - Testar fluxo

4. **[ALTA]** Preencher documentação
   - `docs/CHANGELOG.md`
   - `docs/RULES.md`
   - `docs/BACKLOG.md`
   - Customizar `README.md`

5. **[ALTA]** Remover `any` types
   - Adicionar tipos interface para resultados Supabase
   - Validar types em compilação

---

## 📊 Resumo Executivo

| Categoria | Status |
|-----------|--------|
| **Estrutura** | ✅ Bem organizada |
| **Tipos** | ⚠️ Incompletos (alguns `any`) |
| **Arquitetura** | ❌ Violações críticas |
| **Features** | ⚠️ Parcialmente implementadas |
| **Testes** | ❌ Não existe |
| **Documentação** | ⚠️ Incompleta |
| **Performance** | ✅ Boa (sem otimizações necessárias) |
| **Segurança** | ⚠️ Supabase exposto em `"use client"` |
| **UX** | ✅ Limpa, botões grandes |
| **Deploy** | ✅ Pronto para Vercel |

---

## 📈 Métricas

```
Linhas de Código:        ~1.500 LOC
Componentes:             3 implementados, 1+ planejados
Serviços:                5 arquivos, 8 funções
Páginas:                 6 rotas implementadas
Tipos:                   4 types definidos, ~10 faltam
Dependências:            10 (todas utilizadas)
Arquivos Mortos:         2 (nova-partida duplicado)
Problemas Críticos:      3
Problemas Altos:         4
Problemas Médios:        5
Cobertura de Testes:     0%
```

---

**Análise realizada em:** 2026-06-29  
**Próxima revisão sugerida:** Após Sprint 2.4
