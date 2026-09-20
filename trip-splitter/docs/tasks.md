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
