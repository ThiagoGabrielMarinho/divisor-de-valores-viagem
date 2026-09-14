# Divisor de Contas de Viagem em Grupo Specification

## Problem Statement

Grupos de amigos que viajam juntos gastam de formas desiguais (um paga o hotel, outro o jantar, outro o combustível) e, no fim, ninguém sabe ao certo quem deve quanto a quem. O objetivo é registrar os gastos da viagem em um único lugar e calcular automaticamente o menor número de transferências necessárias para todo mundo ficar quite.

## Goals

- [x] Permitir registrar uma viagem, seus participantes e as despesas pagas por cada um.
- [x] Calcular o saldo de cada participante (quanto pagou a mais ou a menos do que devia).
- [x] Gerar a lista simplificada de "quem paga quem" para quitar todas as dívidas.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature                                    | Reason                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Múltiplas moedas / conversão de câmbio      | MVP opera em uma única moeda (BRL) por viagem.                       |
| Autenticação de usuários                    | Quem tem o ID da viagem acessa e edita; sem contas/login no MVP.     |
| Divisão por valor ou percentual desigual    | MVP só divide igualmente entre os participantes selecionados.        |
| Edição ou exclusão de despesa após criada   | Reduz complexidade de recalcular saldos históricos no MVP.           |
| Notificações (email/push) de cobrança       | Fora do escopo de um MVP local/self-hosted.                          |
| Anexar comprovantes/fotos de recibo         | Exigiria upload e storage de arquivo, fora do escopo do MVP.         |

---

## Assumptions & Open Questions

Toda ambiguidade foi resolvida ou registrada aqui - nada fica silenciosamente incerto.

| Assumption / decision                                              | Chosen default                                                      | Rationale                                                                                   | Confirmed? |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Como tratar o resto (centavos) numa divisão que não fecha exato     | Distribuir 1 centavo extra aos primeiros participantes da lista de divisão, na ordem enviada, até zerar o resto | Garante que a soma dos rateios seja sempre exatamente igual ao valor da despesa (sem perda/sobra de centavos) | y |
| Comparação de nomes de participante duplicados                      | Case-insensitive (`lower(name)`) dentro da mesma viagem                | Evita duplicidade acidental por diferença de maiúscula/minúscula ("Ana" vs "ana")             | y |
| Algoritmo de simplificação de dívidas                                | Guloso (maior credor recebe do maior devedor, repetidamente)          | Aproximação padrão de mercado (mesma linha do Splitwise); resolver o mínimo teórico é NP-difícil em geral | y |
| Persistência dos dados                                                | PostgreSQL gerenciado (Render), acessado via Drizzle ORM              | Necessário para os dados sobreviverem a redeploys; Render free tier não oferece disco persistente para SQLite | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Registrar viagem, participantes e despesas ⭐ MVP

**User Story**: Como organizador de uma viagem em grupo, eu quero criar a viagem, adicionar os participantes e registrar cada despesa (quem pagou e entre quem divide) para que o grupo tenha um histórico único e confiável dos gastos.

**Why P1**: Sem isso não há dado nenhum para calcular saldo ou quitação - é a base de tudo.

**Acceptance Criteria**:

1. WHEN o usuário envia um nome de viagem válido THEN o sistema SHALL criar a viagem e retornar um ID único.
2. WHEN o usuário adiciona um participante com nome ainda não usado na viagem THEN o sistema SHALL cadastrar o participante nessa viagem.
3. IF o nome do participante já existe na mesma viagem (case-insensitive) THEN o sistema SHALL rejeitar a criação com status 400.
4. WHEN o usuário registra uma despesa com descrição, valor maior que zero, pagador e lista de participantes que dividem THEN o sistema SHALL salvar a despesa vinculada à viagem.
5. The system SHALL dividir toda despesa em partes iguais entre os participantes selecionados, distribuindo o resto em centavos (um a mais cada) aos primeiros participantes da lista, na ordem enviada, até zerar o resto.

**Independent Test**: Criar uma viagem, adicionar 3 participantes, registrar uma despesa de R$1,00 dividida entre os 3 e conferir que os rateios somam exatamente 100 centavos (34/33/33).

---

### P1: Calcular saldos e quitação simplificada ⭐ MVP

**User Story**: Como participante da viagem, eu quero ver meu saldo (quanto devo ou tenho a receber) e a lista mínima de transferências para eu saber exatamente o que fazer para ficar quite com o grupo.

**Why P1**: É o motivo de existir do produto - sem o cálculo de saldo/quitação, a lista de despesas sozinha não resolve o problema do usuário.

**Acceptance Criteria**:

1. The system SHALL calcular o saldo de cada participante como (total pago) menos (total consumido nas despesas em que participou).
2. The system SHALL garantir que a soma dos saldos de todos os participantes de uma viagem seja sempre igual a zero.
3. WHEN existem participantes com saldo positivo e negativo THEN o sistema SHALL gerar a lista de transações (quem paga quanto para quem) que zera todos os saldos usando o algoritmo guloso (maior credor recebe do maior devedor).
4. WHEN o usuário lista as despesas de uma viagem THEN o sistema SHALL retorná-las em ordem cronológica reversa (mais recente primeiro).

**Independent Test**: Registrar 2 despesas pagas por pessoas diferentes, chamar o endpoint de saldos e confirmar soma zero, depois chamar o de quitação e confirmar que aplicar as transações geradas zera os saldos de todos.

---

### P2: Interface web para o grupo usar sem terminal

**User Story**: Como membro do grupo (não-técnico), eu quero uma página web simples para criar a viagem, adicionar despesas e ver o resumo, sem precisar chamar a API manualmente.

**Why P2**: Melhora a experiência de uso real do grupo, mas a API sozinha (P1) já entrega o valor central e é testável isoladamente.

**Acceptance Criteria**:

1. WHEN o usuário abre a aplicação THEN o sistema SHALL exibir uma tela para criar uma nova viagem ou abrir uma existente pelo código.
2. WHEN uma viagem está aberta THEN o sistema SHALL exibir participantes, despesas, saldo de cada participante e a lista de transações de quitação na mesma tela.

**Independent Test**: Abrir a página, criar uma viagem pela UI, adicionar participantes e uma despesa, e conferir visualmente que saldos e quitação aparecem corretos sem usar curl/Postman.

---

## Edge Cases

- IF o valor da despesa é menor ou igual a zero THEN o sistema SHALL rejeitar a requisição com status 400.
- IF o pagador informado não é participante da viagem THEN o sistema SHALL rejeitar a requisição com status 400.
- IF a lista de participantes que dividem a despesa está vazia THEN o sistema SHALL rejeitar a requisição com status 400.
- IF algum participante da lista de divisão não pertence à viagem THEN o sistema SHALL rejeitar a requisição com status 400.
- WHEN a viagem referenciada não existe THEN o sistema SHALL retornar status 404.

---

## Requirement Traceability

Cada requisito recebe um ID único para rastreamento entre design, tasks e validação.

| Requirement ID | Story                                       | Phase  | Status   |
| --------------- | -------------------------------------------- | ------ | -------- |
| TRIP-01         | P1: Registrar viagem, participantes e despesas | Design | Verified |
| TRIP-02         | P1: Registrar viagem, participantes e despesas | Design | Verified |
| TRIP-03         | P1: Registrar viagem, participantes e despesas | Design | Verified |
| TRIP-04         | P1: Registrar viagem, participantes e despesas | Design | Verified |
| TRIP-05         | P1: Calcular saldos e quitação simplificada    | Design | Verified |
| TRIP-06         | P1: Calcular saldos e quitação simplificada    | Design | Verified |
| TRIP-07         | P1: Calcular saldos e quitação simplificada    | Design | Verified |
| TRIP-08         | P1: Registrar viagem, participantes e despesas | Design | Verified |
| TRIP-09         | P2: Interface web para o grupo usar sem terminal | Design | Verified |

**ID format:** `TRIP-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 9 total, 9 mapped to tasks, 0 unmapped

---

## Success Criteria

Como saberemos que a feature é bem-sucedida:

- [x] Um grupo consegue registrar uma viagem completa (participantes + despesas) e obter a lista de quitação sem editar dados manualmente no banco.
- [x] A soma dos saldos de qualquer viagem é sempre zero (garantido por teste automatizado).
- [x] Os dados sobrevivem a um redeploy da aplicação (persistidos em PostgreSQL, não em disco efêmero).
