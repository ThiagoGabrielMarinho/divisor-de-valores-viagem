# Contexto de Discuss — evolução de conta compartilhada

**Status:** Blocked — decisões de produto aguardando confirmação  
**Spec:** `docs/features/evolucao-conta-compartilhada/spec.md`  
**Regra:** este arquivo registra decisões. Não tratar recomendações como aprovação.

## Feature Boundary

Esta evolução cobre estados verdadeiros de despesas/quitação, identidade autenticada, membership por viagem, resumo global de dívidas, confirmação de pagamento, prazo, reset seguro e redesign clean/light. Não cobre pagamentos financeiros externos nem múltiplas moedas.

## Decisões já confirmadas

### Visual e experiência

- A plataforma será exclusivamente em modo claro.
- O visual deve ser clean, moderno, bonito, acessível e simples de entender.
- Cada fluxo precisa tratar loading, sucesso, erro, vazio e indisponibilidade.
- A interface deve funcionar em celular, tablet e desktop.

### Stack e domínio existente

- Node.js + TypeScript + Express.
- PostgreSQL via Drizzle.
- Centavos inteiros e BRL.
- Services concentram regras; rotas permanecem finas.

## Gray areas que exigem decisão

### 1. Tipo de login

**Recomendação:** email + senha, sessão segura no backend e cookie HttpOnly.  
**Alternativas:** magic link; nome + PIN; provedor externo.  
**Impactos:** tabela de usuários, hash de senha, sessão, logout, expiração, recuperação, CORS/CSRF e testes de segurança.

### 2. Membership e papéis

**Recomendação:** `owner` e `member`, com owner controlando reset e convites; member registra gastos e confirma somente o que sua permissão permitir.  
**Alternativas:** todos os membros iguais; papéis adicionais de admin.  
**Impactos:** endpoints 401/403, criação de viagem, convite e migração das viagens atuais.

### 3. Identidade de participante

**Recomendação:** participante de viagem referencia uma conta quando autenticado; convidado sem conta deve ser explícito e não pode ser confundido com outra pessoa pelo nome.  
**Alternativas:** exigir conta para todos; manter participantes anônimos e não oferecer resumo global para eles.  
**Impactos:** agregação global, convites, renomeação e privacidade.

### 4. Estados de despesa e quitação

**Recomendação:** separar despesa (`active/cancelled/archived`) de obrigação (`pending/confirmed/disputed/cancelled`, se necessário). O settlement guloso continua sendo uma sugestão até uma obrigação persistida existir.  
**Alternativas:** apenas marcar despesa paga; excluir/corrigir despesa.  
**Impactos:** saldo, histórico, confirmação, reset, auditoria e compatibilidade de dados antigos.

### 5. Confirmação de pagamento

**Recomendação:** confirmação idempotente, com actor e timestamp, autorizada por regra explícita; não apagar a despesa.  
**Alternativas:** confirmação do pagador; confirmação do recebedor; confirmação de ambos; confirmação unilateral com contestação.  
**Impactos:** conflitos 409, desfazer, status global e UX.

### 6. Prazo

**Recomendação:** prazo opcional por obrigação, persistido em UTC e exibido no timezone escolhido pelo usuário; atraso é derivado do relógio.  
**Alternativas:** prazo por despesa ou por viagem.  
**Impactos:** schema, filtros, testes temporais e UI.

### 7. Reset

**Recomendação:** owner confirma a criação de um novo ciclo; histórico e pagamentos confirmados permanecem consultáveis.  
**Alternativas:** apagar tudo; arquivar somente despesas; resetar somente obrigações pendentes.  
**Impactos:** atomicidade, auditoria, concorrência, autorização e comunicação ao usuário.

### 8. Resumo global

**Recomendação:** agrupar por identidade de conta e mostrar saldo líquido por pessoa, com detalhamento por viagem, obrigação, status e prazo.  
**Alternativas:** mostrar cada obrigação sem netting; consolidar somente viagens selecionadas.  
**Impactos:** consultas, privacy boundary, moeda futura e experiência da home.

## Perguntas para confirmação do usuário

1. Você confirma email + senha ou prefere outro tipo de login?
2. O owner será o único autorizado a resetar a viagem e convidar/remover membros?
3. Participantes sem conta poderão existir? Se sim, como serão convidados e vinculados depois?
4. Quem confirma um pagamento: quem paga, quem recebe, ambos ou owner?
5. Confirmar pagamento deve mudar o saldo exibido ou somente o status da obrigação?
6. O prazo será por transferência/obrigação, por despesa ou por viagem?
7. Reset deve criar um novo ciclo preservando histórico, ou apagar dados? O que ocorre com pagamentos confirmados?
8. O resumo global deve fazer netting entre valores opostos da mesma dupla?
9. Quando uma viagem existente do MVP não tiver owner/account, ela deve ficar bloqueada até ser reivindicada, receber um convite ou permanecer no modo legado?
10. O redesign pode alterar completamente a composição atual das telas, mantendo apenas o conteúdo funcional?

## Agent's Discretion

- Escolha de tokens CSS, espaçamento, tipografia e composição visual, desde que siga o steering de modo claro, clean, acessível e responsivo.
- Organização interna dos services e nomes de arquivos, desde que as rotas permaneçam finas e o design aprovado seja respeitado.
- Escolha do runner de testes frontend/HTTP somente após explicitar o impacto de dependência e atualizar a matriz de testes.

## Declined / Undiscussed Gray Areas → Assumptions

Ainda não convertidas em assumptions aprovadas. A feature permanece `Blocked` até o usuário responder as perguntas críticas ou autorizar defaults.

## Deferred Ideas

- Múltiplas moedas e conversão.
- Integrações de pagamento real.
- Notificações externas.
- Aplicativo nativo.
- Recuperação avançada de conta e suporte administrativo.
