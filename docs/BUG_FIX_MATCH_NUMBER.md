# Bug Fix: Partida - match_number NOT NULL

## 🐛 Bug Encontrado

**Erro:**
```
null value in column "match_number" of relation "events" violates not-null constraint
```

**Local:** `lib/events.ts` - função `addEvent()`

---

## 📍 Análise da Causa Raiz

### Stack do Erro:

1. **Página:** `app/partidas/nova/page.tsx`
   - Usuário clica em botão de evento (⚽, 🎯, 🟨, etc)
   - Abre `<EventModal matchId={match.id} />`
   
2. **Componente:** `components/match/GoalModal.tsx`
   - Usuário seleciona jogador
   - Chama `await addGoal(matchId, playerName, side)`
   
3. **Serviço:** `lib/events.ts` - `addGoal()`
   - Chama `addEvent(matchId, playerName, side, "GOL")`
   
4. **BUG - `addEvent()`:**
   ```typescript
   // ❌ ANTES (ERRADO)
   const { error } = await supabase.from("events").insert({
     match_id: matchId,           // ✅ Presente
     player_name_raw: playerName, // ✅ Presente
     side,                         // ✅ Presente
     event_type: eventType,        // ✅ Presente
     // ❌ FALTA: match_number
   });
   ```

### Por Que o Banco Rejeitou:

A tabela `events` em Supabase tem schema:
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  match_number INTEGER NOT NULL,  ← ❌ EXIGIDO!
  player_name_raw TEXT NOT NULL,
  side TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

O `match_number` é `NOT NULL`, mas estava sendo inserido como NULL.

---

## ✅ Solução Implementada

### Antes (Errado):
```typescript
export async function addEvent(
  matchId: string,
  playerName: string,
  side: Side,
  eventType: EventType
) {
  const { error } = await supabase.from("events").insert({
    match_id: matchId,
    player_name_raw: playerName,
    side,
    event_type: eventType,
  });
  if (error) throw error;
}
```

### Depois (Correto):
```typescript
export async function addEvent(
  matchId: string,
  playerName: string,
  side: Side,
  eventType: EventType
) {
  // 1. Busca a partida para obter match_number
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("match_number")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new Error(`Partida não encontrada (ID: ${matchId})`);
  }

  // 2. Insere o evento com match_number
  const { error } = await supabase.from("events").insert({
    match_id: matchId,
    match_number: match.match_number,  // ← ✅ AGORA PRESENTE
    player_name_raw: playerName,
    side,
    event_type: eventType,
  });

  if (error) throw error;
}
```

---

## 🔧 O Que Foi Feito

### ✅ Centralização em `lib/events.ts`
- Função `addEvent()` agora busca `match_number` antes de inserir
- Erro amigável se partida não existir: `Partida não encontrada (ID: ...)`
- Nenhuma página acessa banco direto para eventos

### ✅ Garantias
- ✅ Nunca assume `match_number`
- ✅ Busca a partida usando `match_id`
- ✅ Lê o campo `match_number`
- ✅ Insere evento com `match_id` e `match_number`
- ✅ Erro amigável se partida não existir
- ✅ Lógica centralizada em `lib/`

### ✅ Impacto
- ✅ `addEvent()` agora funciona corretamente
- ✅ Todas as funções derivadas funcionam: `addGoal()`, `addAssist()`, `addYellowCard()`, `addRedCard()`, `addInjury()`, `addOwnGoal()`
- ✅ Fluxo de partida agora salva eventos corretamente
- ✅ Placar atualiza corretamente

---

## 🧪 Como Testar

### Teste 1: Registrar Evento
1. Vá para `/partidas/nova`
2. Clique "Iniciar Partida"
3. Clique em ⚽ (Gol)
4. Selecione "São Paulo"
5. Selecione um jogador
6. ✅ Esperado: Evento salvo sem erro
7. ✅ Timeline mostra o evento
8. ✅ Placar atualiza

### Teste 2: Todos os Tipos
- 🎯 Assistência
- 🟨 Amarelo
- 🟥 Vermelho
- 🤕 Lesão
- 🔵 Gol Contra

Todos devem salvar sem erro.

### Teste 3: Erro Amigável
1. Abra DevTools Console
2. Modifique o `matchId` passado ao modal para um valor inválido
3. Tente registrar evento
4. ✅ Esperado: Erro "Partida não encontrada"

---

## 📊 Mudanças

| Arquivo | Mudança | Status |
|---------|---------|--------|
| `lib/events.ts` | `addEvent()` agora busca match_number | ✅ Corrigido |

---

## ⚠️ Notas Importantes

### 1. Performance
- Cada evento registrado faz 1 query SELECT na tabela `matches`
- Impacto mínimo (SELECT simples por ID)
- Futuro: Pode passar `match_number` como parâmetro opcional para evitar query

### 2. player_id
- Ainda está NULL nos eventos (como antes)
- Será abordado em futura sprint quando implementar busca por player_id
- Rankings precisarão usar `player_aliases` entretanto

### 3. Páginas que Acessam Banco Direto
Existem acessos em:
- `app/importar-historico/page.tsx` (OK, é operação especial de importação)
- `app/historico/page.tsx` (Poderia usar serviço em lib/, mas não é crítico)

---

## 🎯 Resumo

**Problema:**
- Função `addEvent()` não incluía `match_number` ao inserir eventos
- Tabela `events` exige `match_number` (NOT NULL)
- Resultado: "not-null constraint violation"

**Solução:**
- `addEvent()` agora busca `match_number` da partida antes de inserir
- Centralizado em `lib/events.ts`
- Erro amigável se partida não existir

**Resultado:**
- ✅ Eventos salvam corretamente
- ✅ Placar atualiza
- ✅ Timeline funciona
- ✅ Fluxo de partida completo
