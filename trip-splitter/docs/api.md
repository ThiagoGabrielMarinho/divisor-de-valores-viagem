# Contrato HTTP atual

**Base URL local:** `http://localhost:3000`  
**Prefixo da API:** `/api`  
**Formato:** JSON UTF-8  
**Moeda:** BRL  
**Valores:** inteiros em centavos (`amount_cents`, `share_cents`, `balance_cents`, `amount_cents` em settlement)

Este documento descreve o contrato implementado. Alterações de contrato devem nascer de uma feature spec e atualizar este arquivo, os testes de rota e a matriz de rastreabilidade.

## Convenções

- IDs são UUIDs gerados pelo backend.
- Datas são strings ISO 8601 UTC.
- Requests JSON inválidos ou campos ausentes podem resultar em erro de validação do service; a borda HTTP ainda não possui um schema validator dedicado.
- Erros de domínio são `{ "error": "mensagem" }`.
- Uma viagem inexistente retorna `404`.
- Erro sem status conhecido retorna `500` e é logado pelo backend.
- Não existe autenticação/autorização: possuir o ID permite consultar e alterar a viagem.
- Não há idempotency key; repetir um POST pode criar outro recurso.

## Endpoints

### Criar viagem

`POST /api/trips`

Request:

```json
{ "name": "Chapada 2026" }
```

Sucesso `201`:

```json
{
  "id": "uuid",
  "name": "Chapada 2026",
  "currency": "BRL",
  "created_at": "2026-09-18T12:00:00.000Z"
}
```

Nome vazio retorna `400` com `{ "error": "..." }`.

### Obter viagem

`GET /api/trips/:tripId`

Sucesso `200`:

```json
{
  "id": "uuid",
  "name": "Chapada 2026",
  "currency": "BRL",
  "created_at": "2026-09-18T12:00:00.000Z",
  "participants": [
    { "id": "uuid", "trip_id": "uuid", "name": "Ana" }
  ]
}
```

Viagem inexistente: `404`.

### Adicionar participante

`POST /api/trips/:tripId/participants`

Request:

```json
{ "name": "Ana" }
```

Sucesso `201`:

```json
{ "id": "uuid", "trip_id": "uuid", "name": "Ana" }
```

Nome vazio ou duplicado case-insensitive na viagem: `400`. Viagem inexistente: `404`.

### Registrar despesa

`POST /api/trips/:tripId/expenses`

Request:

```json
{
  "description": "Jantar",
  "amountCents": 10000,
  "paidBy": "participant-uuid",
  "splitAmong": ["participant-uuid", "other-participant-uuid"]
}
```

Sucesso `201`:

```json
{
  "id": "uuid",
  "trip_id": "trip-uuid",
  "description": "Jantar",
  "amount_cents": 10000,
  "paid_by": "participant-uuid",
  "created_at": "2026-09-18T12:00:00.000Z",
  "shares": [
    { "participant_id": "participant-uuid", "share_cents": 5000 },
    { "participant_id": "other-participant-uuid", "share_cents": 5000 }
  ]
}
```

O valor deve ser inteiro maior que zero. O pagador e todos os IDs de `splitAmong` devem pertencer à viagem. `splitAmong` não pode ser vazio. Falhas de regra retornam `400`; viagem inexistente retorna `404`.

A divisão é igualitária em centavos. Quando houver resto, cada centavo excedente vai para os primeiros participantes na ordem de `splitAmong`.

### Listar despesas

`GET /api/trips/:tripId/expenses`

Sucesso `200`: array de despesas no formato acima, com `shares`. A ordenação pretendida é cronológica reversa (`created_at` mais recente primeiro). A validação automatizada dedicada dessa garantia ainda está pendente conforme `validation.md`.

### Consultar saldos

`GET /api/trips/:tripId/balances`

Sucesso `200`:

```json
[
  {
    "participant_id": "uuid",
    "name": "Ana",
    "balance_cents": 2500
  }
]
```

Saldo positivo significa que a pessoa tem a receber; negativo significa que deve pagar. A soma dos saldos de uma viagem deve ser zero.

### Consultar quitação

`GET /api/trips/:tripId/settlements`

Sucesso `200`:

```json
[
  {
    "from": "debtor-uuid",
    "from_name": "Bruno",
    "to": "creditor-uuid",
    "to_name": "Ana",
    "amount_cents": 2500
  }
]
```

A lista é gerada pelo algoritmo guloso de maior devedor/maior credor. Ela deve zerar os saldos quando aplicada, mas não promete o mínimo matemático global em todos os casos.

## Frontend servido pelo backend

- `GET /` retorna `frontend/index.html` com status `200`.
- Arquivos estáticos são servidos pela raiz (`/app.js`, `/style.css`).
- Rotas não-API retornam o fallback do `index.html`.

## Mudanças de contrato

Uma mudança em request, response, status, unidade monetária, ordenação ou semântica de acesso exige:

1. definir ou atualizar a spec no caminho de artefatos decidido para a feature;
2. registrar decisões transversais no artefato de memória decidido para a tarefa, se aplicável;
3. atualizar este documento e `docs/data-model.md` quando necessário;
4. adicionar testes de contrato HTTP para o resultado exato;
5. rodar os gates da skill e obter validação independente antes de marcar a feature como concluída.

## Backend de conta compartilhada (implementado em evolução)

As rotas abaixo fazem parte do backend protegido da conta compartilhada. Elas usam sessão por cookie HttpOnly (`trip_session`) ou `Authorization: Bearer`.

| Método | Rota | Auth | Resultado |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | pública | Cria usuário, hash scrypt e sessão; 201. |
| POST | `/api/auth/login` | pública | Valida credenciais e cria sessão; 200/401. |
| POST | `/api/auth/logout` | sessão opcional | Revoga sessão e limpa cookie; 204. |
| GET | `/api/account/balances` | sessão | Resumo global com netting; 200. |
| GET | `/api/account/balances/:userId` | sessão | Detalhe do saldo com uma pessoa. |
| POST | `/api/trips` | sessão | Cria viagem e membership owner; 201. |
| GET | `/api/trips/:tripId` | membership | Viagem e participantes; 200/401/403/404. |
| POST | `/api/trips/:tripId/participants` | owner | Adiciona conta como member; 201/403. |
| POST | `/api/trips/:tripId/expenses` | membership | Registra despesa autorizada; 201/400/403. |
| GET | `/api/trips/:tripId/expenses` | membership | Lista despesas; 200. |
| GET | `/api/trips/:tripId/obligations` | membership | Lista obrigações; 200. |
| POST | `/api/trips/:tripId/obligations` | membership | Cria obrigação; 201. |
| POST | `/api/obligations/:obligationId/declare` | sessão | Devedor declara pagamento. |
| POST | `/api/obligations/:obligationId/confirm` | sessão | Recebedor confirma pagamento. |
| POST | `/api/obligations/:obligationId/reject` | sessão | Recebedor recusa declaração. |
| PATCH | `/api/obligations/:obligationId/deadline` | sessão | Recebedor define prazo. |
| POST | `/api/trips/:tripId/reset` | owner | Reset confirmado ou 409 se há concluído. |

O backend protege membership por middleware e não trata UUID da viagem como autorização suficiente. A senha nunca é persistida em texto: o hash é gerado com `crypto.scrypt` nesta etapa.
