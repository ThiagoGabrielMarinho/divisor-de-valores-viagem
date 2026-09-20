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
