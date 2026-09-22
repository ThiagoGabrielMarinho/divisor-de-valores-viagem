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

### 2026-09-21 — Backend T12: documentação e Verifier FAIL

- **O que mudou:** docs de API, dados, arquitetura e testing foram atualizados; o Verifier independente criou `validation.md`, confirmou gate 40/40 e 3/3 mutações mortas, mas identificou gaps reais de autorização HTTP, status e atomicidade/reset. Lessons L-001/L-002 foram registradas pelo script.
- **Estado:** T12 fica `Blocked`; T14/T15 foram criadas como fix tasks e exigem nova verificação.
- **Commit:** `docs(backend): document shared account contracts`.

### 2026-09-20 — Backend T11: contratos HTTP protegidos

- **O que mudou:** criadas rotas de auth/account, rotas de trips protegidas por sessão/membership, factory `app.ts`, bootstrap atualizado e teste HTTP de 401/cookie/criação/leitura autorizada.
- **Gate:** `npm test` no Aiven: build, migração e 40/40 testes passaram.
- **Commit:** `feat(api): expose shared account backend routes`.

### 2026-09-20 — Backend T10: resumo global com netting

- **O que mudou:** criado `globalBalanceService.ts` com agregação por user autorizado, netting por par, exclusão de obrigações concluídas e detalhes por viagem; adicionados testes globais.
- **Gate:** `npm test` no Aiven: build, migração e 39/39 testes passaram.
- **Commit:** `feat(balance): add global netted summary service`.

### 2026-09-20 — Backend T9: reset seguro

- **O que mudou:** criado `resetService.ts` com owner-only, confirmação obrigatória, bloqueio por obrigação concluída e exclusão transacional de obrigações/despesas; adicionados testes de autorização, confirmação e bloqueio.
- **Gate:** isolado 4/4; suíte completa no Aiven passou 35/35 na segunda execução após instabilidade transitória.
- **Commit:** `feat(trips): add guarded expense reset service`.

### 2026-09-20 — Backend T8: prazos por obrigação

- **O que mudou:** `obligationService` ganhou definição/limpeza de prazo pelo recebedor, validação `YYYY-MM-DD` e status temporal determinístico (`sem_prazo`, `no_prazo`, `atrasado`, `concluido`); Drizzle usa `DATE`.
- **Gate:** isolado 6/6 e suíte completa no Aiven após T13: 31/31 testes passaram.
- **Commit:** `feat(payments): add obligation deadlines`.

### 2026-09-20 — Backend T13: suíte PostgreSQL sequencial

- **O que mudou:** `backend/package.json` passou a executar `node:test` com `--test-concurrency=1`, evitando corrida entre arquivos que encerram o pool compartilhado.
- **Gate:** `npm test` no Aiven: build, migração e 31/31 testes passaram.
- **Commit:** `test(backend): run database suite sequentially`.

### 2026-09-20 — Backend T7: obrigações e pagamentos

- **O que mudou:** criado `obligationService.ts` com criação autorizada, declaração pelo devedor, confirmação/recusa pelo recebedor, estados persistidos e updates condicionais; adicionados testes de papéis e concorrência.
- **Gate:** `npm test` no Aiven: build, migração e 29/29 testes passaram.
- **Commit:** `feat(payments): implement obligation state transitions`.

### 2026-09-20 — Backend T6: viagens e despesas ligadas a usuários

- **O que mudou:** participantes ganharam `user_id`; `tripService` ganhou criação autenticada como owner, adição de member e verificação de membership; `expenseService` aceita `actorUserId` e rejeita registro sem membership; testes integrados foram adicionados.
- **Gate:** `npm test` no Aiven: build, migração e 25/25 testes passaram.
- **Commit:** `feat(expenses): persist authorized user expenses`.

### 2026-09-20 — Backend T5: middleware de sessão e membership

- **O que mudou:** criado `middleware/auth.ts` com extração de Bearer/cookie, `requireSession` (401) e `requireTripMembership` (403 por membership/role), além de testes integrados.
- **Gate:** `npm test` no Aiven: build, migração e 21/21 testes passaram.
- **Commit:** `feat(auth): protect trip routes by membership`.

### 2026-09-20 — Backend T4: sessão persistida e logout

- **O que mudou:** adicionada tabela `sessions` com token hash, expiração e revogação; `authService` ganhou criação, consulta e revogação de sessão usando SHA-256 para o token persistido; testes de sessão foram adicionados.
- **Gate:** `npm test` no Aiven: build, migração e 17/17 testes passaram.
- **Commit:** `feat(auth): add session lifecycle`.

### 2026-09-20 — Backend T3: cadastro e hash scrypt

- **O que mudou:** criado `authService.ts` com cadastro, normalização de email, duplicidade neutra, hash scrypt nativo e autenticação; criado `auth.test.ts` com 4 testes de hash/auth. O campo legado `users.senha` armazena somente o hash nesta etapa.
- **Gate:** `npm test` no Aiven: build, migração e 13/13 testes passaram.
- **Commit:** `feat(auth): add secure user registration`.

### 2026-09-20 — Backend T2: schema integrado ao boot

- **O que mudou:** `migrate.ts` passou a ler `backend/db/schema.sql`; `db/index.ts` normaliza `sslmode=require` e configura SSL gerenciado sem segredo hardcoded; o SQL ganhou compatibilidade idempotente para colunas/tabelas legadas do MVP.
- **Gate:** `npm test` no PostgreSQL Aiven: build, migração e 8/8 testes passaram.
- **Commit:** `feat(db): run shared schema migration on boot`.

### 2026-09-20 — Backend T1: schema Drizzle alinhado

- **O que mudou:** `backend/src/db/schema.ts` passou a declarar users, memberships e obligations, mantendo exports legados de trips/participants/expenses/shares para a migração gradual dos services.
- **Gate:** `npm run build` passou. O DDL foi aplicado duas vezes no Aiven; `npm test` ficou bloqueado pela configuração SSL legada do backend e será resolvido na T2 de boot/migração.
- **Commit:** `feat(db): align drizzle schema with postgres ddl`.

### 2026-09-20 — Planejamento: backend completo da conta compartilhada

- **O que mudou:** criada `docs/features/backend-conta-compartilhada/` com spec, design e 12 tasks de backend (T1–T12), cobrindo alinhamento Drizzle/DDL, migração no boot, autenticação real, sessão, membership, despesas, obrigações, pagamentos, prazos, reset, netting, rotas HTTP, documentação e Verifier.
- **Por quê:** transformar o schema aplicado em backend completo sem misturar com o protótipo frontend-only.
- **Gate:** `validate_tasks.py` passou sem erros; `validate_spec.py` passou sem erros com warning explícito de decisões de segurança ainda pendentes.
- **Commit:** `docs(planning): plan shared account backend`.

### 2026-09-20 — DB T7: índices de acesso aplicados

- **O que mudou:** adicionados índices idempotentes para memberships, despesas, rateios e obrigações por viagem, devedor e recebedor.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven e catálogo de índices inspecionado.
- **Commit:** `feat(db): add access indexes`.

### 2026-09-20 — DB T6: obrigações com estado e prazo aplicadas

- **O que mudou:** adicionada `obligations` com devedor, recebedor, valor, estados pendente/aguardando_confirmacao/concluido, prazo, confirmação e FKs.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven; idempotência confirmada.
- **Commit:** `feat(db): create obligations table`.

### 2026-09-20 — DB T5: tabela de rateios aplicada

- **O que mudou:** adicionada `expense_shares` com participante, valor em centavos e cascade da despesa.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven.
- **Commit:** `feat(db): create expense shares table`.

### 2026-09-20 — DB T4: tabela de despesas aplicada

- **O que mudou:** adicionada `expenses` com valor positivo em centavos, pagador, vínculo à viagem e cascade.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven.
- **Commit:** `feat(db): create expenses table`.

### 2026-09-20 — DB T3: memberships e papéis aplicados

- **O que mudou:** adicionada `trip_memberships` com papéis owner/member, FKs, cascade e unicidade por viagem/usuário.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven; constraints e idempotência passaram.
- **Commit:** `feat(db): create trip memberships table`.

### 2026-09-20 — DB T2: tabela de viagens aplicada

- **O que mudou:** adicionada `trips` ao `backend/db/schema.sql`, com moeda default BRL e timestamps.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven; idempotência confirmada.
- **Commit:** `feat(db): create trips table`.

### 2026-09-20 — DB T1: tabela de usuários aplicada

- **O que mudou:** criado o primeiro bloco de `backend/db/schema.sql` com `users` e índice único case-insensitive para email.
- **Gate:** SQL aplicado duas vezes no PostgreSQL Aiven via `pg`; ambas as aplicações passaram.
- **Commit:** `feat(db): create users table`.

### 2026-09-20 — Planejamento: schema PostgreSQL

- **O que mudou:** criada a feature de planejamento `docs/features/persistencia-postgresql/` com `spec.md` (20 ACs, DB-01..DB-20) e `tasks.md` (T1–T7, DDL por tabela + índices), definindo as tabelas PostgreSQL do domínio validado no protótipo: users, trips, trip_memberships, expenses, expense_shares e obligations (com estado, prazo e confirmação). Nenhuma tabela foi criada; é só planejamento.
- **Por quê:** preparar a persistência real que sustenta a evolução de conta compartilhada, com valores em centavos, moeda BRL, papéis e estados por constraint, e DDL idempotente.
- **Arquivos:** `docs/features/persistencia-postgresql/spec.md`, `docs/features/persistencia-postgresql/tasks.md`, `docs/tasks.md`.
- **Gate:** `validate_spec.py` e `validate_tasks.py` sem erros nem warnings.
- **Commit:** `docs(planning): plan postgresql schema tasks`.

### 2026-09-20 — PROTO T14: remoção das mensagens de simulação

- **O que mudou:** removidos os textos visíveis que diziam que era simulação: banner do topo, placeholder "senha simulada", hint dos participantes, greeting da home e toasts (login, cadastro, logout, reset de estado). Mensagens de erro do `auth.js`/`trips.js` foram neutralizadas e a constante `SIMULATION_NOTICE` (não usada) foi removida. Comentários internos de código não foram alterados por não serem visíveis ao usuário.
- **Por quê:** a interface não deve anunciar que é simulação.
- **Arquivos:** `frontend/prototype/index.html`, `frontend/prototype/app.js`, `frontend/prototype/auth.js`, `frontend/prototype/trips.js`, `docs/features/evolucao-conta-compartilhada/tasks.md`.
- **Gate:** `node --check` verde; varredura confirmou ausência de texto visível de simulação no HTML e nas mensagens. UAT pendente de execução pelo usuário.
- **Commit:** `refactor(frontend): remove simulation notices`.

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
