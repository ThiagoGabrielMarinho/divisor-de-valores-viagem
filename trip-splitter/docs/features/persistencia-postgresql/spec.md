# Schema PostgreSQL da conta compartilhada

**Status:** Draft — planejamento de banco  
**Feature path:** `docs/features/persistencia-postgresql/`  
**Prioridade:** Large

## Problem Statement

O protótipo frontend validou o domínio: usuários, viagens com papéis, despesas com rateio, obrigações com estado, prazo e pagamento em duas etapas. Para o produto sair do navegador, esse domínio precisa de persistência real. Esta feature define os comandos SQL que criam as tabelas PostgreSQL necessárias, alinhadas ao domínio validado e às invariantes do produto.

Esta feature cobre apenas a criação do schema (DDL): tabelas, chaves, restrições e índices. Ela não implementa API, autenticação real, migração de dados nem a camada de serviços; esses são trabalhos posteriores.

## Goals

- Definir o DDL das tabelas de usuários, viagens, membros/papéis, despesas, rateios e obrigações.
- Representar o pagamento em duas etapas por meio de um estado explícito na obrigação.
- Representar o prazo por obrigação.
- Preservar as invariantes do produto: valores em centavos inteiros e moeda BRL.
- Garantir integridade referencial com chaves estrangeiras e restrições coerentes.
- Fornecer índices para os acessos previstos (por viagem, por usuário e por obrigação).
- Manter o DDL idempotente (`CREATE TABLE IF NOT EXISTS`) coerente com o padrão atual do projeto.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Endpoints de API e camada de serviços | Esta feature cria apenas o schema; consumo vem depois. |
| Autenticação real, hash de senha e sessão | Segurança de credenciais é uma feature própria. |
| Migração de dados do protótipo | O protótipo não tem dados reais a migrar. |
| Histórico versionado de migrations e rollback | O projeto usa DDL idempotente; versionamento é decisão futura. |
| Múltiplas moedas | O produto continua em BRL nesta etapa. |
| ORM ou geração automática de schema | Aqui definimos SQL explícito; a escolha de ORM é posterior. |

## Assumptions & Open Questions

Cada decisão abaixo é derivada do protótipo já validado e das invariantes registradas do produto.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Banco | PostgreSQL | Invariante do produto. | y |
| Dinheiro | Inteiro em centavos | Invariante do produto; evita ponto flutuante. | y |
| Moeda | BRL, coluna com default | O produto opera em uma moeda por enquanto. | y |
| Identificadores | `text` com UUID gerado pela aplicação | Coerente com o schema atual e com o protótipo. | y |
| Papéis | `owner` e `member` via constraint de verificação | Papéis definidos no protótipo. | y |
| Estado da obrigação | `pendente`, `aguardando_confirmacao`, `concluido` via constraint | Pagamento em duas etapas validado no protótipo. | y |
| Prazo | Coluna de data opcional na obrigação | Prazo por obrigação, definido por quem recebe. | y |
| Unicidade de membro | `UNIQUE(trip_id, user_id)` | Uma pessoa participa uma vez por viagem. | y |
| Unicidade de email | `UNIQUE(lower(email))` | Evita contas duplicadas por caixa diferente. | y |
| Timestamps | `timestamptz` com default `now()` | Padrão seguro para data/hora no PostgreSQL. | y |
| DDL | `CREATE TABLE IF NOT EXISTS` idempotente | Coerente com `backend/src/db/migrate.ts`. | y |

**Open questions:** none - all resolved or logged above.

## User Stories

### P1: Persistir contas e viagens

**User Story**: Como sistema, preciso de tabelas para usuários, viagens e vínculos de participação com papéis, para sustentar identidade e acesso.

**Why P1**: Sem essas tabelas não há a quem associar despesas nem quem participa de cada viagem.

**Acceptance Criteria**:

1. The system SHALL definir uma tabela de usuários com identificador, email único sem diferenciar maiúsculas de minúsculas, senha e nome.
2. The system SHALL definir uma tabela de viagens com identificador, nome, moeda com default `BRL` e timestamp de criação.
3. The system SHALL definir uma tabela de participação que associa usuário e viagem com um papel restrito a `owner` ou `member`.
4. The system SHALL impedir participação duplicada do mesmo usuário na mesma viagem por meio de restrição de unicidade.
5. IF um usuário ou viagem referenciado não existir THEN o banco SHALL rejeitar a linha de participação por integridade referencial.

**Independent Test**: Aplicar o DDL e verificar as tabelas, a unicidade de email, a restrição de papel e a unicidade de participação.

### P1: Persistir despesas e rateios

**User Story**: Como sistema, preciso de tabelas para despesas e seus rateios, para registrar quem pagou e como o valor foi dividido.

**Why P1**: É a base do cálculo de quem deve a quem.

**Acceptance Criteria**:

1. The system SHALL definir uma tabela de despesas com identificador, viagem, descrição, valor em centavos inteiros positivos, pagador e timestamp.
2. The system SHALL definir uma tabela de rateios que associa despesa e participante com o valor devido em centavos.
3. The system SHALL exigir que o valor da despesa seja maior que zero por meio de uma restrição de verificação.
4. IF uma despesa for removida THEN o banco SHALL remover seus rateios em cascata.
5. IF a viagem de uma despesa for removida THEN o banco SHALL remover as despesas dessa viagem em cascata.

**Independent Test**: Aplicar o DDL, inserir uma despesa com rateios e verificar a restrição de valor positivo e o cascade.

### P1: Persistir obrigações com estado, prazo e pagamento

**User Story**: Como sistema, preciso de uma tabela de obrigações que registre quem deve a quem, o estado do pagamento, o prazo e o momento da confirmação.

**Why P1**: É o que sustenta o pagamento em duas etapas, o prazo e o resumo de dívidas.

**Acceptance Criteria**:

1. The system SHALL definir uma tabela de obrigações com identificador, viagem, devedor, recebedor e valor em centavos.
2. The system SHALL restringir o estado da obrigação a `pendente`, `aguardando_confirmacao` ou `concluido` por meio de uma restrição de verificação.
3. The system SHALL permitir uma coluna de prazo opcional do tipo data na obrigação.
4. The system SHALL permitir uma coluna opcional que registra o momento da confirmação do recebimento.
5. IF a viagem de uma obrigação for removida THEN o banco SHALL remover as obrigações dessa viagem em cascata.
6. The system SHALL exigir que devedor e recebedor referenciem usuários existentes por integridade referencial.

**Independent Test**: Aplicar o DDL, inserir obrigações em cada estado válido e verificar a rejeição de um estado inválido e o cascade por viagem.

### P2: Índices de acesso

**User Story**: Como sistema, preciso de índices para as consultas por viagem, por usuário e por obrigação, para manter o desempenho previsível.

**Why P2**: As tabelas funcionam sem índices, mas os acessos previstos ficam mais eficientes com eles.

**Acceptance Criteria**:

1. The system SHALL criar índices para participação por viagem e por usuário.
2. The system SHALL criar índices para despesas por viagem e rateios por despesa.
3. The system SHALL criar índices para obrigações por viagem, por devedor e por recebedor.
4. The system SHALL criar todos os índices de forma idempotente com `IF NOT EXISTS`.

**Independent Test**: Aplicar o DDL duas vezes e confirmar que os índices existem e que a reaplicação não gera erro.

## Edge Cases

- IF o DDL for aplicado mais de uma vez THEN o banco SHALL permanecer consistente por causa do `IF NOT EXISTS`.
- IF um email for inserido com caixa diferente de um já existente THEN o banco SHALL rejeitar por unicidade insensível a caixa.
- IF um papel diferente de `owner`/`member` for inserido THEN o banco SHALL rejeitar por restrição de verificação.
- IF um estado de obrigação inválido for inserido THEN o banco SHALL rejeitar por restrição de verificação.
- IF um valor de despesa menor ou igual a zero for inserido THEN o banco SHALL rejeitar por restrição de verificação.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DB-01 | P1: Persistir contas e viagens | Tasks | Pending |
| DB-02 | P1: Persistir contas e viagens | Tasks | Pending |
| DB-03 | P1: Persistir contas e viagens | Tasks | Pending |
| DB-04 | P1: Persistir contas e viagens | Tasks | Pending |
| DB-05 | P1: Persistir contas e viagens | Tasks | Pending |
| DB-06 | P1: Persistir despesas e rateios | Tasks | Pending |
| DB-07 | P1: Persistir despesas e rateios | Tasks | Pending |
| DB-08 | P1: Persistir despesas e rateios | Tasks | Pending |
| DB-09 | P1: Persistir despesas e rateios | Tasks | Pending |
| DB-10 | P1: Persistir despesas e rateios | Tasks | Pending |
| DB-11 | P1: Persistir obrigações com estado, prazo e pagamento | Tasks | Pending |
| DB-12 | P1: Persistir obrigações com estado, prazo e pagamento | Tasks | Pending |
| DB-13 | P1: Persistir obrigações com estado, prazo e pagamento | Tasks | Pending |
| DB-14 | P1: Persistir obrigações com estado, prazo e pagamento | Tasks | Pending |
| DB-15 | P1: Persistir obrigações com estado, prazo e pagamento | Tasks | Pending |
| DB-16 | P1: Persistir obrigações com estado, prazo e pagamento | Tasks | Pending |
| DB-17 | P2: Índices de acesso | Tasks | Pending |
| DB-18 | P2: Índices de acesso | Tasks | Pending |
| DB-19 | P2: Índices de acesso | Tasks | Pending |
| DB-20 | P2: Índices de acesso | Tasks | Pending |

**ID format:** `DB-NN`  
**Status values:** Pending → In Design → In Tasks → Implementing → Verified  
**Coverage:** 20 acceptance criteria; mapeamento por task fechado em `tasks.md`.

## Success Criteria

- [ ] O DDL cria todas as tabelas do domínio validado no protótipo.
- [ ] Valores monetários são inteiros em centavos e a moeda default é BRL.
- [ ] Papéis e estados de obrigação são restringidos por constraint.
- [ ] Integridade referencial e cascatas estão definidas.
- [ ] O DDL é idempotente e reaplicável sem erro.
