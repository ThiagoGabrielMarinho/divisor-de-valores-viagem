# Design — Integração do frontend ao backend real

**Spec:** `docs/features/integracao-frontend-backend/spec.md`
**Status:** Draft

## Visão geral

Duas frentes coordenadas:

1. **Backend** ganha (a) derivação de obrigações dentro da transação de criação da despesa e (b) um endpoint de busca de conta por email para o fluxo "adicionar participante".
2. **Frontend** passa a ser uma aplicação real servida na raiz, reescrita a partir da UI do protótipo, consumindo `/api` com sessão por cookie. O frontend legado por UUID é removido.

Nenhuma mudança de moeda, unidade (centavos) ou algoritmo de divisão. As regras continuam nos services; as rotas continuam finas.

## Backend

### 1. Derivação de obrigações (INT-17..INT-22)

Local: `backend/src/services/expenseService.ts`, dentro da transação já existente em `addExpense`.

Modelo: `expenses.paid_by` e `expense_shares.participant_id` referenciam `participants.id`; `obligations.de_user_id`/`para_user_id` referenciam `users.id`. A ponte é `participants.user_id`.

Regra de derivação, após inserir despesa e rateios, na mesma `tx`:

- Seja `payerParticipant = paidBy`. Resolver `payerUserId = participants.user_id` do pagador.
- Para cada rateio `share` de participante `p` com `p.id !== payerParticipant.id`:
  - Resolver `debtorUserId = p.user_id`.
  - Se `debtorUserId` e `payerUserId` existirem, forem diferentes e `share.share_cents > 0`, inserir uma obrigação:
    - `trip_id`, `expense_id = expense.id`, `de_user_id = debtorUserId`, `para_user_id = payerUserId`, `valor_cents = share.share_cents`, `estado = 'pendente'`.
- O rateio do próprio pagador nunca gera obrigação (INT-19 implícito) e valores não positivos são ignorados (INT-19).

Pré-condição de dados: para gerar obrigações, os participantes envolvidos precisam ter `user_id`. No fluxo real, participantes são contas (owner na criação, members adicionados por conta). Participantes sem `user_id` (não deve ocorrer no fluxo novo) são simplesmente ignorados na derivação — a despesa e os rateios ainda persistem. Isso mantém compatibilidade e não quebra a transação.

Atomicidade (INT-20): se qualquer insert de obrigação falhar, a transação inteira (despesa + rateios + obrigações) faz rollback; o cliente recebe erro e nada é gravado.

Sem mudança de contrato do endpoint `POST /api/trips/:tripId/expenses` (mesma request/response); apenas o efeito colateral de criar obrigações passa a existir. `docs/api.md` será atualizado para documentar esse efeito.

### 2. Busca de conta por email (INT-12, INT-16)

Nova rota fina protegida por sessão, no `accountRouter` ou `trips` router:

`GET /api/account/lookup?email=<email>`

- Protegida por `requireSession`.
- Normaliza o email (trim + lowercase) e busca em `users` por `lower(email)`.
- Sucesso `200`: `{ "id": "...", "nome": "...", "email": "..." }` — nunca retorna `senha`/hash.
- Não encontrado: `404` com `{ "error": "Nenhuma conta encontrada com esse email." }`.
- Sem email na query: `400`.

Regra no service `authService` (ou `userService`): função `findUserByEmail(email)` que devolve apenas campos públicos. A rota apenas traduz para HTTP.

O endpoint existente `POST /api/trips/:tripId/participants` continua recebendo `{ userId }` e permanece owner-only. O frontend faz o lookup por email para obter o `userId` e então chama o endpoint de adição.

### 3. Sem mudança nas demais rotas

Login/logout/register, viagens, obrigações, prazos, reset e resumo global já existem e são reusados como estão.

## Frontend

### Estratégia de arquivos

- Novo diretório servido: **`frontend/`** (raiz). Os arquivos novos substituem o legado.
- Reaproveitar `frontend/prototype/prototype.css` como base do CSS (copiar/renomear para `frontend/styles.css`), preservando o sistema visual claro.
- Estrutura de telas herdada do `frontend/prototype/index.html` (auth, home, viagem), adaptada.
- Lógica reescrita: em vez dos módulos simulados (`store.js`, `auth.js` etc.), um único cliente de API + controlador de UI que fala com `/api`.

Arquivos finais em `frontend/`:

- `index.html` — telas de auth, home e viagem (markup limpo, acessível, modo claro).
- `styles.css` — sistema visual (baseado no `prototype.css`).
- `api.js` — cliente HTTP: `apiFetch(path, options)` com `credentials: "include"`, parse de JSON, tratamento de erro e **redirecionamento a auth em 401** (INT-06).
- `app.js` — controlador: navegação entre telas, render de estados (loading/erro/vazio/dados), handlers de formulários e ações.

### Cliente de API (`api.js`)

- `credentials: "include"` em toda chamada (cookie de sessão same-origin).
- `Content-Type: application/json` nos POST/PATCH com corpo.
- Em resposta não-ok: lança `ApiError(status, message)` com a mensagem `{error}` do backend.
- Em `401`: dispara um callback global de "sessão expirada" que leva à tela de auth (atende INT-06 e o edge de expiração).

Métodos mapeando o contrato:

| Função | Rota |
| --- | --- |
| `register(email, senha, nome)` | `POST /api/auth/register` |
| `login(email, senha)` | `POST /api/auth/login` |
| `logout()` | `POST /api/auth/logout` |
| `listTrips()` | `GET /api/trips` |
| `createTrip(name)` | `POST /api/trips` |
| `getTrip(id)` | `GET /api/trips/:id` |
| `lookupAccount(email)` | `GET /api/account/lookup?email=` |
| `addParticipant(tripId, userId)` | `POST /api/trips/:id/participants` |
| `addExpense(tripId, body)` | `POST /api/trips/:id/expenses` |
| `listExpenses(tripId)` | `GET /api/trips/:id/expenses` |
| `listObligations(tripId)` | `GET /api/trips/:id/obligations` |
| `declare/confirm/reject(oblId)` | `POST /api/obligations/:id/{declare,confirm,reject}` |
| `setDeadline(oblId, date)` | `PATCH /api/obligations/:id/deadline` |
| `globalBalances()` | `GET /api/account/balances` |
| `globalBalanceDetails(userId)` | `GET /api/account/balances/:userId` |
| `resetTrip(tripId)` | `POST /api/trips/:id/reset` |

### Telas e estados

- **Auth**: abas Entrar/Criar conta; erro neutro em credencial inválida (INT-03); ao sucesso vai para a home.
- **Home**: saudação, resumo global (lista por pessoa, líquido, direção), estado vazio verdadeiro (INT-32..INT-34), e lista de viagens do usuário + criar viagem (INT-07, INT-08).
- **Viagem**: título, papel; participantes; adicionar participante por email (owner-only, INT-12..INT-15); registrar despesa (descrição, valor em R$, pagador, checkboxes de divisão); lista de despesas; lista de obrigações não concluídas com ações contextuais por papel (declarar/confirmar/recusar/definir prazo — INT-23..INT-27); card de reset (owner-only, com bloqueio — INT-28..INT-31).
- **Estados globais**: cada seção usa loading/erro/vazio/dados; erro e vazio nunca se confundem (edge). Ações mostram feedback (toast) e desabilitam o botão durante o envio.

### Papéis na UI

O papel vem de `GET /api/trips/:id` (o backend expõe participantes; o papel do usuário é derivado da própria membership). Para saber o papel, o frontend usa o resultado de abrir a viagem; ações owner-only (adicionar participante, reset) só aparecem/são habilitadas para owner. A verdadeira autorização é sempre do backend (403), a UI só evita oferecer o que não pode.

> Observação: o `GET /api/trips/:id` retorna a viagem + participantes. Para o papel do usuário logado, o frontend identifica sua própria linha de participante/membership. Se necessário para clareza, o campo de papel pode ser inferido no cliente a partir de quem criou/participa; a decisão de exibição não afeta a segurança, que é server-side.

### Servir na raiz

`backend/src/app.ts` já serve `frontend/` como estáticos e faz fallback para `index.html`. Com os novos arquivos em `frontend/`, isso passa a servir a aplicação integrada sem mudança na factory — apenas confirmando que o diretório apontado é `frontend/`. O diretório `frontend/prototype/` permanece como referência de UI, mas não é a raiz.

## Remoção do legado

Remover `frontend/index.html`, `frontend/app.js` e `frontend/style.css` legados (substituídos por `index.html`, `app.js`, `api.js`, `styles.css`). O histórico permanece no git. Nenhuma rota do backend dependia desses arquivos além do estático.

## Erros e mapeamento HTTP

| Situação | Backend | UI |
| --- | --- | --- |
| Sem sessão / expirada | 401 | volta à auth |
| Sem membership / papel | 403 | mensagem de acesso; ação não oferecida |
| Validação (valor, email vazio) | 400 | erro no formulário/toast |
| Não encontrado (viagem, email) | 404 | mensagem específica |
| Reset com concluído | 409 | "reset bloqueado" |
| Falha inesperada | 500 | estado de erro perceptível |

## Riscos

- **Participante sem `user_id`**: no fluxo novo não deve ocorrer; a derivação ignora e não quebra. Documentado como assumption.
- **Divisão com resto**: as obrigações refletem exatamente os `share_cents`, então a soma das obrigações + parte do pagador fecha com o valor da despesa.
- **Concorrência**: criação de despesa é transacional; declaração/confirmação de obrigação já é idempotente e serializada no backend.
- **CORS/cookie**: mesma origem (frontend servido pelo próprio backend), então `credentials: "include"` basta; sem configuração CORS credencial adicional.

## Verificação

- Backend: testes de integração PostgreSQL para derivação (uma despesa gera as obrigações certas; pagador não vira devedor; resto correto; rollback em falha) e para o lookup por email (encontrado, não encontrado, sem email, sem sessão).
- Frontend: `node --check` nos JS + UAT manual no navegador cobrindo a jornada P1 completa.
- Gate: `npm test` (backend) verde; Verifier independente com sensor de mutação no código novo do backend.
