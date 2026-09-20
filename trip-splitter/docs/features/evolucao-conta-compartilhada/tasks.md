# Tasks — evolução de conta compartilhada

**Spec:** `docs/features/evolucao-conta-compartilhada/spec.md`  
**Context:** `docs/features/evolucao-conta-compartilhada/context.md`  
**Design:** `docs/features/evolucao-conta-compartilhada/design.md`  
**Status:** Proposed / Blocked — Discuss necessária antes da implementação

## Execution Protocol

Cada task abaixo permanece no histórico. O status inicial é `Proposed`, mas tasks dependentes das decisões de Discuss ficam `Blocked` até o contexto ser aprovado. Nenhuma task de código deve iniciar enquanto a feature estiver bloqueada.

Cada task exige gate verde, revisão de adequação, status `Done` no próprio arquivo e exatamente um commit local com a mensagem planejada. Não apagar tasks concluídas; novo escopo cria novo ID.

## Test Coverage Matrix

> Guidelines: `docs/testing.md`, `.kiro/steering/trip-splitter-project.md` e `.kiro/references/design.md`; não há runner HTTP/frontend configurado, então UAT manual permanece obrigatório até task própria aprovar ferramenta.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain/services | integration + unit where pure | Todos os ACs, estados, erros, idempotência e edge cases | `backend/src/tests/*.test.ts` | `npm test` |
| PostgreSQL/schema | integration | FKs, migração compatível, atomicidade e concorrência relevante | `backend/src/tests/*.test.ts` | `npm test` |
| HTTP routes | integration HTTP | Happy path + 400/401/403/404/409 e payload exato por rota | `backend/src/tests/*.test.ts` até runner ser definido | `npm test` |
| Frontend | manual UAT; automated if approved | Jornada, loading, success, error, empty, unavailable, responsividade e acessibilidade | `frontend/*` + checklist UAT | `npm run build` + UAT |
| Schema/docs/config | none/build | Compilação e consistência documental | arquivos declarados na task | `npm run build` |

## Gate Check Commands

| Gate Level | Command |
| --- | --- |
| Quick | `npm run build` |
| Full | `npm test` |
| Spec | `python .kiro/scripts/validate_spec.py docs/features/evolucao-conta-compartilhada/spec.md --root .` |
| Tasks | `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .` |
| State | `python .kiro/scripts/validate_state.py docs/features/evolucao-conta-compartilhada --root .` |
| Commit | `python .kiro/scripts/check_commit.py --message "<task message>"` |

## Execution Plan

Tasks são sequenciais por fase. A fase 0 é planejamento e Discuss; as fases seguintes permanecem bloqueadas até contexto e design aprovados.

### Phase 0: Specify, Discuss, Design and Tasks

```text
T1 -> T2 -> T3 -> T4
```

### Phase 1: Identity foundation

```text
T4 -> T5 -> T6 -> T7 -> T8
```

### Phase 2: Financial lifecycle

```text
T8 -> T9 -> T10 -> T11 -> T12 -> T13
```

### Phase 3: Global summary

```text
T13 -> T14 -> T15
```

### Phase 4: User experience

```text
T15 -> T16 -> T17 -> T18 -> T19
```

### Phase 5: Documentation and verification

```text
T19 -> T20 -> T21 -> T22
```

## Task Breakdown

### T1: Fechar decisões de login e identidade

**Status**: Proposed / Blocked  
**What**: Confirmar tipo de login, credenciais, sessão, logout, recuperação inicial, identidade global e migração de viagens existentes.  
**Where**: `docs/features/evolucao-conta-compartilhada/context.md`  
**Depends on**: None  
**Requirement**: EVOL-06..11  
**Tests**: revisão de decisões e cenários 401/403  
**Gate**: `python .kiro/scripts/validate_spec.py docs/features/evolucao-conta-compartilhada/spec.md --root .`  
**Done when**: perguntas 1, 3 e 9 do context.md possuem decisões confirmadas e sem default silencioso.  
**Commit**: `docs(auth): decide identity and login behavior`

### T2: Fechar decisões de quitação, prazo e reset

**Status**: Proposed / Blocked  
**What**: Confirmar quem pode confirmar pagamento, estados, conflitos, prazo, timezone, reset, histórico e pagamentos existentes.  
**Where**: `docs/features/evolucao-conta-compartilhada/context.md`  
**Depends on**: T1  
**Requirement**: EVOL-17..27  
**Tests**: revisão de máquina de estados e cenários de conflito  
**Gate**: `python .kiro/scripts/validate_spec.py docs/features/evolucao-conta-compartilhada/spec.md --root .`  
**Done when**: perguntas 4, 5, 6, 7 e 8 possuem decisões confirmadas e transições válidas documentadas.  
**Commit**: `docs(finance): decide payment deadline and reset rules`

### T3: Aprovar arquitetura, migração e UX

**Status**: Proposed / Blocked  
**What**: Finalizar `design.md` com arquitetura escolhida, interfaces, modelo de dados, estratégia de migração e UX light-only.  
**Where**: `docs/features/evolucao-conta-compartilhada/design.md`  
**Depends on**: T2  
**Requirement**: todos os EVOL  
**Tests**: revisão contra spec/context e matriz de riscos  
**Gate**: `git diff --check` + revisão do design  
**Done when**: não há “Pendente” em decisões críticas e cada risco possui mitigação e task correspondente.  
**Commit**: `docs(design): approve shared account architecture`

### T4: Aprovar matriz e registro de execução

**Status**: Proposed / Blocked  
**What**: Atualizar esta matriz com comandos finais, localização real dos testes, dependências aprovadas e tasks atômicas sem escopo agregado.  
**Where**: `docs/features/evolucao-conta-compartilhada/tasks.md`  
**Depends on**: T3  
**Requirement**: processo tlc-spec-driven  
**Tests**: validador estrutural de tasks  
**Gate**: `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .`  
**Done when**: o validador passa sem erros e cada task tem Tests, Gate, Done when e Commit.  
**Commit**: `docs(tasks): approve shared account execution plan`

### T5: Criar entidades de usuário e membership

**Status**: Proposed / Blocked  
**What**: Implementar schema/DDL compatível para usuários, identidade de participante e membership/roles decididos.  
**Where**: `backend/src/db/schema.ts`  
**Depends on**: T4  
**Requirement**: EVOL-06..11  
**Tests**: integração de FKs, membership, índices e migração  
**Gate**: `npm test`  
**Done when**: dados existentes permanecem legíveis e constraints suportam as regras aprovadas.  
**Commit**: `feat(auth): add user and trip membership schema`

### T6: Implementar autenticação e sessão

**Status**: Proposed / Blocked  
**What**: Implementar o mecanismo de login aprovado, criação/validação/expiração de sessão e logout.  
**Where**: `backend/src/services/authService.ts`  
**Depends on**: T5  
**Requirement**: EVOL-06..11  
**Tests**: unit/integration de credenciais, expiração, logout, repetição e falhas  
**Gate**: `npm test`  
**Done when**: credencial válida autentica, inválida retorna 401 e sessão expirada não protege acesso.  
**Commit**: `feat(auth): add authenticated session service`

### T7: Proteger rotas por membership

**Status**: Proposed / Blocked  
**What**: Adicionar middleware/contexto de autorização e aplicar 401/403 às rotas de viagem, despesa, saldo e quitação.  
**Where**: `backend/src/index.ts`  
**Depends on**: T6  
**Requirement**: EVOL-06..11  
**Tests**: HTTP de sessão ausente, membership válida, usuário errado e recurso inexistente  
**Gate**: `npm test`  
**Done when**: nenhum endpoint protegido aceita somente o UUID como bypass.  
**Commit**: `feat(auth): enforce trip authorization middleware`

### T8: Criar login e sessão no frontend

**Status**: Proposed / Blocked  
**What**: Criar a tela de login/logout e os estados de sessão expirada, erro e loading.  
**Where**: `frontend/index.html`  
**Depends on**: T7  
**Requirement**: EVOL-06..11  
**Tests**: UAT da jornada de entrada, erro, logout e sessão expirada  
**Gate**: `npm run build` + UAT  
**Done when**: usuário entende como entrar, sair e recuperar o fluxo sem ver conteúdo não autorizado.  
**Commit**: `feat(ui): add login and session flow`

### T9: Implementar lifecycle de despesa

**Status**: Proposed / Blocked  
**What**: Adicionar estados e transições de despesa aprovados, preservando shares e compatibilidade histórica.  
**Where**: `backend/src/services/expenseService.ts`  
**Depends on**: T8  
**Requirement**: EVOL-01..05, edge cases de lifecycle  
**Tests**: integração de estados válidos/inválidos, compatibilidade e atomicidade  
**Gate**: `npm test`  
**Done when**: listagem e saldo ignoram somente estados explicitamente excluídos pela spec.  
**Commit**: `feat(expenses): add expense lifecycle states`

### T10: Corrigir contrato de despesas e quitação

**Status**: Proposed / Blocked  
**What**: Corrigir services/rotas para que respostas não vazias nunca produzam estados vazios e erros não virem “nenhum dado”.  
**Where**: `backend/src/routes/trips.ts`  
**Depends on**: T9  
**Requirement**: EVOL-01..05  
**Tests**: HTTP de payload não vazio, vazio, erro parcial e status exatos  
**Gate**: `npm test`  
**Done when**: contrato diferencia `[]` legítimo de indisponibilidade e UI não recebe fallback enganoso.  
**Commit**: `fix(api): preserve expense and settlement states`

### T11: Persistir obrigações e confirmações de pagamento

**Status**: Proposed / Blocked  
**What**: Criar modelo/service de obrigação e confirmação conforme máquina de estados aprovada.  
**Where**: `backend/src/services/paymentService.ts`  
**Depends on**: T10  
**Requirement**: EVOL-17..22  
**Tests**: criação, confirmação, repetição idempotente, conflito e permissão  
**Gate**: `npm test`  
**Done when**: settlement sugerido e pagamento confirmado são conceitos distintos e persistidos.  
**Commit**: `feat(payments): persist settlement confirmations`

### T12: Adicionar prazos e status temporal

**Status**: Proposed / Blocked  
**What**: Persistir vencimento e derivar pendente, pago ou atrasado com timezone definido.  
**Where**: `backend/src/services/deadlineService.ts`  
**Depends on**: T11  
**Requirement**: EVOL-21  
**Tests**: relógio controlado, limites do dia, timezone, ausência e alteração autorizada  
**Gate**: `npm test`  
**Done when**: prazo e atraso aparecem com resultado determinístico no contrato.  
**Commit**: `feat(payments): add obligation deadlines`

### T13: Implementar reset seguro por ciclo

**Status**: Proposed / Blocked  
**What**: Implementar reset aprovado com confirmação, autorização, transação, concorrência e histórico.  
**Where**: `backend/src/services/resetService.ts`  
**Depends on**: T12  
**Requirement**: EVOL-23..27  
**Tests**: owner/member, confirmação, falha atômica, repetição, concorrência e pagamentos existentes  
**Gate**: `npm test`  
**Done when**: reset não apaga silenciosamente histórico e no máximo uma transição ocorre por ciclo.  
**Commit**: `feat(trips): add safe expense cycle reset`

### T14: Criar resumo global por identidade

**Status**: Proposed / Blocked  
**What**: Agregar obrigações autorizadas por par de contas e detalhar origem, status e prazo.  
**Where**: `backend/src/services/globalBalanceService.ts`  
**Depends on**: T13  
**Requirement**: EVOL-12..16  
**Tests**: múltiplas viagens, netting, homônimos, membership, vazio e moeda  
**Gate**: `npm test`  
**Done when**: resultado global não usa nome/participant_id local como identidade e respeita acesso.  
**Commit**: `feat(balance): add global debt summary service`

### T15: Expor endpoint do resumo global

**Status**: Proposed / Blocked  
**What**: Criar rota fina para resumo global com filtros e drill-down aprovados.  
**Where**: `backend/src/routes/account.ts`  
**Depends on**: T14  
**Requirement**: EVOL-12..16  
**Tests**: HTTP de 200, vazio, filtros, 401, 403 e payload exato  
**Gate**: `npm test`  
**Done when**: contrato documentado e nenhum dado de viagem não autorizada aparece.  
**Commit**: `feat(api): expose global debt summary`

### T16: Implementar estado de sessão e carregamento no frontend

**Status**: Proposed / Blocked  
**What**: Criar shell de sessão e estados de loading, erro, indisponibilidade e retry seguro.  
**Where**: `frontend/app.js`  
**Depends on**: T15  
**Requirement**: EVOL-01..16  
**Tests**: UAT de respostas vazias/não vazias/erro, sessão e refresh  
**Gate**: `npm run build` + UAT  
**Done when**: erro nunca vira “nenhuma despesa” ou “tudo quitado”.  
**Commit**: `fix(ui): render truthful loading and error states`

### T17: Atualizar tela da viagem com lifecycle financeiro

**Status**: Proposed / Blocked  
**What**: Exibir estados de despesa, obrigação, pagamento, prazo e reset com ações autorizadas.  
**Where**: `frontend/index.html`  
**Depends on**: T16  
**Requirement**: EVOL-01..05, EVOL-17..27  
**Tests**: UAT de jornada completa, confirmação, erro, vazio, atraso e reset  
**Gate**: `npm run build` + UAT  
**Done when**: todos os estados e ações são compreensíveis e têm feedback.  
**Commit**: `feat(ui): show trip payment lifecycle`

### T18: Criar dashboard global

**Status**: Proposed / Blocked  
**What**: Criar a tela inicial com dívidas agregadas, detalhes por viagem e estados vazios/loading/error.  
**Where**: `frontend/index.html`  
**Depends on**: T17  
**Requirement**: EVOL-12..16  
**Tests**: UAT com múltiplas viagens, sem dívidas, indisponibilidade e drill-down  
**Gate**: `npm run build` + UAT  
**Done when**: a primeira tela responde “quanto devo para cada pessoa” sem exigir abrir uma viagem.  
**Commit**: `feat(ui): add global debt dashboard`

### T19: Aplicar redesign clean e light

**Status**: Proposed / Blocked  
**What**: Consolidar layout moderno, hierarquia, responsividade, foco, contraste e modo claro sem dark mode.  
**Where**: `frontend/style.css`  
**Depends on**: T18  
**Requirement**: EVOL-28..32  
**Tests**: checklist UAT visual/acessível em mobile, tablet e desktop  
**Gate**: `npm run build` + UAT  
**Done when**: não há overflow, seletor de dark mode ou estado visual ambíguo.  
**Commit**: `style(ui): modernize light trip experience`

### T20: Atualizar documentação e contratos

**Status**: Proposed / Blocked  
**What**: Atualizar API, data model, architecture e testing com o contrato final e a estratégia de migração.  
**Where**: `docs/api.md`  
**Depends on**: T19  
**Requirement**: rastreabilidade e documentação permanente  
**Tests**: revisão de consistência, links e exemplos de payload  
**Gate**: `npm run build` + `npm test`  
**Done when**: documentação não promete comportamento diferente do código aprovado.  
**Commit**: `docs(product): document account and payment contracts`

### T21: Executar Verifier independente

**Status**: Proposed / Blocked  
**What**: Produzir relatório de validação com evidência por AC, gate e 1–3 mutações em scratch isolado.  
**Where**: diretório de artefatos definido para esta feature  
**Depends on**: T20  
**Requirement**: todos os EVOL  
**Tests**: outcome check e discrimination sensor  
**Gate**: `python .kiro/scripts/validate_state.py docs/features/evolucao-conta-compartilhada --root .`  
**Done when**: relatório PASS com evidência `file:line`, nenhum mutant sobrevivente sem fix task e tasks rastreáveis.  
**Commit**: `test(verification): verify shared account evolution`

### T22: Registrar lessons grounded

**Status**: Proposed / Blocked  
**What**: Registrar somente sinais reais encontrados pelo Verifier usando `lessons.py`.  
**Where**: `.kiro/lessons.json` e `.kiro/LESSONS.md`, somente se houver sinal  
**Depends on**: T21  
**Requirement**: lessons do processo  
**Tests**: self-test/status do script de lessons  
**Gate**: `python .kiro/scripts/lessons.py --root . selftest`  
**Done when**: nenhuma lesson é inventada e cada entrada tem source grounded no validation report.  
**Commit**: `chore(process): distill verified evolution lessons`

## Task Integrity Rules

- Nenhuma task de código começa enquanto T1–T4 estiverem bloqueada por decisões não confirmadas.
- Cada `Where` representa um deliverable coeso; se a implementação exigir múltiplos arquivos não coesos, dividir a task.
- Os testes pertencem à mesma task que cria/modifica o comportamento.
- Cada task concluída recebe exatamente um commit; a mensagem planejada deve passar no `check_commit.py`.
- Tasks antigas permanecem no arquivo; gaps do Verifier viram novas tasks.
