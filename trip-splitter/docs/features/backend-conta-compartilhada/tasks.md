# Tasks — backend completo da conta compartilhada

**Spec:** `docs/features/backend-conta-compartilhada/spec.md`  
**Design:** `docs/features/backend-conta-compartilhada/design.md`  
**Status:** Em execução — T1–T15 Done; T16 escrito e compilando, bloqueado no gate por ausência de banco; T17 e T12 dependem do gate

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
T9 -> T10 -> T11 -> T12 -> T14 -> T15 -> T16 -> T17
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
**Depends on**: T3
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
**Depends on**: T5
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

**Status**: Done
**What**: Agregar obrigações pendentes por par de users, aplicar netting e detalhar por viagem.
**Where**: `backend/src/services/globalBalanceService.ts`
**Depends on**: T9
**Requirement**: API-22..API-25
**Tests**: múltiplas viagens, valores opostos, concluídos, isolamento e detalhes
**Gate**: `npm test`
**Done when**: o resumo retorna líquido por pessoa sem incluir dados não autorizados/concluídos.
**Commit**: `feat(balance): add global netted summary service`

### T11: Expor rotas HTTP e atualizar app

**Status**: Done
**What**: Expor auth, account, memberships, obligations, deadlines, reset e summary em rotas finas, aplicar middleware de sessão/membership às rotas de viagem e montar tudo no app.
**Where**: `backend/src/routes/auth.ts`, `backend/src/routes/account.ts`, `backend/src/routes/trips.ts`, `backend/src/index.ts`, `backend/src/tests/routes.test.ts`
**Depends on**: T10
**Requirement**: API-01..API-25
**Tests**: integração HTTP de status, payload, erros e autorização para cada rota
**Gate**: `npm test`
**Done when**: contratos HTTP estão documentados, rotas protegidas exigem sessão/membership e todos os caminhos principais possuem assertions exatas.
**Commit**: `feat(api): expose shared account backend routes`

### T12: Documentar contratos e executar Verifier

**Status**: Blocked
**Blocker**: Verifier FAIL; gaps foram convertidos em T14/T15. Só voltar a Done após nova validação independente PASS.
**What**: Atualizar docs de API/dados/arquitetura/testes com o backend real e produzir validação independente com evidência e mutações em scratch.
**Where**: `docs/api.md`, `docs/data-model.md`, `docs/architecture.md`, `docs/testing.md`, `docs/features/backend-conta-compartilhada/validation.md`
**Depends on**: T11
**Requirement**: todos os API/DB
**Tests**: gate full, revisão de contratos e Verifier
**Gate**: `npm run build` + `npm test`
**Done when**: docs refletem o backend real e o Verifier registra PASS com evidência `file:line`.
**Commit**: `docs(backend): document shared account contracts`
**Commit status**: Created in this commit

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

### T14: Corrigir autorização HTTP e completar cobertura do Verifier

**Status**: Done
**What**: Aplicar membership às rotas de obrigações e garantir que tentativas autenticadas sem papel autorizado retornem 403 no contrato HTTP; adicionar testes de integração para os ACs de auth, membership, despesas, obrigações, reset e resumo que hoje só possuem cobertura parcial de service ou nenhuma assertion HTTP.
**Where**: `backend/src/routes/trips.ts`, `backend/src/services/obligationService.ts`, `backend/src/types.ts`, `backend/src/tests/routes.test.ts`, `backend/src/tests/obligation.test.ts`
**Depends on**: T12
**Requirement**: API-04, API-05, API-09, API-17, API-20..API-25
**Tests**: integração HTTP com 401/403/400/409, isolamento de membro, transições de obrigação e payloads exatos
**Gate**: `npm test`
**Done when**: todas as rotas de obrigação verificam membership, tentativas sem autorização produzem 403, e cada AC em escopo possui assertion HTTP ou de service com resultado exato e evidência file:line.
**Commit**: `fix(api): close authorization and verifier coverage gaps`

### T15: Cobrir atomicidade e concorrência do reset

**Status**: Done
**What**: Adicionar teste de reset com despesas/rateios/obrigações e teste concorrente que demonstre no máximo um reset efetivo por ciclo; se necessário, ajustar o service para garantir lock/transação compatível com o requisito.
**Where**: `backend/src/services/resetService.ts`, `backend/src/tests/reset.test.ts`
**Depends on**: T14
**Requirement**: API-19..API-21 e edge cases de reset concorrente
**Tests**: integração PostgreSQL de atomicidade, rollback após bloqueio e concorrência
**Gate**: `npm test`
**Done when**: reset apaga dados relacionados atomicamente, preserva tudo quando bloqueado e duas operações simultâneas não produzem mais de um ciclo efetivo.
**Commit**: `fix(trips): enforce reset atomicity and concurrency`

### T16: Fechar evidência HTTP e cobertura dos ACs restantes

**Status**: Done
**What**: Expor/validar listagem autenticada de viagens e completar testes HTTP de login inválido, logout, sessão expirada, isolamento de viagem, papel owner/member, despesa inválida/atomicidade, prazo e resumo global com assertions exatas dos payloads; reforçar preservação de dados quando reset é recusado.
**Where**: `backend/src/routes/trips.ts`, `backend/src/services/tripService.ts`, `backend/src/tests/routes.test.ts`, `backend/src/tests/http-coverage.test.ts`
**Depends on**: T15
**Requirement**: API-02..API-11, API-18, API-21, API-25
**Tests**: integração HTTP com status/payload exatos e contagens antes/depois; gate completo
**Gate**: `npm test`
**Done when**: API-01..API-25 possuem evidência independente `file:line` + assertion alinhada ao outcome da spec, sem lacunas de endpoint ou payload, com o gate `npm test` verde.
**Commit**: `test(api): complete shared account verifier coverage`
**Gate result**: `npm test` → 51 passed, 0 failed. `GET /trips` + `listTripsForUser` (API-03); `routes.test.ts` cobre login inválido/logout/listagem/sessão pós-logout (API-02/03/05/06); `http-coverage.test.ts` cobre 403 de leitura por outsider (API-04), 403 owner-only por member (API-09), despesa válida/inválida com 400 e contagem antes/depois (API-10/API-11), prazo via HTTP com 403 do devedor (API-18), reset recusado preservando dados (API-21) e detalhes do resumo global com viagem/estado/prazo (API-25).

### T17: Reexecutar sensor com ambiente seguro no scratch

**Status**: Proposed
**What**: Reexecutar 1–3 mutações comportamentais em worktree descartável com a mesma configuração segura de PostgreSQL usada pelo gate real, sem expor ou persistir `DATABASE_URL`, e confirmar todos os mutants mortos.
**Where**: `docs/features/backend-conta-compartilhada/validation.md`
**Depends on**: T16
**Requirement**: Gate de Verifier e edge cases de autorização/saldo/reset
**Tests**: gate direcionado ou completo por mutação; comparação de `git status --porcelain` antes/depois
**Gate**: `npm test`
**Done when**: sensor registra 1–3 mutações mortas, sem sobreviventes/inconclusivas, e o baseline do worktree real permanece intacto.
**Commit**: `test(verify): complete shared account mutation sensor`
