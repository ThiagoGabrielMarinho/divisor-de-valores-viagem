// Autenticação simulada do protótipo Trip Splitter (frontend-only).
//
// IMPORTANTE: isto é uma simulação de interface. Não há servidor, hash de senha,
// sessão real, verificação de email ou recuperação. O objetivo é apenas o fluxo:
// cadastrar, entrar, sair e saber quem é o usuário atual. As senhas ficam em
// texto no estado do navegador exatamente porque nada aqui é seguro de verdade.
//
// Escrito para o navegador e para passar em `node --check`.

(function (global) {
  "use strict";

  var Store = global.TripSplitterStore;
  if (!Store && typeof require !== "undefined") {
    try {
      Store = require("./store.js");
    } catch (e) {
      Store = null;
    }
  }

  // Marca explícita de que a autenticação é simulada, para a UI exibir o aviso.
  var SIMULATION_NOTICE =
    "Cadastro e login são apenas uma simulação neste protótipo. Não use uma senha real.";

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function findUserByEmail(state, email) {
    var target = normalizeEmail(email);
    for (var i = 0; i < state.users.length; i++) {
      if (normalizeEmail(state.users[i].email) === target) {
        return state.users[i];
      }
    }
    return null;
  }

  // Cadastro simulado: exige email e senha, rejeita email já usado.
  function signup(input) {
    input = input || {};
    var email = normalizeEmail(input.email);
    var senha = String(input.senha || "");
    var nome = String(input.nome || "").trim();

    if (!email || email.indexOf("@") === -1) {
      throw new Error("Informe um email válido.");
    }
    if (senha.length < 4) {
      throw new Error("A senha simulada precisa ter ao menos 4 caracteres.");
    }

    return Store.update(function (state) {
      if (findUserByEmail(state, email)) {
        throw new Error("Já existe uma conta com esse email nesta simulação.");
      }
      var user = {
        id: Store.generateId("user"),
        email: email,
        senhaSimulada: senha,
        nome: nome || email.split("@")[0]
      };
      state.users.push(user);
      // Cadastro já deixa o usuário logado na simulação.
      state.sessionUserId = user.id;
      return publicUser(user);
    });
  }

  // Login simulado: valida email + senha contra o estado do navegador.
  function login(input) {
    input = input || {};
    var email = normalizeEmail(input.email);
    var senha = String(input.senha || "");

    return Store.update(function (state) {
      var user = findUserByEmail(state, email);
      if (!user || user.senhaSimulada !== senha) {
        // Mensagem neutra: não revela se foi o email ou a senha.
        throw new Error("Email ou senha inválidos nesta simulação.");
      }
      state.sessionUserId = user.id;
      return publicUser(user);
    });
  }

  function logout() {
    return Store.update(function (state) {
      state.sessionUserId = null;
      return true;
    });
  }

  function currentUser() {
    var state = Store._getRawState();
    if (!state.sessionUserId) return null;
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].id === state.sessionUserId) {
        return publicUser(state.users[i]);
      }
    }
    return null;
  }

  function isAuthenticated() {
    return currentUser() !== null;
  }

  // Nunca expõe a senha simulada para o resto da aplicação.
  function publicUser(user) {
    if (!user) return null;
    return { id: user.id, email: user.email, nome: user.nome };
  }

  var Auth = {
    SIMULATION_NOTICE: SIMULATION_NOTICE,
    signup: signup,
    login: login,
    logout: logout,
    currentUser: currentUser,
    isAuthenticated: isAuthenticated
  };

  global.TripSplitterAuth = Auth;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Auth;
  }
})(typeof window !== "undefined" ? window : globalThis);
