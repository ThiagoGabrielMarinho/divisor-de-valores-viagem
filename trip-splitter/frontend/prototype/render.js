// Estados de renderização do protótipo Trip Splitter (frontend-only).
//
// O ponto central desta task: nunca exibir um estado vazio ("nenhuma despesa",
// "tudo quitado") quando há dados ou quando ocorreu um erro. A decisão de qual
// estado mostrar é uma função pura, testável sem DOM. A aplicação da decisão no
// DOM é feita por um helper separado.
//
// Estados possíveis: "loading", "error", "unavailable", "empty", "data".

(function (global) {
  "use strict";

  // Recebe o contexto de uma seção e devolve o estado que deve ser exibido.
  // - loading: carregamento em andamento
  // - error: houve falha ao obter os dados (nunca confundir com vazio)
  // - unavailable: recurso indisponível/sem permissão
  // - empty: obtido com sucesso e realmente sem itens
  // - data: há itens para renderizar
  function decideState(ctx) {
    ctx = ctx || {};
    if (ctx.loading) return "loading";
    if (ctx.error) return "error";
    if (ctx.unavailable) return "unavailable";
    var items = ctx.items;
    if (!Array.isArray(items)) {
      // Sem array e sem erro explícito: tratamos como indisponível, não vazio.
      return "unavailable";
    }
    if (items.length === 0) return "empty";
    return "data";
  }

  // Mensagem padrão por estado e por tipo de seção (expenses | settlements).
  function messageFor(section, state) {
    var messages = {
      expenses: {
        loading: "Carregando despesas...",
        error: "Não foi possível carregar as despesas. Tente novamente.",
        unavailable: "Despesas indisponíveis no momento.",
        empty: "Nenhuma despesa ainda. Registre a primeira.",
        data: ""
      },
      settlements: {
        loading: "Carregando a quitação...",
        error: "Não foi possível carregar a quitação. Tente novamente.",
        unavailable: "Quitação indisponível no momento.",
        empty: "Tudo quitado. Ninguém deve nada a ninguém.",
        data: ""
      }
    };
    var group = messages[section] || messages.expenses;
    return group[state] || "";
  }

  // Aplica a decisão a um conjunto de elementos do DOM. Só o "data" mostra a
  // lista; qualquer outro estado mostra a mensagem correspondente e esconde a
  // lista, garantindo que erro nunca vire "vazio".
  function applyState(elements, section, ctx) {
    var state = decideState(ctx);
    var listEl = elements.list;
    var statusEl = elements.status;

    if (listEl) listEl.classList.toggle("hidden", state !== "data");
    if (statusEl) {
      if (state === "data") {
        statusEl.classList.add("hidden");
        statusEl.textContent = "";
        statusEl.classList.remove("is-error");
      } else {
        statusEl.classList.remove("hidden");
        statusEl.textContent = messageFor(section, state);
        statusEl.classList.toggle("is-error", state === "error");
      }
    }
    return state;
  }

  var Render = {
    decideState: decideState,
    messageFor: messageFor,
    applyState: applyState
  };

  global.TripSplitterRender = Render;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Render;
  }
})(typeof window !== "undefined" ? window : globalThis);
