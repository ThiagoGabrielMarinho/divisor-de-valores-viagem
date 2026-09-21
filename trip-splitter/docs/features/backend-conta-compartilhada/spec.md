# Backend completo da conta compartilhada

**Status:** Draft — planejamento backend  
**Feature path:** `docs/features/backend-conta-compartilhada/`  
**Prioridade:** Large/Complex

## Problem Statement

O schema PostgreSQL da conta compartilhada foi criado, mas o backend atual ainda expõe o MVP antigo por UUID, sem autenticação real, membership, obrigação persistida, confirmação de pagamento, prazo, reset ou resumo global. Esta feature conecta o schema aos services e contratos HTTP reais, sem alterar a fronteira frontend-only do protótipo já validado.

## Goals

- Integrar o schema ao bootstrap/migração do backend com configuração segura de conexão.
- Implementar autenticação real com email/senha armazenada de forma segura e sessão.
- Proteger viagens por membership e papéis owner/member.
- Migrar despesas/rateios para identidade de usuário e regras de autorização.
- Implementar obrigações, confirmação pelo recebedor, prazo, reset bloqueado após pagamento e resumo global com netting.
- Expor contratos HTTP finos, documentados e testados.
- Preservar centavos inteiros, BRL e regras de negócio nos services.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Pagamento financeiro real | O backend registra confirmação, não movimenta dinheiro. |
| Notificações externas | Email/push/WhatsApp ficam para feature posterior. |
| Múltiplas moedas | MVP continua BRL. |
| Frontend de produção | O protótipo frontend e sua integração visual são outra fase. |
| Administração geral da plataforma | Fora do domínio de viagem compartilhada. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Login | Email + senha | Decisão confirmada no Discuss do protótipo. | y |
| Senha | Hash seguro no backend; nunca persistir senha em texto | O schema inicial tem `senha` apenas como placeholder e deve ser corrigido antes da autenticação real. | y |
| Sessão | Cookie HttpOnly com expiração | Evita expor sessão em JavaScript; CSRF e CORS devem ser tratados no design. | n |
| Roles | `owner` e `member` | Decisão confirmada no protótipo. | y |
| Confirmação | Devedor declara; recebedor confirma ou recusa | Decisão confirmada no protótipo. | y |
| Prazo | Por obrigação, definido pelo recebedor | Decisão confirmada no protótipo. | y |
| Reset | Owner apaga gastos; bloqueado após obrigação concluída | Decisão confirmada no protótipo; auditoria e confirmação precisam ser definidas no Design. | y |
| Netting | Saldo líquido por par, com detalhes por viagem | Decisão confirmada no protótipo. | y |
| Migração de dados | Nenhuma viagem antiga existe | Usuário confirmou que não há backend/banco anterior para migrar. | y |
| Sessão/CSRF/rate limit | Detalhar em Discuss/Design antes de implementar | São dimensões de segurança reais, não devem ser inventadas no Execute. | n |

**Open questions:** política final de cookie/CSRF, expiração de sessão, rate limit e auditoria do reset precisam ser fechadas no Design antes da implementação.

## User Stories

### P1: Autenticação e autorização

**User Story**: Como usuário, quero cadastrar/login e acessar somente viagens das quais participo.

**Acceptance Criteria**:

1. WHEN credenciais válidas forem enviadas THEN the system SHALL criar uma sessão autenticada sem persistir senha em texto.
2. IF credenciais inválidas forem enviadas THEN the system SHALL responder 401 sem revelar qual campo falhou.
3. WHEN uma sessão válida consultar viagens THEN the system SHALL retornar somente memberships do usuário.
4. IF um usuário sem membership acessar uma viagem THEN the system SHALL responder 403 sem expor dados.
5. IF uma sessão expirar ou faltar THEN the system SHALL responder 401 nas rotas protegidas.
6. WHEN logout for solicitado THEN the system SHALL invalidar a sessão.

### P1: Viagens, membros e despesas

**User Story**: Como owner/member, quero criar viagens, gerenciar membership conforme papel e registrar despesas autorizadas.

**Acceptance Criteria**:

1. WHEN um usuário autenticado criar uma viagem THEN the system SHALL criar o vínculo owner na mesma operação.
2. WHEN um owner adicionar um usuário THEN the system SHALL criar membership member sem duplicidade.
3. IF um member tentar ação exclusiva de owner THEN the system SHALL responder 403.
4. WHEN uma despesa válida for registrada THEN the system SHALL persistir despesa e rateios atomicamente.
5. IF uma despesa inválida for enviada THEN the system SHALL responder 400 sem gravação parcial.
6. The system SHALL manter valores financeiros em centavos inteiros e moeda BRL.

### P1: Obrigações, pagamento, prazo e reset

**User Story**: Como participante, quero acompanhar e concluir obrigações com confirmação do recebedor, prazo e reset seguro.

**Acceptance Criteria**:

1. WHEN uma despesa gerar obrigação THEN the system SHALL persistir devedor, recebedor, valor e estado pendente.
2. WHEN o devedor declarar pagamento THEN the system SHALL mudar a obrigação para aguardando confirmação.
3. WHEN o recebedor confirmar THEN the system SHALL mudar para concluído com timestamp e retirar do saldo pendente.
4. WHEN o recebedor recusar THEN the system SHALL retornar a obrigação para pendente.
5. IF usuário sem papel autorizado tentar uma transição THEN the system SHALL responder 403.
6. WHEN o recebedor definir prazo THEN the system SHALL persistir a data da obrigação.
7. WHEN o owner resetar antes de pagamentos concluídos THEN the system SHALL apagar gastos/obrigações da viagem atomicamente.
8. IF existir pagamento concluído THEN the system SHALL bloquear reset com status 409.
9. IF reset não for autorizado ou confirmado THEN the system SHALL preservar os dados.

### P1: Resumo global

**User Story**: Como usuário, quero ver o saldo líquido entre pessoas em todas as viagens autorizadas.

**Acceptance Criteria**:

1. WHEN o usuário consultar o resumo global THEN the system SHALL agregar somente obrigações de viagens autorizadas.
2. WHEN houver obrigações opostas entre o mesmo par THEN the system SHALL retornar o valor líquido com netting.
3. The system SHALL excluir obrigações concluídas do saldo pendente.
4. WHEN o usuário solicitar detalhes THEN the system SHALL retornar origem por viagem, estado e prazo.

## Edge Cases

- IF duas confirmações ocorrerem simultaneamente THEN the system SHALL produzir uma única transição válida.
- IF duas operações de reset ocorrerem simultaneamente THEN the system SHALL permitir no máximo uma por ciclo.
- IF sessão expirar durante uma operação THEN the system SHALL rejeitar sem gravação parcial.
- IF usuário não membro enviar expense/obligation THEN the system SHALL rejeitar com 403.
- IF email duplicado por caixa ocorrer THEN the system SHALL rejeitar com 409 ou erro de validação definido no contrato.
- IF uma obrigação concluída for consultada THEN the system SHALL mantê-la no histórico mas fora do saldo pendente.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| API-01 | P1: Autenticação e autorização | Design | Pending |
| API-02 | P1: Autenticação e autorização | Design | Pending |
| API-03 | P1: Autenticação e autorização | Design | Pending |
| API-04 | P1: Autenticação e autorização | Design | Pending |
| API-05 | P1: Autenticação e autorização | Design | Pending |
| API-06 | P1: Autenticação e autorização | Design | Pending |
| API-07 | P1: Viagens, membros e despesas | Design | Pending |
| API-08 | P1: Viagens, membros e despesas | Design | Pending |
| API-09 | P1: Viagens, membros e despesas | Design | Pending |
| API-10 | P1: Viagens, membros e despesas | Design | Pending |
| API-11 | P1: Viagens, membros e despesas | Design | Pending |
| API-12 | P1: Viagens, membros e despesas | Design | Pending |
| API-13 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-14 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-15 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-16 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-17 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-18 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-19 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-20 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-21 | P1: Obrigações, pagamento, prazo e reset | Design | Pending |
| API-22 | P1: Resumo global | Design | Pending |
| API-23 | P1: Resumo global | Design | Pending |
| API-24 | P1: Resumo global | Design | Pending |
| API-25 | P1: Resumo global | Design | Pending |

**ID format:** `API-NN`  
**Status:** Pending → In Design → In Tasks → Implementing → Verified

## Success Criteria

- [ ] Backend autentica sem senha em texto e protege membership.
- [ ] Todas as operações financeiras têm service, transação e testes.
- [ ] Pagamento em duas etapas, prazo, reset e netting têm contratos HTTP.
- [ ] Schema e migração de produção são compatíveis e documentados.
- [ ] Cada AC possui teste e evidência do Verifier.
