// Controlador de UI do protótipo Trip Splitter (frontend-only).
//
// Liga os módulos simulados (auth, trips, expenses, payments, deadlines, reset,
// summary, render) em uma navegação: autenticação -> home (resumo global +
// viagens) -> viagem (participantes, despesas, obrigações, pagamentos, prazos,
// reset). Tudo é simulado no navegador; não há backend.

(function () {
  "use strict";

  var Auth = window.TripSplitterAuth;
  var Store = window.TripSplitterStore;
  var Trips = window.TripSplitterTrips;
  var Expenses = window.TripSplitterExpenses;
  var Payments = window.TripSplitterPayments;
  var Deadlines = window.TripSplitterDeadlines;
  var Reset = window.TripSplitterReset;
  var Summary = window.TripSplitterSummary;
  var Render = window.TripSplitterRender;

  var $ = function (sel) { return document.querySelector(sel); };

  var screenAuth = $("#screen-auth");
  var screenHome = $("#screen-home");
  var screenTrip = $("#screen-trip");

  var currentTripId = null;

  // ---------- utilidades ----------

  function centsToBRL(cents) {
    return "R$ " + (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function reaisToCents(value) {
    var n = Number(String(value).replace(",", "."));
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function showToast(message, isError) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.toggle("error", !!isError);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.add("hidden"); }, 3200);
  }

  function clearError(el) { if (el) { el.textContent = ""; el.classList.add("hidden"); } }
  function showError(el, msg) { if (el) { el.textContent = msg; el.classList.remove("hidden"); } }

  function userNameById(userId) {
    var state = Store._getRawState();
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].id === userId) return state.users[i].nome;
    }
    return "(desconhecido)";
  }

  // ---------- autenticação ----------

  var tabLogin = $("#tab-login");
  var tabSignup = $("#tab-signup");
  var formLogin = $("#form-login");
  var formSignup = $("#form-signup");
  var loginError = $("#login-error");
  var signupError = $("#signup-error");

  function selectTab(which) {
    var loginActive = which === "login";
    tabLogin.classList.toggle("is-active", loginActive);
    tabSignup.classList.toggle("is-active", !loginActive);
    tabLogin.setAttribute("aria-selected", String(loginActive));
    tabSignup.setAttribute("aria-selected", String(!loginActive));
    formLogin.classList.toggle("hidden", !loginActive);
    formSignup.classList.toggle("hidden", loginActive);
    clearError(loginError);
    clearError(signupError);
  }

  // ---------- navegação ----------

  function showScreen(el) {
    [screenAuth, screenHome, screenTrip].forEach(function (s) {
      if (s) s.classList.add("hidden");
    });
    if (el) el.classList.remove("hidden");
  }

  function showAuth() {
    currentTripId = null;
    showScreen(screenAuth);
    selectTab("login");
  }

  function showHome() {
    var user = Auth.currentUser();
    if (!user) { showAuth(); return; }
    currentTripId = null;
    showScreen(screenHome);
    $("#home-greeting").textContent = "Olá, " + user.nome + ". Este é um protótipo simulado.";
    renderSummary(user.id);
    renderTripsList(user.id);
  }

  function showTrip(tripId) {
    var user = Auth.currentUser();
    if (!user) { showAuth(); return; }
    try {
      var trip = Trips.getTripForUser(tripId, user.id);
      currentTripId = tripId;
      showScreen(screenTrip);
      $("#trip-title").textContent = trip.nome;
      $("#trip-role").textContent = Trips.isOwner(tripId, user.id) ? "Você é o dono desta viagem." : "Você é participante desta viagem.";
      renderMembers(tripId);
      renderPayerOptions(tripId);
      renderSplitOptions(tripId);
      renderExpenses(tripId, user.id);
      renderObligations(tripId, user.id);
      updateResetButton(tripId, user.id);
    } catch (err) {
      showToast(err.message, true);
      showHome();
    }
  }

  // ---------- render: resumo global ----------

  function renderSummary(userId) {
    var list = $("#summary-list");
    var status = $("#summary-status");
    var items;
    var ctx = {};
    try {
      items = Summary.globalSummaryForUser(userId);
      ctx.items = items;
    } catch (e) {
      ctx.error = true;
    }
    Render.applyState({ list: list, status: status }, "settlements", ctx);
    list.innerHTML = "";
    if (!items || !items.length) return;
    items.forEach(function (row) {
      var li = document.createElement("li");
      li.className = "summary-item " + (row.direcao === "a_receber" ? "positive" : "negative");
      var texto = row.direcao === "a_receber"
        ? row.pessoaNome + " deve a você"
        : "Você deve a " + row.pessoaNome;
      li.innerHTML =
        '<span class="summary-name"></span>' +
        '<span class="summary-amount"></span>';
      li.querySelector(".summary-name").textContent = texto;
      li.querySelector(".summary-amount").textContent = centsToBRL(Math.abs(row.valorLiquidoCents));
      list.appendChild(li);
    });
  }

  // ---------- render: lista de viagens ----------

  function renderTripsList(userId) {
    var list = $("#trips-list");
    var status = $("#trips-status");
    var items;
    var ctx = {};
    try {
      items = Trips.listTripsForUser(userId);
      ctx.items = items;
    } catch (e) {
      ctx.error = true;
    }
    Render.applyState({ list: list, status: status }, "expenses", ctx);
    if (status && (!items || !items.length)) {
      status.textContent = "Você ainda não tem viagens. Crie a primeira abaixo.";
    }
    list.innerHTML = "";
    if (!items || !items.length) return;
    items.forEach(function (trip) {
      var li = document.createElement("li");
      li.className = "trip-item";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "trip-open";
      btn.textContent = trip.nome + " (" + trip.memberCount + ")";
      btn.addEventListener("click", function () { showTrip(trip.id); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  // ---------- render: participantes ----------

  function renderMembers(tripId) {
    var ul = $("#members-list");
    ul.innerHTML = "";
    Trips.listMembers(tripId).forEach(function (m) {
      var li = document.createElement("li");
      li.textContent = m.nome + (m.papel === "owner" ? " (dono)" : "");
      ul.appendChild(li);
    });
  }

  function renderPayerOptions(tripId) {
    var select = $("#expense-payer");
    select.innerHTML = "";
    Trips.listMembers(tripId).forEach(function (m) {
      var opt = document.createElement("option");
      opt.value = m.userId;
      opt.textContent = m.nome;
      select.appendChild(opt);
    });
  }

  function renderSplitOptions(tripId) {
    var box = $("#expense-split");
    box.innerHTML = "";
    Trips.listMembers(tripId).forEach(function (m) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = m.userId;
      input.checked = true;
      label.appendChild(input);
      label.appendChild(document.createTextNode(m.nome));
      box.appendChild(label);
    });
  }

  // ---------- render: despesas ----------

  function renderExpenses(tripId, userId) {
    var list = $("#expenses-list");
    var status = $("#expenses-status");
    var items;
    var ctx = {};
    try {
      items = Expenses.listExpenses(tripId, userId);
      ctx.items = items;
    } catch (e) {
      ctx.error = true;
    }
    Render.applyState({ list: list, status: status }, "expenses", ctx);
    list.innerHTML = "";
    if (!items || !items.length) return;
    items.forEach(function (exp) {
      var li = document.createElement("li");
      li.className = "expense-item";
      li.innerHTML =
        '<span class="expense-desc"></span>' +
        '<span class="expense-payer"></span>' +
        '<span class="expense-amount"></span>';
      li.querySelector(".expense-desc").textContent = exp.descricao;
      li.querySelector(".expense-payer").textContent = "pago por " + userNameById(exp.pagoPorUserId);
      li.querySelector(".expense-amount").textContent = centsToBRL(exp.valorCents);
      list.appendChild(li);
    });
  }

  // ---------- render: obrigações ----------

  function estadoLabel(estado) {
    if (estado === "pendente") return "pendente";
    if (estado === "aguardando_confirmacao") return "aguardando confirmação";
    if (estado === "concluido") return "pago";
    return estado;
  }

  function prazoLabel(obl) {
    var status = Deadlines.deadlineStatus(obl);
    if (status === "atrasado") return " · atrasado";
    if (status === "no_prazo" && obl.prazo) return " · vence " + obl.prazo;
    return "";
  }

  function renderObligations(tripId, userId) {
    var list = $("#obligations-list");
    var status = $("#obligations-status");
    var items;
    var ctx = {};
    try {
      // Só as não concluídas contam como "quem paga quem".
      items = Expenses.listObligations(tripId, userId).filter(function (o) {
        return o.estado !== "concluido";
      });
      ctx.items = items;
    } catch (e) {
      ctx.error = true;
    }
    Render.applyState({ list: list, status: status }, "settlements", ctx);
    list.innerHTML = "";
    if (!items || !items.length) return;

    items.forEach(function (obl) {
      var li = document.createElement("li");
      li.className = "obligation-item";

      var texto = userNameById(obl.deUserId) + " → " + userNameById(obl.paraUserId) +
        " · " + centsToBRL(obl.valorCents) + " · " + estadoLabel(obl.estado) + prazoLabel(obl);
      var span = document.createElement("span");
      span.className = "obligation-text";
      span.textContent = texto;
      li.appendChild(span);

      var actions = document.createElement("span");
      actions.className = "obligation-actions";

      // Devedor pode declarar pagamento quando pendente.
      if (obl.deUserId === userId && obl.estado === "pendente") {
        actions.appendChild(actionButton("Declarar que paguei", function () {
          runAction(function () { Payments.declarePayment(obl.id, userId); }, "Pagamento declarado.");
        }));
      }
      // Recebedor confirma ou recusa quando aguardando.
      if (obl.paraUserId === userId && obl.estado === "aguardando_confirmacao") {
        actions.appendChild(actionButton("Confirmar recebimento", function () {
          runAction(function () { Payments.confirmReceipt(obl.id, userId); }, "Pagamento confirmado.");
        }));
        actions.appendChild(actionButton("Recusar", function () {
          runAction(function () { Payments.rejectDeclaration(obl.id, userId); }, "Declaração recusada.");
        }));
      }
      // Recebedor define prazo quando ainda não concluído.
      if (obl.paraUserId === userId && obl.estado !== "concluido") {
        actions.appendChild(actionButton("Definir prazo", function () {
          var data = window.prompt("Prazo no formato AAAA-MM-DD:", obl.prazo || "");
          if (data === null) return;
          runAction(function () { Deadlines.setDeadline(obl.id, userId, data.trim()); }, "Prazo definido.");
        }));
      }

      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function actionButton(label, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-small";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // Executa uma ação simulada e re-renderiza a viagem e o resumo.
  function runAction(fn, successMsg) {
    var user = Auth.currentUser();
    try {
      fn();
      showToast(successMsg);
      if (currentTripId) showTrip(currentTripId);
    } catch (err) {
      showToast(err.message, true);
      if (currentTripId && user) {
        renderObligations(currentTripId, user.id);
      }
    }
  }

  // ---------- reset ----------

  function updateResetButton(tripId, userId) {
    var btn = $("#btn-reset");
    if (!btn) return;
    var check = Reset.canReset(tripId, userId);
    btn.disabled = !check.allowed;
    btn.title = check.allowed ? "" : check.reason;
  }

  // ---------- handlers de auth ----------

  tabLogin.addEventListener("click", function () { selectTab("login"); });
  tabSignup.addEventListener("click", function () { selectTab("signup"); });

  formLogin.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError(loginError);
    try {
      Auth.login({ email: $("#login-email").value, senha: $("#login-senha").value });
      formLogin.reset();
      showHome();
      showToast("Entrou na simulação.");
    } catch (err) {
      showError(loginError, err.message);
    }
  });

  formSignup.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError(signupError);
    try {
      Auth.signup({ nome: $("#signup-nome").value, email: $("#signup-email").value, senha: $("#signup-senha").value });
      formSignup.reset();
      showHome();
      showToast("Conta criada nesta simulação.");
    } catch (err) {
      showError(signupError, err.message);
    }
  });

  $("#btn-logout").addEventListener("click", function () {
    Auth.logout();
    showAuth();
    showToast("Você saiu da simulação.");
  });

  // ---------- handlers de home ----------

  $("#form-new-trip").addEventListener("submit", function (e) {
    e.preventDefault();
    var user = Auth.currentUser();
    if (!user) { showAuth(); return; }
    try {
      var trip = Trips.createTrip(user.id, $("#trip-name").value);
      $("#form-new-trip").reset();
      showToast("Viagem criada.");
      showTrip(trip.id);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // ---------- handlers de viagem ----------

  $("#btn-back-home").addEventListener("click", showHome);

  $("#form-add-member").addEventListener("submit", function (e) {
    e.preventDefault();
    var user = Auth.currentUser();
    if (!user || !currentTripId) return;
    var email = String($("#member-email").value || "").trim().toLowerCase();
    var state = Store._getRawState();
    var target = state.users.filter(function (u) { return u.email === email; })[0];
    if (!target) {
      showToast("Nenhuma conta simulada com esse email.", true);
      return;
    }
    try {
      Trips.addMember(currentTripId, user.id, target.id);
      $("#form-add-member").reset();
      showToast("Participante adicionado.");
      showTrip(currentTripId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  $("#form-add-expense").addEventListener("submit", function (e) {
    e.preventDefault();
    var user = Auth.currentUser();
    if (!user || !currentTripId) return;
    var checked = Array.prototype.slice
      .call(document.querySelectorAll("#expense-split input:checked"))
      .map(function (el) { return el.value; });
    try {
      Expenses.addExpense(currentTripId, user.id, {
        descricao: $("#expense-desc").value,
        valorCents: reaisToCents($("#expense-amount").value),
        pagoPorUserId: $("#expense-payer").value,
        participantesUserIds: checked
      });
      $("#form-add-expense").reset();
      showToast("Despesa registrada.");
      showTrip(currentTripId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  $("#btn-reset").addEventListener("click", function () {
    var user = Auth.currentUser();
    if (!user || !currentTripId) return;
    var check = Reset.canReset(currentTripId, user.id);
    if (!check.allowed) {
      showToast(check.reason, true);
      return;
    }
    var ok = window.confirm("Isto vai apagar as despesas e obrigações desta viagem. Confirmar?");
    if (!ok) return;
    try {
      Reset.resetTripExpenses(currentTripId, user.id, { confirmed: true });
      showToast("Gastos resetados.");
      showTrip(currentTripId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  // ---------- boot ----------

  if (Store && Store.wasReset && Store.wasReset()) {
    showToast("O estado do protótipo foi reiniciado neste navegador.");
    Store.acknowledgeReset();
  }

  if (Auth && Auth.isAuthenticated()) {
    showHome();
  } else {
    showAuth();
  }
})();
