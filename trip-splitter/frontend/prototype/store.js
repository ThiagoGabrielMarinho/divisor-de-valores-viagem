// Store simulado do protótipo Trip Splitter (frontend-only).
//
// Não há backend nem API: todo o estado vive no navegador. O estado é mantido
// em memória e espelhado em localStorage para sobreviver a um reload. Quando o
// localStorage não estiver disponível ou estiver corrompido, o store reinicia
// com um estado vazio e sinaliza isso para a UI avisar o usuário.
//
// Este arquivo é escrito para rodar no navegador e também passar em
// `node --check` (sem dependências e sem APIs exclusivas de Node).

(function (global) {
  "use strict";

  var STORAGE_KEY = "tripSplitterPrototype";
  var SCHEMA_VERSION = 1;

  // Estrutura do estado simulado. Valores monetários são sempre centavos inteiros.
  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      users: [], // { id, email, senhaSimulada, nome }
      sessionUserId: null, // usuário logado na simulação
      trips: [], // { id, nome, ownerUserId, createdAt }
      memberships: [], // { id, tripId, userId, papel: "owner" | "member" }
      expenses: [], // { id, tripId, descricao, valorCents, pagoPorUserId, participantesUserIds, createdAt }
      obligations: [], // { id, tripId, expenseId, deUserId, paraUserId, valorCents, prazo, estado }
      referenceDate: null // data de referência simulada (ISO) para avaliar prazos; null = hoje
    };
  }

  // Sinaliza se o estado teve de ser reiniciado nesta carga (para a UI avisar).
  var stateWasReset = false;

  function hasLocalStorage() {
    try {
      return typeof global.localStorage !== "undefined" && global.localStorage !== null;
    } catch (e) {
      return false;
    }
  }

  function isValidState(candidate) {
    if (!candidate || typeof candidate !== "object") return false;
    var requiredArrays = ["users", "trips", "memberships", "expenses", "obligations"];
    for (var i = 0; i < requiredArrays.length; i++) {
      if (!Array.isArray(candidate[requiredArrays[i]])) return false;
    }
    return true;
  }

  function load() {
    if (!hasLocalStorage()) {
      stateWasReset = true;
      return emptyState();
    }
    var raw;
    try {
      raw = global.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stateWasReset = true;
      return emptyState();
    }
    if (!raw) {
      // Primeiro acesso: estado vazio, mas não é um "reset" de dados perdidos.
      return emptyState();
    }
    try {
      var parsed = JSON.parse(raw);
      if (!isValidState(parsed) || parsed.schemaVersion !== SCHEMA_VERSION) {
        stateWasReset = true;
        return emptyState();
      }
      // Preenche campos ausentes de forma tolerante.
      var base = emptyState();
      for (var key in base) {
        if (Object.prototype.hasOwnProperty.call(base, key) && !(key in parsed)) {
          parsed[key] = base[key];
        }
      }
      return parsed;
    } catch (e) {
      stateWasReset = true;
      return emptyState();
    }
  }

  var state = load();

  function persist() {
    if (!hasLocalStorage()) return;
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Em modo privado ou storage cheio, o protótipo segue apenas em memória.
    }
  }

  // Gera um id único simples e legível o suficiente para o protótipo.
  function generateId(prefix) {
    var rand = Math.random().toString(36).slice(2, 10);
    var time = Date.now().toString(36);
    return (prefix || "id") + "_" + time + "_" + rand;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // Retorna uma cópia rasa para leitura, evitando mutação acidental de fora.
  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  // Substitui o estado inteiro (usado por testes/manual). Persiste ao final.
  function replaceState(next) {
    if (!isValidState(next)) {
      throw new Error("Estado inválido para replaceState.");
    }
    state = next;
    persist();
    return snapshot();
  }

  // Aplica uma mutação segura: recebe o estado real, permite alterar e persiste.
  function update(mutator) {
    if (typeof mutator !== "function") {
      throw new Error("update requer uma função mutadora.");
    }
    var result = mutator(state);
    persist();
    return result;
  }

  function wasReset() {
    return stateWasReset;
  }

  function acknowledgeReset() {
    stateWasReset = false;
  }

  // Zera todo o estado do protótipo (útil para recomeçar a demonstração).
  function clearAll() {
    state = emptyState();
    persist();
    return snapshot();
  }

  var Store = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    emptyState: emptyState,
    snapshot: snapshot,
    replaceState: replaceState,
    update: update,
    persist: persist,
    generateId: generateId,
    nowIso: nowIso,
    wasReset: wasReset,
    acknowledgeReset: acknowledgeReset,
    clearAll: clearAll,
    // Acesso direto ao estado real para os módulos de domínio do protótipo.
    _getRawState: function () {
      return state;
    }
  };

  // Exporta para o navegador (window) e para Node (module.exports), permitindo
  // uso na UI e verificação por node --check / import em checagens manuais.
  global.TripSplitterStore = Store;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Store;
  }
})(typeof window !== "undefined" ? window : globalThis);
