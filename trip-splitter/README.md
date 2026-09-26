# Rachadinha — Divisor de Contas de Viagem em Grupo

MVP de app web para grupos dividirem gastos de viagem e descobrirem como quitar as dívidas entre si. A versão atual usa uma moeda por viagem (BRL), não possui autenticação e oferece a funcionalidade de rachadinha.

## Método de desenvolvimento

O projeto usa o tlc-spec-driven como mecânica de trabalho, adaptado ao Kiro sem criar uma skill duplicada. O material operacional está diretamente em:

- `.kiro/references/` — referências completas de Specify, Discuss, Design, Tasks, Execute, validação, memória, lessons e princípios;
- `.kiro/scripts/` — validadores determinísticos, `check_commit.py` e `lessons.py`;
- `.kiro/steering/trip-splitter-project.md` — contexto permanente do produto e regras de aplicação.

As pastas `.specs/`, `tlc-spec-driven/`, `.kiro/skills/` e `.kiro/specs/` foram removidas. Não recriá-las. O tlc-spec-driven continua sendo o método principal, não uma pasta adicional no projeto.

## Ciclo obrigatório

1. **Specify:** requisitos, escopo, stories, ACs EARS, edge cases e assumptions.
2. **Discuss:** decisões sobre ambiguidades de UX, API, persistência, estado, auth ou concorrência.
3. **Design:** arquitetura para features Large/Complex.
4. **Tasks:** decomposição atômica para features Large/Complex ou com mais de cinco passos.
5. **Execute:** implementar por tarefa, rodar gates e manter rastreabilidade.
6. **Verifier:** validar ACs por evidência, executar mutações em scratch e registrar gaps.
7. **Lessons:** registrar somente sinais reais pelo script oficial.

Os artefatos de uma feature devem ser criados somente quando a fase exigir e em um caminho explicitamente decidido para a tarefa. Não há um diretório padrão de specs neste workspace.

## Como rodar localmente

Requer **Node.js 18+** e um PostgreSQL acessível (local via Docker ou banco gerenciado).

No PowerShell, a partir da raiz:

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
# edite backend/.env e defina DATABASE_URL
npm start
```

O `npm start` compila, aplica o DDL idempotente e sobe API e frontend em `http://localhost:3000`.

Para desenvolvimento:

```powershell
npm --prefix backend run dev
```

## Testes e gates

```powershell
npm run build
npm test
python .kiro/scripts/lessons.py --root . selftest
python .kiro/scripts/validate_spec.py <caminho\para\spec.md> --root .
python .kiro/scripts/validate_tasks.py <caminho\para\tasks.md> --root .
python .kiro/scripts/validate_state.py <caminho\para\diretorio-da-feature> --root .
```

Os validadores recebem caminhos explícitos porque o projeto não impõe uma pasta de artefatos. A cobertura atual do backend está concentrada em regras de domínio e integração de services; não há lint, testes HTTP automatizados, testes frontend ou CI.

## Como usar

1. Abra `http://localhost:3000` e crie uma viagem.
2. Adicione os participantes.
3. Registre despesas — quem pagou e entre quem dividir.
4. Consulte despesas, saldos e a lista de quem paga quem.
5. Copie o UUID da viagem para compartilhar ou reabrir depois.

## Arquitetura e contrato

- Backend: Node.js + TypeScript + Express.
- Banco: PostgreSQL via `drizzle-orm` + `pg`.
- Frontend: HTML/CSS/JS estático sem build tool.
- Testes: `node:test` nativo do Node.
- Detalhes: `docs/architecture.md`, `docs/api.md`, `docs/data-model.md` e `docs/testing.md`.

## Limitações do MVP

- Uma moeda só, sem conversão.
- Divisão igualitária, sem valores/percentuais desiguais.
- Sem edição/exclusão de despesa.
- Sem autenticação/autorização.
- Sem notificações ou anexos.
- Quitação gulosa: não é garantia do menor número matemático absoluto de transferências em todo caso.
