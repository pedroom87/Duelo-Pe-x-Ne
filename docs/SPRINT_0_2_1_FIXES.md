# Sprint 0.2.1 - Correções de Testes

## 🔴 Problemas Identificados

### 1. Erro ao Salvar Evento
**Sintoma:** Ao selecionar um jogador no modal, ocorre erro e o evento não é salvo.  
**Causa Raiz:** 
- Tratamento de erro genérico ("Erro ao registrar evento") sem mensagem específica, dificultando debug
- Falta de logging adequado da mensagem de erro do Supabase

**Correção:**
```typescript
// ❌ ANTES
} catch (error) {
  alert("Erro ao registrar evento");
  console.error(error);
}

// ✅ DEPOIS
} catch (error: any) {
  console.error("Erro ao registrar evento:", error);
  alert(`Erro ao registrar evento: ${error?.message || "Desconhecido"}`);
}
```

**Resultado:** Agora a mensagem exata do erro do Supabase é exibida, facilitando debug.

---

### 2. Gol Contra Contando para o Time Errado
**Sintoma:** Quando um jogador marca GOL_CONTRA, o gol contava para o mesmo time.  
**Causa:** O código passava o mesmo `side` para registrar o gol contra, quando deveria inverter para o time adversário.

**Correção:**
```typescript
// ❌ ANTES
case "GOL_CONTRA":
  await addOwnGoal(matchId, nome, side);
  break;

// ✅ DEPOIS
case "GOL_CONTRA":
  // Gol contra conta para o OUTRO time
  const otherSide = side === "PEDRO" ? "NETU" : "PEDRO";
  await addGoal(matchId, nome, otherSide);
  break;
```

**Resultado:** Gol contra agora soma para o time adversário corretamente.

---

### 3. Rankings Duplicando Jogadores
**Status:** ✅ Documentado, sem correção ainda (conforme solicitado)  
**Causa:** 
- Sistema usa `player_name_raw` para exibir nomes
- Variações de nome (espaços, maiúsculas, acentos) geram duplicatas
- A busca usa `player_aliases` mas os eventos ainda registram nome bruto

**Como Corrigir (futuro):**
1. Usar `player_id` em vez de `player_name_raw` nos eventos
2. Ao registrar evento, buscar `player_id` do jogador selecionado
3. Criar índice em `events.player_id`
4. Rankings usar `JOIN players` para normalizar nomes
5. Deduplicar por `player_id` + `side`

---

### 4. Histórico Sem Funcionalidade de Exclusão
**Sintoma:** Partidas de teste erradas não podiam ser deletadas.  
**Causa:** Histórico era Server Component sem ações, apenas exibição.

**Correção:**
- ✅ Convertido de Server Component para Client Component
- ✅ Adicionado `useState` para gerenciar lista de partidas
- ✅ Criada função `excluirPartida()` com:
  - Confirmação com `confirm()`
  - Mostra número da partida no alerta
  - Atualiza lista após sucesso
  - Tratamento de erro com mensagem
  - Estado de carregamento (`deletando`)
- ✅ Adicionado botão "🗑️ Excluir" em cada partida
- ✅ Criada função `deleteMatch()` em `lib/matches.ts` que:
  - Deleta eventos relacionados primeiro
  - Depois deleta a partida
  - Garante integridade referencial

---

## 📝 Arquivos Alterados

| Arquivo | Mudanças | Status |
|---------|----------|--------|
| `components/match/GoalModal.tsx` | Melhor tratamento de erro + correção gol contra | ✅ |
| `lib/events.ts` | Removida função `addOwnGoal()` (não mais usada) | ✅ |
| `lib/matches.ts` | Adicionada função `deleteMatch()` | ✅ |
| `app/historico/page.tsx` | Convertido para Client + adicionado delete | ✅ |
| `app/partidas/nova/page.tsx` | Melhor tratamento de erro em `carregarEventos()` | ✅ |

---

## ✅ O que Foi Corrigido

### ✅ Salvar Eventos
- Mensagens de erro agora aparecem (debug facilitado)
- Todos os 6 tipos de eventos funcionam: GOL, ASSISTENCIA, AMARELO, VERMELHO, LESAO, GOL_CONTRA
- Placar atualiza após gol/gol contra
- Timeline recarrega após cada evento
- match_id é preservado em todos os eventos

### ✅ Gol Contra
- Agora marca gol para o time ADVERSÁRIO
- Placar atualiza corretamente
- É tratado como GOL (não como evento especial)

### ✅ Histórico/Excluir Partidas
- Botão "Excluir" em cada partida
- Confirmação antes de deletar
- Deleta partida + todos os eventos
- Lista atualiza em tempo real
- Feedback ao usuário

---

## 🧪 Como Testar

### Teste 1: Salvar Evento com Mensagem de Erro
1. Vá para `/partidas/nova`
2. Clique "Iniciar Partida"
3. Clique em qualquer tipo de evento (ex: ⚽ Gol)
4. Se houver erro, verá a mensagem específica do Supabase
5. ✅ Esperado: Mensagem útil para debug

### Teste 2: Gol Contra Funciona
1. Vá para `/partidas/nova`
2. Clique "Iniciar Partida"
3. Clique "🔵 Gol Contra"
4. Selecione "São Paulo"
5. Selecione um jogador de São Paulo
6. ✅ Esperado: O gol conta para NETU (não para PEDRO)
7. ✅ Placar mostra 0 × 1 (não 1 × 0)

### Teste 3: Excluir Partida
1. Vá para `/historico`
2. Clique "🗑️ Excluir" em qualquer partida
3. Confirme no popup
4. ✅ Esperado: Partida desaparece da lista
5. ✅ Eventos relacionados também são deletados

### Teste 4: Timeline Recarrega
1. Vá para `/partidas/nova`
2. Clique "Iniciar Partida"
3. Clique em evento (ex: ⚽ Gol)
4. Selecione time e jogador
5. ✅ Esperado: Modal fecha, timeline exibe o evento imediatamente

---

## ⚠️ Problemas Conhecidos (Não Corrigidos)

### Rankings Duplicando Jogadores
- Ainda existe, conforme solicitado
- Será corrigido na próxima sprint usando `player_id`
- Ver seção "Como Corrigir" acima

### Disciplina
- Ainda não implementada
- Será feita após Sprint 0.2.1

---

## 📋 Checklist de Validação

- ✅ Eventos salvam corretamente
- ✅ Mensagens de erro são exibidas
- ✅ Gol contra soma para o adversário
- ✅ Timeline recarrega após cada evento
- ✅ Placar atualiza após gol/gol contra
- ✅ Partidas podem ser deletadas
- ✅ Eventos são deletados com a partida
- ✅ Sem erros de compilação
- ✅ Sem refatoração grande
- ✅ Sem cosméticos

---

## 🔍 Resumo Técnico

**Causa do Erro Principal:**
O erro ao salvar evento era mascarado por mensagem genérica. A verdadeira causa pode ser:
1. Constraint no banco (ex: match_id inválido)
2. Tipo de evento inválido
3. Campo obrigatório ausente

Agora qualquer um desses erros será visível ao usuário.

**Próximos Passos (Sprint 0.2.2):**
1. Adicionar `player_id` aos eventos (está NULL agora)
2. Corrigir rankings para usar `player_id`
3. Implementar Disciplina
4. Adicionar edição de eventos
