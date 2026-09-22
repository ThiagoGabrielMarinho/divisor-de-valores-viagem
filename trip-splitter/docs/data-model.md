# Modelo de dados atual

**Banco:** PostgreSQL  
**ORM:** Drizzle (`backend/src/db/schema.ts`)  
**DDL:** `backend/src/db/migrate.ts`  
**Unidade monetária:** centavos inteiros

## Relacionamentos

```text
trips 1 ──── N participants
trips 1 ──── N expenses
expenses 1 ──── N expense_shares
participants 1 ──── N expenses (paid_by)
participants 1 ──── N expense_shares
```

As relações de viagem e de rateios usam `ON DELETE CASCADE` no DDL quando a exclusão é descendente. A aplicação atual não expõe exclusão de viagem, participante ou despesa pela API.

## Tabelas

### `trips`

| Coluna | Tipo | Nulo | Regra |
| --- | --- | --- | --- |
| `id` | `TEXT` | não | chave primária; UUID gerado pela aplicação |
| `name` | `TEXT` | não | nome normalizado com trim no service |
| `currency` | `TEXT` | não | atualmente sempre `BRL` |
| `created_at` | `TEXT` | não | ISO 8601 gerado pela aplicação |

### `participants`

| Coluna | Tipo | Nulo | Regra |
| --- | --- | --- | --- |
| `id` | `TEXT` | não | chave primária; UUID |
| `trip_id` | `TEXT` | não | FK para `trips.id`, cascade |
| `name` | `TEXT` | não | trim no service |

A duplicidade case-insensitive (`lower(name)`) é verificada por `tripService` antes do insert. **Não existe atualmente uma constraint `UNIQUE(trip_id, name)` nem um índice funcional equivalente no DDL.** Essa é uma limitação de concorrência a considerar em uma futura feature de hardening.

### `expenses`

| Coluna | Tipo | Nulo | Regra |
| --- | --- | --- | --- |
| `id` | `TEXT` | não | chave primária; UUID |
| `trip_id` | `TEXT` | não | FK para `trips.id`, cascade |
| `description` | `TEXT` | não | não vazia após trim no service |
| `amount_cents` | `INTEGER` | não | inteiro positivo |
| `paid_by` | `TEXT` | não | FK para `participants.id`; pertencimento à viagem validado no service |
| `created_at` | `TEXT` | não | ISO 8601; usado para ordenar despesas |

### `expense_shares`

| Coluna | Tipo | Nulo | Regra |
| --- | --- | --- | --- |
| `id` | `SERIAL` | não | chave primária gerada pelo PostgreSQL |
| `expense_id` | `TEXT` | não | FK para `expenses.id`, cascade |
| `participant_id` | `TEXT` | não | FK para `participants.id` |
| `share_cents` | `INTEGER` | não | rateio calculado em centavos |

O schema não possui constraint de unicidade para `(expense_id, participant_id)`. O serviço usa `Map` ao calcular shares; IDs repetidos em `splitAmong` não são explicitamente rejeitados na borda atual e devem ser tratados em uma futura especificação de validação de entrada.

## Regras de integridade no domínio

- Para toda despesa válida, a soma dos `share_cents` deve ser igual a `amount_cents`.
- Apenas participantes da viagem podem ser `paid_by` ou aparecer no split.
- O saldo é `sum(expenses.amount_cents por paid_by) - sum(expense_shares.share_cents por participant_id)`.
- A soma dos saldos de uma viagem é zero quando os dados foram gravados pelas regras atuais.
- A quitação não é persistida; é calculada sob demanda a partir das rows atuais.

## Migração e operação

`runMigrations()` executa um bloco DDL idempotente no início do processo e também pode ser chamado por `npm run db:migrate`. O arquivo não é um histórico de migrations versionadas: não há tabela de versão, rollback automático ou mecanismo formal para alterar uma tabela já criada. Toda evolução de schema deve ser uma feature explícita, com plano de compatibilidade para bancos existentes e teste contra PostgreSQL.

## Decisões de persistência

As escolhas de PostgreSQL, Drizzle e centavos inteiros são decisões de projeto registradas em `feature artifacts/STATE.md`. Se uma futura feature quiser trocar banco, ORM, unidade monetária ou estratégia de migração, deve superseder a decisão com um novo `AD-NNN`, nunca apenas alterar este documento.

## Tabelas de conta compartilhada

O schema aplicado em `backend/db/schema.sql` também possui:

- `users`: identidade, email com índice único case-insensitive, nome e hash de senha compatível legado;
- `sessions`: token hash, expiração, revogação e usuário;
- `trip_memberships`: vínculo usuário/viagem com `owner` ou `member`;
- `obligations`: devedor, recebedor, valor em centavos, estado, prazo e confirmação;
- `participants.user_id`: ligação gradual do participante legado a uma conta.

A compatibilidade entre o DDL inicial e tabelas existentes é tratada com blocos idempotentes no schema. A migração não apaga dados. A integração dos services ainda mantém alguns exports legados durante a migração gradual das rotas.
