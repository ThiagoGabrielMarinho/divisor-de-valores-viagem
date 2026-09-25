// Cliente HTTP do Trip Splitter — fala com a API real em /api.
//
// Toda chamada envia o cookie de sessão (same-origin) e trata erros de forma
// central. Um 401 dispara o callback global de "sessão encerrada", que leva a
// UI de volta à tela de autenticação (INT-06 e expiração de sessão).

(function () {
  "use strict";

  var BASE = "/api";
  var onUnauthorized = null;

  function ApiError(status, message) {
    this.name = "ApiError";
    this.status = status;
    this.message = message || "Erro inesperado.";
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function setUnauthorizedHandler(fn) {
    onUnauthorized = typeof fn === "function" ? fn : null;
  }

  async function apiFetch(path, options) {
    options = options || {};
    var init = {
      method: options.method || "GET",
      credentials: "include",
      headers: {},
    };
    if (options.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    var response;
    try {
      response = await fetch(BASE + path, init);
    } catch (networkError) {
      throw new ApiError(0, "Não foi possível falar com o servidor.");
    }

    if (response.status === 401) {
      if (onUnauthorized) onUnauthorized();
      throw new ApiError(401, "Sessão encerrada. Entre novamente.");
    }

    if (response.status === 204) return null;

    var data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      data = null;
    }

    if (!response.ok) {
      var message = data && data.error ? data.error : "Erro inesperado.";
      throw new ApiError(response.status, message);
    }
    return data;
  }

  var Api = {
    ApiError: ApiError,
    setUnauthorizedHandler: setUnauthorizedHandler,

    // Auth
    register: function (email, password, name) {
      return apiFetch("/auth/register", { method: "POST", body: { email: email, password: password, name: name } });
    },
    login: function (email, password) {
      return apiFetch("/auth/login", { method: "POST", body: { email: email, password: password } });
    },
    logout: function () {
      return apiFetch("/auth/logout", { method: "POST" });
    },

    // Viagens
    listTrips: function () { return apiFetch("/trips"); },
    createTrip: function (name) { return apiFetch("/trips", { method: "POST", body: { name: name } }); },
    getTrip: function (tripId) { return apiFetch("/trips/" + encodeURIComponent(tripId)); },

    // Participantes
    lookupAccount: function (email) {
      return apiFetch("/account/lookup?email=" + encodeURIComponent(email));
    },
    addParticipant: function (tripId, userId) {
      return apiFetch("/trips/" + encodeURIComponent(tripId) + "/participants", { method: "POST", body: { userId: userId } });
    },

    // Despesas
    addExpense: function (tripId, body) {
      return apiFetch("/trips/" + encodeURIComponent(tripId) + "/expenses", { method: "POST", body: body });
    },
    listExpenses: function (tripId) {
      return apiFetch("/trips/" + encodeURIComponent(tripId) + "/expenses");
    },

    // Obrigações
    listObligations: function (tripId) {
      return apiFetch("/trips/" + encodeURIComponent(tripId) + "/obligations");
    },
    declarePayment: function (obligationId) {
      return apiFetch("/obligations/" + encodeURIComponent(obligationId) + "/declare", { method: "POST" });
    },
    confirmReceipt: function (obligationId) {
      return apiFetch("/obligations/" + encodeURIComponent(obligationId) + "/confirm", { method: "POST" });
    },
    rejectDeclaration: function (obligationId) {
      return apiFetch("/obligations/" + encodeURIComponent(obligationId) + "/reject", { method: "POST" });
    },
    setDeadline: function (obligationId, deadline) {
      return apiFetch("/obligations/" + encodeURIComponent(obligationId) + "/deadline", { method: "PATCH", body: { deadline: deadline } });
    },

    // Resumo global
    globalBalances: function () { return apiFetch("/account/balances"); },
    globalBalanceDetails: function (userId) {
      return apiFetch("/account/balances/" + encodeURIComponent(userId));
    },

    // Reset
    resetTrip: function (tripId) {
      return apiFetch("/trips/" + encodeURIComponent(tripId) + "/reset", { method: "POST", body: { confirmed: true } });
    },
  };

  window.TripSplitterApi = Api;
})();
