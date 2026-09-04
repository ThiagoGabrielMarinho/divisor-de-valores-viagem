# Design: Divisor de Contas de Viagem em Grupo

## Modelos de dados (SQLite)

```
trips(id TEXT PK, name TEXT, currency TEXT DEFAULT 'BRL', created_at TEXT)
participants(id TEXT PK, trip_id TEXT FK, name TEXT)
  UNIQUE(trip_id, name)
expenses(id TEXT PK, trip_id TEXT FK, description TEXT, amount_cents INTEGER,
          paid_by TEXT FK->participants.id, created_at TEXT)
expense_shares(expense_id TEXT FK, participant_id TEXT FK, share_cents INTEGER)
```

Valores monetários são armazenados em **centavos (inteiros)** para evitar erros de ponto flutuante (R5 exige soma exata = 0).

## Componentes

### 1. `db/schema.ts`
- Localização: `backend/src/db/`
- Responsabilidade: inicializar o SQLite e criar as tabelas acima se não existirem.
- Reaproveita: `better-sqlite3` (síncrono, simples, sem necessidade de ORM para este escopo).

### 2. `services/tripService.ts`
- Purpose: CRUD de trips e participants (R1, R2).
- Interfaces: `createTrip(name)`, `addParticipant(tripId, name)`, `getTrip(tripId)`.
- Valida nomes duplicados (R2) lançando erro tipado `ValidationError`.

### 3. `services/expenseService.ts`
- Purpose: registrar despesas e calcular a divisão (R3, R4, R8).
- Interfaces: `addExpense(tripId, {description, amountCents, paidBy, splitAmong})`, `listExpenses(tripId)`.
- Algoritmo de divisão (R4): `base = floor(amount / n)`, `resto = amount - base*n`; os primeiros `resto` participantes de `splitAmong` (na ordem enviada) recebem `base + 1`, os demais recebem `base`.

### 4. `services/balanceService.ts`
- Purpose: calcular saldos (R5) e a lista simplificada de quitação (R6).
- Interfaces: `getBalances(tripId)`, `getSettlements(tripId)`.
- Algoritmo de settle-up (guloso, min-cash-flow):
  1. Calcular saldo líquido de cada participante (pago − consumido).
  2. Separar em duas listas: credores (saldo > 0) e devedores (saldo < 0), ordenadas por magnitude decrescente.
  3. Repetir: pegar o maior credor e o maior devedor; transação = min(credor.saldo, |devedor.saldo|); registrar transação; abater dos dois saldos; remover quem zerou; repetir até não sobrar ninguém.
  4. Isso não garante o mínimo teórico absoluto de transações em todos os casos (esse é um problema NP-difícil em geral), mas é uma boa aproximação gulosa padrão de mercado (mesmo approach usado por apps como Splitwise) — documentado como trade-off aceito.

### 5. `routes/*.ts`
- Camada HTTP fina, só valida shape da request e chama os services. Erros de validação → 400 com `{error: mensagem}`.

### 6. Frontend (`frontend/`)
- Uma página estática (`index.html` + `app.js` + `style.css`), sem framework/build.
- Estado simples em memória no navegador (`currentTripId` em variável JS), sincronizado via fetch a cada ação.
- Fluxo: criar viagem → adicionar participantes → registrar despesas → ver saldos/quitação, tudo na mesma tela, sem reload.

## Diagrama de fluxo

```
[Browser] --fetch--> [Express routes] --> [services] --> [better-sqlite3] --> arquivo .db
                                             |
                                             +--> balanceService (calcula em memória a partir das rows)
```

## Cobertura de testes planejada (test-coverage matrix)

| Requisito | Teste |
|-----------|-------|
| R2 | participante duplicado retorna 400 |
| R4 | divisão de 100 (R$1,00) entre 3 pessoas → 34/33/33 centavos |
| R5 | soma de saldos de uma viagem com N despesas = 0 |
| R6 | settle-up com 3 pessoas gera no máximo N-1 transações |
| R8 | despesa com valor ≤ 0, pagador inválido, ou split vazio → 400 |
