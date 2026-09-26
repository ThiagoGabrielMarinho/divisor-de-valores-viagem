# Deploy no Render

O Trip Splitter roda como **um único Web Service** que serve a API (`/api`) e o
frontend estático (a raiz `/`), mais um **PostgreSQL gerenciado**. O blueprint
`render.yaml` (na raiz do repositório) já descreve os dois.

## Pré-requisitos

- Repositório no GitHub/GitLab conectado ao Render.
- O `render.yaml` está na raiz do repo (`divisor-de-valores-viagem/render.yaml`).
- O código do projeto está em `trip-splitter/backend` (API) e `trip-splitter/frontend` (UI).

## Passo a passo (Blueprint)

1. No Render: **New > Blueprint** e selecione este repositório.
2. O Render lê o `render.yaml` e propõe criar:
   - **trip-splitter-db** — PostgreSQL gerenciado (plano free).
   - **trip-splitter** — Web Service Node.
3. Confirme. O Render vai:
   - criar o banco e expor a connection string;
   - injetar `DATABASE_URL` no serviço web automaticamente (via `fromDatabase`);
   - definir `NODE_ENV=production`.
4. O build roda `npm install && npm run build` em `trip-splitter/backend`; o start roda `npm start` (`node dist/index.js`).
5. No primeiro boot, `runMigrations()` aplica o schema idempotente (`backend/db/schema.sql`). Não é preciso rodar migração manual.
6. Ao ficar "Live", abra a URL pública do serviço: a tela de login já responde e persiste no Postgres.

## Como funciona em produção

- **Porta**: o backend usa `process.env.PORT` (o Render injeta). Sem configuração manual.
- **Banco/SSL**: `backend/src/db/index.ts` normaliza `sslmode=require` e conecta com SSL gerenciado (`rejectUnauthorized: false`), compatível com o Postgres do Render. A connection string vem só do ambiente; nada é hardcoded.
- **Frontend**: `backend/src/app.ts` serve `trip-splitter/frontend` como estático e faz fallback para `index.html` em rotas não-API. Como `__dirname` em produção é `.../backend/dist`, o caminho relativo `../../frontend` resolve para `trip-splitter/frontend`.
- **Sessão**: o cookie `trip_session` é `HttpOnly; SameSite=Lax` e ganha `Secure` quando `NODE_ENV=production` (Render serve HTTPS). Frontend e API são a mesma origem, então não há CORS credencial a configurar.
- **Migração**: idempotente no boot; reaplicar não apaga dados.

## Deploys seguintes

Cada push na branch conectada dispara build + deploy automáticos. A migração de
boot reaplica o schema com segurança.

## Notas

- Plano free do Postgres tem limites e expira após um período; para uso contínuo, avalie um plano pago.
- Não commite `DATABASE_URL` nem `.env`; o `.env` é git-ignored e as credenciais de produção vêm do Render.
- Se preferir configurar manualmente (sem blueprint): crie o Postgres, crie um Web Service apontando **Root Directory** para `trip-splitter/backend`, com Build `npm install --include=dev && npm run build`, Start `npm start`, e as env vars `NODE_ENV=production` e `DATABASE_URL` (Internal Connection String do banco).
- **Build com `NODE_ENV=production`**: use `npm install --include=dev` no build, senão o Render pula `typescript`/`ts-node` (devDependencies) e o `tsc` falha. O blueprint já faz isso.
