# Rachadinha — Divisor de Contas de Viagem em Grupo

MVP de app web para grupos dividirem gastos de viagem e descobrirem a forma mais simples de quitar as dívidas entre si. Moeda única (BRL), sem autenticação.

Construído seguindo metodologia **spec-driven** (Specify → Design → Tasks → Execute) — veja os documentos em `.specs/features/split-de-contas/`:
- `spec.md` — requisitos testáveis (R1-R9) e o que está fora de escopo
- `design.md` — modelos de dados, componentes e algoritmos
- `tasks.md` — tarefas atômicas, cada uma = 1 commit (veja `git log`)

## Como rodar

Requer **Node.js 22.13+** (usa o módulo `node:sqlite`, nativo do Node — sem dependências que precisem compilar, então não precisa de Visual Studio/build tools no Windows nem de Xcode no Mac). Rode `node -v` pra conferir a sua versão; se estiver abaixo de 22.13, atualize em https://nodejs.org.

```bash
npm run install:all   # instala as dependências do backend
npm start              # builda e sobe o servidor em http://localhost:3000
```

O frontend é servido pelo próprio backend — não precisa de um segundo processo.

## Como rodar os testes

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

- Backend: Node.js + TypeScript + Express + SQLite (`better-sqlite3`)
- Frontend: HTML/CSS/JS estático, sem build tool
- Testes: `node:test` (nativo do Node)

## Limitações conhecidas do MVP (ver "fora de escopo" em spec.md)

- Uma moeda só, sem conversão.
- Divisão sempre igualitária (sem valores/percentuais desiguais).
- Sem edição/exclusão de despesa após criada.
- Sem autenticação — quem tem o código da viagem, acessa e edita.
