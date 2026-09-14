# Divisor de Contas de Viagem Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/split-de-contas/spec.md`
**Status**: Done

---

## Test Coverage Matrix

| Layer               | Requirement(s)                | Test type   | File                                          |
| -------------------- | ------------------------------ | ----------- | ---------------------------------------------- |
| Domain (split)        | TRIP-04                        | unit        | `backend/src/tests/expense.test.ts`            |
| Domain (duplicidade)  | TRIP-02                        | integration | `backend/src/tests/expense.test.ts`            |
| Domain (saldos)       | TRIP-05, TRIP-06                | integration | `backend/src/tests/expense.test.ts`            |
| Domain (validação)    | TRIP-08                        | integration | `backend/src/tests/expense.test.ts`            |
| Routes (HTTP)         | TRIP-01, TRIP-03, TRIP-07       | manual smoke (curl end-to-end) | `backend/src/routes/trips.ts`      |
| UI                    | TRIP-09                        | manual smoke (fluxo completo no navegador) | `frontend/app.js` |

## Gate Check Commands

- **quick**: `cd backend && npm run build` (compilação TypeScript limpa)
- **full**: `cd backend && npm run build && node dist/db/migrate.js && node --test dist/tests/*.test.js` (migração + suíte completa contra Postgres)

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

```
T1 -> T2
```

### Phase 2: Core Implementation

```
T2 -> T3
T3 -> T4
T4 -> T5
T3 -> T6
T4 -> T6
T5 -> T6
```

### Phase 3: Integration & Delivery

```
T6 -> T7
T6 -> T8
T8 -> T9
```

### Phase 4: Hardening (persistência real)

```
T9 -> T10
```

---

## Task Breakdown

### T1: Setup do projeto backend

**What**: Inicializar `package.json` e `tsconfig.json` do backend com as dependências base (Express, TypeScript).
**Where**: `backend/package.json`, `backend/tsconfig.json`
**Depends on**: None
**Reuses**: N/A (primeira task)
**Requirement**: N/A (infraestrutura)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm install` roda sem erro
- [x] `npx tsc --noEmit` roda sem erro de configuração

**Tests**: none
**Gate**: quick

**Commit**: `chore(backend): setup do projeto (deps, tsconfig)`

---

### T2: Schema do banco + tipos compartilhados

**What**: Definir as tabelas (`trips`, `participants`, `expenses`, `expense_shares`) e os tipos TypeScript compartilhados entre services e rotas.
**Where**: `backend/src/db/schema.ts`
**Depends on**: T1
**Reuses**: N/A
**Requirement**: TRIP-01, TRIP-02, TRIP-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Tabelas cobrem todos os campos usados pelos services (ver `backend/src/db/schema.ts:7-40`)
- [x] Chaves estrangeiras com `ON DELETE CASCADE` de participante/despesa para viagem

**Tests**: none
**Gate**: quick

**Commit**: `feat(backend): schema do Postgres via Drizzle + tipos compartilhados`

---

### T3: tripService - criar viagem e participantes

**What**: Implementar `createTrip`, `getTrip`, `listParticipants` e `addParticipant` com validação de duplicidade case-insensitive.
**Where**: `backend/src/services/tripService.ts`
**Depends on**: T2
**Reuses**: `backend/src/db/schema.ts` (tabelas `trips`, `participants`)
**Requirement**: TRIP-01, TRIP-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nome de viagem vazio é rejeitado (`backend/src/services/tripService.ts:10`)
- [x] Participante duplicado (case-insensitive) é rejeitado (`backend/src/services/tripService.ts:46-52`)
- [x] Gate check passa: `cd backend && npm run build`

**Tests**: integration
**Gate**: quick

**Commit**: `feat(backend): tripService - criar viagem e participantes (TRIP-01, TRIP-02)`

---

### T4: expenseService - registrar despesa e divisão igualitária

**What**: Implementar `addExpense` (com validações) e `splitEqually` (divisão igual com distribuição de resto em centavos).
**Where**: `backend/src/services/expenseService.ts`
**Depends on**: T3
**Reuses**: `getTrip` de `tripService.ts`
**Requirement**: TRIP-03, TRIP-04, TRIP-07, TRIP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `splitEqually(100, [p1,p2,p3])` retorna 34/33/33 e soma 100
- [x] Despesa com valor ≤ 0, pagador inválido ou split vazio é rejeitada (`backend/src/services/expenseService.ts:33-56`)
- [x] Insere despesa + rateios em uma transação (`backend/src/services/expenseService.ts:75-92`)
- [x] Gate check passa: `cd backend && npm run build`

**Tests**: unit + integration
**Gate**: quick

**Commit**: `feat(backend): expenseService - divisao igualitaria e validacao (TRIP-03, TRIP-04, TRIP-08)`

---

### T5: balanceService - saldos e settle-up guloso

**What**: Implementar `getBalances` (saldo = pago − consumido) e `getSettlements` (algoritmo guloso maior-credor-recebe-do-maior-devedor).
**Where**: `backend/src/services/balanceService.ts`
**Depends on**: T4
**Reuses**: `getTrip`/`listParticipants` de `tripService.ts`
**Requirement**: TRIP-05, TRIP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Soma de todos os saldos de uma viagem é sempre zero (`backend/src/services/balanceService.ts:34-38`)
- [x] Settle-up gera no máximo N-1 transações e zera os saldos (`backend/src/services/balanceService.ts:42-79`)
- [x] Gate check passa: `cd backend && npm run build`

**Tests**: integration
**Gate**: quick

**Commit**: `feat(backend): balanceService - saldos e settle-up guloso (TRIP-05, TRIP-06)`

---

### T6: Rotas Express + error handler central

**What**: Expor os services via HTTP fino, mapeando `ValidationError`/`NotFoundError` para os status corretos.
**Where**: `backend/src/routes/trips.ts`
**Depends on**: T3, T4, T5
**Reuses**: todos os services das tasks anteriores
**Requirement**: TRIP-01, TRIP-02, TRIP-03, TRIP-04, TRIP-05, TRIP-06, TRIP-07, TRIP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cada rota chama o service correspondente e devolve o status certo (400/404/2xx)
- [x] Gate check passa: `cd backend && npm run build`

**Tests**: manual smoke (curl end-to-end)
**Gate**: quick

**Commit**: `feat(backend): rotas Express + error handler central (TRIP-01..TRIP-08)`

---

### T7: Testes automatizados (coverage matrix)

**What**: Cobrir TRIP-02, TRIP-04, TRIP-05, TRIP-06 e TRIP-08 com testes automatizados contra Postgres real.
**Where**: `backend/src/tests/expense.test.ts`
**Depends on**: T6
**Reuses**: services das tasks T3-T5
**Requirement**: TRIP-02, TRIP-04, TRIP-05, TRIP-06, TRIP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Gate check passa: `cd backend && npm run build && node dist/db/migrate.js && node --test dist/tests/*.test.js`
- [x] Test count: 8 testes passam (0 falhas)

**Tests**: integration
**Gate**: full

**Commit**: `test(backend): cobertura automatizada TRIP-02/04/05/06/08 (8/8 passando)`

---

### T8: Frontend estático consumindo a API

**What**: Página HTML/CSS/JS (sem build tool) para criar viagem, adicionar participantes/despesas e ver saldos/quitação.
**Where**: `frontend/app.js`
**Depends on**: T6
**Reuses**: contrato JSON das rotas de T6
**Requirement**: TRIP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Fluxo completo (criar viagem → participantes → despesa → saldos/quitação) funciona sem chamar a API manualmente

**Tests**: manual smoke (fluxo completo no navegador)
**Gate**: quick

**Commit**: `feat(frontend): UI estatica consumindo a API (TRIP-09)`

---

### T9: Servir frontend estático pelo Express

**What**: Express serve os arquivos estáticos do frontend, um único processo (`npm start`) para tudo.
**Where**: `backend/src/index.ts`
**Depends on**: T8
**Reuses**: rotas de T6
**Requirement**: TRIP-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `GET /` responde 200 com o HTML do frontend
- [x] `npm start` sobe API + frontend juntos

**Tests**: manual smoke
**Gate**: quick

**Commit**: `feat(backend): servir frontend estatico + script unico de start`

---

### T10: Migrar SQLite → PostgreSQL (persistência real no deploy)

**What**: Trocar a camada de dados de SQLite/`node:sqlite` para PostgreSQL via Drizzle ORM, com migração DDL idempotente e SSL automático fora de localhost, para os dados sobreviverem a redeploys no Render.
**Where**: `backend/src/db/index.ts`, `backend/src/db/migrate.ts`
**Depends on**: T9
**Reuses**: schema de T2 (portado para `pgTable`)
**Requirement**: TRIP-01 .. TRIP-09 (infraestrutura transversal - persistência)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `DATABASE_URL` ausente falha alto e cedo com mensagem explicativa (`backend/src/db/index.ts`)
- [x] SSL habilitado automaticamente fora de `localhost`/`127.0.0.1`
- [x] Gate check passa: `cd backend && npm run build && node dist/db/migrate.js && node --test dist/tests/*.test.js`
- [x] Test count: 8 testes passam (0 falhas) - mesma suíte de T7, agora contra Postgres

**Tests**: integration
**Gate**: full

**Commit**: `fix(backend): migrar SQLite para PostgreSQL via Drizzle (persistencia real no deploy)`
