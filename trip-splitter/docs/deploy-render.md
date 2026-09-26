# Deploy no Render

O Trip Splitter roda como **um único Web Service** que serve a API (`/api`) e o
frontend estático (a raiz `/`). O banco é o **PostgreSQL externo do Aiven** (já
existente) — o blueprint `render.yaml` não cria banco; você informa o
`DATABASE_URL` do Aiven no painel do Render.

## Pré-requisitos

- Repositório no GitHub/GitLab conectado ao Render.
- O `render.yaml` está na raiz do repo (`divisor-de-valores-viagem/render.yaml`).
- O código do projeto está em `trip-splitter/backend` (API) e `trip-splitter/frontend` (UI).

## Passo a passo (Blueprint)

1. No Render: **New > Blueprint** e selecione este repositório.
2. O Render lê o `render.yaml` e propõe criar o serviço **trip-splitter** (Web Service Node). Não cria banco.
3. Confirme. Como o `DATABASE_URL` está marcado `sync: false`, o Render vai pedir o valor: cole a **connection string do Aiven** (ex.: `postgres://avnadmin:...@...aivencloud.com:PORTA/defaultdb?sslmode=require`).
4. O Render define `NODE_ENV=production`. O build roda `npm install --include=dev && npm run build` em `trip-splitter/backend`; o start roda `npm start` (`node dist/index.js`).
5. No primeiro boot, `runMigrations()` aplica o schema idempotente (`backend/db/schema.sql`). Não é preciso rodar migração manual.
6. Ao ficar "Live", abra a URL pública do serviço: a tela de login já responde e persiste no Postgres.

## Como funciona em produção

- **Porta**: o backend usa `process.env.PORT` (o Render injeta). Sem configuração manual.
- **Banco/SSL**: `backend/src/db/index.ts` normaliza `sslmode=require` e conecta com SSL gerenciado (`rejectUnauthorized: false`), compatível com o Aiven. A connection string vem só do ambiente; nada é hardcoded.
- **Frontend**: `backend/src/app.ts` serve `trip-splitter/frontend` como estático e faz fallback para `index.html` em rotas não-API. Como `__dirname` em produção é `.../backend/dist`, o caminho relativo `../../frontend` resolve para `trip-splitter/frontend`.
- **Sessão**: o cookie `trip_session` é `HttpOnly; SameSite=Lax` e ganha `Secure` quando `NODE_ENV=production` (Render serve HTTPS). Frontend e API são a mesma origem, então não há CORS credencial a configurar.
- **Migração**: idempotente no boot; reaplicar não apaga dados.

## Deploys seguintes

Cada push na branch conectada dispara build + deploy automáticos. A migração de
boot reaplica o schema com segurança.

## Banco Aiven

- O banco continua sendo o **Aiven** (externo ao Render). O Render só recebe a connection string via `DATABASE_URL`.
- Use a connection string **com `?sslmode=require`**; o backend cuida do SSL gerenciado.
- Prefira a conta/rede que o Aiven permitir a conexões externas; se o Aiven tiver allowlist de IP, libere o acesso do Render (ou deixe aberto conforme sua política).
- A migração de boot é idempotente: apontar o Render para o mesmo Aiven que você já usou nos testes reaproveita o schema existente sem apagar dados.

## Notas

- Não commite `DATABASE_URL` nem `.env`; o `.env` é git-ignored e a credencial de produção fica só no painel do Render (`sync: false`).
- Rotacione a senha do Aiven que foi compartilhada durante o desenvolvimento antes de colocar em produção.
- Se preferir configurar manualmente (sem blueprint): crie um Web Service apontando **Root Directory** para `trip-splitter/backend`, com Build `npm install --include=dev && npm run build`, Start `npm start`, e as env vars `NODE_ENV=production` e `DATABASE_URL` (a connection string do Aiven).
- **Build com `NODE_ENV=production`**: use `npm install --include=dev` no build, senão o Render pula `typescript`/`ts-node` (devDependencies) e o `tsc` falha. O blueprint já faz isso.
