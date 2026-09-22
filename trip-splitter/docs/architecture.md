# Arquitetura atual

**Status:** referência do sistema implementado em 2026-09-18  
**Escopo:** arquitetura permanente do produto; requisitos e artefatos específicos são definidos no contexto de cada tarefa.

## Visão geral

O Trip Splitter é um monólito web pequeno: o navegador consome uma API Express e o mesmo processo serve os arquivos estáticos do frontend. Os services concentram as regras de negócio e o PostgreSQL é acessado por Drizzle ORM.

```text
[Browser]
    │ fetch /api/*
    ▼
[Express: backend/src/index.ts]
    ├── /api → routes/trips.ts
    ├── / → frontend/index.html, app.js, style.css
    ▼
[Services]
    ├── tripService       viagens e participantes
    ├── expenseService    despesas e divisão igualitária
    └── balanceService    saldos e quitação gulosa
    ▼
[Drizzle ORM]
    ▼
[PostgreSQL]
```

## Entrypoints e responsabilidades

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Bootstrap HTTP | `backend/src/index.ts` | Configura Express, CORS, JSON, rotas, arquivos estáticos, fallback SPA, migração no boot e `listen`. |
| HTTP | `backend/src/routes/trips.ts` | Traduz requests para chamadas de service e erros tipados para respostas HTTP. Não deve conter regra financeira. |
| Domínio de viagens | `backend/src/services/tripService.ts` | Cria viagens, busca viagem, lista participantes e rejeita nomes duplicados sem diferenciar maiúsculas/minúsculas. |
| Domínio de despesas | `backend/src/services/expenseService.ts` | Valida despesa, divide centavos, grava despesa e rateios em uma transação e lista por data decrescente. |
| Domínio financeiro | `backend/src/services/balanceService.ts` | Calcula `pago - consumido` e gera transferências pelo algoritmo guloso. |
| Persistência | `backend/src/db/index.ts`, `schema.ts`, `migrate.ts` | Pool PostgreSQL, schema Drizzle e DDL idempotente executado no boot. |
| Contratos | `backend/src/types.ts` | Tipos de domínio, erros `ValidationError` (400), `NotFoundError` (404) e respostas financeiras. |
| UI | `frontend/index.html`, `app.js`, `style.css` | Página estática em português, estado da viagem no navegador e renderização das respostas da API. |

## Fluxos principais

### Inicialização

1. `backend/src/index.ts` importa `runMigrations`.
2. `runMigrations()` executa o DDL idempotente em `backend/src/db/migrate.ts`.
3. Se a conexão ou migração falhar, o processo registra o erro e encerra sem aceitar tráfego.
4. Após sucesso, Express começa a escutar `PORT` ou `3000`.

### Criar e abrir viagem

1. A UI envia `POST /api/trips` com `{ "name": string }`.
2. `tripService.createTrip` normaliza o nome, gera UUID, fixa `BRL` e persiste.
3. A UI guarda apenas o UUID em `localStorage` (`currentTripId`).
4. Ao abrir, `GET /api/trips/:tripId` devolve a viagem e os participantes.

### Registrar despesa e recalcular resumo

1. A UI envia descrição, valor inteiro em centavos, pagador e IDs selecionados.
2. `expenseService` verifica existência da viagem e pertencimento dos participantes.
3. `splitEqually` calcula a base inteira e distribui o resto aos primeiros IDs na ordem recebida.
4. Despesa e `expense_shares` são inseridos na mesma transação.
5. A UI recarrega despesas, saldos e quitação com `Promise.all`.

### Calcular quitação

1. `balanceService.getBalances` agrega valores pagos e consumidos por participante.
2. O saldo é `total_pago - total_consumido`; positivo significa a receber e negativo significa pagar.
3. `getSettlements` ordena credores e devedores por magnitude e casa os maiores até zerar os saldos.
4. O algoritmo é determinístico para a mesma ordem de entrada, mas é guloso: não promete o mínimo teórico absoluto de transferências.

## Invariantes arquiteturais

- Valores monetários são inteiros em centavos; não usar `float` em contratos de domínio ou persistência.
- A moeda atual é `BRL` e não há conversão.
- O prefixo público da API é `/api`; o frontend usa caminhos relativos para funcionar localmente e em deploy.
- A camada de rota é fina; validação de negócio pertence aos services.
- A criação de despesa deve manter despesa e rateios atômicos.
- Cada nova feature deve ter requisitos e artefatos de validação definidos no próprio contexto da tarefa, antes da implementação proporcional ao seu tamanho.
- Decisões transversais e decisões específicas devem ficar nos artefatos explicitamente definidos para aquela tarefa; não há um diretório padrão de specs neste repositório.

## Limitações conhecidas

- Não há autenticação, autorização, rate limiting ou isolamento por usuário; o UUID funciona como segredo de acesso no MVP.
- CORS está aberto.
- O SSL remoto usa `rejectUnauthorized: false`; isso é uma decisão provisória de MVP e precisa ser revista antes de um cenário de segurança mais exigente.
- `migrate.ts` usa DDL `CREATE TABLE IF NOT EXISTS`, sem histórico versionado ou rollback.
- A unicidade case-insensitive de participantes é garantida no service por consulta seguida de insert, sem constraint única equivalente no banco; concorrência pode expor uma corrida.
- Não há testes automatizados HTTP ou frontend no estado atual; a evidência de cada feature deve ser registrada no caminho de validação definido para ela.

## Aplicação do tlc-spec-driven

O processo usa as referências em `.kiro/references/` e os scripts em `.kiro/scripts/`: Specify → Discuss quando houver ambiguidade → Design para mudanças grandes/complexas → Tasks para decomposição → Execute com gate por tarefa → Verifier independente. Este documento é contexto arquitetural; não substitui requisitos verificáveis.

## Backend de conta compartilhada

A evolução adicionou autenticação e autorização ao monólito sem criar outro serviço:

```text
Auth routes → authService (scrypt + sessions)
                     ↓
              auth middleware (401)
                     ↓
Trip routes → membership authorization (403)
                     ↓
expenseService / obligationService / resetService / globalBalanceService
                     ↓
                  PostgreSQL
```

A sessão usa token opaco: o token é entregue no cookie HttpOnly ou Bearer ao cliente, mas somente seu hash é persistido em `sessions`. Obrigações são persistidas separadas da projeção de saldo; confirmação do recebedor é a transição que marca `concluido`. O resumo global agrega obrigações pendentes por identidade e aplica netting.
