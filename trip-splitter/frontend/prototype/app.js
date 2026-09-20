// Controlador de telas do protótipo Trip Splitter (frontend-only).
//
// Nesta task (T3) o app cobre apenas autenticação: alternar entre login e
// cadastro, criar conta, entrar, sair e mostrar a área autenticada. As telas de
// viagens e resumo global são preenchidas nas tasks seguintes.
//
// Depende de store.js e auth.js carregados antes deste arquivo.

(function () {
  "use strict";

  var Auth = window.TripSplitterAuth;
  var Store = window.TripSplitterStore;

  var $ = function (sel) { return document.querySelector(sel); };

  var screenAuth = $("#screen-auth");
  var screenHome = $("#screen-home");

  var tabLogin = $("#tab-login");
  var tabSignup = $("#tab-signup");
  var formLogin = $("#form-login");
  var formSignup = $("#form-signup");
  var loginError = $("#login-error");
  var signupError = $("#signup-error");
  var homeGreeting = $("#home-greeting");
  var btnLogout = $("#btn-logout");

  function showToast(message, isError) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.toggle("error", !!isError);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.add("hidden");
    }, 3200);
  }

  function clearError(el) {
    if (!el) return;
    el.textContent = "";
    el.classList.add("hidden");
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
  }

  // ---------- alternância de abas ----------

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

  // ---------- navegação entre telas ----------

  function showAuthScreen() {
    screenHome.classList.add("hidden");
    screenAuth.classList.remove("hidden");
    selectTab("login");
  }

  function showHomeScreen() {
    var user = Auth.currentUser();
    if (!user) {
      showAuthScreen();
      return;
    }
    screenAuth.classList.add("hidden");
    screenHome.classList.remove("hidden");
    if (homeGreeting) {
      homeGreeting.textContent = "Olá, " + user.nome + ". Este é um protótipo simulado.";
    }
  }

  // ---------- handlers ----------

  if (tabLogin) tabLogin.addEventListener("click", function () { selectTab("login"); });
  if (tabSignup) tabSignup.addEventListener("click", function () { selectTab("signup"); });

  if (formLogin) {
    formLogin.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError(loginError);
      try {
        Auth.login({
          email: $("#login-email").value,
          senha: $("#login-senha").value
        });
        formLogin.reset();
        showHomeScreen();
        showToast("Entrou na simulação.");
      } catch (err) {
        showError(loginError, err.message);
      }
    });
  }

  if (formSignup) {
    formSignup.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError(signupError);
      try {
        Auth.signup({
          nome: $("#signup-nome").value,
          email: $("#signup-email").value,
          senha: $("#signup-senha").value
        });
        formSignup.reset();
        showHomeScreen();
        showToast("Conta criada nesta simulação.");
      } catch (err) {
        showError(signupError, err.message);
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      Auth.logout();
      showAuthScreen();
      showToast("Você saiu da simulação.");
    });
  }

  // ---------- boot ----------

  if (Store && Store.wasReset && Store.wasReset()) {
    showToast("O estado do protótipo foi reiniciado neste navegador.");
    Store.acknowledgeReset();
  }

  if (Auth && Auth.isAuthenticated()) {
    showHomeScreen();
  } else {
    showAuthScreen();
  }
})();
