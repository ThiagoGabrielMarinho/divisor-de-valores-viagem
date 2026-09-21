# Design — backend completo da conta compartilhada

**Status:** Draft — Discuss/decisões de segurança pendentes  
**Spec:** `docs/features/backend-conta-compartilhada/spec.md`

## Arquitetura recomendada

Manter o monólito Express atual, separando responsabilidades:

```text
Browser
  │ HTTP + cookie de sessão
  ▼
Express bootstrap
  ├── auth middleware
  ├── routes/auth.ts
  ├── routes/trips.ts
  └── routes/account.ts
       ▼
Services
  ├── authService
  ├── tripService
  ├── expenseService
  ├── obligationService
  ├── resetService
  └── globalBalanceService
       ▼
Drizzle/pg → PostgreSQL
```

## Ordem de implementação

1. Corrigir/alinhar schema SQL e schema Drizzle.
2. Integrar migração no boot sem apagar o DDL atual.
3. Criar auth/session e middleware.
4. Proteger trips/memberships.
5. Adaptar expenses e derivação de obligations.
6. Implementar payment/deadline/reset lifecycle.
7. Implementar global summary/netting.
8. Expor rotas e atualizar documentação.

## Componentes e arquivos previstos

| Componente | Arquivos | Responsabilidade |
| --- | --- | --- |
| Schema/migration | `backend/db/schema.sql`, `backend/src/db/schema.ts`, `backend/src/db/migrate.ts` | DDL e tipos coerentes; evolução idempotente. |
| Auth | `backend/src/services/authService.ts`, `backend/src/routes/auth.ts` | Hash, cadastro, login, logout e sessão. |
| Middleware | `backend/src/middleware/auth.ts` | Resolver sessão, 401 e contexto do usuário. |
| Authorization | `backend/src/services/membershipService.ts` | Membership e owner/member, 403. |
| Expenses | `backend/src/services/expenseService.ts` | Despesa, shares, autorização e atomicidade. |
| Obligations | `backend/src/services/obligationService.ts` | Estados, confirmação pelo recebedor, recusa e prazo. |
| Reset | `backend/src/services/resetService.ts` | Bloqueio após concluído, confirmação e transação. |
| Summary | `backend/src/services/globalBalanceService.ts` | Netting por par e drill-down por viagem. |
| HTTP | `backend/src/routes/auth.ts`, `trips.ts`, `account.ts` | Contratos finos e status/payload. |
| Types | `backend/src/types.ts` | Tipos de domínio e erros. |
| Tests | `backend/src/tests/*.test.ts` | Unit/integration/HTTP conforme matriz. |

## Decisões de segurança a fechar antes do código

- Cookie HttpOnly, SameSite e Secure conforme ambiente.
- Estratégia CSRF para requests mutáveis.
- Expiração e revogação de sessão.
- Rate limit para login.
- Não armazenar `senha` em texto: migrar/renomear para `senha_hash` antes da implementação real.
- Mensagens de login neutras.
- Não registrar secrets ou senhas nos logs.

## Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Schema SQL e Drizzle divergem | Runtime quebra ou tabelas incompletas | Task própria de alinhamento e teste contra banco real. |
| `migrate.ts` atual cria apenas tabelas antigas | Novas tabelas não sobem no boot | Integrar `schema.sql` ou DDL equivalente em task dedicada. |
| Senha atual em coluna `senha` | Risco de credencial em texto | Alterar para hash e nunca aceitar texto no service. |
| Sessão sem CSRF/rate limit | Ataque à conta | Fechar Discuss de segurança antes de Execute. |
| Reset concorrente | Perda/inconsistência | Transação, lock/estado de ciclo e teste concorrente. |
| Global summary mistura IDs | Valores errados | Agregar por users.id, nunca por nome/participant local. |
| Rotas atuais abertas por UUID | Bypass de auth | Middleware em todas as rotas e testes 401/403 antes de liberar. |

## UX/API

O backend deve suportar o protótipo sem replicar seu armazenamento local. Contratos precisam expressar estados distintos: pendente, aguardando confirmação, concluído, atraso, vazio, indisponível e erro. A UI segue o modo claro/clean, mas integração frontend será tratada em outra feature.
