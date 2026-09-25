# Integração do frontend da plataforma ao backend real

**Status:** Draft — planejamento de integração
**Feature path:** `docs/features/integracao-frontend-backend/`
**Prioridade:** Large/Complex

## Problem Statement

O backend da conta compartilhada está completo e verificado (autenticação, papéis, obrigações, pagamentos, prazos, reset e resumo global), mas nenhum frontend real o consome: a raiz servida (`frontend/`) ainda é o MVP legado por UUID, sem autenticação, e a interface evoluída (`frontend/prototype/`) roda apenas com dados simulados no navegador. O usuário quer que a plataforma atual completa seja servida na raiz e integrada de ponta a ponta ao backend, persistindo no PostgreSQL.

## Goals

- [ ] Servir na raiz (`GET /`) um frontend real que consome exclusivamente a API `/api`, com sessão por cookie.
- [ ] Cobrir toda a jornada: cadastro, login, logout, viagens por usuário, papéis owner/member, despesas, obrigações, pagamento em duas etapas, prazos, reset e resumo global.
- [ ] Fazer o backend derivar as obrigações a partir da despesa, na mesma transação, para que "quem paga quem" exista sem cálculo no cliente.
- [ ] Permitir ao owner adicionar participantes por email de contas existentes, via endpoint de busca.
- [ ] Remover o frontend legado por UUID, preservando-o apenas no histórico do git.
- [ ] Preservar as invariantes: centavos inteiros, BRL, regras nos services, rotas finas, UI clean em modo claro.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Pagamento financeiro real | O backend registra confirmação, não movimenta dinheiro. |
| Notificações externas (email/push) | Fora do MVP de integração. |
| Múltiplas moedas | Continua BRL. |
| Recuperação de senha / verificação de email | Não faz parte desta integração. |
| Convite de pessoas sem conta | Adicionar participante exige conta já criada (decisão confirmada). |
| Divisão não igualitária (pesos, valores manuais) | Mantém a divisão igualitária atual do backend. |
| Edição/exclusão de despesa individual | O reset é o único mecanismo de limpeza nesta fase. |

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Derivação de obrigações | O backend cria obrigações na mesma transação da despesa | Mantém a regra de negócio no service e o "quem paga quem" consistente para qualquer cliente; confirmado pelo usuário (Opção B). | y |
| Adicionar participante | Owner adiciona por email de conta existente; endpoint de busca resolve email→conta | Melhor UX que colar UUID; confirmado pelo usuário. | y |
| Frontend servido na raiz | Promover a UI do protótipo a frontend real, reescrita para consumir a API | Reaproveita o visual clean já pronto; confirmado pelo usuário. | y |
| Frontend legado | Remover `frontend/index.html`, `frontend/app.js` e `frontend/style.css` | Não funciona com o backend protegido; fica no histórico do git; confirmado pelo usuário. | y |
| Sessão no cliente | Cookie HttpOnly `trip_session` enviado com `credentials: "include"` (mesma origem) | O backend já emite o cookie; mesma origem dispensa CORS credencial. | y |
| Divisão da despesa | Igualitária entre os participantes selecionados, com resto aos primeiros (regra atual do backend) | Preserva o comportamento existente e testado. | y |
| Obrigação com valor zero | Participante cujo rateio se anula com o que pagou não gera obrigação | Evita obrigação de valor não positivo (constraint `valor_cents > 0`). | y |
| Pagador na derivação | O próprio pagador não gera obrigação para si | Não há dívida de alguém consigo mesmo. | y |
| Idempotência de expense→obrigações | Cada POST de despesa cria seu próprio conjunto de obrigações; repetir o POST cria outra despesa e outras obrigações | Consistente com a ausência atual de idempotency key no backend. | y |
| Busca por email | Retorna apenas `{ id, nome, email }` de conta existente; exige sessão | Evita vazar senha/hash; restringe a usuários autenticados. | y |

**Open questions:** none — todas resolvidas ou registradas acima.

## User Stories

### P1: Entrar e sair da plataforma ⭐ MVP

**User Story**: Como usuário, quero cadastrar, entrar e sair pela interface web, para acessar minhas viagens com segurança.

**Why P1**: Sem sessão real, nenhuma outra tela funciona contra o backend protegido.

**Acceptance Criteria**:

1. WHEN o usuário enviar o formulário de cadastro com email, senha e nome válidos THEN the system SHALL criar a conta, iniciar a sessão e exibir a home autenticada.
2. WHEN o usuário enviar login com credenciais válidas THEN the system SHALL autenticar e exibir a home.
3. IF o login tiver credenciais inválidas THEN the system SHALL exibir uma mensagem de erro neutra sem revelar qual campo falhou.
4. WHEN o usuário acionar sair THEN the system SHALL encerrar a sessão e retornar à tela de autenticação.
5. WHILE não houver sessão ativa the system SHALL manter o usuário na tela de autenticação e não exibir dados de viagens.
6. IF uma chamada autenticada retornar 401 THEN the system SHALL redirecionar o usuário para a tela de autenticação.

**Independent Test**: cadastrar, ver a home, sair, tentar reabrir e cair no login.

### P1: Viagens por usuário com papéis ⭐ MVP

**User Story**: Como usuário autenticado, quero criar e abrir minhas viagens e ver meu papel, para gerenciar apenas o que me pertence.

**Why P1**: É o contêiner de todo o domínio financeiro.

**Acceptance Criteria**:

1. WHEN a home carregar THEN the system SHALL listar somente as viagens das quais o usuário é membro.
2. WHEN o usuário criar uma viagem THEN the system SHALL persistir a viagem, torná-lo owner e abrir a viagem.
3. WHEN o usuário abrir uma viagem da qual é membro THEN the system SHALL exibir nome, papel e participantes.
4. IF o usuário tentar abrir uma viagem da qual não é membro THEN the system SHALL exibir erro de acesso e não mostrar dados.
5. WHILE o usuário for member the system SHALL ocultar ou desabilitar ações exclusivas de owner (adicionar participante e reset).

**Independent Test**: criar viagem como owner, ver participante próprio, abrir viagem inexistente/alheia e receber bloqueio.

### P1: Adicionar participante por email ⭐ MVP

**User Story**: Como owner, quero adicionar à viagem uma pessoa pelo email da conta dela, para dividir despesas com ela.

**Why P1**: Sem mais de um participante não há divisão real.

**Acceptance Criteria**:

1. WHEN o owner buscar um email de conta existente THEN the system SHALL retornar o identificador e o nome da conta.
2. WHEN o owner confirmar a adição de uma conta existente THEN the system SHALL criar a membership member e o participante vinculado ao usuário.
3. IF o email informado não pertencer a nenhuma conta THEN the system SHALL exibir "Nenhuma conta encontrada com esse email." e não alterar a viagem.
4. IF um member tentar adicionar participante THEN the system SHALL responder 403 e a interface SHALL não oferecer a ação.
5. IF a conta já for participante da viagem THEN the system SHALL informar o erro retornado pelo backend sem duplicar a membership.

**Independent Test**: com duas contas, o owner adiciona a segunda por email; buscar email inexistente mostra a mensagem.

### P1: Despesas geram obrigações ⭐ MVP

**User Story**: Como participante, quero registrar despesas e ver automaticamente quem deve a quem, para acompanhar a dívida sem cálculo manual.

**Why P1**: É o núcleo do produto.

**Acceptance Criteria**:

1. WHEN uma despesa válida for registrada THEN the system SHALL persistir a despesa, os rateios e as obrigações derivadas na mesma transação.
2. The system SHALL derivar uma obrigação de cada participante devedor para o pagador, no valor do rateio do participante, exceto para o próprio pagador.
3. IF o rateio de um participante resultar em valor não positivo a favor do pagador THEN the system SHALL não criar obrigação para esse participante.
4. IF a despesa for inválida (valor não positivo, sem participantes, pagador fora da viagem) THEN the system SHALL responder 400 sem gravar despesa, rateios ou obrigações.
5. WHEN a lista de obrigações for exibida THEN the system SHALL mostrar devedor, recebedor, valor, estado e prazo, ocultando as concluídas do "quem paga quem".
6. The system SHALL manter valores em centavos inteiros e moeda BRL.

**Independent Test**: registrar uma despesa dividida entre duas pessoas e ver uma obrigação do outro participante para o pagador com metade do valor.

### P1: Pagamento em duas etapas e prazos ⭐ MVP

**User Story**: Como participante, quero declarar pagamento e, como recebedor, confirmar, recusar e definir prazo, para refletir a quitação real.

**Why P1**: Fecha o ciclo de dívida do produto.

**Acceptance Criteria**:

1. WHEN o devedor declarar pagamento de uma obrigação pendente THEN the system SHALL mudar o estado para aguardando confirmação.
2. WHEN o recebedor confirmar THEN the system SHALL concluir a obrigação e removê-la do saldo pendente.
3. WHEN o recebedor recusar THEN the system SHALL retornar a obrigação a pendente.
4. IF um usuário sem o papel correto tentar uma transição THEN the system SHALL responder 403 e a interface SHALL não oferecer a ação.
5. WHEN o recebedor definir um prazo válido THEN the system SHALL persistir o prazo e refletir o status temporal (no prazo, atrasado ou sem prazo).

**Independent Test**: como devedor declarar, como recebedor confirmar e ver a obrigação sair do pendente; definir prazo e vê-lo na lista.

### P1: Reset seguro ⭐ MVP

**User Story**: Como owner, quero resetar os gastos da viagem com confirmação, para recomeçar sem apagar histórico de quitação.

**Why P1**: É a operação destrutiva controlada do produto.

**Acceptance Criteria**:

1. WHEN o owner confirmar o reset e não houver pagamento concluído THEN the system SHALL apagar despesas e obrigações da viagem e atualizar a interface.
2. IF houver obrigação concluída THEN the system SHALL responder 409 e a interface SHALL informar que o reset está bloqueado.
3. IF o reset não for confirmado THEN the system SHALL preservar os dados.
4. IF um member tentar reset THEN the system SHALL responder 403 e a interface SHALL não oferecer a ação.

**Independent Test**: resetar viagem com despesas pendentes (some tudo); concluir um pagamento e ver o reset bloqueado.

### P1: Resumo global com netting ⭐ MVP

**User Story**: Como usuário, quero ver na home quanto devo e tenho a receber de cada pessoa somando todas as viagens, para ter a visão consolidada.

**Why P1**: É a tela inicial pedida.

**Acceptance Criteria**:

1. WHEN a home carregar THEN the system SHALL exibir, por pessoa, o valor líquido entre o usuário e ela somando as viagens autorizadas.
2. The system SHALL excluir obrigações concluídas do resumo.
3. WHEN não houver saldo pendente THEN the system SHALL exibir um estado vazio verdadeiro, sem inventar valores.
4. WHEN o usuário abrir o detalhe de uma pessoa THEN the system SHALL listar a origem por viagem, o estado e o prazo.

**Independent Test**: com obrigações opostas em duas viagens, ver o líquido por pessoa na home.

## Edge Cases

- IF a API estiver indisponível ou retornar 500 THEN the system SHALL exibir um estado de erro perceptível, distinto de "vazio".
- WHILE uma chamada estiver em andamento the system SHALL exibir estado de carregamento e evitar duplo envio do mesmo formulário.
- IF a sessão expirar durante o uso THEN the system SHALL, na próxima chamada 401, retornar à autenticação sem estado parcial.
- IF o email buscado existir mas já for participante THEN the system SHALL exibir o erro do backend sem duplicar.
- WHEN uma despesa dividida gerar resto de centavos THEN the system SHALL distribuir o resto aos primeiros participantes, e as obrigações SHALL refletir exatamente os rateios.
- IF todos os participantes selecionados forem apenas o pagador THEN the system SHALL registrar a despesa sem gerar obrigações.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| INT-01 | P1: Entrar e sair | Design | Pending |
| INT-02 | P1: Entrar e sair | Design | Pending |
| INT-03 | P1: Entrar e sair | Design | Pending |
| INT-04 | P1: Entrar e sair | Design | Pending |
| INT-05 | P1: Entrar e sair | Design | Pending |
| INT-06 | P1: Entrar e sair | Design | Pending |
| INT-07 | P1: Viagens por usuário | Design | Pending |
| INT-08 | P1: Viagens por usuário | Design | Pending |
| INT-09 | P1: Viagens por usuário | Design | Pending |
| INT-10 | P1: Viagens por usuário | Design | Pending |
| INT-11 | P1: Viagens por usuário | Design | Pending |
| INT-12 | P1: Adicionar participante | Design | Pending |
| INT-13 | P1: Adicionar participante | Design | Pending |
| INT-14 | P1: Adicionar participante | Design | Pending |
| INT-15 | P1: Adicionar participante | Design | Pending |
| INT-16 | P1: Adicionar participante | Design | Pending |
| INT-17 | P1: Despesas geram obrigações | Design | Pending |
| INT-18 | P1: Despesas geram obrigações | Design | Pending |
| INT-19 | P1: Despesas geram obrigações | Design | Pending |
| INT-20 | P1: Despesas geram obrigações | Design | Pending |
| INT-21 | P1: Despesas geram obrigações | Design | Pending |
| INT-22 | P1: Despesas geram obrigações | Design | Pending |
| INT-23 | P1: Pagamento e prazos | Design | Pending |
| INT-24 | P1: Pagamento e prazos | Design | Pending |
| INT-25 | P1: Pagamento e prazos | Design | Pending |
| INT-26 | P1: Pagamento e prazos | Design | Pending |
| INT-27 | P1: Pagamento e prazos | Design | Pending |
| INT-28 | P1: Reset seguro | Design | Pending |
| INT-29 | P1: Reset seguro | Design | Pending |
| INT-30 | P1: Reset seguro | Design | Pending |
| INT-31 | P1: Reset seguro | Design | Pending |
| INT-32 | P1: Resumo global | Design | Pending |
| INT-33 | P1: Resumo global | Design | Pending |
| INT-34 | P1: Resumo global | Design | Pending |
| INT-35 | P1: Resumo global | Design | Pending |

**ID format:** `INT-NN`
**Status:** Pending → In Design → In Tasks → Implementing → Verified

## Success Criteria

- [ ] `GET /` serve o frontend integrado e nenhuma tela usa dados simulados.
- [ ] Toda a jornada P1 funciona ponta a ponta contra o PostgreSQL.
- [ ] Registrar despesa cria as obrigações derivadas na mesma transação, com testes.
- [ ] Adicionar participante por email funciona e é owner-only.
- [ ] O frontend legado foi removido e a raiz não expõe o MVP por UUID.
- [ ] Gate `npm test` verde e Verifier independente PASS.
