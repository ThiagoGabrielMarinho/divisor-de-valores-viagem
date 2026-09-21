# Registro de documentação e planejamento

Este arquivo é o changelog contínuo das alterações de documentação e planejamento do Trip Splitter. Cada entrada descreve, de forma objetiva, o que foi mexido, por quê e qual commit registrou a mudança. Ele complementa o registro de tasks em `docs/tasks.md`.

Escopo deste log:

- adaptações do método tlc-spec-driven;
- criação e refinamento de specs, contexto, design e tasks de features;
- decisões de produto registradas;
- mudanças em documentação permanente (`docs/`).

Não registra aqui detalhes de implementação de código; esses ficam nas tasks da feature e nos commits correspondentes.

## Convenção de entrada

Cada entrada segue: data, task relacionada, o que mudou, arquivos e commit.

## Entradas

### 2026-09-20 — PROTO T13: layout da seção de reset

- **O que mudou:** a seção de resetar gastos foi redesenhada em `index.html` e `prototype.css` com ícone, título, descrição e botão alinhados, faixa lateral de risco e responsividade; a classe antiga `danger-zone` foi substituída por `reset-card`.
- **Por quê:** o layout do reset estava feio e inconsistente com o restante.
- **Arquivos:** `frontend/prototype/prototype.css`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** consistência de classes verificada (CSS/HTML) e sem resíduo de `danger-zone`; UAT visual pendente de execução pelo usuário.
- **Commit:** `style(frontend): refine reset section layout`.

### 2026-09-20 — PROTO T12: redesign clean, claro e responsivo

- **O que mudou:** `frontend/prototype/prototype.css` reescrito como sistema visual moderno em modo claro exclusivo, com tokens de cor, hierarquia, cartões, botões (primário, ghost, small, danger), listas de resumo/viagens/despesas/obrigações, chips, checkbox de divisão, zona de risco do reset, foco visível, contraste, `sr-only` e responsividade (grid da viagem colapsa, header empilha, obrigações em coluna no mobile).
- **Por quê:** entregar a experiência clean, bonita e acessível pedida, sem dark mode.
- **Arquivos:** `frontend/prototype/prototype.css`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** checagem de consistência confirmou que todas as classes usadas pela UI têm estilo, que não há `prefers-color-scheme`/tema escuro (a única ocorrência de "dark" é o comentário "sem dark mode") e que o CSS tem conteúdo. UAT visual no navegador pendente de execução pelo usuário.
- **Commit:** `style(frontend): modernize light prototype experience`.

### 2026-09-20 — PROTO T11: controlador de UI completo

- **O que mudou:** `frontend/prototype/app.js` reescrito como controlador completo (home com resumo global e viagens, tela de viagem com participantes, despesas, obrigações, pagamentos em duas etapas, prazos e reset), usando `render.applyState` para estados verdadeiros. `index.html` ganhou os contêineres de home e da tela de viagem.
- **Por quê:** conectar todos os módulos simulados em uma jornada navegável.
- **Arquivos:** `frontend/prototype/app.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde em todos os JS; integração ponta a ponta verificada em Node (home, obrigação, pagamento, netting). UAT interativa no navegador pendente de execução pelo usuário.
- **Commit:** `feat(frontend): add global summary home screen`.

### 2026-09-20 — PROTO T10: resumo global com netting

- **O que mudou:** criado `frontend/prototype/summary.js` com `globalSummaryForUser` (agrega obrigações não concluídas de todas as viagens do usuário por pessoa, aplica netting e ordena por magnitude) e `detailsForPerson` (drill-down). Incluído no `index.html`.
- **Por quê:** responder "quanto devo/tenho a receber de cada pessoa" no total, com valor líquido.
- **Arquivos:** `frontend/prototype/summary.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou netting entre viagens, detalhamento, recálculo ao concluir e resumo vazio quando quites.
- **Commit:** `feat(frontend): add netted global debt summary`.

### 2026-09-20 — PROTO T9: reset com bloqueio e confirmação

- **O que mudou:** criado `frontend/prototype/reset.js` com `canReset` (bloqueia sem owner ou com pagamento concluído) e `resetTripExpenses` (exige confirmação, apaga só a viagem alvo). Incluído no `index.html`.
- **Por quê:** permitir recomeçar os gastos sem destruir uma viagem que já teve quitação.
- **Arquivos:** `frontend/prototype/reset.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou owner-only, confirmação, isolamento por viagem e bloqueio após pagamento concluído.
- **Commit:** `feat(frontend): add guarded expense reset`.

### 2026-09-20 — PROTO T8: prazo por obrigação

- **O que mudou:** criado `frontend/prototype/deadlines.js` com `setDeadline`/`clearDeadline` restritos ao recebedor, `referenceDate`/`setReferenceDate` para data simulada e `deadlineStatus` (sem_prazo, no_prazo, atrasado, concluido). Incluído no `index.html`.
- **Por quê:** dar ao credor o controle do prazo e derivar atraso de forma determinística.
- **Arquivos:** `frontend/prototype/deadlines.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou papel, limites do dia, data inválida e obrigação concluída.
- **Commit:** `feat(frontend): add per-obligation deadlines`.

### 2026-09-20 — PROTO T7: pagamento em duas etapas

- **O que mudou:** criado `frontend/prototype/payments.js` com `declarePayment` (devedor), `confirmReceipt` (recebedor), `rejectDeclaration` (recebedor) e `pendingBalanceForUser`, aplicando as transições pendente → aguardando_confirmacao → concluido e a regra de que concluído sai do saldo pendente. Incluído no `index.html`.
- **Por quê:** implementar o combinado do grupo: quem paga declara e quem recebe confirma.
- **Arquivos:** `frontend/prototype/payments.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou papéis, transições, recusa e efeito no saldo pendente.
- **Commit:** `feat(frontend): add two-step payment confirmation`.

### 2026-09-20 — PROTO T6: estados verdadeiros de renderização

- **O que mudou:** criado `frontend/prototype/render.js` com `decideState` puro (loading, error, unavailable, empty, data), mensagens por seção e `applyState` para o DOM. Erro e ausência de dados nunca são tratados como "vazio". Incluído no `index.html`.
- **Por quê:** impedir que a interface mostre "nenhuma despesa" ou "tudo quitado" quando há dados ou falha.
- **Arquivos:** `frontend/prototype/render.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou precedência de erro/indisponível sobre vazio e vazio só com lista vazia.
- **Commit:** `fix(frontend): render truthful expense states`.

### 2026-09-20 — PROTO T5: despesas e obrigações derivadas

- **O que mudou:** criado `frontend/prototype/expenses.js` com registro de despesa, divisão igualitária em centavos (resto aos primeiros) e derivação de obrigações (cada devedor deve sua parte ao pagador). Incluído no `index.html`.
- **Por quê:** transformar despesas em dívidas rastreáveis para pagamento, prazo e resumo.
- **Arquivos:** `frontend/prototype/expenses.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou split 34/33/33, obrigações sem o pagador, soma coerente, estado pendente e validações.
- **Commit:** `feat(frontend): record expenses and derive obligations`.

### 2026-09-20 — PROTO T4: viagens por usuário com papéis

- **O que mudou:** criado `frontend/prototype/trips.js` com criação de viagem (criador vira owner), listagem restrita ao usuário logado, acesso com verificação de membership, adição de membro (member por padrão) e helpers de papel. `trips.js` foi incluído no `index.html` antes do `app.js`.
- **Por quê:** dar visibilidade por usuário e papéis owner/member ao protótipo.
- **Arquivos:** `frontend/prototype/trips.js`, `frontend/prototype/index.html`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou owner ao criar, isolamento por usuário, bloqueio de acesso cruzado e entrada como member.
- **Commit:** `feat(frontend): scope trips by simulated user`.

### 2026-09-20 — PROTO T3: telas de autenticação

- **O que mudou:** criado `frontend/prototype/index.html` com telas de login e cadastro, abas acessíveis, aviso de simulação e container da área autenticada. Para a tela funcionar isolada, foram criados um `app.js` mínimo (alternância de abas, login/cadastro/logout, erros e transição de tela) e um `prototype.css` base em modo claro.
- **Por quê:** entregar a jornada de entrada do protótipo de forma verificável.
- **Nota de rastreabilidade:** `app.js` (Where de T11) e `prototype.css` (Where de T12) começaram como base nesta task e serão enriquecidos nas suas tasks próprias; nenhum arquivo de `backend/` foi tocado.
- **Arquivos:** `frontend/prototype/index.html`, `frontend/prototype/app.js`, `frontend/prototype/prototype.css`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde nos três JS; UAT do fluxo de entrada pendente de execução no navegador pelo usuário.
- **Commit:** `feat(frontend): add authentication screens`.

### 2026-09-20 — PROTO T2: autenticação simulada

- **O que mudou:** criado `frontend/prototype/auth.js` com cadastro, login, logout e usuário atual simulados sobre o store, incluindo aviso explícito de simulação e mensagem de erro neutra.
- **Por quê:** permitir o fluxo de identidade no protótipo sem servidor nem segurança real.
- **Arquivos:** `frontend/prototype/auth.js`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual confirmou cadastro, duplicado rejeitado, login válido/inválido, logout e sessão.
- **Commit:** `feat(frontend): simulate signup and login`.

### 2026-09-20 — PROTO T1: store simulado do protótipo

- **O que mudou:** criado o store simulado do protótipo em `frontend/prototype/store.js`, com estado em memória espelhado em `localStorage`, entidades (users, session, trips, memberships, expenses, obligations), geração de IDs, update/persist e sinal de reinício de estado.
- **Por quê:** dar base de dados simulada ao protótipo frontend-only, sem backend.
- **Arquivos:** `frontend/prototype/store.js`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; checagem manual em Node confirmou estado vazio, IDs únicos, update, clearAll e sinal de reset.
- **Commit:** `feat(frontend): add simulated in-browser store`.

### 2026-09-20 — T5: gate honesto e pasta do protótipo

- **O que mudou:** o `tasks.md` da feature passou a construir o protótipo em `frontend/prototype/` (separado do `frontend/app.js` legado, que ainda fala com o backend) e trocou o gate de `npm run build` por `node --check` do JS do protótipo mais UAT, porque o build atual compila o backend e não valida o frontend.
- **Por quê:** o gate anterior não verificava o protótipo; o novo é honesto para código frontend estático e não quebra o app legado.
- **Arquivos:** `docs/features/evolucao-conta-compartilhada/tasks.md`, `docs/planning-log.md`, `docs/tasks.md`.
- **Commit:** `docs(planning): use honest frontend gate for prototype`.

### 2026-09-20 — T4: criação deste changelog

- **O que mudou:** criado o registro contínuo de documentação e planejamento.
- **Por quê:** o planejamento será usado de forma recorrente e precisa de um histórico consultável.
- **Arquivos:** `docs/planning-log.md`, `docs/tasks.md`.
- **Commit:** `docs(process): add planning changelog`.

### 2026-09-20 — T3: refino da feature para escopo frontend-only

- **O que mudou:** spec, contexto, design e tasks da feature `evolucao-conta-compartilhada` foram reescritos para um protótipo somente frontend, com decisões confirmadas (login/cadastro simulados, owner/member, pagamento em duas etapas, confirmação pelo recebedor, prazo por obrigação definido por quem recebe, reset bloqueado após pagamento concluído, resumo global com netting, modo claro).
- **Por quê:** o produto ainda não tem backend nem banco; a evolução vira um protótipo de interface.
- **Arquivos:** `docs/features/evolucao-conta-compartilhada/{spec,context,design,tasks}.md`, `docs/tasks.md`.
- **Commit:** `1f7c146 docs(planning): scope shared account prototype to frontend`.

### 2026-09-20 — T2: planejamento inicial da evolução

- **O que mudou:** criados spec, contexto, design e tasks iniciais da evolução de conta compartilhada, com decisões ainda abertas para Discuss.
- **Por quê:** transformar os pedidos em uma feature rastreável antes de qualquer implementação.
- **Arquivos:** `docs/features/evolucao-conta-compartilhada/`, `docs/tasks.md`.
- **Commit:** `8d18009 docs(planning): define shared account evolution tasks`.

### 2026-09-20 — T1: documentação da adaptação do método

- **O que mudou:** criado o documento que descreve a adaptação do tlc-spec-driven ao Kiro e ao Trip Splitter.
- **Por quê:** registrar o que foi preservado, adaptado, removido e validado na migração do método.
- **Arquivos:** `docs/tlc-spec-driven-adaptation.md`, `docs/tasks.md`.
- **Commit:** `5ea616e docs(process): document tlc-spec-driven adaptation`.
