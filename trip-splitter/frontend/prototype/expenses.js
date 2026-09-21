// Despesas e obrigações do protótipo Trip Splitter (frontend-only).
//
// Registra uma despesa na viagem e deriva as obrigações: cada participante que
// não pagou passa a dever sua parte a quem pagou. Divisão igualitária em
// centavos, com o resto distribuído aos primeiros participantes na ordem
// enviada (mesma regra do produto original).
//
// Sem backend: opera sobre o store simulado. Escrito para o navegador e para
// passar em `node --check`.

(function (global) {
  "use strict";

  var Store = global.TripSplitterStore;
  var Trips = global.TripSplitterTrips;
  if (typeof require !== "undefined") {
    if (!Store) { try { Store = require("./store.js"); } catch (e) { Store = null; } }
    if (!Trips) { try { Trips = require("./trips.js"); } catch (e) { Trips = null; } }
  }

  // Divisão igualitária: base inteira e resto (1 centavo) aos primeiros da lista.
  function splitEqually(amountCents, participantIds) {
    var n = participantIds.length;
    var base = Math.floor(amountCents / n);
    var remainder = amountCents - base * n;
    var shares = {};
    for (var i = 0; i < n; i++) {
      shares[participantIds[i]] = base + (i < remainder ? 1 : 0);
    }
    return shares;
  }

  // Registra a despesa e cria as obrigações derivadas, tudo numa operação.
  function addExpense(tripId, actorUserId, input) {
    input = input || {};
    var descricao = String(input.descricao || "").trim();
    var valorCents = input.valorCents;
    var pagoPorUserId = input.pagoPorUserId;
    var participantesUserIds = input.participantesUserIds || [];

    if (!descricao) throw new Error("Informe uma descrição para a despesa.");
    if (!Number.isInteger(valorCents) || valorCents <= 0) {
      throw new Error("O valor da despesa deve ser maior que zero.");
    }
    if (!participantesUserIds.length) {
      throw new Error("Selecione ao menos um participante para dividir a despesa.");
    }

    return Store.update(function (state) {
      var trip = state.trips.filter(function (t) { return t.id === tripId; })[0];
      if (!trip) throw new Error("Viagem não encontrada.");
      if (!isMemberInState(state, tripId, actorUserId)) {
        throw new Error("Você não participa desta viagem.");
      }
      if (!isMemberInState(state, tripId, pagoPorUserId)) {
        throw new Error("Quem pagou precisa ser um membro da viagem.");
      }
      for (var i = 0; i < participantesUserIds.length; i++) {
        if (!isMemberInState(state, tripId, participantesUserIds[i])) {
          throw new Error("Todos os participantes da divisão precisam ser membros da viagem.");
        }
      }

      var expense = {
        id: Store.generateId("exp"),
        tripId: tripId,
        descricao: descricao,
        valorCents: valorCents,
        pagoPorUserId: pagoPorUserId,
        participantesUserIds: participantesUserIds.slice(),
        createdAt: Store.nowIso()
      };
      state.expenses.push(expense);

      // Deriva obrigações: cada devedor (participante != pagador) deve sua parte.
      var shares = splitEqually(valorCents, participantesUserIds);
      for (var j = 0; j < participantesUserIds.length; j++) {
        var uid = participantesUserIds[j];
        if (uid === pagoPorUserId) continue;
        var valor = shares[uid];
        if (valor <= 0) continue;
        state.obligations.push({
          id: Store.generateId("obl"),
          tripId: tripId,
          expenseId: expense.id,
          deUserId: uid, // deve
          paraUserId: pagoPorUserId, // recebe
          valorCents: valor,
          prazo: null,
          estado: "pendente"
        });
      }

      return publicExpense(expense);
    });
  }

  function isMemberInState(state, tripId, userId) {
    for (var i = 0; i < state.memberships.length; i++) {
      var m = state.memberships[i];
      if (m.tripId === tripId && m.userId === userId) return true;
    }
    return false;
  }

  // Lista despesas de uma viagem, mais recentes primeiro, só para membros.
  function listExpenses(tripId, actorUserId) {
    var state = Store._getRawState();
    if (!isMemberInState(state, tripId, actorUserId)) {
      throw new Error("Esta viagem não está disponível para você.");
    }
    return state.expenses
      .filter(function (e) { return e.tripId === tripId; })
      .slice()
      .sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0; })
      .map(publicExpense);
  }

  // Obrigações de uma viagem (todas ou filtradas por estado).
  function listObligations(tripId, actorUserId) {
    var state = Store._getRawState();
    if (!isMemberInState(state, tripId, actorUserId)) {
      throw new Error("Esta viagem não está disponível para você.");
    }
    return state.obligations
      .filter(function (o) { return o.tripId === tripId; })
      .map(publicObligation);
  }

  function publicExpense(e) {
    return {
      id: e.id,
      tripId: e.tripId,
      descricao: e.descricao,
      valorCents: e.valorCents,
      pagoPorUserId: e.pagoPorUserId,
      participantesUserIds: e.participantesUserIds.slice(),
      createdAt: e.createdAt
    };
  }

  function publicObligation(o) {
    return {
      id: o.id,
      tripId: o.tripId,
      expenseId: o.expenseId,
      deUserId: o.deUserId,
      paraUserId: o.paraUserId,
      valorCents: o.valorCents,
      prazo: o.prazo,
      estado: o.estado
    };
  }

  var Expenses = {
    splitEqually: splitEqually,
    addExpense: addExpense,
    listExpenses: listExpenses,
    listObligations: listObligations
  };

  global.TripSplitterExpenses = Expenses;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Expenses;
  }
})(typeof window !== "undefined" ? window : globalThis);
