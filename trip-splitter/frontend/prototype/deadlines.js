// Prazos por obrigação do protótipo Trip Splitter (frontend-only).
//
// Regra de produto: quem tem a receber (o credor da obrigação) define o prazo.
// O status temporal é derivado de uma data de referência simulada:
// - "sem_prazo": obrigação sem prazo definido
// - "concluido": pagamento já confirmado (tempo não se aplica)
// - "no_prazo": não concluída e a referência é anterior ou igual ao prazo
// - "atrasado": não concluída e a referência é posterior ao prazo
//
// O prazo é uma data no formato YYYY-MM-DD. A comparação é feita por dia.

(function (global) {
  "use strict";

  var Store = global.TripSplitterStore;
  if (!Store && typeof require !== "undefined") {
    try { Store = require("./store.js"); } catch (e) { Store = null; }
  }

  var CONCLUIDO = "concluido";

  function findObligation(state, obligationId) {
    for (var i = 0; i < state.obligations.length; i++) {
      if (state.obligations[i].id === obligationId) return state.obligations[i];
    }
    return null;
  }

  function isValidDateString(value) {
    if (typeof value !== "string") return false;
    // Aceita apenas YYYY-MM-DD e confirma que é uma data real.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var d = new Date(value + "T00:00:00Z");
    return !isNaN(d.getTime());
  }

  // Só o recebedor (paraUserId) define o prazo da obrigação.
  function setDeadline(obligationId, actorUserId, dateString) {
    if (!isValidDateString(dateString)) {
      throw new Error("Informe uma data de prazo válida (AAAA-MM-DD).");
    }
    return Store.update(function (state) {
      var o = findObligation(state, obligationId);
      if (!o) throw new Error("Obrigação não encontrada.");
      if (o.paraUserId !== actorUserId) {
        throw new Error("Apenas quem tem a receber pode definir o prazo.");
      }
      o.prazo = dateString;
      return { id: o.id, prazo: o.prazo };
    });
  }

  function clearDeadline(obligationId, actorUserId) {
    return Store.update(function (state) {
      var o = findObligation(state, obligationId);
      if (!o) throw new Error("Obrigação não encontrada.");
      if (o.paraUserId !== actorUserId) {
        throw new Error("Apenas quem tem a receber pode alterar o prazo.");
      }
      o.prazo = null;
      return { id: o.id, prazo: null };
    });
  }

  // Data de referência: usa a definida no store (simulada) ou a data de hoje.
  function referenceDate() {
    var state = Store._getRawState();
    var ref = state.referenceDate;
    if (isValidDateString(ref)) return ref;
    // Sem referência simulada: usa a data atual no formato YYYY-MM-DD.
    return new Date().toISOString().slice(0, 10);
  }

  function setReferenceDate(dateString) {
    if (dateString !== null && !isValidDateString(dateString)) {
      throw new Error("Data de referência inválida.");
    }
    return Store.update(function (state) {
      state.referenceDate = dateString;
      return state.referenceDate;
    });
  }

  // Deriva o status temporal de uma obrigação (objeto público ou do store).
  function deadlineStatus(obligation, refDate) {
    if (!obligation) return "sem_prazo";
    if (obligation.estado === CONCLUIDO) return CONCLUIDO;
    if (!obligation.prazo) return "sem_prazo";
    var ref = isValidDateString(refDate) ? refDate : referenceDate();
    // Comparação lexicográfica funciona para YYYY-MM-DD.
    return ref > obligation.prazo ? "atrasado" : "no_prazo";
  }

  var Deadlines = {
    setDeadline: setDeadline,
    clearDeadline: clearDeadline,
    referenceDate: referenceDate,
    setReferenceDate: setReferenceDate,
    deadlineStatus: deadlineStatus,
    isValidDateString: isValidDateString
  };

  global.TripSplitterDeadlines = Deadlines;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Deadlines;
  }
})(typeof window !== "undefined" ? window : globalThis);
