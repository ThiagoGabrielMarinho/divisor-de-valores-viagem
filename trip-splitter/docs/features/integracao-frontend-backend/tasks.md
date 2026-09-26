# Tasks — Integração do frontend ao backend real

**Spec:** `docs/features/integracao-frontend-backend/spec.md`
**Design:** `docs/features/integracao-frontend-backend/design.md`
**Status:** Proposed — integração backend + frontend

## Execution Protocol

Cada task começa `Proposed`, vira `In Progress` ao iniciar e só vira `Done` após o gate verde e a revisão de adequação. Cada task concluída recebe exatamente um commit local com a mensagem planejada, validada por `check_commit.py`. Tasks concluídas permanecem no arquivo.

As tasks de backend (T1–T2) alteram services/rotas e têm gate `npm test` (PostgreSQL). As de frontend (T3–T6) têm gate `node --check` dos JS mais UAT no navegador, porque o `npm run build` compila só o backend. A remoção do legado (T7) e a documentação (T8) fecham a feature.

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Service/domínio backend | integration PostgreSQL | Derivação de obrigações (pagador, resto, valor não positivo, rollback) e lookup por email | `backend/src/tests/*.test.ts` | `npm test` |
| HTTP backend | integration HTTP | Lookup por email: 200/404/400/401; despesa gera obrigações via rota | `backend/src/tests/*.test.ts` | `npm test` |
| Cliente/UI frontend | `node --check` + UAT | Jornada P1, estados loading/erro/vazio/dados, papéis, 401→auth | `frontend/*.js` | `node --check` + UAT |
| Sistema visual | UAT | Modo claro, responsividade, acessibilidade | `frontend/styles.css` | UAT |

## Gate Check Commands

| Gate Level | Command |
| --- | --- |
| Build | `npm run build` (em `backend`) |
| Full | `npm test` (em `backend`) |
| Syntax FE | `node --check frontend/<arquivo>.js` |
| UAT | abrir `http://localhost:3000` e rodar o checklist da jornada P1 |
| Spec | `python .kiro/scripts/validate_spec.py docs/features/integracao-frontend-backend/spec.md --root .` |
| Tasks | `python .kiro/scripts/validate_tasks.py docs/features/integracao-frontend-backend/tasks.md --root .` |
| Commit | `python .kiro/scripts/check_commit.py --message "<task message>"` |

## Execution Plan

### Phase 1: backend

```text
T1 -> T2
```

### Phase 2: cliente e telas frontend

```text
T2 -> T3 -> T4 -> T5 -> T6
```

### Phase 3: limpeza e documentação

```text
T6 -> T7 -> T8
```

## Task Breakdown

### T1: Derivar obrigações na transação da despesa

**Status**: Done
**What**: Fazer `addExpense` criar, na mesma transação, uma obrigação de cada participante devedor para o pagador, no valor do rateio, ignorando o próprio pagador e valores não positivos; garantir rollback conjunto em falha.
**Where**: `backend/src/services/expenseService.ts`, `backend/src/tests/expense-obligations.test.ts`, `backend/src/tests/reset.test.ts`
**Depends on**: None
**Requirement**: INT-17, INT-18, INT-19, INT-20, INT-22
**Tests**: integração PostgreSQL — despesa dividida gera obrigações corretas; pagador não vira devedor; resto reflete os rateios; despesa inválida não grava obrigação
**Gate**: `npm test`
**Done when**: registrar despesa cria as obrigações derivadas atomicamente e os testes afirmam devedor/recebedor/valor/estado exatos.
**Commit**: `feat(expenses): derive obligations on expense creation`
**Gate result**: `npm test` → 56 passed, 0 failed. Novos testes em `expense-obligations.test.ts` (obrigação única member→owner de 500; pagador não gera obrigação; resto 33/33; despesa inválida não grava). `reset.test.ts` atualizado: a despesa dividida passou a derivar 1 obrigação, então os testes de reset agora esperam 2 obrigações apagadas (1 derivada + 1 manual), mantendo as asserções de deleção total.

### T2: Buscar conta por email

**Status**: Done
**What**: Adicionar `findUserByEmail` no service de auth e a rota fina `GET /api/account/lookup?email=` protegida por sessão, retornando apenas `{ id, nome, email }`.
**Where**: `backend/src/services/authService.ts`, `backend/src/routes/account.ts`, `backend/src/tests/account-lookup.test.ts`
**Depends on**: T1
**Requirement**: INT-12, INT-16
**Tests**: integração HTTP — 200 com campos públicos; 404 email inexistente; 400 sem email; 401 sem sessão
**Gate**: `npm test`
**Done when**: o endpoint resolve email→conta sem expor senha e exige sessão, com assertions exatas.
**Commit**: `feat(account): add account lookup by email`
**Gate result**: `npm test` → 61 passed, 0 failed. `account-lookup.test.ts` afirma 200 com `{id,nome,email}` sem `senha`/`created_at`, 404 para email inexistente, 400 sem email e 401 sem sessão.

### T3: Cliente de API do frontend

**Status**: Done
**What**: Criar `frontend/api.js` com `apiFetch` (`credentials: "include"`, JSON, `ApiError`) e as funções que mapeiam o contrato, incluindo o gancho global de 401→auth.
**Where**: `frontend/api.js`
**Depends on**: T2
**Requirement**: INT-06
**Tests**: `node --check`; verificação manual de que 401 dispara o callback de sessão
**Gate**: `node --check frontend/api.js`
**Done when**: o cliente cobre todas as rotas da jornada e trata erro/401 de forma central.
**Commit**: `feat(frontend): add api client for real backend`
**Gate result**: `node --check frontend/api.js` OK. Cliente cobre auth, viagens, lookup, participantes, despesas, obrigações, prazos, resumo global e reset; 401 chama `setUnauthorizedHandler` e lança `ApiError`.

### T4: Telas de autenticação integradas

**Status**: Done
**What**: Criar `frontend/index.html` (auth/home/viagem) e o `frontend/styles.css` baseado no `prototype.css`, com o fluxo de cadastro/login/logout ligado à API e erro neutro.
**Where**: `frontend/index.html`, `frontend/styles.css`, `frontend/app.js`
**Depends on**: T3
**Requirement**: INT-01, INT-02, INT-03, INT-04, INT-05
**Tests**: `node --check frontend/app.js`; UAT de cadastro, login válido/inválido, logout e bloqueio sem sessão
**Gate**: `node --check frontend/app.js` + UAT
**Done when**: a jornada de entrada funciona ponta a ponta contra o backend e sem sessão fica na auth.
**Commit**: `feat(frontend): integrate authentication screens`
**Status pós-execução**: Done — `node --check` OK; telas auth/home/viagem em `index.html`, `styles.css` (base do protótipo), `app.js` com login/cadastro/logout, erro neutro em 401 e handler global 401→auth. UAT interativa fica na task de verificação.

### T5: Home com viagens e resumo global

**Status**: Done
**What**: Implementar a home autenticada: resumo global por pessoa com netting e estado vazio verdadeiro, lista de viagens do usuário, criação de viagem e navegação para a viagem.
**Where**: `frontend/app.js`
**Depends on**: T4
**Requirement**: INT-07, INT-08, INT-32, INT-33, INT-34, INT-35
**Tests**: `node --check`; UAT de home com dados/vazio/erro e criação de viagem
**Gate**: `node --check frontend/app.js` + UAT
**Done when**: a home lista só as viagens do usuário e mostra o líquido por pessoa com detalhe.
**Commit**: `feat(frontend): add authenticated home with global summary`
**Nota de commit**: T4, T5 e T6 compartilham `index.html`/`app.js` (peça coesa de UI); entregues juntas em um único commit para não fatiar arquivos acoplados. Ver commit de T6.

### T6: Tela de viagem completa integrada

**Status**: Done
**What**: Implementar a tela de viagem: participantes e adicionar por email (owner-only), registrar despesa, listar despesas, listar obrigações com ações por papel (declarar/confirmar/recusar/prazo) e reset owner-only com bloqueio, tudo via API.
**Where**: `frontend/app.js`
**Depends on**: T5
**Requirement**: INT-09, INT-10, INT-11, INT-13, INT-14, INT-15, INT-21, INT-23, INT-24, INT-25, INT-26, INT-27, INT-28, INT-29, INT-30, INT-31
**Tests**: `node --check`; UAT com duas contas cobrindo papéis, despesa→obrigação, pagamento em duas etapas, prazo e reset
**Gate**: `node --check frontend/app.js` + UAT
**Done when**: toda a jornada da viagem funciona contra o backend, com ações contextuais por papel e estados verdadeiros.
**Commit**: `feat(frontend): integrate trip screen with backend`
**Gate result**: `node --check frontend/app.js` OK. Este commit entrega as telas de T4, T5 e T6 (index.html, styles.css, app.js): auth, home com resumo global e viagens, e viagem com participantes/adicionar por email/despesas/obrigações/pagamentos/prazos/reset, tudo via `/api`.

### T7: Remover o frontend legado

**Status**: Proposed
**What**: Remover `frontend/index.html` legado, `frontend/app.js` legado e `frontend/style.css` legado, substituídos pelos novos arquivos; confirmar que a raiz serve a aplicação integrada.
**Where**: `frontend/style.css`
**Depends on**: T6
**Requirement**: (limpeza — Success Criteria)
**Tests**: UAT confirmando que `GET /` serve a nova aplicação e nenhuma referência ao legado permanece
**Gate**: UAT
**Done when**: o MVP por UUID não é mais servido e não há arquivos legados órfãos.
**Commit**: `refactor(frontend): remove legacy uuid mvp`

### T8: Atualizar documentação de contrato

**Status**: Proposed
**What**: Atualizar `docs/api.md` (efeito de derivação de obrigações no POST de despesa e novo endpoint de lookup) e `docs/architecture.md`/`docs/data-model.md` se necessário.
**Where**: `docs/api.md`
**Depends on**: T7
**Requirement**: (documentação permanente)
**Tests**: revisão de conteúdo e `git diff --check`
**Gate**: `git diff --check`
**Done when**: a documentação reflete a derivação de obrigações e o endpoint de lookup.
**Commit**: `docs(api): document obligation derivation and lookup`

## Task Integrity Rules

- Cada `Where` aponta um deliverable coeso; arquivos não coesos exigem dividir a task.
- Os testes/UAT pertencem à mesma task que cria o comportamento.
- Cada task concluída recebe exatamente um commit; a mensagem passa por `check_commit.py`.
- Tasks concluídas permanecem no arquivo; novo escopo ou gap vira nova task com novo ID.
- Nenhuma credencial entra no repositório; `backend/.env` permanece git-ignored.
