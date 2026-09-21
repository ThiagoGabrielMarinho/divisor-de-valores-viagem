# Tasks — backend completo da conta compartilhada

**Spec:** `docs/features/backend-conta-compartilhada/spec.md`  
**Design:** `docs/features/backend-conta-compartilhada/design.md`  
**Status:** Proposed — segurança precisa de Discuss final

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Auth/domain | unit + integration | ACs, hash, sessão, expiração, erros e rate limit decidido | `backend/src/tests/*.test.ts` | `npm test` |
| Services/database | integration | Transações, FKs, estados, idempotência e concorrência relevante | `backend/src/tests/*.test.ts` | `npm test` |
| HTTP | integration HTTP | Happy path, 400, 401, 403, 404, 409 e payload exato | `backend/src/tests/*.test.ts` | `npm test` |
| Migration | integration PostgreSQL | Banco vazio, schema existente e aplicação repetida | `backend/src/tests/*.test.ts` | `npm test` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Build | `npm run build` |
| Full | `npm test` |
| Spec | `python .kiro/scripts/validate_spec.py docs/features/backend-conta-compartilhada/spec.md --root .` |
| Tasks | `python .kiro/scripts/validate_tasks.py docs/features/backend-conta-compartilhada/tasks.md --root .` |
| Commit | `python .kiro/scripts/check_commit.py --message "<task message>"` |

## Execution Plan

### Phase 1: schema and boot

```text
T1 -> T2
```

### Phase 2: identity and authorization

```text
T2 -> T3 -> T4 -> T5
```

### Phase 3: financial domain

```text
T5 -> T6 -> T7 -> T8 -> T9
```

### Phase 4: HTTP and closure

```text
T9 -> T10 -> T11 -> T12
```

## Task Breakdown

### T1: Alinhar schema SQL e Drizzle

**Status**: Proposed
**What**: Fazer `backend/src/db/schema.ts` representar exatamente `backend/db/schema.sql`, incluindo users, trips, memberships, expenses, shares e obligations; corrigir nomes/constraints divergentes.
**Where**: `backend/src/db/schema.ts`
**Depends on**: None
**Requirement**: DB-01..DB-20
**Tests**: build + integração que verifica as tabelas e constraints esperadas
**Gate**: `npm test`
**Done when**: Drizzle e SQL usam os mesmos nomes, tipos, FKs, checks e índices.
**Commit**: `feat(db): align drizzle schema with postgres ddl`

### T2: Integrar schema ao boot/migração

**Status**: Proposed
**What**: Fazer `runMigrations()` aplicar o schema real idempotente no boot e manter comando manual, sem credenciais hardcoded.
**Where**: `backend/src/db/migrate.ts`
**Depends on**: T1
**Requirement**: DB-01..DB-20
**Tests**: banco vazio, aplicação repetida e banco já criado
**Gate**: `npm test`
**Done when**: boot e `db:migrate` criam/reaplicam todas as tabelas sem apagar dados.
**Commit**: `feat(db): run shared schema migration on boot`

### T3: Implementar usuários e hash de senha

**Status**: Proposed
**What**: Criar service de usuários com cadastro, email case-insensitive e hash seguro; remover dependência de senha em texto.
**Where**: `backend/src/services/authService.ts`
**Depends on**: T2
**Requirement**: API-01, API-02
**Tests**: unit/integration de cadastro, duplicidade, hash e mensagens neutras
**Gate**: `npm test`
**Done when**: nenhuma senha em texto é persistida e cadastro inválido retorna erro definido.
**Commit**: `feat(auth): add secure user registration`

### T4: Implementar sessão e logout

**Status**: Proposed
**What**: Criar sessão real conforme decisão de cookie/expiração e invalidar no logout.
**Where**: `backend/src/services/authService.ts`
**Depends on**: T3
**Requirement**: API-01, API-02, API-06
**Tests**: sessão válida, expiração, logout, repetição e ausência
**Gate**: `npm test`
**Done when**: sessão não expõe credencial e logout invalida acesso protegido.
**Commit**: `feat(auth): add session lifecycle`

### T5: Proteger rotas e memberships

**Status**: Proposed
**What**: Adicionar middleware de sessão e autorização owner/member em todas as operações de viagem.
**Where**: `backend/src/middleware/auth.ts`
**Depends on**: T4
**Requirement**: API-03..API-05, API-07..API-09
**Tests**: HTTP 401, 403, membership válida, owner/member e isolamento
**Gate**: `npm test`
**Done when**: UUID sozinho não contorna autorização e papéis restringem ações.
**Commit**: `feat(auth): protect trip routes by membership`

### T6: Adaptar viagens e despesas ao usuário real

**Status**: Proposed
**What**: Adaptar services de viagem/despesa para users/memberships reais, mantendo transação de expense + shares.
**Where**: `backend/src/services/expenseService.ts`
**Depends on**: T5
**Requirement**: API-07..API-12
**Tests**: criação autorizada, membership, validações, atomicidade e valores em centavos
**Gate**: `npm test`
**Done when**: despesas são gravadas para viagem autorizada com pagador/membros existentes.
**Commit**: `feat(expenses): persist authorized user expenses`

### T7: Implementar obrigações e transições de pagamento

**Status**: Proposed
**What**: Criar service de obrigações com pendente, declaração pelo devedor, confirmação/recusa pelo recebedor e transições idempotentes.
**Where**: `backend/src/services/obligationService.ts`
**Depends on**: T6
**Requirement**: API-13..API-17
**Tests**: estados válidos/inválidos, papéis, confirmação concorrente e saldo pendente
**Gate**: `npm test`
**Done when**: apenas o recebedor conclui e cada transição gera estado persistido consistente.
**Commit**: `feat(payments): implement obligation state transitions`

### T8: Implementar prazos

**Status**: Proposed
**What**: Permitir ao recebedor definir prazo por obrigação e consultar status temporal.
**Where**: `backend/src/services/obligationService.ts`
**Depends on**: T7
**Requirement**: API-18
**Tests**: prazo, timezone definido, atraso, ausência e permissão
**Gate**: `npm test`
**Done when**: status temporal é determinístico e prazo só pode ser alterado pelo recebedor.
**Commit**: `feat(payments): add obligation deadlines`

### T9: Implementar reset seguro

**Status**: Proposed
**What**: Implementar reset owner-only, confirmado, transacional e bloqueado se houver obrigação concluída.
**Where**: `backend/src/services/resetService.ts`
**Depends on**: T8
**Requirement**: API-19..API-21
**Tests**: owner/member, confirmação, 409 após concluído, atomicidade e concorrência
**Gate**: `npm test`
**Done when**: reset apaga somente a viagem autorizada e nunca apaga após pagamento concluído.
**Commit**: `feat(trips): add guarded expense reset service`

### T10: Implementar resumo global com netting

**Status**: Proposed
**What**: Agregar obrigações pendentes por par de users, aplicar netting e detalhar por viagem.
**Where**: `backend/src/services/globalBalanceService.ts`
**Depends on**: T9
**Requirement**: API-22..API-25
**Tests**: múltiplas viagens, valores opostos, concluídos, isolamento e detalhes
**Gate**: `npm test`
**Done when**: o resumo retorna líquido por pessoa sem incluir dados não autorizados/concluídos.
**Commit**: `feat(balance): add global netted summary service`

### T11: Expor rotas HTTP e atualizar app

**Status**: Proposed
**What**: Expor auth, account, memberships, obligations, deadlines, reset e summary em rotas finas e montar middleware no app.
**Where**: `backend/src/routes/account.ts`
**Depends on**: T10
**Requirement**: API-01..API-25
**Tests**: integração HTTP de status, payload, erros e autorização para cada rota
**Gate**: `npm test`
**Done when**: contratos HTTP estão documentados e todos os caminhos de erro possuem assertions exatas.
**Commit**: `feat(api): expose shared account backend routes`

### T12: Documentar contratos e executar Verifier

**Status**: Proposed
**What**: Atualizar docs de API/dados/arquitetura/testes e produzir validação independente com evidência e mutações em scratch.
**Where**: `docs/api.md`
**Depends on**: T11
**Requirement**: todos os API/DB
**Tests**: gate full, revisão de contratos e Verifier
**Gate**: `npm run build` + `npm test`
**Done when**: docs refletem o backend real e o Verifier registra PASS com evidência `file:line`.
**Commit**: `docs(backend): document shared account contracts`

## Task Integrity Rules

- Cada task é um deliverable coeso e inclui seus próprios testes.
- Nenhuma senha ou credencial deve entrar no repositório.
- Cada task concluída recebe exatamente um commit local.
- Tasks concluídas permanecem neste arquivo.
- Push, deploy e banco de produção exigem autorização separada.
