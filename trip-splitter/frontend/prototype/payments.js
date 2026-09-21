// Pagamento em duas etapas do protótipo Trip Splitter (frontend-only).
//
// Regra de produto:
// - o devedor declara "paguei"      -> pendente -> aguardando_confirmacao
// - o recebedor confirma recebimento -> aguardando_confirmacao -> concluido
// - o recebedor recusa a declaração  -> aguardando_confirmacao -> pendente
// A confirmação do recebedor é o único caminho que conclui o pagamento e o tira
// do saldo pendente. Sem backend: opera sobre o store simulado.

(function (global) {
  "use strict";

  var Store = global.TripSplitterStore;
  if (!Store && typeof require !== "undefined") {
    try { Store = require("./store.js"); } catch (e) { Store = null; }
  }

  var ESTADOS = {
    PENDENTE: "pendente",
    AGUARDANDO: "aguardando_confirmacao",
    CONCLUIDO: "concluido"
  };

  function findObligation(state, obligationId) {
    for (var i = 0; i < state.obligations.length; i++) {
      if (state.obligations[i].id === obligationId) return state.obligations[i];
    }
    return null;
  }

  // Devedor declara que pagou. Só o próprio devedor pode declarar, e só a partir
  // de pendente.
  function declarePayment(obligationId, actorUserId) {
    return Store.update(function (state) {
      var o = findObligation(state, obligationId);
      if (!o) throw new Error("Obrigação não encontrada.");
      if (o.deUserId !== actorUserId) {
        throw new Error("Apenas quem deve pode declarar o pagamento.");
      }
      if (o.estado !== ESTADOS.PENDENTE) {
        throw new Error("Só é possível declarar pagamento de uma obrigação pendente.");
      }
      o.estado = ESTADOS.AGUARDANDO;
      return publicObligation(o);
    });
  }

  // Recebedor confirma o recebimento. Só o recebedor, e só a partir de
  // aguardando_confirmacao.
  function confirmReceipt(obligationId, actorUserId) {
    return Store.update(function (state) {
      var o = findObligation(state, obligationId);
      if (!o) throw new Error("Obrigação não encontrada.");
      if (o.paraUserId !== actorUserId) {
        throw new Error("Apenas quem tem a receber pode confirmar o pagamento.");
      }
      if (o.estado !== ESTADOS.AGUARDANDO) {
        throw new Error("Só é possível confirmar um pagamento que foi declarado.");
      }
      o.estado = ESTADOS.CONCLUIDO;
      o.confirmadoEm = Store.nowIso();
      return publicObligation(o);
    });
  }

  // Recebedor recusa a declaração e a obrigação volta a pendente.
  function rejectDeclaration(obligationId, actorUserId) {
    return Store.update(function (state) {
      var o = findObligation(state, obligationId);
      if (!o) throw new Error("Obrigação não encontrada.");
      if (o.paraUserId !== actorUserId) {
        throw new Error("Apenas quem tem a receber pode recusar a declaração.");
      }
      if (o.estado !== ESTADOS.AGUARDANDO) {
        throw new Error("Só é possível recusar uma declaração aguardando confirmação.");
      }
      o.estado = ESTADOS.PENDENTE;
      return publicObligation(o);
    });
  }

  // Saldo pendente entre o usuário e cada pessoa, ignorando obrigações concluídas.
  // Retorna centavos: positivo = usuário tem a receber; negativo = usuário deve.
  function pendingBalanceForUser(userId, tripId) {
    var state = Store._getRawState();
    var byPerson = {};
    for (var i = 0; i < state.obligations.length; i++) {
      var o = state.obligations[i];
      if (tripId && o.tripId !== tripId) continue;
      if (o.estado === ESTADOS.CONCLUIDO) continue; // concluído sai do pendente
      if (o.paraUserId === userId) {
        byPerson[o.deUserId] = (byPerson[o.deUserId] || 0) + o.valorCents;
      } else if (o.deUserId === userId) {
        byPerson[o.paraUserId] = (byPerson[o.paraUserId] || 0) - o.valorCents;
      }
    }
    return byPerson;
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
      estado: o.estado,
      confirmadoEm: o.confirmadoEm || null
    };
  }

  var Payments = {
    ESTADOS: ESTADOS,
    declarePayment: declarePayment,
    confirmReceipt: confirmReceipt,
    rejectDeclaration: rejectDeclaration,
    pendingBalanceForUser: pendingBalanceForUser
  };

  global.TripSplitterPayments = Payments;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Payments;
  }
})(typeof window !== "undefined" ? window : globalThis);
