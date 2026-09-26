// Controlador de UI do Trip Splitter — integrado ao backend real via api.js.
//
// Navegação: autenticação -> home (resumo global + viagens) -> viagem
// (participantes, despesas, obrigações, pagamentos, prazos, reset).
// Toda persistência é no backend; nenhuma lógica de negócio vive aqui além da
// orquestração de telas e do preparo de payloads.

(function () {
  "use strict";

  var Api = window.TripSplitterApi;
  var $ = function (sel) { return document.querySelector(sel); };

  var screenAuth = $("#screen-auth");
  var screenHome = $("#screen-home");
  var screenTrip = $("#screen-trip");

  // Sessão em memória: guardamos o usuário logado após register/login.
  var currentUser = null;
  var currentTripId = null;
  var currentTrip = null; // { id, name, participants, myRole }

  // ---------- utilidades ----------

  function centsToBRL(cents) {
    return "R$ " + (Number(cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    showToast._t = setTimeout(function () { toast.classList.add("hidden"); }, 3400);
  }

  function clearError(el) { if (el) { el.textContent = ""; el.classList.add("hidden"); } }
  function showError(el, msg) { if (el) { el.textContent = msg; el.classList.remove("hidden"); } }

  function setStatus(el, message, isError) {
    if (!el) return;
    if (!message) { el.classList.add("hidden"); el.textContent = ""; return; }
    el.textContent = message;
    el.classList.remove("hidden");
    el.classList.toggle("is-error", !!isError);
  }

  // ---------- navegação ----------

  function showScreen(el) {
    [screenAuth, screenHome, screenTrip].forEach(function (s) { if (s) s.classList.add("hidden"); });
    if (el) el.classList.remove("hidden");
  }

  function showAuth() {
    currentUser = null;
    currentTripId = null;
    currentTrip = null;
    showScreen(screenAuth);
    selectTab("login");
  }

  async function showHome() {
    if (!currentUser) { showAuth(); return; }
    currentTripId = null;
    currentTrip = null;
    showScreen(screenHome);
    $("#home-greeting").textContent = "Olá, " + currentUser.nome + ".";
    await Promise.all([renderSummary(), renderTripsList()]);
  }

  async function openTrip(tripId) {
    if (!currentUser) { showAuth(); return; }
    try {
      var trip = await Api.getTrip(tripId);
      currentTripId = tripId;
      // Deriva o papel do usuário: dono é o primeiro participante (criador).
      // A autorização real é sempre do backend; isto só orienta a UI.
      var myParticipant = (trip.participants || []).filter(function (p) { return p.user_id === currentUser.id; })[0];
      var isOwner = Boolean(myParticipant) && trip.participants[0] && trip.participants[0].user_id === currentUser.id;
      currentTrip = { id: trip.id, name: trip.name, participants: trip.participants || [], isOwner: isOwner };
      showScreen(screenTrip);
      $("#trip-title").textContent = trip.name;
      $("#trip-role").textContent = isOwner ? "Você é o dono desta viagem." : "Você é participante desta viagem.";
      renderMembers();
      renderPayerOptions();
      renderSplitOptions();
      toggleOwnerControls(isOwner);
      await Promise.all([renderExpenses(), renderObligations()]);
    } catch (err) {
      showToast(err.message, true);
      showHome();
    }
  }

  function toggleOwnerControls(isOwner) {
    var addMemberForm = $("#form-add-member");
    var resetCard = $("#reset-card");
    if (addMemberForm) addMemberForm.classList.toggle("hidden", !isOwner);
    if (resetCard) resetCard.classList.toggle("hidden", !isOwner);
    var hint = $("#member-hint");
    if (hint) hint.textContent = isOwner ? "Adicione pessoas que já criaram uma conta." : "Apenas o dono adiciona participantes.";
  }

  // ---------- render: resumo global ----------

  async function renderSummary() {
    var list = $("#summary-list");
    var status = $("#summary-status");
    list.innerHTML = "";
    setStatus(status, "Carregando…");
    var items;
    try {
      items = await Api.globalBalances();
    } catch (err) {
      setStatus(status, "Não foi possível carregar o resumo.", true);
      return;
    }
    if (!items || !items.length) {
      setStatus(status, "Você está quite com todo mundo. 🎉");
      return;
    }
    setStatus(status, "");
    items.forEach(function (row) {
      var li = document.createElement("li");
      var isReceber = row.direction === "a_receber";
      li.className = "summary-item " + (isReceber ? "positive" : "negative");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "summary-name";
      btn.textContent = isReceber ? (row.user_name + " deve a você") : ("Você deve a " + row.user_name);
      btn.style.border = "none";
      btn.style.background = "transparent";
      btn.style.font = "inherit";
      btn.style.cursor = "pointer";
      btn.style.textAlign = "left";
      btn.addEventListener("click", function () { toggleSummaryDetail(li, row.user_id); });

      var amount = document.createElement("span");
      amount.className = "summary-amount";
      amount.textContent = centsToBRL(Math.abs(row.net_cents));

      li.appendChild(btn);
      li.appendChild(amount);
      list.appendChild(li);
    });
  }

  async function toggleSummaryDetail(li, otherUserId) {
    var existing = li.nextElementSibling;
    if (existing && existing.classList.contains("summary-detail")) {
      existing.remove();
      return;
    }
    var box = document.createElement("li");
    box.className = "summary-detail";
    box.textContent = "Carregando detalhes…";
    li.parentNode.insertBefore(box, li.nextSibling);
    try {
      var detail = await Api.globalBalanceDetails(otherUserId);
      box.textContent = "";
      var ul = document.createElement("ul");
      (detail.details || []).forEach(function (d) {
        var item = document.createElement("li");
        var prazo = d.prazo ? (" · vence " + d.prazo) : "";
        item.textContent = d.trip_name + " · " + centsToBRL(d.amount_cents) + " · " + estadoLabel(d.estado) + prazo;
        ul.appendChild(item);
      });
      box.appendChild(ul);
    } catch (err) {
      box.textContent = err.message;
    }
  }

  // ---------- render: lista de viagens ----------

  async function renderTripsList() {
    var list = $("#trips-list");
    var status = $("#trips-status");
    list.innerHTML = "";
    setStatus(status, "Carregando…");
    var items;
    try {
      items = await Api.listTrips();
    } catch (err) {
      setStatus(status, "Não foi possível carregar suas viagens.", true);
      return;
    }
    if (!items || !items.length) {
      setStatus(status, "Você ainda não tem viagens. Crie a primeira abaixo.");
      return;
    }
    setStatus(status, "");
    items.forEach(function (trip) {
      var li = document.createElement("li");
      li.className = "trip-item";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "trip-open";
      btn.textContent = trip.name;
      btn.addEventListener("click", function () { openTrip(trip.id); });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  // ---------- render: participantes ----------

  function renderMembers() {
    var ul = $("#members-list");
    ul.innerHTML = "";
    (currentTrip.participants || []).forEach(function (p, index) {
      var li = document.createElement("li");
      li.textContent = p.name + (index === 0 ? " (dono)" : "");
      ul.appendChild(li);
    });
  }

  function renderPayerOptions() {
    var select = $("#expense-payer");
    select.innerHTML = "";
    (currentTrip.participants || []).forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id; // participant id (paidBy usa participant id)
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  }

  function renderSplitOptions() {
    var box = $("#expense-split");
    box.innerHTML = "";
    (currentTrip.participants || []).forEach(function (p) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = p.id; // participant id
      input.checked = true;
      label.appendChild(input);
      label.appendChild(document.createTextNode(p.name));
      box.appendChild(label);
    });
  }

  // ---------- render: despesas ----------

  function participantName(participantId) {
    var p = (currentTrip.participants || []).filter(function (x) { return x.id === participantId; })[0];
    return p ? p.name : "(desconhecido)";
  }

  function userName(userId) {
    var p = (currentTrip.participants || []).filter(function (x) { return x.user_id === userId; })[0];
    return p ? p.name : "(alguém)";
  }

  async function renderExpenses() {
    var list = $("#expenses-list");
    var status = $("#expenses-status");
    list.innerHTML = "";
    setStatus(status, "Carregando…");
    var items;
    try {
      items = await Api.listExpenses(currentTripId);
    } catch (err) {
      setStatus(status, "Não foi possível carregar as despesas.", true);
      return;
    }
    if (!items || !items.length) {
      setStatus(status, "Nenhuma despesa registrada ainda.");
      return;
    }
    setStatus(status, "");
    items.forEach(function (exp) {
      var li = document.createElement("li");
      li.className = "expense-item";
      var desc = document.createElement("span");
      desc.className = "expense-desc";
      desc.textContent = exp.description;
      var payer = document.createElement("span");
      payer.className = "expense-payer";
      payer.textContent = "pago por " + participantName(exp.paid_by);
      var amount = document.createElement("span");
      amount.className = "expense-amount";
      amount.textContent = centsToBRL(exp.amount_cents);
      li.appendChild(desc);
      li.appendChild(payer);
      li.appendChild(amount);
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

  function isLate(obl) {
    if (!obl.prazo || obl.estado === "concluido") return false;
    var today = new Date().toISOString().slice(0, 10);
    return today > obl.prazo;
  }

  async function renderObligations() {
    var list = $("#obligations-list");
    var status = $("#obligations-status");
    list.innerHTML = "";
    setStatus(status, "Carregando…");
    var items;
    try {
      items = await Api.listObligations(currentTripId);
    } catch (err) {
      setStatus(status, "Não foi possível carregar as cobranças.", true);
      return;
    }
    var pendentes = (items || []).filter(function (o) { return o.estado !== "concluido"; });
    if (!pendentes.length) {
      setStatus(status, "Ninguém deve nada nesta viagem. 🎉");
      return;
    }
    setStatus(status, "");
    pendentes.forEach(function (obl) {
      var li = document.createElement("li");
      li.className = "obligation-item";

      var text = document.createElement("span");
      text.className = "obligation-text";
      text.textContent = userName(obl.de_user_id) + " → " + userName(obl.para_user_id) + " · " + centsToBRL(obl.valor_cents) + " · " + estadoLabel(obl.estado);
      if (obl.prazo) {
        var badge = document.createElement("span");
        badge.className = "obligation-badge" + (isLate(obl) ? " atrasado" : "");
        badge.textContent = isLate(obl) ? ("atrasado (" + obl.prazo + ")") : ("vence " + obl.prazo);
        text.appendChild(badge);
      }
      li.appendChild(text);

      var actions = document.createElement("span");
      actions.className = "obligation-actions";

      if (obl.de_user_id === currentUser.id && obl.estado === "pendente") {
        actions.appendChild(actionButton("Declarar que paguei", function () {
          runAction(function () { return Api.declarePayment(obl.id); }, "Pagamento declarado.");
        }));
      }
      if (obl.para_user_id === currentUser.id && obl.estado === "aguardando_confirmacao") {
        actions.appendChild(actionButton("Confirmar recebimento", function () {
          runAction(function () { return Api.confirmReceipt(obl.id); }, "Pagamento confirmado.");
        }));
        actions.appendChild(actionButton("Recusar", function () {
          runAction(function () { return Api.rejectDeclaration(obl.id); }, "Declaração recusada.");
        }));
      }
      if (obl.para_user_id === currentUser.id && obl.estado !== "concluido") {
        actions.appendChild(actionButton("Definir prazo", function () {
          var data = window.prompt("Prazo no formato AAAA-MM-DD:", obl.prazo || "");
          if (data === null) return;
          runAction(function () { return Api.setDeadline(obl.id, String(data).trim()); }, "Prazo definido.");
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

  async function runAction(fn, successMsg) {
    try {
      await fn();
      showToast(successMsg);
      if (currentTripId) await openTrip(currentTripId);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  // ---------- autenticação: abas ----------

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

  tabLogin.addEventListener("click", function () { selectTab("login"); });
  tabSignup.addEventListener("click", function () { selectTab("signup"); });

  formLogin.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError(loginError);
    var btn = formLogin.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      currentUser = await Api.login($("#login-email").value, $("#login-senha").value);
      formLogin.reset();
      await showHome();
      showToast("Bem-vindo de volta.");
    } catch (err) {
      showError(loginError, err.status === 401 ? "Email ou senha inválidos." : err.message);
    } finally {
      btn.disabled = false;
    }
  });

  formSignup.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError(signupError);
    var btn = formSignup.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      currentUser = await Api.register($("#signup-email").value, $("#signup-senha").value, $("#signup-nome").value);
      formSignup.reset();
      await showHome();
      showToast("Conta criada.");
    } catch (err) {
      showError(signupError, err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("#btn-logout").addEventListener("click", async function () {
    try { await Api.logout(); } catch (e) { /* segue para auth de qualquer forma */ }
    showAuth();
    showToast("Você saiu da sua conta.");
  });

  // ---------- home ----------

  $("#form-new-trip").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!currentUser) { showAuth(); return; }
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      var trip = await Api.createTrip($("#trip-name").value);
      e.target.reset();
      showToast("Viagem criada.");
      await openTrip(trip.id);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- viagem ----------

  $("#btn-back-home").addEventListener("click", showHome);

  $("#form-add-member").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!currentUser || !currentTripId) return;
    var email = String($("#member-email").value || "").trim();
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      var account = await Api.lookupAccount(email);
      await Api.addParticipant(currentTripId, account.id);
      e.target.reset();
      showToast("Participante adicionado.");
      await openTrip(currentTripId);
    } catch (err) {
      if (err.status === 404) {
        showToast("Nenhuma conta encontrada com esse email.", true);
      } else if (err.status === 403) {
        showToast("Apenas o dono pode adicionar participantes.", true);
      } else {
        showToast(err.message, true);
      }
    } finally {
      btn.disabled = false;
    }
  });

  $("#form-add-expense").addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!currentUser || !currentTripId) return;
    var checked = Array.prototype.slice
      .call(document.querySelectorAll("#expense-split input:checked"))
      .map(function (el) { return el.value; });
    if (!checked.length) { showToast("Selecione ao menos um participante.", true); return; }
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await Api.addExpense(currentTripId, {
        description: $("#expense-desc").value,
        amountCents: reaisToCents($("#expense-amount").value),
        paidBy: $("#expense-payer").value,
        splitAmong: checked,
      });
      e.target.reset();
      showToast("Despesa registrada.");
      await openTrip(currentTripId);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  $("#btn-reset").addEventListener("click", async function () {
    if (!currentUser || !currentTripId) return;
    var ok = window.confirm("Isto vai apagar as despesas e cobranças desta viagem. Confirmar?");
    if (!ok) return;
    try {
      await Api.resetTrip(currentTripId);
      showToast("Gastos resetados.");
      await openTrip(currentTripId);
    } catch (err) {
      if (err.status === 409) {
        showToast("Reset bloqueado: já existe um pagamento concluído.", true);
      } else if (err.status === 403) {
        showToast("Apenas o dono pode resetar.", true);
      } else {
        showToast(err.message, true);
      }
    }
  });

  // ---------- boot ----------

  Api.setUnauthorizedHandler(function () {
    if (currentUser) showToast("Sua sessão expirou. Entre novamente.", true);
    showAuth();
  });

  // Sem persistência de sessão no cliente: começa sempre na autenticação.
  // O cookie HttpOnly existe no navegador, mas o backend não expõe "quem sou
  // eu" sem uma chamada; começar na auth mantém o fluxo simples e previsível.
  showAuth();
})();
