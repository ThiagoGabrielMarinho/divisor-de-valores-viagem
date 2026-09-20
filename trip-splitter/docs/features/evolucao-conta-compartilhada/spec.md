# Protótipo frontend de conta compartilhada

**Status:** Draft — escopo somente frontend, decisões confirmadas
**Feature path:** `docs/features/evolucao-conta-compartilhada/`  
**Prioridade:** Large (frontend-only)

## Problem Statement

O produto ainda não tem backend nem banco de dados. Antes de investir em servidor, o grupo quer validar no navegador a experiência completa: cadastro e login simulados, viagens com papéis, despesas com estados verdadeiros, pagamentos confirmados, prazos, reset e uma visão inicial de quanto se deve a cada pessoa. Esta feature entrega esse protótipo apenas no frontend.

Tudo é simulado no navegador. Não há autenticação real, persistência de servidor ou API. O objetivo é o fluxo, a clareza e a confiança visual.

## Goals

- Simular cadastro e login por email e senha no frontend, sem servidor.
- Exibir despesas e quitações refletindo estados reais do estado simulado, sem mensagens vazias falsas.
- Mostrar somente as viagens do usuário logado no protótipo, com papéis owner e member.
- Permitir o fluxo de pagamento em duas etapas: o pagador declara que pagou e o recebedor confirma.
- Mover o valor do saldo pendente para concluído somente após a confirmação do recebedor.
- Permitir prazo por obrigação, definido por quem tem a receber.
- Permitir reset que apaga os gastos, bloqueado quando já houve pagamento concluído.
- Apresentar um resumo global com netting do quanto o usuário deve ou tem a receber por pessoa.
- Entregar um visual clean, moderno, responsivo, acessível e em modo claro.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Backend, banco de dados ou API | Esta feature é exclusivamente frontend; nenhuma task altera servidor. |
| Autenticação real, sessão de servidor, hash de senha, recuperação | Cadastro e login são simulação de interface. |
| Persistência compartilhada entre dispositivos ou usuários reais | O estado vive apenas no navegador do protótipo. |
| Pagamentos financeiros externos, PIX ou integração bancária | Confirmar pagamento é apenas um estado simulado. |
| Notificações por email, push ou mensagem | Dependem de infraestrutura externa inexistente no protótipo. |
| Múltiplas moedas | O protótipo continua em BRL. |
| Migração de viagens antigas | Não existem dados antigos; não há backend nem banco. |

## Assumptions & Open Questions

Todas as decisões abaixo foram confirmadas pelo usuário. Nenhuma exige backend.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo | Somente frontend; sem backend, banco ou API | O produto ainda não tem servidor e quer validar o fluxo primeiro. | y |
| Login e cadastro | Simulados por email e senha no navegador | Valida a experiência sem construir autenticação real. | y |
| Papéis | Owner e member por viagem | Owner cria e gerencia; member participa. | y |
| Cadastro de pessoas | Pessoas podem se cadastrar na simulação | Permite montar o cenário de várias contas no protótipo. | y |
| Fluxo de pagamento | Pagador declara que pagou e recebedor confirma | Espelha o combinado real do grupo. | y |
| Efeito da confirmação | Move do saldo pendente para pagamento concluído | Deixa claro o que ainda falta e o que já foi quitado. | y |
| Prazo | Por obrigação, definido por quem recebe | Quem espera o dinheiro define até quando. | y |
| Reset | Apaga os gastos, mas é bloqueado se houver pagamento concluído | Evita apagar um histórico que já teve quitação. | y |
| Resumo global | Consolidado por pessoa com netting | Mostra o valor líquido entre o usuário e cada pessoa. | y |
| Visual | Modo claro, clean, responsivo e acessível | Decisão permanente do steering. | y |
| Persistência do protótipo | Estado no navegador (memória e/ou localStorage) | Suficiente para demonstrar o fluxo sem servidor. | y |

**Open questions:** none - all resolved or logged above.

## User Stories

### P1: Cadastro e login simulados

**User Story**: Como pessoa do grupo, quero me cadastrar e entrar com email e senha na simulação para acessar minhas viagens no protótipo.

**Why P1**: Sem identidade simulada não há como demonstrar viagens por usuário nem o resumo global.

**Acceptance Criteria**:

1. WHEN a pessoa envia um cadastro simulado com email e senha válidos THEN the system SHALL registrar a conta no estado do navegador e SHALL habilitar o login com essas credenciais.
2. WHEN a pessoa envia login com credenciais que existem no estado simulado THEN the system SHALL iniciar a sessão simulada e SHALL exibir a área autenticada.
3. IF o login usar credenciais inexistentes no estado simulado THEN the system SHALL exibir uma mensagem de erro e SHALL permanecer na tela de login.
4. WHEN a pessoa aciona sair THEN the system SHALL encerrar a sessão simulada e SHALL voltar para a tela de login.
5. The system SHALL deixar explícito na interface que o cadastro e o login são uma simulação sem servidor.

**Independent Test**: Cadastrar uma conta na simulação, sair, entrar com as mesmas credenciais, tentar credenciais erradas e verificar telas e mensagens.

### P1: Viagens por usuário com papéis

**User Story**: Como usuário logado no protótipo, quero ver apenas as viagens das quais faço parte e saber se sou owner ou member.

**Why P1**: A visibilidade por usuário e o papel controlam o que aparece e quais ações existem.

**Acceptance Criteria**:

1. WHEN o usuário logado abre a lista de viagens THEN the system SHALL exibir somente as viagens em que ele participa no estado simulado.
2. WHEN o usuário cria uma viagem THEN the system SHALL registrá-lo como owner dessa viagem.
3. WHILE o usuário for member de uma viagem THEN the system SHALL ocultar ou desabilitar as ações exclusivas de owner nessa viagem.
4. IF o usuário tentar abrir uma viagem da qual não participa THEN the system SHALL impedir o acesso e SHALL informar que a viagem não está disponível para ele.

**Independent Test**: Com duas contas simuladas, criar viagens distintas e confirmar visibilidade, papel e bloqueio de acesso cruzado.

### P1: Estados verdadeiros de despesas e quitação

**User Story**: Como participante, quero que despesas e quitações mostrem o estado real do protótipo para não ver mensagens falsas.

**Why P1**: A interface não pode dizer que está tudo quitado ou vazio quando há dados.

**Acceptance Criteria**:

1. WHEN existir ao menos uma despesa na viagem THEN the system SHALL listar cada despesa e SHALL ocultar a mensagem de nenhuma despesa.
2. WHEN não existir despesa na viagem THEN the system SHALL exibir a mensagem de nenhuma despesa e SHALL não manter itens antigos na lista.
3. WHEN existir ao menos uma obrigação em aberto THEN the system SHALL listar as obrigações e SHALL ocultar a mensagem de tudo quitado.
4. WHEN não existir obrigação em aberto THEN the system SHALL exibir a mensagem de tudo quitado somente quando o estado simulado não tiver pendências.
5. IF uma ação simulada falhar THEN the system SHALL exibir um estado de erro identificável e SHALL não apresentar vazio como se fosse sucesso.

**Independent Test**: Alternar o estado simulado entre com dados, sem dados e erro, e verificar listas, mensagens e limpeza de estado anterior.

### P1: Pagamento em duas etapas

**User Story**: Como participante, quero declarar que paguei uma obrigação e que o recebedor confirme, para o pagamento só ser concluído quando quem recebe confirmar.

**Why P1**: É o combinado do grupo e evita marcar como pago sem o aceite de quem recebe.

**Acceptance Criteria**:

1. WHEN o devedor de uma obrigação aciona "declarar pagamento" THEN the system SHALL marcar a obrigação como aguardando confirmação e SHALL mantê-la no saldo pendente.
2. WHEN o recebedor da obrigação confirma o recebimento THEN the system SHALL marcar a obrigação como pagamento concluído e SHALL removê-la do saldo pendente.
3. IF um usuário que não é o recebedor tentar confirmar o recebimento THEN the system SHALL impedir a confirmação e SHALL manter o estado anterior.
4. WHILE uma obrigação estiver aguardando confirmação THEN the system SHALL exibir esse estado de forma distinta de pendente e de concluído.
5. WHEN o recebedor recusa uma declaração de pagamento THEN the system SHALL retornar a obrigação para pendente e SHALL mantê-la no saldo pendente.

**Independent Test**: Declarar pagamento como devedor, confirmar como recebedor, tentar confirmar com outro usuário e recusar uma declaração, verificando estados e saldo.

### P1: Prazo por obrigação

**User Story**: Como pessoa que tem a receber, quero definir o prazo de uma obrigação para o devedor saber até quando pagar.

**Why P1**: O prazo orienta a cobrança e destaca atrasos.

**Acceptance Criteria**:

1. WHEN o recebedor define um prazo para uma obrigação THEN the system SHALL associar esse prazo à obrigação no estado simulado.
2. WHILE a data simulada de referência for anterior ou igual ao prazo e a obrigação não estiver concluída THEN the system SHALL exibir a obrigação como dentro do prazo.
3. WHILE a data simulada de referência for posterior ao prazo e a obrigação não estiver concluída THEN the system SHALL exibir a obrigação como atrasada.
4. IF um usuário que não é o recebedor tentar definir o prazo THEN the system SHALL impedir a ação e SHALL manter o prazo anterior.
5. WHERE uma obrigação não tiver prazo definido THEN the system SHALL exibi-la sem indicação de atraso.

**Independent Test**: Definir prazo como recebedor, variar a data de referência simulada em torno do prazo e tentar definir prazo com outro usuário.

### P1: Reset de gastos com bloqueio

**User Story**: Como owner, quero resetar os gastos da viagem, mas ser impedido quando já houve pagamento concluído.

**Why P1**: Reset é destrutivo e não pode apagar uma viagem que já teve quitação.

**Acceptance Criteria**:

1. WHEN o owner aciona o reset e confirma a ação THEN the system SHALL apagar as despesas e obrigações em aberto da viagem no estado simulado.
2. IF a viagem tiver ao menos um pagamento concluído THEN the system SHALL bloquear o reset e SHALL explicar o motivo.
3. IF um usuário que não é owner tentar resetar THEN the system SHALL impedir a ação e SHALL não alterar dados.
4. WHEN o reset for solicitado THEN the system SHALL exigir uma confirmação explícita antes de apagar.
5. IF o usuário cancelar a confirmação THEN the system SHALL preservar os gastos.

**Independent Test**: Resetar uma viagem sem pagamentos, tentar resetar uma com pagamento concluído, tentar como member e cancelar a confirmação.

### P1: Resumo global com netting

**User Story**: Como usuário, quero ver na tela inicial quanto devo ou tenho a receber de cada pessoa, com valores líquidos.

**Why P1**: É a visão central do produto além de uma viagem única.

**Acceptance Criteria**:

1. WHEN o usuário abre a tela inicial autenticada THEN the system SHALL exibir, por pessoa, o valor líquido que ele deve ou tem a receber considerando suas viagens simuladas.
2. WHEN o usuário tem valores a pagar e a receber com a mesma pessoa THEN the system SHALL apresentar apenas o resultado líquido entre os dois.
3. WHEN não houver pendência com ninguém THEN the system SHALL exibir um estado vazio verdadeiro e SHALL não afirmar que há dívidas.
4. WHEN o usuário seleciona uma pessoa do resumo THEN the system SHALL detalhar a origem por viagem e o estado de cada obrigação.
5. The system SHALL excluir do resumo as obrigações já concluídas do cálculo de pendência.

**Independent Test**: Montar obrigações opostas com a mesma pessoa em viagens diferentes e conferir o valor líquido, o estado vazio e o detalhamento.

### P2: Visual clean e moderno

**User Story**: Como usuário não técnico, quero uma interface bonita, clara e responsiva em modo claro.

**Why P2**: Reforça confiança e entendimento depois que os fluxos estão definidos.

**Acceptance Criteria**:

1. The system SHALL usar exclusivamente o modo claro e SHALL não exibir seletor de modo escuro.
2. WHEN o usuário percorre o fluxo principal THEN the system SHALL apresentar hierarquia visual clara, ação primária evidente e linguagem simples.
3. WHEN uma tela estiver carregando, vazia, em erro ou indisponível THEN the system SHALL exibir o estado correspondente sem confundi-lo com dados reais.
4. WHEN a viewport for de celular, tablet ou desktop THEN the system SHALL manter o conteúdo legível, ações alcançáveis e sem overflow horizontal.
5. The system SHALL manter foco visível, contraste suficiente, labels associados e informação que não dependa apenas de cor.

**Independent Test**: UAT nos três tamanhos de viewport com checklist de jornada, estados, acessibilidade e ausência de dark mode.

## Edge Cases

- IF o estado simulado do navegador estiver vazio no primeiro acesso THEN the system SHALL apresentar um ponto de partida claro para cadastro e criação de viagem.
- IF duas pessoas tiverem o mesmo nome THEN the system SHALL diferenciá-las pela identidade simulada da conta e não apenas pelo nome exibido.
- IF o usuário recarregar a página THEN the system SHALL manter o estado simulado conforme a estratégia de persistência escolhida ou SHALL indicar claramente que o estado foi reiniciado.
- IF uma obrigação já concluída aparecer em uma consulta THEN the system SHALL mantê-la fora do saldo pendente e do cálculo do resumo global.
- IF o usuário tentar declarar pagamento de uma obrigação que não é dele THEN the system SHALL impedir a ação.
- IF a data de referência simulada não estiver disponível THEN the system SHALL tratar prazos de forma definida e consistente, sem marcar atraso aleatório.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PROTO-01 | P1: Cadastro e login simulados | Design | Pending |
| PROTO-02 | P1: Cadastro e login simulados | Design | Pending |
| PROTO-03 | P1: Cadastro e login simulados | Design | Pending |
| PROTO-04 | P1: Cadastro e login simulados | Design | Pending |
| PROTO-05 | P1: Cadastro e login simulados | Design | Pending |
| PROTO-06 | P1: Viagens por usuário com papéis | Design | Pending |
| PROTO-07 | P1: Viagens por usuário com papéis | Design | Pending |
| PROTO-08 | P1: Viagens por usuário com papéis | Design | Pending |
| PROTO-09 | P1: Viagens por usuário com papéis | Design | Pending |
| PROTO-10 | P1: Estados verdadeiros de despesas e quitação | Design | Pending |
| PROTO-11 | P1: Estados verdadeiros de despesas e quitação | Design | Pending |
| PROTO-12 | P1: Estados verdadeiros de despesas e quitação | Design | Pending |
| PROTO-13 | P1: Estados verdadeiros de despesas e quitação | Design | Pending |
| PROTO-14 | P1: Estados verdadeiros de despesas e quitação | Design | Pending |
| PROTO-15 | P1: Pagamento em duas etapas | Design | Pending |
| PROTO-16 | P1: Pagamento em duas etapas | Design | Pending |
| PROTO-17 | P1: Pagamento em duas etapas | Design | Pending |
| PROTO-18 | P1: Pagamento em duas etapas | Design | Pending |
| PROTO-19 | P1: Pagamento em duas etapas | Design | Pending |
| PROTO-20 | P1: Prazo por obrigação | Design | Pending |
| PROTO-21 | P1: Prazo por obrigação | Design | Pending |
| PROTO-22 | P1: Prazo por obrigação | Design | Pending |
| PROTO-23 | P1: Prazo por obrigação | Design | Pending |
| PROTO-24 | P1: Prazo por obrigação | Design | Pending |
| PROTO-25 | P1: Reset de gastos com bloqueio | Design | Pending |
| PROTO-26 | P1: Reset de gastos com bloqueio | Design | Pending |
| PROTO-27 | P1: Reset de gastos com bloqueio | Design | Pending |
| PROTO-28 | P1: Reset de gastos com bloqueio | Design | Pending |
| PROTO-29 | P1: Reset de gastos com bloqueio | Design | Pending |
| PROTO-30 | P1: Resumo global com netting | Design | Pending |
| PROTO-31 | P1: Resumo global com netting | Design | Pending |
| PROTO-32 | P1: Resumo global com netting | Design | Pending |
| PROTO-33 | P1: Resumo global com netting | Design | Pending |
| PROTO-34 | P1: Resumo global com netting | Design | Pending |
| PROTO-35 | P2: Visual clean e moderno | Design | Pending |
| PROTO-36 | P2: Visual clean e moderno | Design | Pending |
| PROTO-37 | P2: Visual clean e moderno | Design | Pending |
| PROTO-38 | P2: Visual clean e moderno | Design | Pending |
| PROTO-39 | P2: Visual clean e moderno | Design | Pending |

**ID format:** `PROTO-NN`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified  
**Coverage:** 39 acceptance criteria; mapeamento por task fechado em `tasks.md`.

## Success Criteria

- [ ] O protótipo roda apenas no frontend, sem depender de backend ou banco.
- [ ] Cadastro, login e logout simulados funcionam e são identificados como simulação.
- [ ] Despesas, obrigações e resumo nunca mostram vazio quando há dados.
- [ ] O pagamento só conclui após a confirmação do recebedor e muda o saldo pendente.
- [ ] O prazo por obrigação reflete dentro do prazo e atrasado conforme a data de referência.
- [ ] O reset apaga gastos, é bloqueado após pagamento concluído e exige confirmação.
- [ ] O resumo global mostra o valor líquido por pessoa com netting.
- [ ] A interface é clean, responsiva, acessível e em modo claro.
