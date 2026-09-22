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

**Status**: Done
**What**: Adicionar ao `backend/src/db/schema.ts` as novas entidades `users`, `trip_memberships` e `obligations`, mantendo os exports legados (`trips`, `participants`, `expenses`, `expenseShares`) até a migração dos services nas tasks seguintes. A compatibilidade com as tabelas legadas é intencional nesta task.
**Where**: `backend/src/db/schema.ts`
**Depends on**: None
**Requirement**: DB-01..DB-20
**Tests**: build TypeScript; aplicação idempotente do DDL correspondente já verificada no PostgreSQL Aiven
**Gate**: `npm run build`
**Done when**: o Drizzle representa as novas entidades users, memberships e obligations, preserva os exports legados usados pelo MVP e compila sem erros; a migração/SSL ficam para T2.
**Commit**: `feat(db): align drizzle schema with postgres ddl`

### T2: Integrar schema ao boot/migração

**Status**: Done
**What**: Fazer `runMigrations()` aplicar o schema real idempotente no boot e manter comando manual, normalizar SSL gerenciado sem credenciais hardcoded e preservar as tabelas legadas necessárias ao MVP.
**Where**: `backend/src/db/migrate.ts`, `backend/src/db/index.ts`, `backend/db/schema.sql`
**Depends on**: T1
**Requirement**: DB-01..DB-20
**Tests**: banco vazio, aplicação repetida e banco já criado
**Gate**: `npm test`
**Done when**: boot e `db:migrate` criam/reaplicam todas as tabelas sem apagar dados; a URL com SSL gerenciado funciona sem credenciais hardcoded e a suíte existente passa.
**Commit**: `feat(db): run shared schema migration on boot`

### T3: Implementar usuários e hash de senha

**Status**: Done
**What**: Criar service de usuários com email case-insensitive e hash seguro via `crypto.scrypt`; o campo legado `users.senha` armazenará somente o hash nesta task. Nenhuma senha em texto será persistida.
**Where**: `backend/src/services/authService.ts`, `backend/src/tests/auth.test.ts`
**Depends on**: T2
**Requirement**: API-01, API-02
**Tests**: unit/integration de cadastro, duplicidade, hash e mensagens neutras
**Gate**: `npm test`
**Done when**: nenhuma senha em texto é persistida e cadastro inválido retorna erro definido.
**Commit**: `feat(auth): add secure user registration`

### T4: Implementar sessão e logout

**Status**: Done
**What**: Criar tabela e service de sessão persistida com token opaco, hash SHA-256, expiração e revogação no logout; o token puro não será persistido.
**Where**: `backend/src/services/authService.ts`, `backend/src/db/schema.ts`, `backend/db/schema.sql`, `backend/src/tests/session.test.ts`
**Requirement**: API-01, API-02, API-06
**Tests**: sessão válida, expiração, logout, repetição e ausência
**Gate**: `npm test`
**Done when**: sessão não expõe credencial, token puro não é persistido, expiração é respeitada e logout invalida acesso protegido.
**Commit**: `feat(auth): add session lifecycle`

### T5: Proteger rotas e memberships

**Status**: Done
**What**: Adicionar middleware de sessão e autorização owner/member em todas as operações de viagem.
**Where**: `backend/src/middleware/auth.ts`
**Depends on**: T4
**Requirement**: API-03..API-05, API-07..API-09
**Tests**: HTTP 401, 403, membership válida, owner/member e isolamento
**Gate**: `npm test`
**Done when**: o middleware resolve Bearer/cookie, retorna 401 sem sessão, 403 sem membership/role e anexa contexto autorizado ao request; a aplicação das rotas fica para T11.
**Commit**: `feat(auth): protect trip routes by membership`

### T6: Adaptar viagens e despesas ao usuário real

**Status**: Done
**What**: Ligar participantes a usuários por `user_id`, criar criação de viagem/membership autenticada e exigir membership do ator ao registrar despesas, mantendo compatibilidade das APIs legadas até T11.
**Where**: `backend/src/services/tripService.ts`, `backend/src/services/expenseService.ts`, `backend/src/db/schema.ts`, `backend/db/schema.sql`, `backend/src/tests/user-trip-expense.test.ts`
**Requirement**: API-07..API-12
**Tests**: criação autorizada, membership, validações, atomicidade e valores em centavos
**Gate**: `npm test`
**Done when**: usuários autenticados possuem participante/membership, owner cria e adiciona member, o ator deve ser membro ao registrar despesa e a transação legado de expense + shares continua passando.
**Commit**: `feat(expenses): persist authorized user expenses`

### T7: Implementar obrigações e transições de pagamento

**Status**: Done
**What**: Criar service de obrigações com pendente, declaração pelo devedor, confirmação/recusa pelo recebedor e transições idempotentes.
**Where**: `backend/src/services/obligationService.ts`
**Depends on**: T6
**Requirement**: API-13..API-17
**Tests**: estados válidos/inválidos, papéis, confirmação concorrente e saldo pendente
**Gate**: `npm test`
**Done when**: apenas o recebedor conclui, transições são condicionais/idempotentes e confirmações concorrentes não produzem dupla conclusão.
**Commit**: `feat(payments): implement obligation state transitions`

### T8: Implementar prazos

**Status**: Done
**What**: Permitir ao recebedor definir prazo por obrigação e consultar status temporal.
**Where**: `backend/src/services/obligationService.ts`
**Depends on**: T7
**Requirement**: API-18
**Tests**: prazo, timezone definido, atraso, ausência e permissão
**Gate**: `npm test`
**Done when**: prazo é validado como data, só o recebedor pode definir/limpar, status é determinístico e obrigação concluída não aceita alteração.
**Commit**: `feat(payments): add obligation deadlines`

### T9: Implementar reset seguro

**Status**: Done
**What**: Implementar reset owner-only, confirmado, transacional e bloqueado se houver obrigação concluída.
**Where**: `backend/src/services/resetService.ts`
**Depends on**: T8
**Requirement**: API-19..API-21
**Tests**: owner/member, confirmação, 409 após concluído, atomicidade e concorrência
**Gate**: `npm test`
**Done when**: reset é owner-only, exige confirmação, bloqueia se houver concluído e apaga obrigações/despesas atomicamente.
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

### T13: Estabilizar execução sequencial da suíte PostgreSQL

**Status**: Done
**What**: Configurar o runner `node:test` para executar os arquivos de teste do backend sequencialmente, evitando corrida no pool compartilhado e mantendo o gate determinístico.
**Where**: `backend/package.json`
**Depends on**: None
**Requirement**: confiabilidade dos gates de todas as tasks backend
**Tests**: `npm test` com todos os arquivos da suíte
**Gate**: `npm test`
**Done when**: a suíte completa executa sem concorrência entre arquivos que encerram o pool, mantendo todas as asserções verdes.
**Commit**: `test(backend): run database suite sequentially`
