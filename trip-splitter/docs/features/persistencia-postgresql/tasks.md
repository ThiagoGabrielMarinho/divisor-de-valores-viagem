# Tasks — schema PostgreSQL da conta compartilhada

**Spec:** `docs/features/persistencia-postgresql/spec.md`
**Status:** Proposed — planejamento de banco

## Execution Protocol

Cada task cria uma parte coesa do schema em SQL idempotente. O arquivo de DDL fica em `backend/db/schema.sql` (novo, sem alterar o código atual do backend nesta feature). As tasks são incrementais: cada uma adiciona seu bloco ao mesmo arquivo, na ordem de dependência (tabelas referenciadas antes das que as referenciam).

Cada task começa `Proposed`, vira `In Progress` ao iniciar e só vira `Done` após o gate. Cada task concluída recebe exatamente um commit com a mensagem planejada, validada por `check_commit.py`. Tasks concluídas permanecem no arquivo.

## Test Coverage Matrix

> Não há banco de testes garantido no ambiente do agente. O gate preferencial é aplicar o DDL em um PostgreSQL de teste; quando indisponível, a verificação é revisão do SQL contra os ACs. A aplicação real em PostgreSQL é obrigatória antes de considerar a feature verificada.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| DDL de schema | aplicação em PostgreSQL | Cada tabela, constraint e índice dos ACs criado e idempotente | `backend/db/schema.sql` | `psql "$DATABASE_URL" -f backend/db/schema.sql` |

## Gate Check Commands

| Gate Level | Command |
| --- | --- |
| Apply | `psql "$DATABASE_URL" -f backend/db/schema.sql` |
| Idempotente | aplicar o comando Apply duas vezes sem erro |
| Spec | `python .kiro/scripts/validate_spec.py docs/features/persistencia-postgresql/spec.md --root .` |
| Tasks | `python .kiro/scripts/validate_tasks.py docs/features/persistencia-postgresql/tasks.md --root .` |
| Commit | `python .kiro/scripts/check_commit.py --message "<task message>"` |

## Execution Plan

### Phase 1: Base de identidade

```text
T1 -> T2 -> T3
```

### Phase 2: Despesas e rateios

```text
T3 -> T4 -> T5
```

### Phase 3: Obrigações e índices

```text
T5 -> T6 -> T7
```

## Task Breakdown

### T1: Criar tabela de usuários

**Status**: Done
**What**: Adicionar o `CREATE TABLE IF NOT EXISTS users` com id texto, email, senha, nome, timestamp e unicidade de email insensível a caixa.
**Where**: `backend/db/schema.sql`
**Depends on**: None
**Requirement**: DB-01
**Tests**: aplicação em PostgreSQL de teste; verificar unicidade de email por `lower(email)`
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: a tabela `users` é criada, reaplicável, com email único insensível a caixa.
**Commit**: `feat(db): create users table`

### T2: Criar tabela de viagens

**Status**: Done
**What**: Adicionar o `CREATE TABLE IF NOT EXISTS trips` com id, nome, moeda com default `BRL` e timestamp de criação.
**Where**: `backend/db/schema.sql`
**Depends on**: T1
**Requirement**: DB-02
**Tests**: aplicação em PostgreSQL de teste; verificar default de moeda
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: a tabela `trips` é criada, reaplicável, com moeda default `BRL`.
**Commit**: `feat(db): create trips table`

### T3: Criar tabela de participação com papéis

**Status**: Done
**What**: Adicionar o `CREATE TABLE IF NOT EXISTS trip_memberships` com viagem, usuário, papel restrito a `owner`/`member`, FKs e unicidade `(trip_id, user_id)`.
**Where**: `backend/db/schema.sql`
**Depends on**: T2
**Requirement**: DB-03, DB-04, DB-05
**Tests**: aplicação em PostgreSQL de teste; verificar constraint de papel, unicidade e integridade referencial
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: a tabela associa usuário e viagem, rejeita papel inválido e participação duplicada, e exige FKs válidas.
**Commit**: `feat(db): create trip memberships table`

### T4: Criar tabela de despesas

**Status**: Done
**What**: Adicionar o `CREATE TABLE IF NOT EXISTS expenses` com viagem, descrição, valor em centavos com verificação de positivo, pagador, timestamp e cascade por viagem.
**Where**: `backend/db/schema.sql`
**Depends on**: T3
**Requirement**: DB-06, DB-08, DB-10
**Tests**: aplicação em PostgreSQL de teste; verificar valor positivo e cascade da viagem
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: a tabela `expenses` exige valor maior que zero e remove em cascata quando a viagem é removida.
**Commit**: `feat(db): create expenses table`

### T5: Criar tabela de rateios

**Status**: Done
**What**: Adicionar o `CREATE TABLE IF NOT EXISTS expense_shares` com despesa, participante, valor em centavos e cascade da despesa.
**Where**: `backend/db/schema.sql`
**Depends on**: T4
**Requirement**: DB-07, DB-09
**Tests**: aplicação em PostgreSQL de teste; verificar cascade ao remover despesa
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: a tabela `expense_shares` associa despesa e participante e é removida em cascata com a despesa.
**Commit**: `feat(db): create expense shares table`

### T6: Criar tabela de obrigações com estado e prazo

**Status**: Proposed
**What**: Adicionar o `CREATE TABLE IF NOT EXISTS obligations` com viagem, devedor, recebedor, valor em centavos, estado restrito, prazo opcional, momento de confirmação e cascade por viagem.
**Where**: `backend/db/schema.sql`
**Depends on**: T5
**Requirement**: DB-11, DB-12, DB-13, DB-14, DB-15, DB-16
**Tests**: aplicação em PostgreSQL de teste; inserir cada estado válido, rejeitar estado inválido e verificar cascade
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: a tabela `obligations` restringe o estado a `pendente`/`aguardando_confirmacao`/`concluido`, permite prazo e confirmação opcionais e exige FKs de devedor/recebedor.
**Commit**: `feat(db): create obligations table`

### T7: Criar índices de acesso

**Status**: Proposed
**What**: Adicionar os `CREATE INDEX IF NOT EXISTS` para participação (viagem, usuário), despesas (viagem), rateios (despesa) e obrigações (viagem, devedor, recebedor).
**Where**: `backend/db/schema.sql`
**Depends on**: T6
**Requirement**: DB-17, DB-18, DB-19, DB-20
**Tests**: aplicação dupla em PostgreSQL de teste; confirmar índices e idempotência
**Gate**: `psql "$DATABASE_URL" -f backend/db/schema.sql`
**Done when**: todos os índices previstos existem e a reaplicação não gera erro.
**Commit**: `feat(db): add access indexes`

## Task Integrity Rules

- Esta feature cria apenas `backend/db/schema.sql`; não altera o backend existente nem o frontend.
- Cada task adiciona um bloco coeso ao mesmo arquivo de schema, na ordem de dependência.
- Testes/aplicação em PostgreSQL pertencem à mesma task que cria o bloco.
- Cada task concluída recebe exatamente um commit; a mensagem passa por `check_commit.py`.
- A feature só é considerada verificada após aplicação real e idempotente em PostgreSQL.
- Tasks concluídas permanecem no arquivo; novo escopo vira nova task com novo ID.
