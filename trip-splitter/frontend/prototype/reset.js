// Reset de gastos do protótipo Trip Splitter (frontend-only).
//
// Regra de produto:
// - o reset apaga as despesas e obrigações da viagem;
// - só o owner da viagem pode resetar;
// - o reset é bloqueado se já houver qualquer pagamento concluído;
// - exige confirmação explícita (confirmed: true) antes de apagar.
//
// Sem backend: opera sobre o store simulado, apagando somente os dados da
// viagem informada. Escrito para o navegador e para passar em `node --check`.

(function (global) {
  "use strict";

  var Store = global.TripSplitterStore;
  var Trips = global.TripSplitterTrips;
  if (typeof require !== "undefined") {
    if (!Store) { try { Store = require("./store.js"); } catch (e) { Store = null; } }
    if (!Trips) { try { Trips = require("./trips.js"); } catch (e) { Trips = null; } }
  }

  var CONCLUIDO = "concluido";

  function hasCompletedPayment(state, tripId) {
    for (var i = 0; i < state.obligations.length; i++) {
      var o = state.obligations[i];
      if (o.tripId === tripId && o.estado === CONCLUIDO) return true;
    }
    return false;
  }

  function isOwnerInState(state, tripId, userId) {
    for (var i = 0; i < state.memberships.length; i++) {
      var m = state.memberships[i];
      if (m.tripId === tripId && m.userId === userId) {
        return m.papel === "owner";
      }
    }
    return false;
  }

  // Avalia se o reset é permitido, retornando motivo quando não for.
  function canReset(tripId, actorUserId) {
    var state = Store._getRawState();
    var trip = state.trips.filter(function (t) { return t.id === tripId; })[0];
    if (!trip) return { allowed: false, reason: "Viagem não encontrada." };
    if (!isOwnerInState(state, tripId, actorUserId)) {
      return { allowed: false, reason: "Apenas o dono da viagem pode resetar os gastos." };
    }
    if (hasCompletedPayment(state, tripId)) {
      return {
        allowed: false,
        reason: "Não é possível resetar: já existe pagamento concluído nesta viagem."
      };
    }
    return { allowed: true, reason: null };
  }

  // Executa o reset. Exige options.confirmed === true. Apaga apenas os dados
  // desta viagem, preservando as demais.
  function resetTripExpenses(tripId, actorUserId, options) {
    options = options || {};
    var check = canReset(tripId, actorUserId);
    if (!check.allowed) {
      throw new Error(check.reason);
    }
    if (options.confirmed !== true) {
      throw new Error("Confirme o reset antes de apagar os gastos.");
    }
    return Store.update(function (state) {
      var removedExpenses = 0;
      var removedObligations = 0;

      state.expenses = state.expenses.filter(function (e) {
        if (e.tripId === tripId) { removedExpenses++; return false; }
        return true;
      });
      state.obligations = state.obligations.filter(function (o) {
        if (o.tripId === tripId) { removedObligations++; return false; }
        return true;
      });

      return { tripId: tripId, removedExpenses: removedExpenses, removedObligations: removedObligations };
    });
  }

  var Reset = {
    canReset: canReset,
    resetTripExpenses: resetTripExpenses
  };

  global.TripSplitterReset = Reset;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Reset;
  }
})(typeof window !== "undefined" ? window : globalThis);
