# Estratégia de testes e validação

## Estado atual

O backend usa `node:test` nativo e executa os testes compilados contra o PostgreSQL indicado por `DATABASE_URL`. A suíte atual está em `backend/src/tests/expense.test.ts` e cobre regras de domínio de duplicidade, divisão, saldo, quitação e validações de despesa.

Não há, neste momento:

- lint ou formatter configurado;
- suíte HTTP automatizada;
- testes automatizados do frontend;
- workflow de CI;
- banco/schema de teste separado obrigatório;
- migrations versionadas.

A cobertura real e suas lacunas devem ser registradas no relatório de validação localizado no diretório de artefatos escolhido para a feature; não considerar a feature integralmente verificada apenas porque o build passa.

## Pré-requisitos

1. Node.js 18 ou superior.
2. PostgreSQL acessível.
3. `backend/.env` criado a partir de `backend/.env.example`.
4. `DATABASE_URL` configurada.

Os testes atuais criam viagens com IDs aleatórios, mas usam o banco apontado por `DATABASE_URL` e não removem todos os dados ao final. Para execução segura em equipe/CI, usar um banco ou schema dedicado de testes; não assumir que um banco de desenvolvimento compartilhado é isolamento suficiente.

## Comandos no Windows/PowerShell

Na raiz do projeto:

```powershell
npm run install:all
Copy-Item backend/.env.example backend/.env
# editar backend/.env e definir DATABASE_URL
npm run build
npm run db:migrate
npm test
```

Para desenvolvimento interativo, o processo longo deve ser iniciado manualmente:

```powershell
npm --prefix backend run dev
```

O comando de teste é de execução única: `npm test` chama o build, aplica a migração e executa `node --test dist/tests/*.test.js`.

## Gates do projeto

| Gate | Comando | Objetivo |
| --- | --- | --- |
| Build | `npm run build` | Compilar TypeScript estrito. |
| Banco | `npm run db:migrate` | Confirmar conexão e DDL idempotente. |
| Full | `npm test` | Build + migração + testes de domínio/integracão. |
- **Spec:** `python .kiro/scripts/validate_spec.py <caminho-para-spec.md> --root .` | Validar IDs, seções, EARS/SHALL e assumptions. |
- **Tasks:** `python .kiro/scripts/validate_tasks.py <caminho-para-tasks.md> --root .` | Validar granularidade, dependências, Tests e Gate. |
- **Estado:** `python .kiro/scripts/validate_state.py <diretorio-da-feature> --root .` | Confirmar relatório Verifier com verdict/evidência. |
| Commit | `python .kiro/scripts/check_commit.py --message "feat(scope): descricao"` | Validar Conventional Commit quando um commit for solicitado. |

Os scripts da metodologia devem ser chamados a partir de `.kiro/scripts`, nunca de uma pasta `scripts` presumida na raiz.

## Regra de rastreabilidade

Toda acceptance criterion precisa apontar para uma asserção que verifica o resultado definido na spec. Leitura de código, smoke manual ou um teste que apenas confirma que “existe um campo” não substituem uma asserção do valor/status/estado esperado.

A matriz deve distinguir:

- **domain/unit:** algoritmos puros, como `splitEqually`;
- **integration/database:** services e invariantes persistidas;
- **HTTP contract:** status, payload, erro e comportamento de cada rota;
- **frontend/UAT:** fluxo visível ao usuário, estados vazios e mensagens;
- **operational:** build, migração e inicialização.

## Fluxo tlc-spec-driven para cada feature

1. **Specify:** definir problema, escopo negativo, stories, ACs EARS, IDs, edge cases e assumptions.
2. **Discuss:** capturar decisões de UX/API quando houver ambiguidade ou persistência, estado, concorrência, auth ou chamadas externas.
3. **Design:** registrar componentes, interfaces, dados, riscos e decisões; carregar os artefatos de contexto e memória definidos para a tarefa, quando existirem.
4. **Tasks:** quebrar em entregáveis atômicos, cada um com testes, gate, dependências e critério binário.
5. **Execute:** implementar uma tarefa por vez; rodar seu gate; manter rastreabilidade; não enfraquecer testes.
6. **Verifier:** rederivar cobertura, executar gate, rodar mutações em scratch isolado, registrar `validation.md` e converter gaps em tarefas.
7. **Lessons:** somente após uma validação com sinal real, usar `.kiro/scripts/lessons.py` para registrar orientação grounded; nunca editar `LESSONS.md` manualmente.

Feature user-facing requer UAT além dos testes automatizados. Uma feature não deve ser marcada `Done` se o relatório independente estiver com `Issues`, `FAIL`, AC sem evidência ou gap de precisão não aceito.

## Estado atual do backend de conta compartilhada

A suíte usa `node:test` com `--test-concurrency=1` porque os arquivos compartilham um pool PostgreSQL e cada suíte encerra sua conexão. No Aiven, o gate completo passou com **40 testes** após as rotas HTTP; as tasks seguintes adicionaram cobertura de schema/auth/session/membership/obligation/reset/global balance.

A suíte deve ser executada com `DATABASE_URL` fornecida por variável de ambiente. Credenciais não entram no repositório. O erro de certificado Aiven é evitado pela normalização de `sslmode=require` em `backend/src/db/index.ts`, mantendo SSL explícito para banco gerenciado.
