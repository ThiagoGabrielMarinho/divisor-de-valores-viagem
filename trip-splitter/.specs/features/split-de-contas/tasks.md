# Tasks: Divisor de Contas de Viagem em Grupo

| # | Tarefa | Depende de | Requisitos | Status |
|---|--------|-----------|------------|--------|
| T1 | Setup do projeto (package.json, tsconfig, deps: express, better-sqlite3, cors) | - | - | done |
| T2 | Schema SQLite + inicialização do DB | T1 | - | done |
| T3 | tripService (create/get trip, add participant, validação de duplicidade) | T2 | R1, R2 | done |
| T4 | expenseService (add/list expense, algoritmo de divisão) | T3 | R3, R4, R7, R8 | done |
| T5 | balanceService (saldos + settle-up guloso) | T4 | R5, R6 | done |
| T6 | Rotas Express expondo os services | T3, T4, T5 | R1-R9 | done |
| T7 | Testes automatizados da coverage matrix | T6 | R2, R4, R5, R6, R8 | done |
| T8 | Frontend estático (HTML/CSS/JS) consumindo a API | T6 | R9 | done |
| T9 | Servir frontend estático pelo Express + script npm start | T8 | - | done |

Cada tarefa = 1 commit atômico, feito após os testes/gate correspondentes passarem.

## Verificação final (independente da implementação)
- `npm run build`: compila sem erros.
- `npm test`: 7/7 testes passando (R2, R4, R5, R6, R8).
- Smoke test end-to-end via curl: criação de viagem, participantes, 2 despesas, saldos somando 0, settle-up com 2 transações corretas, validação retornando 400, frontend estático servido em `/` com 200. Todos OK.

