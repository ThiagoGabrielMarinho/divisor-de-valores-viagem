# Registro persistente de tasks

Este arquivo mantém o histórico das unidades de trabalho documentais do projeto. Tasks concluídas permanecem registradas.

## T1: Registrar adaptação do tlc-spec-driven ao Kiro e ao Trip Splitter

**Status**: Done
**What**: Criar um documento objetivo descrevendo o que foi preservado, adaptado, removido e validado na migração do tlc-spec-driven para este workspace.
**Where**: `docs/tlc-spec-driven-adaptation.md`
**Depends on**: None
**Requirement**: Documentação operacional do método
**Tests**: revisão de conteúdo e busca de referências obsoletas
**Gate**: `git diff --check`
**Done when**: o documento explica as alterações por área, os caminhos finais, as regras específicas do projeto e as validações executadas.
**Commit**: `docs(process): document tlc-spec-driven adaptation`
**Commit status**: Created in this commit

## T2: Planejar evolução de conta, quitação e UX do Trip Splitter

**Status**: Done
**What**: Criar os artefatos Specify/Discuss/Design/Tasks para corrigir estados falsos, adicionar identidade/login, resumo global de dívidas, confirmação de pagamentos, prazos, reset e redesign clean/light.
**Where**: `docs/features/evolucao-conta-compartilhada/`
**Depends on**: T1
**Requirement**: Planejamento spec-driven da próxima evolução do produto
**Tests**: validadores estruturais de spec/tasks e revisão das decisões abertas
**Gate**: `python .kiro/scripts/validate_spec.py docs/features/evolucao-conta-compartilhada/spec.md --root .` + `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .`
**Done when**: spec, contexto de Discuss, design e tasks persistentes existem; decisões críticas estão explícitas como confirmadas ou bloqueadoras; cada task tem dependências, testes, gate, Done when e commit planejado.
**Commit**: `docs(planning): define shared account evolution tasks`
**Commit status**: Created in this commit

## T3: Refinar evolução para escopo frontend-only com decisões confirmadas

**Status**: Done
**What**: Atualizar spec, contexto, design e tasks da feature para um protótipo somente frontend, com login/cadastro simulados, papéis owner/member, confirmação de pagamento pelo recebedor, prazo por obrigação definido por quem recebe, reset que apaga mas é bloqueado após pagamentos e resumo global com netting.
**Where**: `docs/features/evolucao-conta-compartilhada/`
**Depends on**: T2
**Requirement**: Fechamento das decisões de Discuss e redução de escopo para frontend
**Tests**: validadores estruturais de spec/tasks e revisão das decisões confirmadas
**Gate**: `python .kiro/scripts/validate_spec.py docs/features/evolucao-conta-compartilhada/spec.md --root .` + `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .`
**Done when**: os artefatos refletem escopo frontend-only, decisões confirmadas sem default silencioso e tasks tocando apenas `frontend/`, cada uma com testes, gate, Done when e commit planejado.
**Commit**: `docs(planning): scope shared account prototype to frontend`
**Commit status**: Created in this commit

## T4: Criar registro contínuo de documentação e planejamento

**Status**: Done
**What**: Criar um changelog persistente que registra cada alteração de documentação/planejamento do projeto, para consulta contínua.
**Where**: `docs/planning-log.md`
**Depends on**: T3
**Requirement**: Rastreabilidade de documentação e planejamento
**Tests**: revisão de conteúdo e `git diff --check`
**Gate**: `git diff --check`
**Done when**: o log existe, explica seu propósito e registra as entradas de planejamento já realizadas (T1, T2, T3) com data, escopo e commit.
**Commit**: `docs(process): add planning changelog`
**Commit status**: Created in this commit

## T5: Definir gate honesto e pasta isolada do protótipo

**Status**: Done
**What**: Ajustar o tasks.md da feature para construir o protótipo em `frontend/prototype/` e usar `node --check` + UAT como gate, sem quebrar o `frontend/app.js` legado.
**Where**: `docs/features/evolucao-conta-compartilhada/tasks.md`
**Depends on**: T4
**Requirement**: Gate verificável para código frontend do protótipo
**Tests**: `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .` e `git diff --check`
**Gate**: `python .kiro/scripts/validate_tasks.py docs/features/evolucao-conta-compartilhada/tasks.md --root .`
**Done when**: cada task PROTO aponta para `frontend/prototype/` e usa um gate que realmente verifica o artefato, sem alterar backend.
**Commit**: `docs(planning): use honest frontend gate for prototype`
**Commit status**: Created in this commit

## T6: Planejar schema PostgreSQL da conta compartilhada

**Status**: Done
**What**: Criar spec e tasks de uma feature de persistência que define os comandos SQL para criar as tabelas PostgreSQL necessárias ao domínio validado no protótipo (usuários, viagens, membros/papéis, despesas, rateios, obrigações com estado, prazo e pagamento em duas etapas). Somente planejamento nesta etapa; sem implementar.
**Where**: `docs/features/persistencia-postgresql/`
**Depends on**: T3
**Requirement**: Planejamento do banco que sustenta a evolução de conta compartilhada
**Tests**: validadores estruturais de spec/tasks
**Gate**: `python .kiro/scripts/validate_spec.py docs/features/persistencia-postgresql/spec.md --root .` + `python .kiro/scripts/validate_tasks.py docs/features/persistencia-postgresql/tasks.md --root .`
**Done when**: spec com requisitos rastreáveis e tasks atômicas de DDL por tabela existem, com dependências, testes, gate, Done when e commit planejado; nenhuma tabela é criada nesta etapa.
**Commit**: `docs(planning): plan postgresql schema tasks`
**Commit status**: Created in this commit

## T7: Planejar backend completo da conta compartilhada

**Status**: Done
**What**: Criar spec, design e tasks para transformar o schema PostgreSQL em backend completo: persistência integrada ao boot, autenticação real, memberships, despesas, obrigações, pagamentos, prazos, reset, resumo global e contratos HTTP.
**Where**: `docs/features/backend-conta-compartilhada/`
**Depends on**: T6
**Requirement**: Planejamento backend após schema PostgreSQL
**Tests**: validadores estruturais de spec/tasks e revisão do design
**Gate**: `python .kiro/scripts/validate_spec.py docs/features/backend-conta-compartilhada/spec.md --root .` + `python .kiro/scripts/validate_tasks.py docs/features/backend-conta-compartilhada/tasks.md --root .`
**Done when**: spec, design e tasks atômicas do backend existem; nenhum comportamento crítico fica sem AC, dependência, teste, gate e commit planejado.
**Commit**: `docs(planning): plan shared account backend`
**Commit status**: Created in this commit

## T8: Estabilizar gate da suíte backend PostgreSQL

**Status**: Done
**What**: Corrigir a execução concorrente dos testes de backend que compartilham pool PostgreSQL, para que o gate completo seja determinístico.
**Where**: `backend/package.json`
**Depends on**: T7
**Requirement**: confiabilidade de execução backend
**Tests**: `npm test` no PostgreSQL Aiven
**Gate**: `npm test`
**Done when**: toda a suíte executa sequencialmente sem falhas de pool/race e sem reduzir assertions.
**Commit**: `test(backend): run database suite sequentially`
**Commit status**: Created in this commit
