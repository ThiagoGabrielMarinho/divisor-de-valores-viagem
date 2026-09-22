# Backend completo da conta compartilhada — Validation

**Date**: 2026-09-21  
**Spec**: `docs/features/backend-conta-compartilhada/spec.md`  
**Diff range**: `HEAD` (`fce74d9`) + working tree under review  
**Verifier**: independente do autor; execução read-only sobre código/testes, exceto este relatório e tasks/lessons exigidos pelo Verifier.

## Validation: backend-conta-compartilhada - FAIL ❌

## Verdict

Não pronto para encerramento.

O gate automatizado está verde e os testes de domínio principais passam, mas a evidência não cobre todos os ACs e há gaps reais no contrato HTTP/autorização. As rotas de obrigações usam apenas `requireSession` (`backend/src/routes/trips.ts:62-93`), sem `requireTripMembership`; além disso, violações de papel no service lançam `ValidationError` (400), embora o AC-17 exija 403 para transições não autorizadas. O reset não tem prova de atomicidade com dados reais nem de concorrência “no máximo uma por ciclo”.

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Commit `0afa4d6`; schema Drizzle alinhado. |
| T2 | ✅ Done | Commit `d311d6b`; migração no boot. |
| T3 | ✅ Done | Commit `4cc71a4`; hash scrypt. |
| T4 | ✅ Done | Commit `713c9c5`; sessão persistida/revogável. |
| T5 | ✅ Done | Commit `4af90a4`; middleware de sessão/membership. |
| T6 | ✅ Done | Commit `4cd0241`; viagens/despesas por usuário. |
| T7 | ✅ Done | Commit `f633963`; transições de obrigação. |
| T8 | ✅ Done | Commit `af2a794`; prazos. |
| T9 | ✅ Done | Commit `6c7be5a`; reset protegido. |
| T10 | ✅ Done | Commit `c8a3d93`; netting global. |
| T11 | ✅ Done | Commit `fce74d9`; rotas montadas, mas cobertura HTTP insuficiente e gaps encontrados. |
| T12 | ⚠️ In Progress | Este relatório é a validação independente; não há commit de encerramento. |
| T13 | ✅ Done | Commit `e4361ed`; runner sequencial. |
| T14 | 🆕 Proposed | Criada neste Verifier para autorização HTTP e cobertura faltante. |
| T15 | 🆕 Proposed | Criada neste Verifier para atomicidade/concorrência do reset. |

A integridade dos registros concluídos T1–T11 e T13 foi conferida no histórico local; T12 permanece corretamente não concluída diante do FAIL.

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência suficiente no escopo exercitado; ⚠️ evidência parcial/spec precisa de contrato adicional; ❌ gap de implementação ou de teste.

### P1 — Autenticação e autorização

| AC | Resultado esperado | Evidência `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| API-01 | Sessão autenticada, sem senha em texto | `backend/src/tests/auth.test.ts:20-23` — `assert.match(stored.senha, /^scrypt.../)` e `assert.notEqual`; `backend/src/tests/session.test.ts:18-21` — token puro diferente do hash | ✅ |
| API-02 | Credencial inválida retorna 401 sem revelar campo | `backend/src/tests/auth.test.ts:32` — `assert.equal(invalid, null)`; não há teste HTTP de `/api/auth/login` com status 401/mensagem neutra | ⚠️ GAP de contrato HTTP |
| API-03 | Consulta autenticada retorna somente memberships | Não existe rota/teste de listagem de viagens autenticada; `backend/src/routes/trips.ts:20-29` cobre somente leitura de uma viagem | ❌ Sem evidência |
| API-04 | Não membro acessando viagem recebe 403 sem dados | `backend/src/tests/auth-middleware.test.ts:85-86` prova owner/member no middleware, mas não request HTTP a viagem por outsider | ⚠️ Evidência parcial |
| API-05 | Sessão ausente/expirada retorna 401 | `backend/src/tests/auth-middleware.test.ts:48-49` — status 401; `backend/src/tests/session.test.ts:28,33` — sessão expirada/revogada resolve `null` | ✅ no service/middleware; falta assertion HTTP de expiração |
| API-06 | Logout invalida sessão | `backend/src/tests/session.test.ts:31-33` — após `revokeSession`, `getSessionUser` retorna `null`; rota logout não é exercitada | ⚠️ Evidência parcial |

### P1 — Viagens, membros e despesas

| AC | Resultado esperado | Evidência `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| API-07 | Criar viagem cria owner na mesma operação | `backend/src/tests/user-trip-expense.test.ts:21-24` — membership `owner` e participante ligado | ⚠️ Sem prova de atomicidade/rollback |
| API-08 | Owner adiciona member sem duplicidade | `backend/src/tests/user-trip-expense.test.ts:31-41` — membro e expense; `:54-57` — member proibido; não há assertion de duplicidade do mesmo alvo | ⚠️ Parcial |
| API-09 | Member não executa ação exclusiva de owner com 403 | `backend/src/tests/auth-middleware.test.ts:85-86` — middleware mock retorna 403; não há rota HTTP real para adicionar membro | ⚠️ Parcial |
| API-10 | Despesa válida persiste despesa/rateios atomicamente | `backend/src/tests/user-trip-expense.test.ts:41-43` verifica amount/payer/listagem; não verifica rateios persistidos nem rollback | ⚠️ Parcial |
| API-11 | Despesa inválida retorna 400 sem gravação parcial | `backend/src/tests/expense.test.ts:88-123` cobre rejeições de valor/pagador/split; não verifica contagem antes/depois nem resposta HTTP 400 | ⚠️ Parcial |
| API-12 | Centavos inteiros e BRL | `backend/src/tests/user-trip-expense.test.ts:41-42` — `amount_cents=1000`; `backend/src/tests/routes.test.ts:39-40` — currency `BRL`; `backend/src/tests/expense.test.ts:36-40` — resto em centavos | ✅ |

### P1 — Obrigações, pagamento, prazo e reset

| AC | Resultado esperado | Evidência `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| API-13 | Obrigação persiste devedor, recebedor, valor e pendente | `backend/src/tests/obligation.test.ts:38-39` — estado `pendente`; service grava os campos em `backend/src/services/obligationService.ts:47-55` | ✅ |
| API-14 | Devedor declara e estado vira aguardando confirmação | `backend/src/tests/obligation.test.ts:42` — `assert.equal(waiting.estado, "aguardando_confirmacao")` | ✅ |
| API-15 | Recebedor confirma, concluído e timestamp | `backend/src/tests/obligation.test.ts:48-50` — estado e `confirmado_em` | ✅ |
| API-16 | Recebedor recusa e retorna a pendente | `backend/src/tests/obligation.test.ts:45` — `pendingAgain.estado` | ✅ |
| API-17 | Papel não autorizado recebe 403 | `backend/src/tests/obligation.test.ts:40` e `:72` apenas esperam `ValidationError`; `backend/src/services/obligationService.ts:65-67,82-84` não define 403; `backend/src/routes/trips.ts:79-93` não usa middleware de membership | ❌ GAP real: 400/sem isolamento de rota |
| API-18 | Recebedor define prazo persistido | `backend/src/tests/obligation.test.ts:105-117` — prazo, atraso, limpeza e status; rota HTTP não testada | ✅ no service; ⚠️ HTTP ausente |
| API-19 | Owner reseta antes de pagamentos concluídos atomicamente | `backend/src/tests/reset.test.ts:28-30` apenas verifica `tripId`; não cria expense/rateio nem confirma deleção/rollback | ❌ Sem evidência suficiente |
| API-20 | Pagamento concluído bloqueia reset com 409 | `backend/src/tests/reset.test.ts:34-38` espera `ValidationError`, mas rota/global handler retorna 400, não 409 | ❌ GAP de status HTTP |
| API-21 | Reset não autorizado/sem confirmação preserva dados | `backend/src/tests/reset.test.ts:20-24` somente verifica rejeição, sem consultar dados depois | ⚠️ Parcial |

### P1 — Resumo global

| AC | Resultado esperado | Evidência `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| API-22 | Agrega somente viagens autorizadas | `backend/src/tests/global-balance.test.ts:45-50` — outsider recebe `[]`; `:31-43` concluídos/viagem autorizada | ✅ no service |
| API-23 | Obrigações opostas sofrem netting | `backend/src/tests/global-balance.test.ts:25-29` — `net_cents=3500`, uma linha e duas details | ✅ |
| API-24 | Concluídas excluídas do saldo pendente | `backend/src/tests/global-balance.test.ts:39-43` — `getGlobalBalances` é `[]` | ✅ |
| API-25 | Detalhes trazem viagem, estado e prazo | `backend/src/tests/global-balance.test.ts:29` apenas verifica `details.length`; não afirma `trip_name`, `estado` e `prazo` individualmente | ⚠️ Parcial |

**Spec-anchored summary**: 11/25 com evidência suficiente; 9 parciais/spec-precision gaps; 5 gaps reais ou sem evidência suficiente (contagens sobrepostas por critério). Nenhum AC sem avaliação.

## Edge Cases

| Edge case | Evidência | Resultado |
| --- | --- | --- |
| Confirmações simultâneas produzem uma conclusão | `backend/src/tests/obligation.test.ts:90-92` — exatamente 1 fulfilled/1 rejected | ✅ |
| Resets simultâneos, no máximo um ciclo | Nenhum teste concorrente de reset; service não possui lock/ciclo explícito | ❌ GAP |
| Sessão expira durante operação sem gravação parcial | Sessão expirada é rejeitada no service, mas não há operação HTTP/transacional durante expiração | ⚠️ Não demonstrado |
| Não membro envia expense/obligation | Expense é rejeitada em `backend/src/tests/user-trip-expense.test.ts:58-68`; obrigação outsider em `backend/src/tests/obligation.test.ts:57-72`; ambos são service/ValidationError, não 403 HTTP | ⚠️ Parcial |
| Email duplicado por caixa | `backend/src/tests/auth.test.ts:38-44` — rejeição neutra após uppercase | ✅ |
| Obrigação concluída permanece histórico e sai do saldo | Estado/timestamp em `backend/src/tests/obligation.test.ts:48-50`; exclusão do global em `backend/src/tests/global-balance.test.ts:39-43`; listagem histórica não testada | ⚠️ Parcial |

## Discrimination Sensor

Executado exclusivamente em `C:\temp\trip-splitter-verifier\trip-splitter`, worktree temporário separado do worktree real; removido com `git worktree remove --force`. A baseline do worktree real permaneceu inalterada, exceto os arquivos solicitados do Verifier.

| Mutação | Arquivo/linha | Fault injetado | Resultado |
| --- | --- | --- | --- |
| M1 | `backend/src/services/authService.ts:25` | Retorno de `verifyPassword` alterado para sempre `false` | ✅ Morto: `auth.test.ts` 2 falhas (senha válida e hash verificável) |
| M2 | `backend/src/services/globalBalanceService.ts:38` | Removido o `continue` para obrigações concluídas | ✅ Morto: `global-balance.test.ts` falhou esperando `[]`, recebeu saldo concluído |
| M3 | `backend/src/middleware/auth.ts:53` | Removida a verificação de `requiredRole` | ✅ Morto: middleware test falhou esperando member bloqueado/403 |

**Sensor depth**: lightweight, 3 mutações, 3 mortas, 0 sobreviventes. **Sensor: PASS ✅**.

## Gate Check

- **Gate command**: `npm test` em `backend`
- **Resultado**: 40 passed, 0 failed, 0 skipped, 0 todo
- **Build/migration**: `npm run build` e migração de boot passaram no `pretest`
- **Test count before feature**: não foi possível obter um baseline confiável anterior à feature a partir do estado disponível
- **Test count after feature**: 40
- **Delta**: não determinável
- **Falhas**: nenhuma no worktree real

## Gaps e Fix Tasks

1. **T14 — autorização HTTP e cobertura**: rotas de obrigação precisam de membership, erros de papel precisam mapear para 403, reset concluído precisa mapear para 409 conforme AC e testes HTTP devem afirmar statuses/payloads exatos. Também deve completar as assertions faltantes de API-02/03/04/06/08/10/11/18/21/25.
2. **T15 — reset atomicidade/concorrência**: criar fixture com despesas, rateios e obrigações; afirmar deleção e preservação após rollback/bloqueio; testar duas operações simultâneas e ajustar o service se o requisito não for satisfeito.

## Code Quality / Scope

- Nenhum código de produção foi alterado pelo Verifier.
- Foram alterados somente `validation.md`, `tasks.md` e o estado de lessons exigido abaixo.
- O gate está determinístico (`--test-concurrency=1`) e o sensor confirmou que três regressões críticas são detectadas.
- A qualidade estrutural do código é aceitável para o escopo, mas não compensa os gaps de contrato e cobertura acima.

## Requirement Traceability Update

Os requisitos não são marcados como Verified neste ciclo: API-01..API-25 permanecem não encerrados até T14/T15 e nova verificação independente. O relatório fornece a evidência e os gaps sem alterar `spec.md`, pois o Verifier não deve reclassificar ACs como concluídos diante do FAIL.

## Summary

**Overall**: ❌ Not Ready  
**Spec-anchored check**: 11/25 evidência suficiente; 9 parciais/spec-precision gaps; 5 gaps reais/sem evidência suficiente (sobreposição possível).  
**Sensor**: 3/3 mutações mortas.  
**Gate**: 40/40 testes passaram; 0 falhas; 0 skips.  
**Lessons**: registradas via `.kiro/scripts/lessons.py` para gaps de AC e sensor/gate conforme aplicável.  
**Next steps**: executar T14 e T15, então repetir o Verifier e atualizar este relatório somente com evidência nova.
