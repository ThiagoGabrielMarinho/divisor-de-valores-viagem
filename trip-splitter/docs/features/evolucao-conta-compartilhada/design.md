# Design — evolução de conta compartilhada

**Status:** Blocked — não escolher arquitetura final antes da Discuss  
**Spec:** `docs/features/evolucao-conta-compartilhada/spec.md`  
**Context:** `docs/features/evolucao-conta-compartilhada/context.md`

## Nota de design

A feature é Large/Complex. O design final depende de decisões sobre login, membership, identidade global, estados financeiros, confirmação, prazo e reset. Este documento registra o espaço de decisão e os limites técnicos conhecidos; não autoriza implementação final.

## O que já está definido

- O monólito atual continua sendo a base: Express serve API e frontend.
- PostgreSQL/Drizzle continuam como persistência.
- Services concentram regras e rotas permanecem finas.
- Valores continuam em centavos e a moeda continua BRL.
- A interface permanece light-only, clean, responsiva, acessível e orientada à jornada.
- O código atual precisa ser tratado como compatibilidade a migrar, não como contrato suficiente para as novas capacidades.

## Alternativas arquiteturais para Discuss

### Opção A — Auth própria no mesmo monólito — recomendação provisória

Usuários, credenciais com hash, sessões, memberships, obrigações e pagamentos ficam no PostgreSQL atual. Express recebe middleware de sessão e o frontend usa endpoints relativos.

- **Vantagens:** mantém deploy simples, baixa quantidade de serviços e controle do modelo financeiro.
- **Riscos:** responsabilidade de segurança cresce; exige política de sessão, CSRF, recuperação e rate limiting.
- **Adequação:** combina com o MVP self-hosted, se o escopo de segurança for aceito.

### Opção B — Provedor externo de identidade

A autenticação fica em um IdP, e o backend valida tokens e mantém somente vínculo de usuário/membership.

- **Vantagens:** reduz implementação de senha, sessão e recuperação.
- **Riscos:** nova dependência, configuração externa, custo/lock-in e impacto em desenvolvimento local.
- **Adequação:** só escolher se o produto aceitar infraestrutura externa.

### Opção C — Link mágico/convite como identidade mínima

A pessoa entra por link ou código com expiração e não há conta tradicional no primeiro corte.

- **Vantagens:** UX simples e pouca persistência de credencial.
- **Riscos:** não resolve bem resumo global, recuperação, revogação ou troca de dispositivo.
- **Adequação:** insuficiente como recomendação para a visão global de dívidas.

**Recomendação provisória:** Opção A, mas somente após confirmação explícita das regras de segurança e migração. Não implementar antes da Discuss.

## Componentes previstos após aprovação

| Componente | Responsabilidade | Estado |
| --- | --- | --- |
| Identity/Auth service | Criar conta, login, logout, sessão e expiração | Bloqueado pela decisão de login |
| Membership service | Associar contas a viagens e aplicar owner/member | Bloqueado por papéis e convite |
| Expense lifecycle service | Estado de despesa, correções, cancelamento e compatibilidade | Bloqueado pela semântica de estado |
| Obligation/payment service | Persistir obrigação, confirmação, conflito e prazo | Bloqueado por regra de pagamento |
| Reset/cycle service | Criar ciclo, preservar histórico e controlar concorrência | Bloqueado pela semântica de reset |
| Global balance service | Consolidar obrigações por identidade e detalhar por viagem | Bloqueado pela identidade e netting |
| HTTP auth/membership routes | Expor contratos 401/403 e operações autorizadas | Bloqueado pelos componentes |
| Frontend session shell | Login, logout, sessão expirada e proteção de telas | Bloqueado pelo contrato de auth |
| Frontend global dashboard | Mostrar dívidas agregadas, filtros e estados | Bloqueado pelo contrato global |
| Frontend trip lifecycle | Mostrar despesa, obrigação, prazo, pagamento e reset | Bloqueado pelo lifecycle |
| Visual system | Redesign claro, clean, responsivo e acessível | Requisito confirmado; conteúdo depende dos estados |

## Modelo de dados a decidir

O modelo provavelmente precisará de entidades equivalentes a:

- `users` e credenciais/sessões;
- `trips` e `trip_memberships`;
- `participants` ligados a uma identidade ou marcados como convidados;
- `expenses` com lifecycle explícito;
- `expense_shares` preservando o split em centavos;
- `obligations`/`settlements` persistidos, separados da projeção gulosa;
- `payment_confirmations` ou eventos de transição;
- `payment_deadlines` ou vencimento na obrigação;
- `trip_cycles`/histórico de reset;
- auditoria mínima para ações destrutivas e confirmações.

Não criar essas tabelas por inferência. O schema final depende do contexto aprovado e deve incluir migração compatível com o DDL atual.

## UX/UI a detalhar após Discuss

O Design aprovado deverá documentar:

- fluxo de login, criação de conta e sessão expirada;
- home global com resumo, vazio, loading, erro e indisponibilidade;
- entrada em uma viagem autorizada e convite pendente;
- cards/tabela de obrigações com status, prazo, ação e confirmação;
- fluxo de reset com confirmação explícita e resultado;
- mensagens para “pendente”, “confirmado”, “atrasado”, “cancelado” e “indisponível”;
- responsividade mobile/tablet/desktop;
- foco, contraste, labels, teclado e alvos de toque;
- ausência permanente de dark mode.

## Riscos e mitigações preliminares

| Risco | Evidência | Impacto | Mitigação planejada |
| --- | --- | --- | --- |
| UUID atual funciona como autorização total | `backend/src/routes/trips.ts` | Dados expostos e edição sem identidade | Definir auth/membership e testar 401/403 antes de fechar rotas antigas. |
| Settlement é apenas projeção em memória | `backend/src/services/balanceService.ts` | Não há confirmação ou histórico de pagamento | Separar obrigação persistida da projeção gulosa em Discuss/Design. |
| DDL não possui migrations versionadas | `backend/src/db/migrate.ts` | Alteração de schema existente pode falhar | Criar estratégia de migração compatível como task própria. |
| Frontend apresenta vazio após erro/estado stale | `frontend/app.js` | Usuário recebe informação financeira falsa | Modelar estados de carregamento/erro e testar respostas vazias/não vazias/erro. |
| Identidade global inexiste | `backend/src/db/schema.ts` | Resumo entre viagens não é confiável por nome | Exigir identidade de conta ou limitar explicitamente convidados. |
| Reset pode destruir histórico | ausência de endpoint e lifecycle | Perda de confiança e inconsistência financeira | Novo ciclo/auditoria ou semântica aprovada, transação e confirmação. |

## Gate de desbloqueio

O Design só pode sair de `Blocked` quando `context.md` tiver decisões confirmadas para login, papéis, identidade, confirmação de pagamento, prazo, reset, resumo global e migração de viagens antigas. Depois disso, substituir recomendações provisórias por escolhas finais, atualizar interfaces/dados e gerar tasks com cobertura verificável.
