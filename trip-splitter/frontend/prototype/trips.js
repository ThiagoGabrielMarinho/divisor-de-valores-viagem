// Viagens e papéis do protótipo Trip Splitter (frontend-only).
//
// Regras de produto cobertas:
// - quem cria uma viagem é registrado como "owner";
// - demais membros entram como "member";
// - o usuário logado só enxerga e acessa viagens em que participa.
//
// Sem backend: tudo opera sobre o store simulado. Escrito para o navegador e
// para passar em `node --check`.

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

  var PAPEL_OWNER = "owner";
  var PAPEL_MEMBER = "member";

  function findMembership(state, tripId, userId) {
    for (var i = 0; i < state.memberships.length; i++) {
      var m = state.memberships[i];
      if (m.tripId === tripId && m.userId === userId) return m;
    }
    return null;
  }

  function isMember(tripId, userId) {
    return findMembership(Store._getRawState(), tripId, userId) !== null;
  }

  function roleOf(tripId, userId) {
    var m = findMembership(Store._getRawState(), tripId, userId);
    return m ? m.papel : null;
  }

  function isOwner(tripId, userId) {
    return roleOf(tripId, userId) === PAPEL_OWNER;
  }

  // Cria a viagem e registra o criador como owner na mesma operação.
  function createTrip(ownerUserId, nome) {
    var nomeTrim = String(nome || "").trim();
    if (!ownerUserId) throw new Error("É preciso estar logado para criar uma viagem.");
    if (!nomeTrim) throw new Error("Informe um nome para a viagem.");

    return Store.update(function (state) {
      var userExists = state.users.some(function (u) { return u.id === ownerUserId; });
      if (!userExists) throw new Error("Usuário da simulação não encontrado.");

      var trip = {
        id: Store.generateId("trip"),
        nome: nomeTrim,
        ownerUserId: ownerUserId,
        createdAt: Store.nowIso()
      };
      state.trips.push(trip);
      state.memberships.push({
        id: Store.generateId("mb"),
        tripId: trip.id,
        userId: ownerUserId,
        papel: PAPEL_OWNER
      });
      return publicTrip(state, trip);
    });
  }

  // Lista somente as viagens em que o usuário participa.
  function listTripsForUser(userId) {
    var state = Store._getRawState();
    var myTripIds = {};
    for (var i = 0; i < state.memberships.length; i++) {
      if (state.memberships[i].userId === userId) {
        myTripIds[state.memberships[i].tripId] = true;
      }
    }
    return state.trips
      .filter(function (t) { return myTripIds[t.id]; })
      .map(function (t) { return publicTrip(state, t); });
  }

  // Retorna a viagem apenas se o usuário for membro; caso contrário, bloqueia.
  function getTripForUser(tripId, userId) {
    var state = Store._getRawState();
    var trip = null;
    for (var i = 0; i < state.trips.length; i++) {
      if (state.trips[i].id === tripId) { trip = state.trips[i]; break; }
    }
    if (!trip) throw new Error("Viagem não encontrada.");
    if (!findMembership(state, tripId, userId)) {
      throw new Error("Esta viagem não está disponível para você.");
    }
    return publicTrip(state, trip);
  }

  // Adiciona um membro (papel member por padrão), sem duplicar vínculo.
  function addMember(tripId, actorUserId, targetUserId, papel) {
    return Store.update(function (state) {
      var trip = state.trips.filter(function (t) { return t.id === tripId; })[0];
      if (!trip) throw new Error("Viagem não encontrada.");
      if (!findMembership(state, tripId, actorUserId)) {
        throw new Error("Você não participa desta viagem.");
      }
      if (findMembership(state, tripId, targetUserId)) {
        return; // já é membro; operação idempotente
      }
      state.memberships.push({
        id: Store.generateId("mb"),
        tripId: tripId,
        userId: targetUserId,
        papel: papel === PAPEL_OWNER ? PAPEL_OWNER : PAPEL_MEMBER
      });
    });
  }

  function listMembers(tripId) {
    var state = Store._getRawState();
    return state.memberships
      .filter(function (m) { return m.tripId === tripId; })
      .map(function (m) {
        var user = state.users.filter(function (u) { return u.id === m.userId; })[0];
        return {
          userId: m.userId,
          papel: m.papel,
          nome: user ? user.nome : "(desconhecido)",
          email: user ? user.email : null
        };
      });
  }

  function publicTrip(state, trip) {
    return {
      id: trip.id,
      nome: trip.nome,
      ownerUserId: trip.ownerUserId,
      createdAt: trip.createdAt,
      memberCount: state.memberships.filter(function (m) { return m.tripId === trip.id; }).length
    };
  }

  var Trips = {
    PAPEL_OWNER: PAPEL_OWNER,
    PAPEL_MEMBER: PAPEL_MEMBER,
    createTrip: createTrip,
    listTripsForUser: listTripsForUser,
    getTripForUser: getTripForUser,
    addMember: addMember,
    listMembers: listMembers,
    isMember: isMember,
    isOwner: isOwner,
    roleOf: roleOf
  };

  global.TripSplitterTrips = Trips;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Trips;
  }
})(typeof window !== "undefined" ? window : globalThis);
