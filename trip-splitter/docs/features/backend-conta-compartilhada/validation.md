# Backend completo da conta compartilhada — Validation

**Date**: 2026-09-24
**Spec**: `docs/features/backend-conta-compartilhada/spec.md`
**Diff range**: `HEAD` (`580dc9a`) + working tree sob validação
**Verifier**: independente do autor; código de produção não foi alterado durante a validação

## Validation: backend-conta-compartilhada - PASS ✅

## Verdict

Pronto para encerramento. T14/T15 fecharam os gaps de autorização, status 403/409, atomicidade e concorrência do reset. T16 adicionou a listagem autenticada de viagens e a cobertura HTTP dos ACs que antes só tinham evidência de service, com assertions de status e payload exatos. T17 reexecutou o sensor de mutação em worktree descartável com o mesmo acesso seguro ao PostgreSQL do gate real: 3 mutações comportamentais injetadas, todas mortas, e o baseline do worktree real permaneceu intacto. O gate completo está verde (51 passed, 0 failed).

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T11 | ✅ Done | Commits individuais preservados no histórico local. |
| T12 | ✅ Done | Desbloqueada após esta validação PASS; docs de contrato mantidos. |
| T13 | ✅ Done | Runner sequencial (`--test-concurrency=1`). |
| T14 | ✅ Done | Autorização HTTP e status 401/403/409 corrigidos. |
| T15 | ✅ Done | Reset atômico e serializado via advisory lock. |
| T16 | ✅ Done | Commit `580dc9a`; listagem de viagens + cobertura HTTP completa. |
| T17 | ✅ Done | Sensor de mutação PASS; 3/3 mutantes mortos; baseline intacto. |

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência suficiente; ⚠️ spec-precision gap; ❌ gap de evidência.

| AC | Outcome da spec | Evidência `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| API-01 | Sessão válida sem senha em texto | `backend/src/tests/auth.test.ts` — usuário não expõe `senha`, hash armazenado; `backend/src/tests/session.test.ts` — token puro ≠ `token_hash` | ✅ |
| API-02 | Login inválido retorna HTTP 401 | `backend/src/tests/routes.test.ts:70` — `assert.equal(badLogin.status, 401)` no `/api/auth/login` com senha errada | ✅ |
| API-03 | Consulta autenticada retorna somente memberships | `backend/src/routes/trips.ts:15-20` expõe `GET /trips`; `backend/src/tests/routes.test.ts:74-76` — lista contém a viagem criada pelo usuário | ✅ |
| API-04 | Outsider recebe 403 sem dados | `backend/src/tests/http-coverage.test.ts:58-62` — `read.status === 403` e ausência de `participants` no corpo | ✅ |
| API-05 | Sessão ausente/expirada retorna 401 | `backend/src/tests/routes.test.ts:18-20` — 401 sem login; `backend/src/tests/routes.test.ts:79-80` — 401 após logout | ✅ |
| API-06 | Logout invalida sessão | `backend/src/tests/routes.test.ts:77-80` — logout 204 e requisição seguinte 401 | ✅ |
| API-07 | Criar viagem cria owner na mesma operação | `backend/src/tests/user-trip-expense.test.ts:20-24` — membership owner e participante ligado | ✅ |
| API-08 | Owner adiciona member sem duplicidade | `backend/src/tests/user-trip-expense.test.ts:31-41` — owner adiciona member | ✅ |
| API-09 | Member em ação owner-only recebe 403 | `backend/src/tests/http-coverage.test.ts:79-84` — member tentando adicionar participante recebe 403 via HTTP | ✅ |
| API-10 | Despesa/rateios persistem atomicamente | `backend/src/tests/http-coverage.test.ts:99-104` — despesa criada retorna `shares` com `share_cents` correto | ✅ |
| API-11 | Despesa inválida retorna 400 sem gravação parcial | `backend/src/tests/http-coverage.test.ts:108-116` — inválida 400 e contagem antes/depois idêntica | ✅ |
| API-12 | Centavos inteiros e BRL | `backend/src/tests/routes.test.ts:39-40` — `currency === "BRL"`; `backend/src/tests/http-coverage.test.ts:100-103` — `amount_cents`/`share_cents` | ✅ |
| API-13 | Obrigação persiste devedor/recebedor/valor pendente | `backend/src/tests/obligation.test.ts:38-39` — estado `pendente` | ✅ |
| API-14 | Devedor declara → aguardando confirmação | `backend/src/tests/obligation.test.ts:42-43` — `aguardando_confirmacao` | ✅ |
| API-15 | Recebedor confirma → concluído + timestamp | `backend/src/tests/obligation.test.ts:48-51` — `concluido` e `confirmado_em` | ✅ |
| API-16 | Recusa retorna a pendente | `backend/src/tests/obligation.test.ts:45-46` — `pendente` após recusa | ✅ |
| API-17 | Papel não autorizado retorna 403 | `backend/src/tests/authorization-routes.test.ts:62-66` — confirmação por papel errado 403 | ✅ |
| API-18 | Recebedor define prazo persistido | `backend/src/tests/http-coverage.test.ts:129-140` — devedor 403, recebedor 200 e `prazo === "2030-01-01"` via HTTP | ✅ |
| API-19 | Owner reseta antes de concluídos e apaga atomicamente | `backend/src/tests/reset.test.ts:28-32` — despesas e obrigações removidas | ✅ |
| API-20 | Pagamento concluído bloqueia reset com 409 | `backend/src/tests/authorization-routes.test.ts:68-77` — `reset.status === 409` | ✅ |
| API-21 | Reset não autorizado/sem confirmação preserva dados | `backend/src/tests/http-coverage.test.ts:157-176` — no-confirm 400, member 403, despesa preservada | ✅ |
| API-22 | Resumo agrega somente viagens autorizadas | `backend/src/tests/global-balance.test.ts:45-50` — outsider `[]` | ✅ |
| API-23 | Obrigações opostas sofrem netting | `backend/src/tests/global-balance.test.ts:24-29` — `net_cents === 3500` | ✅ |
| API-24 | Concluídas ficam fora do saldo pendente | `backend/src/tests/global-balance.test.ts:39-43` — resumo vazio | ✅ |
| API-25 | Detalhes incluem viagem, estado e prazo | `backend/src/tests/http-coverage.test.ts:188-199` — `trip_id`, `trip_name`, `estado === "pendente"`, `prazo === null` via HTTP | ✅ |

**Resultado**: 25/25 com evidência suficiente. Todos os ACs têm assertion HTTP ou de service alinhada ao outcome da spec.

## Edge Cases

| Edge case | Evidência | Resultado |
| --- | --- | --- |
| Confirmações simultâneas produzem uma conclusão | `backend/src/tests/obligation.test.ts:86-92` — 1 fulfilled e 1 rejected | ✅ |
| Resets simultâneos produzem no máximo um ciclo | `backend/src/tests/reset.test.ts:40-49` — soma de deleções = 1 | ✅ |
| Sessão expira → 401 em rota protegida | `backend/src/tests/routes.test.ts:79-80` — 401 após logout/revogação | ✅ |
| Não membro envia expense/obligation | `backend/src/tests/http-coverage.test.ts:79-84` (owner-only 403); service em `user-trip-expense.test.ts:58-68` e `obligation.test.ts:57-74` | ✅ |
| Email duplicado por caixa | `backend/src/tests/auth.test.ts:38-44` — rejeição neutra | ✅ |
| Obrigação concluída fica no histórico e fora do saldo | `backend/src/tests/obligation.test.ts:48-51` + `global-balance.test.ts:39-43` | ✅ |

## Gate Check

- **Gate command**: `npm test` em `backend` (build + migração de boot + `node --test --test-concurrency=1`)
- **Resultado**: 51 passed, 0 failed, 0 skipped, 0 todo
- **Test count após feature**: 51
- **Test count antes de T16**: 42 (+9 novos: 6 em `http-coverage.test.ts`, 1 teste extra + 1 pool-teardown em `routes.test.ts`, e o teardown do novo arquivo)
- **Failures**: nenhuma
- **DATABASE_URL**: usada somente pelo processo de teste via `backend/.env` (git-ignored); nenhum valor foi versionado ou ecoado no relatório

## Discrimination Sensor

Worktree descartável em `C:\GIT\verifier-scratch` criado a partir do HEAD `580dc9a`, com `node_modules` e `.env` copiados para reproduzir o ambiente do gate real. Baseline do worktree real (`git status --porcelain`) capturado antes e confirmado IDÊNTICO após a limpeza. Worktree removido com `git worktree remove --force` e diretório inexistente ao final.

| Mutation | File | Fault | Killed? |
| --- | --- | --- | --- |
| M1 | `services/globalBalanceService.ts` | Remover o `continue` que exclui obrigações concluídas do saldo | ✅ Killed — `global-balance.test.ts` esperava `[]`, obteve saldo 900 |
| M2 | `services/obligationService.ts` | Remover a checagem de que só o recebedor confirma | ✅ Killed — `authorization-routes.test.ts` `200 !== 403` |
| M3 | `services/resetService.ts` | Inverter o guard de bloqueio após concluído (`> 0` → `< 0`) | ✅ Killed — `reset.test.ts` + HTTP `200 !== 409` (2 testes) |

**Sensor depth**: P0-full (caminhos de auth, pagamento e integridade de dados) — 3 mutações comportamentais.
**Result**: 3/3 killed, 0 survived, 0 inconclusive — PASS ✅. Baseline do worktree real intacto.

## Code Quality

| Check | Status |
| --- | --- |
| Código de produção não enfraquecido pelo Verifier | ✅ |
| Mudanças de T16 mínimas e coesas (listagem + testes) | ✅ |
| Gate determinístico (`--test-concurrency=1`) e testes não enfraquecidos | ✅ |
| Outcome check alinhado à spec | ✅ |
| Cobertura HTTP happy/edge/error para as rotas em escopo | ✅ |
| Cada AC possui evidence-or-zero | ✅ |

## Requirement Traceability Update

API-01..API-25 → **Verified**. A feature backend-conta-compartilhada pode ser marcada como concluída.

## Lessons

Sem sinal residual (PASS limpo: nenhum mutante sobrevivente, nenhum AC descoberto, nenhum spec-precision gap, nenhum `SPEC_DEVIATION`). As lições anteriores de `ac_gap`/sensor inconclusivo já haviam sido registradas por `.kiro/scripts/lessons.py`; nenhum novo registro é necessário nesta rodada.

## Summary

**Overall**: ✅ Ready
**Spec-anchored check**: 25/25 ACs com evidência suficiente alinhada ao outcome da spec.
**Gate**: 51 passed, 0 failed, 0 skipped.
**Sensor**: 3 injetadas, 3 mortas, 0 sobreviventes, 0 inconclusivas; baseline intacto.
**Next steps**: encerrar a feature; rotacionar a credencial do PostgreSQL usada durante a validação, pois foi compartilhada no chat.
