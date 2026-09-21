// Resumo global com netting do protótipo Trip Splitter (frontend-only).
//
// Consolida, para o usuário logado, quanto ele deve ou tem a receber de cada
// pessoa considerando TODAS as viagens em que participa. Aplica netting: se o
// usuário deve e tem a receber da mesma pessoa, mostra apenas o líquido.
// Obrigações concluídas são ignoradas no cálculo de pendência.
//
// Convenção do valor líquido (em centavos):
//   positivo  -> a outra pessoa deve ao usuário (usuário tem a receber)
//   negativo  -> o usuário deve à outra pessoa
//   zero      -> quites (não aparece no resumo)
//
// Sem backend: opera sobre o store simulado.

(function (global) {
  "use strict";

  var Store = global.TripSplitterStore;
  if (!Store && typeof require !== "undefined") {
    try { Store = require("./store.js"); } catch (e) { Store = null; }
  }

  var CONCLUIDO = "concluido";

  function userTripIds(state, userId) {
    var ids = {};
    for (var i = 0; i < state.memberships.length; i++) {
      if (state.memberships[i].userId === userId) {
        ids[state.memberships[i].tripId] = true;
      }
    }
    return ids;
  }

  function userName(state, userId) {
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].id === userId) return state.users[i].nome;
    }
    return "(desconhecido)";
  }

  function tripName(state, tripId) {
    for (var i = 0; i < state.trips.length; i++) {
      if (state.trips[i].id === tripId) return state.trips[i].nome;
    }
    return "(viagem)";
  }

  // Resumo por pessoa com valor líquido (netting) e detalhamento por obrigação.
  function globalSummaryForUser(userId) {
    var state = Store._getRawState();
    var myTrips = userTripIds(state, userId);
    var byPerson = {}; // otherUserId -> { net, details: [] }

    for (var i = 0; i < state.obligations.length; i++) {
      var o = state.obligations[i];
      if (!myTrips[o.tripId]) continue; // só viagens do usuário
      if (o.estado === CONCLUIDO) continue; // concluído sai do pendente

      var other = null;
      var signed = 0;
      if (o.paraUserId === userId) {
        other = o.deUserId; // a outra pessoa deve ao usuário
        signed = o.valorCents; // positivo
      } else if (o.deUserId === userId) {
        other = o.paraUserId; // o usuário deve à outra pessoa
        signed = -o.valorCents; // negativo
      } else {
        continue; // obrigação de terceiros
      }

      if (!byPerson[other]) {
        byPerson[other] = { net: 0, details: [] };
      }
      byPerson[other].net += signed;
      byPerson[other].details.push({
        obligationId: o.id,
        tripId: o.tripId,
        tripNome: tripName(state, o.tripId),
        valorCents: o.valorCents,
        direcao: signed > 0 ? "a_receber" : "a_pagar",
        estado: o.estado,
        prazo: o.prazo
      });
    }

    var result = [];
    for (var otherId in byPerson) {
      if (!Object.prototype.hasOwnProperty.call(byPerson, otherId)) continue;
      var entry = byPerson[otherId];
      if (entry.net === 0) continue; // quites após netting: não aparece
      result.push({
        pessoaUserId: otherId,
        pessoaNome: userName(state, otherId),
        valorLiquidoCents: entry.net,
        direcao: entry.net > 0 ? "a_receber" : "a_pagar",
        detalhes: entry.details
      });
    }

    // Ordena por magnitude decrescente para destacar as maiores pendências.
    result.sort(function (a, b) {
      return Math.abs(b.valorLiquidoCents) - Math.abs(a.valorLiquidoCents);
    });
    return result;
  }

  // Detalhamento por pessoa (usado no drill-down da UI).
  function detailsForPerson(userId, otherUserId) {
    var all = globalSummaryForUser(userId);
    for (var i = 0; i < all.length; i++) {
      if (all[i].pessoaUserId === otherUserId) return all[i];
    }
    return null;
  }

  var Summary = {
    globalSummaryForUser: globalSummaryForUser,
    detailsForPerson: detailsForPerson
  };

  global.TripSplitterSummary = Summary;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Summary;
  }
})(typeof window !== "undefined" ? window : globalThis);
