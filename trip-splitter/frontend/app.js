const API = "/api";

let currentTripId = localStorage.getItem("currentTripId") || null;
let currentTrip = null; // {id, name, participants}

const $ = (sel) => document.querySelector(sel);
const screenStart = $("#screen-start");
const screenTrip = $("#screen-trip");

function centsToDisplay(cents) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function reaisToCents(value) {
  return Math.round(parseFloat(value) * 100);
}

function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.toggle("error", isError);
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 3200);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erro inesperado.");
  }
  return data;
}

// ---------- navegação entre telas ----------

function showStartScreen() {
  currentTripId = null;
  currentTrip = null;
  localStorage.removeItem("currentTripId");
  screenTrip.classList.add("hidden");
  screenStart.classList.remove("hidden");
}

async function showTripScreen(tripId) {
  try {
    currentTrip = await api(`/trips/${tripId}`);
    currentTripId = tripId;
    localStorage.setItem("currentTripId", tripId);
    screenStart.classList.add("hidden");
    screenTrip.classList.remove("hidden");
    await refreshTripScreen();
  } catch (e) {
    showToast(e.message, true);
    showStartScreen();
  }
}

async function refreshTripScreen() {
  currentTrip = await api(`/trips/${currentTripId}`);
  $("#trip-name-display").textContent = currentTrip.name;
  $("#trip-id-display").textContent = currentTrip.id;

  renderParticipants(currentTrip.participants);
  renderPayerSelect(currentTrip.participants);
  renderSplitCheckboxes(currentTrip.participants);

  const [expenses, balances, settlements] = await Promise.all([
    api(`/trips/${currentTripId}/expenses`),
    api(`/trips/${currentTripId}/balances`),
    api(`/trips/${currentTripId}/settlements`),
  ]);

  renderExpenses(expenses);
  renderBalances(balances);
  renderSettlements(settlements);
}

// ---------- render ----------

function renderParticipants(participants) {
  const ul = $("#participants-list");
  ul.innerHTML = "";
  participants.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.name;
    ul.appendChild(li);
  });
}

function renderPayerSelect(participants) {
  const select = $("#expense-payer");
  select.innerHTML = "";
  participants.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
}

function renderSplitCheckboxes(participants) {
  const container = $("#expense-split-checkboxes");
  container.innerHTML = "";
  participants.forEach((p) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = p.id;
    input.checked = true; // por padrão divide entre todos
    label.appendChild(input);
    label.appendChild(document.createTextNode(p.name));
    container.appendChild(label);
  });
}

function renderExpenses(expenses) {
  const tbody = $("#expenses-tbody");
  tbody.innerHTML = "";
  $("#expenses-empty").classList.toggle("hidden", expenses.length > 0);

  const nameById = new Map(currentTrip.participants.map((p) => [p.id, p.name]));

  expenses.forEach((exp) => {
    const tr = document.createElement("tr");
    const date = new Date(exp.created_at).toLocaleDateString("pt-BR");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${escapeHtml(exp.description)}</td>
      <td>${escapeHtml(nameById.get(exp.paid_by) || "?")}</td>
      <td class="num">R$ ${centsToDisplay(exp.amount_cents)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBalances(balances) {
  const ul = $("#balances-list");
  ul.innerHTML = "";
  balances.forEach((b) => {
    const li = document.createElement("li");
    const cls = b.balance_cents > 0 ? "positive" : b.balance_cents < 0 ? "negative" : "zero";
    const label = b.balance_cents > 0 ? "a receber" : b.balance_cents < 0 ? "a pagar" : "quite";
    li.innerHTML = `
      <span>${escapeHtml(b.name)}</span>
      <span class="amount ${cls}">R$ ${centsToDisplay(Math.abs(b.balance_cents))} <small>(${label})</small></span>
    `;
    ul.appendChild(li);
  });
}

function renderSettlements(settlements) {
  const ul = $("#settlements-list");
  ul.innerHTML = "";
  $("#settlements-empty").classList.toggle("hidden", settlements.length > 0);

  settlements.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${escapeHtml(s.from_name)}</span>
      <span class="arrow">→</span>
      <span>${escapeHtml(s.to_name)}</span>
      <span class="amount">R$ ${centsToDisplay(s.amount_cents)}</span>
    `;
    ul.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- handlers ----------

$("#form-new-trip").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const trip = await api("/trips", {
      method: "POST",
      body: JSON.stringify({ name: $("#trip-name").value }),
    });
    showToast("Viagem criada!");
    await showTripScreen(trip.id);
  } catch (e) {
    showToast(e.message, true);
  }
});

$("#form-open-trip").addEventListener("submit", async (e) => {
  e.preventDefault();
  await showTripScreen($("#trip-id").value.trim());
});

$("#btn-back").addEventListener("click", showStartScreen);

$("#copy-id").addEventListener("click", async () => {
  await navigator.clipboard.writeText(currentTrip.id);
  showToast("Código copiado.");
});

$("#form-add-participant").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api(`/trips/${currentTripId}/participants`, {
      method: "POST",
      body: JSON.stringify({ name: $("#participant-name").value }),
    });
    $("#participant-name").value = "";
    await refreshTripScreen();
  } catch (e) {
    showToast(e.message, true);
  }
});

$("#form-add-expense").addEventListener("submit", async (e) => {
  e.preventDefault();
  const checked = Array.from(
    document.querySelectorAll("#expense-split-checkboxes input:checked")
  ).map((el) => el.value);

  try {
    await api(`/trips/${currentTripId}/expenses`, {
      method: "POST",
      body: JSON.stringify({
        description: $("#expense-desc").value,
        amountCents: reaisToCents($("#expense-amount").value),
        paidBy: $("#expense-payer").value,
        splitAmong: checked,
      }),
    });
    $("#form-add-expense").reset();
    await refreshTripScreen();
    showToast("Despesa registrada.");
  } catch (e) {
    showToast(e.message, true);
  }
});

// ---------- boot ----------

if (currentTripId) {
  showTripScreen(currentTripId);
} else {
  showStartScreen();
}
