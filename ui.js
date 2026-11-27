import { computeSlotState, formatCOP, formatCountdown } from "./auction-engine.js";
import {
  addSimOffsetMinutes,
  addSlot,
  clearDemoSlots,
  getBookings,
  getSimOffsetMinutes,
  getSlots,
  reserveSlot,
  resetSimOffsetMinutes
} from "./storage.js";

export function showToast(text) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function renderSimIndicator() {
  const badge = document.getElementById("sim-offset-badge");
  if (!badge) return;
  const offset = getSimOffsetMinutes();
  badge.textContent = offset > 0 ? `Simulación: +${offset} min` : "Hora real";
}

export function initSimControls(onChange) {
  renderSimIndicator();

  document.getElementById("btn-sim-5")?.addEventListener("click", () => {
    addSimOffsetMinutes(5);
    renderSimIndicator();
    onChange?.();
    showToast("Se adelantaron 5 minutos en la simulación.");
  });

  document.getElementById("btn-sim-10")?.addEventListener("click", () => {
    addSimOffsetMinutes(10);
    renderSimIndicator();
    onChange?.();
    showToast("Se adelantaron 10 minutos en la simulación.");
  });

  document.getElementById("btn-sim-reset")?.addEventListener("click", () => {
    resetSimOffsetMinutes();
    renderSimIndicator();
    onChange?.();
    showToast("Simulación restablecida a la hora actual.");
  });

  document.getElementById("btn-clear-demos")?.addEventListener("click", () => {
    clearDemoSlots();
    onChange?.();
    showToast("Ejemplos eliminados.");
  });
}

export function initIndexPage() {
  const grid = document.getElementById("slots-grid");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const chipsContainer = document.getElementById("category-chips");

  const categories = [
    "Todas",
    "Barbería & Estética",
    "Odontología & Salud",
    "Entrenamiento",
    "Mecánica & Taller",
    "Otros"
  ];

  let selectedCategory = "Todas";

  chipsContainer.innerHTML = categories
    .map(
      (cat, idx) =>
        `<button type="button" class="chip ${idx === 0 ? "active" : ""}" data-cat="${cat}">${cat}</button>`
    )
    .join("");

  chipsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    selectedCategory = btn.dataset.cat;
    chipsContainer.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    render();
  });

  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);

  function render() {
    const offset = getSimOffsetMinutes();
    const query = searchInput.value.trim().toLowerCase();
    const sortBy = sortSelect.value;

    let items = getSlots()
      .filter((s) => s.status === "AVAILABLE")
      .map((s) => ({ slot: s, state: computeSlotState(s, Date.now(), offset) }))
      .filter(({ slot }) => {
        const matchCat = selectedCategory === "Todas" || slot.category === selectedCategory;
        const matchText =
          !query ||
          slot.businessName.toLowerCase().includes(query) ||
          slot.serviceName.toLowerCase().includes(query) ||
          slot.location.toLowerCase().includes(query);
        return matchCat && matchText;
      });

    if (sortBy === "price-asc") {
      items.sort((a, b) => a.state.currentPrice - b.state.currentPrice);
    } else if (sortBy === "discount-desc") {
      items.sort((a, b) => b.state.discountPercent - a.state.discountPercent);
    }

    if (!items.length) {
      grid.innerHTML = `<div class="empty-state">No hay huecos disponibles con ese filtro en este momento.</div>`;
      return;
    }

    grid.innerHTML = items
      .map(({ slot, state }) => {
        const countdownText = state.reachedFloor
          ? "Precio mínimo alcanzado"
          : `Baja ${formatCOP(slot.stepCOP)} en ${formatCountdown(state.secondsToNextDrop)}`;

        return `
          <article class="slot-card">
            <div>
              <div class="slot-top">
                <span class="badge">${slot.category}</span>
                <span class="timer-pill">${countdownText}</span>
              </div>
              <h2 class="slot-title">${slot.serviceName}</h2>
              <p class="slot-meta">${slot.businessName} · ${slot.location} · ${slot.timeLabel}</p>
            </div>

            <div class="price-box">
              <div class="price-row">
                <span class="current-price">${formatCOP(state.currentPrice)}</span>
                <span class="initial-price">${formatCOP(slot.startPrice)}</span>
              </div>
              <p class="floor-note">
                Mínimo: ${formatCOP(slot.minPrice)} · Baja ${formatCOP(slot.stepCOP)} cada ${slot.intervalMinutes} min
                ${state.discountPercent > 0 ? `(${state.discountPercent}% desc.)` : ""}
              </p>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${state.progressPercent}%"></div>
              </div>
            </div>

            <button type="button" class="btn btn-primary" data-reserve-id="${slot.id}" data-price="${state.currentPrice}">
              Reservar ahora por ${formatCOP(state.currentPrice)}
            </button>
          </article>
        `;
      })
      .join("");
  }

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reserve-id]");
    if (!btn) return;
    const customerName = window.prompt("Ingresa tu nombre para confirmar la reserva:");
    if (!customerName || !customerName.trim()) {
      showToast("Debes ingresar un nombre para reservar.");
      return;
    }
    const result = reserveSlot(btn.dataset.reserveId, customerName, Number(btn.dataset.price));
    if (!result.ok) {
      showToast(result.message);
      render();
      return;
    }
    showToast(`Reserva confirmada · Código ${result.booking.code}`);
    render();
  });

  initSimControls(render);
  render();
  setInterval(render, 1000);
}

export function initPublishPage() {
  const form = document.getElementById("publish-form");
  const preview = document.getElementById("rule-preview");

  function updatePreview() {
    const startPrice = Number(document.getElementById("startPrice").value) || 0;
    const minPrice = Number(document.getElementById("minPrice").value) || 0;
    const intervalMinutes = Math.max(1, Number(document.getElementById("intervalMinutes").value) || 10);
    const stepCOP = Math.max(100, Number(document.getElementById("stepCOP").value) || 1000);

    const dropTotal = Math.max(0, startPrice - minPrice);
    const stepsNeeded = stepCOP > 0 ? Math.ceil(dropTotal / stepCOP) : 0;
    const totalMinutes = stepsNeeded * intervalMinutes;

    preview.innerHTML = `
      <strong>Regla configurada:</strong> Inicia en <strong>${formatCOP(startPrice)}</strong> y baja
      <strong>${formatCOP(stepCOP)}</strong> cada <strong>${intervalMinutes} min</strong> hasta llegar a un mínimo de
      <strong>${formatCOP(minPrice)}</strong> (aprox. ${stepsNeeded} bajadas en ${totalMinutes} min).
    `;
  }

  form.addEventListener("input", updatePreview);
  updatePreview();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const businessName = document.getElementById("businessName").value.trim();
    const serviceName = document.getElementById("serviceName").value.trim();
    const category = document.getElementById("category").value;
    const location = document.getElementById("location").value.trim();
    const timeLabel = document.getElementById("timeLabel").value.trim();
    const startPrice = Number(document.getElementById("startPrice").value);
    const minPrice = Number(document.getElementById("minPrice").value);
    const intervalMinutes = Number(document.getElementById("intervalMinutes").value);
    const stepCOP = Number(document.getElementById("stepCOP").value);

    if (minPrice > startPrice) {
      showToast("El precio mínimo no puede ser mayor que el precio inicial.");
      return;
    }

    addSlot({
      businessName,
      serviceName,
      category,
      location,
      timeLabel,
      startPrice,
      minPrice,
      intervalMinutes,
      stepCOP
    });

    showToast("Hueco publicado. Ya aparece disponible en Inicio.");
    form.reset();
    updatePreview();
  });

  initSimControls();
}

export function initBookingsPage() {
  const list = document.getElementById("bookings-list");
  const bookings = getBookings();

  if (!bookings.length) {
    list.innerHTML = `<div class="empty-state">Aún no tienes reservas confirmadas.</div>`;
    return;
  }

  list.innerHTML = bookings
    .map(
      (b) => `
        <article class="slot-card">
          <div>
            <div class="slot-top">
              <span class="badge">Código: ${b.code}</span>
              <span class="timer-pill">Confirmada</span>
            </div>
            <h2 class="slot-title">${b.serviceName}</h2>
            <p class="slot-meta">${b.businessName} · ${b.location} · ${b.timeLabel}</p>
            <p class="slot-meta">A nombre de: <strong>${b.customerName}</strong> · ${b.reservedAt}</p>
          </div>
          <div class="price-box">
            <div class="price-row">
              <span class="current-price">${formatCOP(b.finalPrice)}</span>
              <span class="slot-meta">Precio acordado</span>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}
