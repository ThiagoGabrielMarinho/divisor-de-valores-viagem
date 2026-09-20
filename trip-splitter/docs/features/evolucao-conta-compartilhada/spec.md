# Evolução de conta compartilhada, quitação e experiência

**Status:** Draft — aguardando Discuss e confirmação do usuário  
**Feature path:** `docs/features/evolucao-conta-compartilhada/`  
**Prioridade:** Large/Complex

## Problem Statement

O MVP atual usa o UUID da viagem como acesso, calcula despesas e quitações somente em memória e apresenta estados incorretos ou pouco confiáveis na interface. O grupo precisa de identidade, acesso controlado às viagens, uma visão consolidada de dívidas, confirmação de pagamentos, prazos, reset seguro e uma experiência visual mais clara.

Esta feature agrupa a próxima evolução funcional do Trip Splitter. Ela não deve ser implementada até que as decisões de autenticação, autorização, identidade global, estados financeiros e reset sejam fechadas em Discuss.

## Goals

- Corrigir a renderização de despesas e quitações para refletir o payload e seus estados reais, sem mensagens vazias falsas.
- Permitir que pessoas autenticadas vejam somente viagens das quais fazem parte, conforme o papel definido.
- Disponibilizar uma visão inicial consolidada do que o usuário deve ou tem a receber entre suas viagens.
- Representar a confirmação de pagamentos e seus efeitos na situação da quitação.
- Permitir prazos de pagamento com estado visual de pendente, pago, atrasado ou outro estado definido em Discuss.
- Oferecer reset de gastos com autorização, confirmação, atomicidade e sem apagar silenciosamente dados financeiros relevantes.
- Modernizar o layout em modo claro, com UX clean, compreensível, responsiva e acessível.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Múltiplas moedas e conversão cambial | O produto continua limitado a BRL nesta evolução. |
| Pagamentos financeiros reais, PIX ou integração bancária | Confirmar pagamento é um registro do produto, não uma transação financeira externa. |
| Notificações por email, push ou WhatsApp | Dependem de infraestrutura externa não existente no MVP. |
| Aplicativo nativo mobile | A entrega continua sendo uma aplicação web responsiva. |
| Sistema completo de recuperação de conta e suporte | Pode ser uma feature posterior, salvo decisão explícita em Discuss. |
| Dashboard administrativo geral | A feature trata usuário, viagens e obrigações, não administração da plataforma. |

## Assumptions & Open Questions

Cada item abaixo precisa ser confirmado em Discuss ou permanecer explicitamente como bloqueio. Nenhum default deve ser implementado silenciosamente.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tipo de login | Pendente: recomendar email + senha com sessão segura | É compreensível e permite associação estável entre viagens, mas exige política de senha, sessão e recuperação. | n |
| Conta sem email | Pendente: não permitir no primeiro corte | Evita identidade duplicada e recuperação indefinida. | n |
| Papel na viagem | Pendente: owner e member | Reset e gestão de membros precisam de autorização distinta. | n |
| Convite para viagem | Pendente: convite autenticado, com UUID apenas como mecanismo de convite temporário | Preserva compartilhamento sem manter o UUID como bypass permanente. | n |
| Identidade de participante | Pendente: participante deve referenciar uma conta quando possível, com convidado explicitamente marcado | O resumo global não pode depender de nomes iguais. | n |
| Estado de despesa | Pendente: active, cancelled e archived se reset criar ciclos | Evita apagar histórico e permite explicar o que compõe o saldo. | n |
| Confirmação de pagamento | Pendente: obrigação persistida e confirmação idempotente pelo papel definido | A quitação atual é apenas uma projeção; pagamento precisa de lifecycle. | n |
| Prazo | Pendente: opcional por obrigação, armazenado em UTC e exibido no timezone do usuário | É o nível mais próximo da ação “pagar alguém”; precisa de regra para atraso. | n |
| Reset | Pendente: owner inicia reset confirmado e o sistema cria novo ciclo, preservando histórico | DELETE irreversível poderia invalidar pagamentos e auditoria. | n |
| Resumo global | Pendente: saldo líquido por par de contas, com drill-down por viagem | Evita mostrar A deve B e B deve A como duas cobranças quando podem ser compensadas. | n |
| Pagamento confirmado | Pendente: confirmar não apaga a despesa; altera a obrigação e sua exibição | Histórico financeiro deve permanecer auditável. | n |
| Layout | Confirmado pelo steering: modo claro, clean, responsivo e orientado a UX | É decisão permanente do produto. | y |
| Persistência | Confirmado pelo produto atual: PostgreSQL via Drizzle e centavos inteiros | Mantém invariantes existentes. | y |

**Open questions:** tipo de autenticação, roles, convite, identidade global, lifecycle de despesa, regra de confirmação, prazo, reset e consolidação global permanecem abertos até Discuss.

## User Stories

### P1: Estados financeiros verdadeiros

**User Story**: Como participante, quero que despesas e quitações exibam o estado real retornado pelo sistema para não tomar decisões com base em mensagens falsas.

**Why P1**: A interface atual contradiz dados financeiros e destrói confiança no produto.

**Acceptance Criteria**:

1. WHEN a API retorna uma lista de despesas não vazia THEN the system SHALL renderizar cada despesa recebida e SHALL ocultar a mensagem de lista vazia.
2. WHEN a API retorna uma lista de despesas vazia THEN the system SHALL exibir a mensagem de nenhuma despesa e SHALL não manter linhas antigas na tabela.
3. WHEN a API retorna quitações não vazias THEN the system SHALL renderizar cada quitação recebida e SHALL ocultar a mensagem de tudo quitado.
4. WHEN a API retorna quitações vazias THEN the system SHALL exibir a mensagem de tudo quitado somente quando não houver obrigação pendente retornada.
5. IF uma consulta de resumo falha THEN the system SHALL exibir um estado de erro ou indisponibilidade identificável e SHALL não apresentar dados vazios como se fossem verdadeiros.

**Independent Test**: Mockar respostas com listas vazias, não vazias e erro e verificar DOM, mensagens e limpeza de estado anterior.

### P1: Conta, login e acesso às viagens

**User Story**: Como usuário, quero criar uma conta e entrar para ver somente as viagens às quais pertenço.

**Why P1**: Identidade e autorização são pré-requisitos para resumo global, pagamentos e segurança.

**Acceptance Criteria**:

1. WHEN uma pessoa envia credenciais válidas THEN the system SHALL criar ou iniciar uma sessão autenticada conforme o mecanismo aprovado em Discuss.
2. IF as credenciais forem inválidas THEN the system SHALL rejeitar o login com status 401 e mensagem segura, sem revelar qual campo falhou.
3. WHILE a pessoa estiver autenticada THEN the system SHALL permitir consultar somente viagens em que sua membership esteja autorizada.
4. IF uma pessoa autenticada tentar acessar uma viagem sem membership THEN the system SHALL responder status 403 sem revelar dados da viagem.
5. IF uma requisição protegida não possuir sessão válida THEN the system SHALL responder status 401 e a UI SHALL orientar o usuário a entrar.
6. WHEN o usuário fizer logout THEN the system SHALL invalidar a sessão conforme a política definida e a UI SHALL voltar ao fluxo de login.

**Independent Test**: Criar dois usuários, associá-los a viagens diferentes e verificar login, logout, 401, 403 e isolamento de payloads.

### P1: Resumo global de dívidas

**User Story**: Como usuário autenticado, quero ver no início quanto devo ou tenho a receber de cada pessoa considerando minhas viagens autorizadas.

**Why P1**: O valor principal evolui de uma única viagem para a visão da conta do usuário.

**Acceptance Criteria**:

1. WHEN o usuário autenticado abrir a tela inicial THEN the system SHALL exibir o resumo agregado somente das viagens às quais ele tem acesso.
2. WHEN obrigações entre o usuário e a mesma pessoa existirem em mais de uma viagem THEN the system SHALL consolidar os valores conforme a regra de netting aprovada.
3. WHEN não houver obrigações pendentes THEN the system SHALL exibir um estado vazio verdadeiro e SHALL não afirmar que há dívidas.
4. IF uma viagem não estiver autorizada ao usuário THEN the system SHALL excluir seus dados do resumo global.
5. WHEN o usuário selecionar uma pessoa do resumo THEN the system SHALL exibir a origem por viagem, status e prazo conforme o contrato aprovado.

**Independent Test**: Usar duas viagens com obrigações entre as mesmas contas e uma terceira viagem sem membership; verificar soma, exclusão e drill-down.

### P1: Confirmação de pagamento e prazo

**User Story**: Como usuário, quero confirmar ou acompanhar o pagamento de uma obrigação e ver seu prazo para saber o que está pendente.

**Why P1**: Uma quitação sugerida não informa se o pagamento realmente aconteceu.

**Acceptance Criteria**:

1. WHEN uma obrigação válida for criada THEN the system SHALL persistir seu estado inicial e seu valor em centavos.
2. WHEN uma pessoa autorizada confirmar o pagamento THEN the system SHALL persistir a confirmação com autor e timestamp.
3. WHEN a mesma confirmação idempotente for repetida THEN the system SHALL manter um único resultado sem duplicar o pagamento.
4. IF uma pessoa sem permissão tentar confirmar ou alterar uma obrigação THEN the system SHALL responder status 403.
5. WHEN uma obrigação possuir prazo THEN the system SHALL exibir seu status como pendente, pago ou atrasado conforme a data atual e a regra de timezone aprovada.
6. IF uma confirmação entrar em conflito com o estado atual THEN the system SHALL rejeitar a transição com status 409 e SHALL manter o estado anterior.

**Independent Test**: Criar obrigação, confirmar, repetir, tentar confirmar sem permissão e verificar vencimento com relógio controlado.

### P1: Reset seguro de gastos

**User Story**: Como responsável autorizado pela viagem, quero iniciar um novo ciclo de gastos sem apagar silenciosamente o histórico.

**Why P1**: Reset é uma operação destrutiva e precisa preservar confiança e rastreabilidade.

**Acceptance Criteria**:

1. WHEN o responsável iniciar um reset confirmado THEN the system SHALL executar a operação atômica conforme a semântica aprovada em Discuss.
2. IF uma pessoa sem permissão tentar resetar a viagem THEN the system SHALL responder status 403 e SHALL não alterar dados.
3. IF o reset falhar durante a operação THEN the system SHALL preservar o estado anterior por atomicidade.
4. WHEN um reset for concluído THEN the system SHALL exibir claramente o novo ciclo e a forma de consultar o histórico preservado.
5. WHEN pagamentos confirmados existirem THEN the system SHALL aplicar a regra aprovada para preservá-los, vinculá-los ou bloquear o reset.

**Independent Test**: Executar reset autorizado, não autorizado, repetido e com falha simulada, verificando atomicidade e histórico.

### P2: Layout clean e moderno

**User Story**: Como usuário não técnico, quero uma interface bonita, clara e fácil de navegar no celular e no desktop.

**Why P2**: Melhora confiança e entendimento depois que os estados funcionais estiverem definidos.

**Acceptance Criteria**:

1. WHEN o usuário abrir a plataforma THEN the system SHALL usar exclusivamente o modo claro e SHALL não exibir seletor de modo escuro.
2. WHEN o usuário navegar pelo fluxo principal THEN the system SHALL apresentar hierarquia visual clara, ação primária identificável e linguagem não técnica.
3. WHEN uma tela estiver carregando, vazia, indisponível, em sucesso ou em erro THEN the system SHALL exibir o estado correspondente sem confundi-lo com dados reais.
4. WHEN a viewport for celular, tablet ou desktop THEN the system SHALL manter conteúdo legível, ações alcançáveis e layout sem overflow horizontal.
5. The system SHALL manter foco visível, contraste suficiente, labels associados e informação que não dependa apenas de cor.

**Independent Test**: UAT nos três tamanhos de viewport com checklist de jornada, estados, acessibilidade e ausência de dark mode.

## Edge Cases

- IF dois usuários tiverem o mesmo nome THEN the system SHALL diferenciá-los pela identidade da conta e não pelo nome exibido.
- IF uma conta perder membership durante uma sessão THEN the system SHALL impedir novas leituras protegidas e SHALL atualizar a UI sem expor dados antigos como atuais.
- IF duas requisições confirmarem a mesma obrigação simultaneamente THEN the system SHALL produzir um único estado final consistente.
- IF duas requisições de reset ocorrerem simultaneamente THEN the system SHALL permitir no máximo uma transição válida por ciclo.
- IF uma despesa existente não possuir estado após a migração THEN the system SHALL aplicar uma compatibilidade definida e rastreável, nunca inferir “quitada” por ausência de dados.
- IF a API falhar parcialmente ao carregar o resumo THEN the system SHALL indicar indisponibilidade e não renderizar “nenhuma despesa” ou “tudo quitado” como fallback enganoso.
- IF o prazo estiver no limite do dia ou em timezone diferente THEN the system SHALL usar a regra temporal aprovada e testável.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EVOL-01 | P1: Estados financeiros verdadeiros | Design | Pending |
| EVOL-02 | P1: Estados financeiros verdadeiros | Design | Pending |
| EVOL-03 | P1: Estados financeiros verdadeiros | Design | Pending |
| EVOL-04 | P1: Estados financeiros verdadeiros | Design | Pending |
| EVOL-05 | P1: Estados financeiros verdadeiros | Design | Pending |
| EVOL-06 | P1: Conta, login e acesso às viagens | Design | Pending |
| EVOL-07 | P1: Conta, login e acesso às viagens | Design | Pending |
| EVOL-08 | P1: Conta, login e acesso às viagens | Design | Pending |
| EVOL-09 | P1: Conta, login e acesso às viagens | Design | Pending |
| EVOL-10 | P1: Conta, login e acesso às viagens | Design | Pending |
| EVOL-11 | P1: Conta, login e acesso às viagens | Design | Pending |
| EVOL-12 | P1: Resumo global de dívidas | Design | Pending |
| EVOL-13 | P1: Resumo global de dívidas | Design | Pending |
| EVOL-14 | P1: Resumo global de dívidas | Design | Pending |
| EVOL-15 | P1: Resumo global de dívidas | Design | Pending |
| EVOL-16 | P1: Resumo global de dívidas | Design | Pending |
| EVOL-17 | P1: Confirmação de pagamento e prazo | Design | Pending |
| EVOL-18 | P1: Confirmação de pagamento e prazo | Design | Pending |
| EVOL-19 | P1: Confirmação de pagamento e prazo | Design | Pending |
| EVOL-20 | P1: Confirmação de pagamento e prazo | Design | Pending |
| EVOL-21 | P1: Confirmação de pagamento e prazo | Design | Pending |
| EVOL-22 | P1: Confirmação de pagamento e prazo | Design | Pending |
| EVOL-23 | P1: Reset seguro de gastos | Design | Pending |
| EVOL-24 | P1: Reset seguro de gastos | Design | Pending |
| EVOL-25 | P1: Reset seguro de gastos | Design | Pending |
| EVOL-26 | P1: Reset seguro de gastos | Design | Pending |
| EVOL-27 | P1: Reset seguro de gastos | Design | Pending |
| EVOL-28 | P2: Layout clean e moderno | Design | Pending |
| EVOL-29 | P2: Layout clean e moderno | Design | Pending |
| EVOL-30 | P2: Layout clean e moderno | Design | Pending |
| EVOL-31 | P2: Layout clean e moderno | Design | Pending |
| EVOL-32 | P2: Layout clean e moderno | Design | Pending |

**ID format:** `EVOL-NN`  
**Status values:** Pending → In Design → In Tasks → Implementing → Verified  
**Coverage:** 32 acceptance criteria agrupados, mapeamento detalhado será fechado em `tasks.md` após Discuss.

## Success Criteria

- [ ] O usuário nunca vê estado vazio quando o payload contém dados.
- [ ] Acesso a viagens e resumo global respeitam membership autenticada.
- [ ] Pagamentos, prazos e reset possuem lifecycle, autorização, atomicidade e testes.
- [ ] A interface mantém modo claro, visual clean e feedback completo em todos os estados.
- [ ] Cada AC tem teste e evidência independente antes da feature ser marcada como concluída.
