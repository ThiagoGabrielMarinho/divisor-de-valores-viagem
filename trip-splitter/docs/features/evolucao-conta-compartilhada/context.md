# Contexto de Discuss — protótipo frontend de conta compartilhada

**Status:** Decisões confirmadas — escopo somente frontend
**Spec:** `docs/features/evolucao-conta-compartilhada/spec.md`  
**Regra:** este arquivo registra decisões confirmadas pelo usuário. As tasks devem respeitá-las sem inventar comportamento novo.

## Feature Boundary

Esta evolução é um protótipo **somente frontend**. Não há backend, banco de dados nem API real nesta feature. Cadastro, login, viagens, participantes, despesas, pagamentos, prazos, reset e resumo global são simulados no navegador. O objetivo é validar a experiência e o fluxo antes de qualquer implementação de servidor.

## Decisões confirmadas

### Escopo técnico

- Não há backend, banco ou API nesta feature; tudo vive no frontend.
- Cadastro e login são uma simulação de interface, sem servidor de autenticação e sem segurança real.
- O estado é mantido no navegador (por exemplo, memória e/ou `localStorage`), suficiente para demonstrar o fluxo.
- As tasks tocam apenas `frontend/`; nenhuma altera `backend/`, `docs` de contrato de API ou schema.

### 1. Login e cadastro

- Autenticação simulada por email e senha.
- Uma pessoa pode se cadastrar pela própria interface.
- Como é simulação, não há hash real, sessão de servidor, recuperação de senha nem verificação de email; o objetivo é apenas o fluxo visual e a troca de tela.

### 2. Papéis na viagem

- Existem dois papéis: `owner` e `member`.
- O owner é quem cria a viagem e tem ações adicionais, como resetar (dentro das regras) e gerir a viagem.
- O member participa, registra despesas e interage com pagamentos conforme as regras abaixo.

### 3. Cadastro de pessoas

- Pessoas podem se cadastrar na simulação.
- Uma viagem mostra apenas para quem faz parte dela; a visibilidade é simulada com base no usuário logado no protótipo.

### 4. Confirmação de pagamento em duas etapas

- Quem deve pagar tem uma ação para declarar “paguei”, marcando a obrigação como aguardando confirmação.
- Quem tem a receber é quem confirma o recebimento.
- Somente a confirmação do recebedor conclui o pagamento; a declaração do pagador sozinha não quita.

### 5. Efeito da confirmação

- Enquanto não confirmado, o valor permanece no saldo pendente.
- Quando o recebedor confirma, a obrigação é marcada como pagamento concluído e sai do saldo pendente.

### 6. Prazo por obrigação

- O prazo é definido por obrigação.
- Quem tem a receber (o credor da obrigação) define o prazo daquele pagamento.
- A interface mostra o estado da obrigação como pendente, aguardando confirmação, concluído ou atrasado em relação ao prazo.

### 7. Reset de gastos

- O reset apaga os gastos da viagem no protótipo.
- O reset é bloqueado quando já existe qualquer pagamento concluído na viagem.
- O reset exige confirmação explícita do usuário antes de apagar.

### 8. Resumo global com netting

- A tela inicial mostra, por pessoa, quanto o usuário deve ou tem a receber, considerando as viagens simuladas às quais ele pertence.
- O resumo usa **netting**: quando o usuário deve a alguém em uma situação e tem a receber da mesma pessoa em outra, a interface mostra apenas o valor líquido entre os dois.
- Ao selecionar uma pessoa, a interface mostra a origem por viagem e o estado de cada obrigação.

### 9. Visual

- Modo claro exclusivo, sem dark mode ou seletor de tema.
- Visual clean, moderno, responsivo, acessível e de fácil entendimento.
- Todos os fluxos exibem loading, sucesso, erro, vazio e indisponibilidade simulados de forma coerente.

## Agent's Discretion

- Estrutura interna dos arquivos do frontend, contanto que permaneça `frontend/` estático sem framework obrigatório.
- Forma exata de simular persistência no navegador, desde que o fluxo e os estados fiquem coerentes e reprodutíveis.
- Tokens de design, tipografia, espaçamento e composição, respeitando o steering de modo claro, clean, acessível e responsivo.
- Escolha de um runner de testes de frontend somente após explicitar impacto de dependência e atualizar a matriz de testes; enquanto não houver, a verificação é UAT manual mais checagem de lógica pura quando extraível.

## Deferred Ideas

- Backend, banco de dados e API reais.
- Autenticação real, sessões seguras e recuperação de conta.
- Persistência compartilhada entre dispositivos e usuários reais.
- Pagamentos financeiros externos e notificações.
- Múltiplas moedas.

Estas ideias ficam explicitamente fora desta feature e virariam novas features quando o produto sair do protótipo frontend.
