# Rachadinha — Divisor de Contas de Viagem em Grupo

MVP de app web para grupos dividirem gastos de viagem e descobrirem a forma mais simples de quitar as dívidas entre si. Moeda única (BRL), sem autenticação.

Construído seguindo metodologia **spec-driven** (Specify → Design → Tasks → Execute) — veja os documentos em `.specs/features/split-de-contas/`:
- `spec.md` — requisitos testáveis (R1-R9) e o que está fora de escopo
- `design.md` — modelos de dados, componentes e algoritmos
- `tasks.md` — tarefas atômicas, cada uma = 1 commit (veja `git log`)

## Como rodar localmente

Requer **Node.js 18+** e um Postgres acessível (local via Docker, ou um banco gerenciado como o do Render/Neon/Supabase).

```bash
npm run install:all         # instala as dependências do backend
cp backend/.env.example backend/.env
# edite backend/.env e preencha DATABASE_URL com a connection string do seu Postgres
npm start                    # builda, aplica as tabelas (migração idempotente) e sobe o servidor em http://localhost:3000
```

O frontend é servido pelo próprio backend — não precisa de um segundo processo.

Não há um passo manual separado de "criar as tabelas": o servidor roda `db/migrate.ts` (CREATE TABLE IF NOT EXISTS) automaticamente antes de aceitar tráfego. Se preferir aplicar manualmente, `npm run db:migrate`.

## Deploy no Render

1. Crie um Postgres no Render e copie a connection string (Internal Database URL, se o Web Service estiver na mesma região).
2. Crie o Web Service apontando para este repo, com:
   - Build Command: `npm run install:all && npm run build`
   - Start Command: `cd backend && npm start`
3. Em Environment, defina `DATABASE_URL` com a string do passo 1.
4. No primeiro boot, o servidor já cria as tabelas automaticamente.

## Como rodar os testes

Os testes rodam contra o Postgres apontado por `DATABASE_URL` (mesmo `.env` do passo acima) — cada teste cria sua própria viagem com ID aleatório, então é seguro rodar contra um banco já em uso.

```bash
npm test
```

Cobre os requisitos R2, R4, R5, R6 e R8 (matriz de cobertura em `design.md`).

## Como usar

1. Abra `http://localhost:3000`, crie uma viagem (dá um código/ID).
2. Adicione os participantes.
3. Registre as despesas — quem pagou e entre quem divide (por padrão, entre todos).
4. Veja os saldos de cada um e a lista de "quem paga quem" pra fechar a conta com o menor número de transferências possível.
5. Guarde o código da viagem (botão "copiar") pra reabrir depois ou compartilhar com o grupo.

## Stack

- Backend: Node.js + TypeScript + Express + PostgreSQL (via `drizzle-orm` + `pg`)
- Frontend: HTML/CSS/JS estático, sem build tool
- Testes: `node:test` (nativo do Node)

## Limitações conhecidas do MVP (ver "fora de escopo" em spec.md)

- Uma moeda só, sem conversão.
- Divisão sempre igualitária (sem valores/percentuais desiguais).
- Sem edição/exclusão de despesa após criada.
- Sem autenticação — quem tem o código da viagem, acessa e edita.
