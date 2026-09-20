# Tasks — protótipo frontend de conta compartilhada

**Spec:** `docs/features/evolucao-conta-compartilhada/spec.md`  
**Context:** `docs/features/evolucao-conta-compartilhada/context.md`  
**Design:** `docs/features/evolucao-conta-compartilhada/design.md`  
**Status:** Proposed — escopo somente frontend

## Execution Protocol

Todas as tasks tocam apenas `frontend/`. Nenhuma altera `backend/`, schema ou contrato de API. Cada task começa como `Proposed`, vira `In Progress` ao iniciar, e só vira `Done` após o gate verde e a revisão de adequação. Cada task concluída recebe exatamente um commit local com a mensagem planejada, validada por `check_commit.py`. Tasks concluídas permanecem no arquivo.

Não há backend nesta feature: cadastro, login e persistência são simulados no navegador.

## Test Coverage Matrix

> Guidelines: `docs/testing.md`, `.kiro/steering/trip-splitter-project.md`, `.kiro/references/design.md`. Não há runner de teste frontend configurado; a verificação combina UAT manual e checagem de funções de domínio puro quando extraíveis. Adotar runner automatizado exige task própria que explicite o impacto de dependência.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio puro no frontend (saldo, netting, transição de pagamento, regra de reset) | unit se runner aprovado, senão checagem manual documentada | Todos os ACs de cálculo/estado e edge cases | `frontend/app.js` | `npm run build` + UAT |
| Fluxo de UI (telas, estados, ações) | manual UAT | Jornada, loading, sucesso, erro, vazio, indisponibilidade e permissão por papel | `frontend/index.html`, `frontend/app.js` | `npm run build` + UAT |
| Sistema visual | manual UAT | Modo claro, responsividade, acessibilidade e ausência de dark mode | `frontend/style.css` | `npm run build` + UAT |

## Gate Check Commands

| Gate Level | Command |
| --- | --- |
| Quick | `npm run build` |
| UAT | `npm run build` + checklist de aceitação no navegador |
| Spec | `python .kiro/scripts/validate_spec.py docs/features/evolucao-conta-compartilhada/spec.md --root .` |
| Tasks | `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .` |
| Commit | `python .kiro/scripts/check_commit.py --message "<task message>"` |

## Execution Plan

Fases sequenciais; cada fase conclui antes da próxima.

### Phase 1: Base simulada

```text
T1 -> T2 -> T3
```

### Phase 2: Viagens e despesas

```text
T3 -> T4 -> T5 -> T6
```

### Phase 3: Pagamentos, prazos e reset

```text
T6 -> T7 -> T8 -> T9
```

### Phase 4: Resumo global e experiência

```text
T9 -> T10 -> T11 -> T12
```

## Task Breakdown

### T1: Criar store simulado no navegador

**Status**: Proposed
**What**: Implementar o estado simulado (usuários, sessão, viagens, membros, despesas, obrigações) com leitura/escrita no navegador e indicação clara de reinício.
**Where**: `frontend/app.js`
**Depends on**: None
**Requirement**: PROTO-01, PROTO-05
**Tests**: checagem manual documentada das funções de store e persistência
**Gate**: `npm run build`
**Done when**: o estado inicial é criado, persiste conforme a estratégia escolhida e a UI indica quando reinicia.
**Commit**: `feat(frontend): add simulated in-browser store`

### T2: Simular cadastro, login e logout

**Status**: Proposed
**What**: Implementar cadastro por email/senha, login validando o estado simulado, logout e aviso explícito de simulação.
**Where**: `frontend/app.js`
**Depends on**: T1
**Requirement**: PROTO-01, PROTO-02, PROTO-03, PROTO-04, PROTO-05
**Tests**: UAT de cadastro, login válido, login inválido e logout
**Gate**: `npm run build` + UAT
**Done when**: credenciais válidas entram, inválidas mostram erro, logout volta ao login e a simulação é sinalizada.
**Commit**: `feat(frontend): simulate signup and login`

### T3: Criar telas de autenticação

**Status**: Proposed
**What**: Criar as telas de cadastro/login e o container das áreas autenticadas.
**Where**: `frontend/index.html`
**Depends on**: T2
**Requirement**: PROTO-01, PROTO-04, PROTO-05
**Tests**: UAT de navegação entre login, cadastro e área autenticada
**Gate**: `npm run build` + UAT
**Done when**: as telas exibem os fluxos de entrada, erro e saída de forma compreensível.
**Commit**: `feat(frontend): add authentication screens`

### T4: Viagens por usuário com papéis

**Status**: Proposed
**What**: Criar/listar viagens do usuário logado e aplicar owner/member, incluindo bloqueio de acesso a viagens de terceiros.
**Where**: `frontend/app.js`
**Depends on**: T3
**Requirement**: PROTO-06, PROTO-07, PROTO-08, PROTO-09
**Tests**: UAT com duas contas simuladas verificando visibilidade, papel e bloqueio
**Gate**: `npm run build` + UAT
**Done when**: o usuário vê só suas viagens, é owner ao criar e não acessa viagem de terceiros.
**Commit**: `feat(frontend): scope trips by simulated user`

### T5: Registrar despesas e gerar obrigações

**Status**: Proposed
**What**: Registrar despesas na viagem e derivar as obrigações entre participantes no estado simulado.
**Where**: `frontend/app.js`
**Depends on**: T4
**Requirement**: PROTO-10, PROTO-11
**Tests**: checagem manual do cálculo de obrigações e UAT do registro
**Gate**: `npm run build` + UAT
**Done when**: uma despesa gera obrigações coerentes e aparece na viagem correta.
**Commit**: `feat(frontend): record expenses and derive obligations`

### T6: Renderizar estados verdadeiros de despesas e quitação

**Status**: Proposed
**What**: Exibir listas com dados, vazio verdadeiro, erro e indisponibilidade sem mensagens falsas.
**Where**: `frontend/index.html`
**Depends on**: T5
**Requirement**: PROTO-12, PROTO-13, PROTO-14
**Tests**: UAT alternando com dados, sem dados e erro
**Gate**: `npm run build` + UAT
**Done when**: nenhuma tela mostra vazio ou tudo quitado quando há dados ou erro.
**Commit**: `fix(frontend): render truthful expense states`

### T7: Fluxo de pagamento em duas etapas

**Status**: Proposed
**What**: Implementar declarar pagamento pelo devedor, confirmar recebimento pelo recebedor e recusa, movendo o valor do pendente para concluído na confirmação.
**Where**: `frontend/app.js`
**Depends on**: T6
**Requirement**: PROTO-15, PROTO-16, PROTO-17, PROTO-18, PROTO-19
**Tests**: checagem manual das transições e UAT de declarar, confirmar, recusar e tentativa sem permissão
**Gate**: `npm run build` + UAT
**Done when**: só o recebedor conclui; declaração sozinha não quita; recusa volta a pendente.
**Commit**: `feat(frontend): add two-step payment confirmation`

### T8: Prazo por obrigação definido pelo recebedor

**Status**: Proposed
**What**: Permitir que o recebedor defina prazo por obrigação e exibir dentro do prazo, atrasado ou sem prazo conforme a data de referência simulada.
**Where**: `frontend/app.js`
**Depends on**: T7
**Requirement**: PROTO-20, PROTO-21, PROTO-22, PROTO-23, PROTO-24
**Tests**: checagem manual da regra temporal e UAT variando a data de referência
**Gate**: `npm run build` + UAT
**Done when**: prazo é definido só pelo recebedor e o atraso reflete a data simulada.
**Commit**: `feat(frontend): add per-obligation deadlines`

### T9: Reset de gastos com bloqueio e confirmação

**Status**: Proposed
**What**: Implementar reset do owner que apaga gastos, exige confirmação e é bloqueado quando há pagamento concluído.
**Where**: `frontend/app.js`
**Depends on**: T8
**Requirement**: PROTO-25, PROTO-26, PROTO-27, PROTO-28, PROTO-29
**Tests**: checagem manual da regra de bloqueio e UAT de reset permitido, bloqueado, sem permissão e cancelado
**Gate**: `npm run build` + UAT
**Done when**: reset só ocorre sem pagamentos concluídos, exige confirmação e é restrito ao owner.
**Commit**: `feat(frontend): add guarded expense reset`

### T10: Resumo global com netting

**Status**: Proposed
**What**: Consolidar por pessoa o quanto o usuário deve ou tem a receber, com netting e detalhamento por viagem, ignorando obrigações concluídas.
**Where**: `frontend/app.js`
**Depends on**: T9
**Requirement**: PROTO-30, PROTO-31, PROTO-32, PROTO-33, PROTO-34
**Tests**: checagem manual da função de netting com valores opostos e UAT do resumo e drill-down
**Gate**: `npm run build` + UAT
**Done when**: o resumo mostra o líquido por pessoa, estado vazio verdadeiro e detalhe por viagem.
**Commit**: `feat(frontend): add netted global debt summary`

### T11: Tela inicial de resumo global

**Status**: Proposed
**What**: Criar a tela inicial autenticada que apresenta o resumo global e o acesso às viagens.
**Where**: `frontend/index.html`
**Depends on**: T10
**Requirement**: PROTO-30, PROTO-33
**Tests**: UAT da home com dados, vazio, erro e navegação para uma pessoa/viagem
**Gate**: `npm run build` + UAT
**Done when**: a primeira tela responde quanto o usuário deve a cada pessoa e leva às viagens.
**Commit**: `feat(frontend): add global summary home screen`

### T12: Redesign clean, claro e responsivo

**Status**: Proposed
**What**: Consolidar o sistema visual claro, moderno, responsivo e acessível em todas as telas, sem dark mode.
**Where**: `frontend/style.css`
**Depends on**: T11
**Requirement**: PROTO-35, PROTO-36, PROTO-37, PROTO-38, PROTO-39
**Tests**: checklist UAT de responsividade, acessibilidade, estados e ausência de dark mode
**Gate**: `npm run build` + UAT
**Done when**: as telas são clean, legíveis, responsivas e acessíveis em modo claro.
**Commit**: `style(frontend): modernize light prototype experience`

## Task Integrity Rules

- Nenhuma task altera `backend/`, schema ou contrato de API; a feature é frontend-only.
- Cada `Where` aponta um deliverable coeso; se a implementação exigir arquivos não coesos, dividir a task.
- Os testes/UAT pertencem à mesma task que cria o comportamento.
- Cada task concluída recebe exatamente um commit; a mensagem planejada passa por `check_commit.py`.
- Tasks concluídas permanecem no arquivo; novo escopo ou gap vira nova task com novo ID.
