# Spec: Divisor de Contas de Viagem em Grupo

## Contexto
App web para grupos de amigos registrarem gastos de uma viagem e descobrirem quem deve pagar quem, minimizando o número de transações necessárias para quitar as dívidas. MVP: moeda única (sem conversão).

## Requisitos

| ID | Requisito | Critério de aceite |
|----|-----------|---------------------|
| R1 | Criar uma viagem | Dado um nome de viagem, o sistema cria a viagem e retorna um ID único. |
| R2 | Adicionar participantes | Dado o ID da viagem e um nome, o participante é adicionado à viagem. Nomes duplicados na mesma viagem são rejeitados (400). |
| R3 | Registrar uma despesa | Dado descrição, valor (> 0), quem pagou e a lista de participantes que dividem a despesa, o sistema cria a despesa vinculada à viagem. |
| R4 | Divisão igualitária automática | Toda despesa é dividida em partes iguais entre os participantes selecionados em `split_among`. Se o valor não for divisível exatamente, o resto (centavos) é distribuído aos primeiros participantes da lista, na ordem em que aparecem, um centavo a mais cada, até zerar o resto. |
| R5 | Calcular saldo por participante | Saldo = total pago − total consumido (sua parte em cada despesa que participou). Saldo positivo = a receber; negativo = a pagar. A soma de todos os saldos de uma viagem deve ser sempre 0 (± arredondamento de centavos). |
| R6 | Simplificar dívidas (settle-up) | O sistema gera a lista mínima de transações (quem paga quanto para quem) que zera todos os saldos, usando algoritmo guloso (maior credor recebe do maior devedor, repetidamente). |
| R7 | Listar despesas de uma viagem | Retorna todas as despesas em ordem cronológica reversa (mais recente primeiro). |
| R8 | Validação de despesa | Rejeitar (400) despesa se: valor ≤ 0, pagador não é participante da viagem, `split_among` vazio, ou algum ID em `split_among` não é participante da viagem. |
| R9 | Visualizar viagem completa | A UI mostra: nome da viagem, participantes, lista de despesas, saldo de cada participante e a lista de transações de quitação. |

## Fora de escopo (explicitamente não implementado neste MVP)
- Múltiplas moedas / conversão de câmbio.
- Autenticação/login de usuários.
- Divisão por valores desiguais ou por percentual (só divisão igualitária no MVP).
- Edição/exclusão de despesas após criadas.
- Notificações (email/push) de cobrança.
- Anexar comprovantes/fotos de recibo.
- Múltiplas viagens simultâneas na mesma tela (a UI opera uma viagem por vez, buscada por ID).

## Notas de design (para a fase Design)
- Persistência: SQLite local (arquivo), sem necessidade de servidor de banco externo.
- Stack: Node.js + TypeScript + Express no backend; HTML/CSS/JS estático no frontend, servido pelo próprio backend.
