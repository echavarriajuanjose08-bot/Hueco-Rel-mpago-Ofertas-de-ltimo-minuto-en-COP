const SLOTS_KEY = "hueco_relampago_slots_v1";
const BOOKINGS_KEY = "hueco_relampago_bookings_v1";
const OFFSET_KEY = "hueco_relampago_offset_min_v1";

const DEFAULT_SLOTS = [
  {
    id: "slot-demo-1",
    businessName: "Barbería Central",
    serviceName: "Corte clásico + perfilado de barba",
    category: "Barbería & Estética",
    location: "Centro",
    timeLabel: "Hoy · 4:30 PM",
    startPrice: 45000,
    minPrice: 25000,
    intervalMinutes: 10,
    stepCOP: 5000,
    createdAt: Date.now() - 4 * 60 * 1000,
    status: "AVAILABLE"
  },
  {
    id: "slot-demo-2",
    businessName: "Clínica Dental Norte",
    serviceName: "Limpieza dental y valoración",
    category: "Odontología & Salud",
    location: "Norte",
    timeLabel: "Hoy · 5:15 PM",
    startPrice: 120000,
    minPrice: 75000,
    intervalMinutes: 15,
    stepCOP: 15000,
    createdAt: Date.now() - 7 * 60 * 1000,
    status: "AVAILABLE"
  },
  {
    id: "slot-demo-3",
    businessName: "Studio Fuerza Activa",
    serviceName: "Sesión personalizada de entrenamiento",
    category: "Entrenamiento",
    location: "La Pradera",
    timeLabel: "Hoy · 6:00 PM",
    startPrice: 60000,
    minPrice: 30000,
    intervalMinutes: 5,
    stepCOP: 5000,
    createdAt: Date.now() - 2 * 60 * 1000,
    status: "AVAILABLE"
  }
];

export function getSlots() {
  const raw = localStorage.getItem(SLOTS_KEY);
  if (!raw) {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(DEFAULT_SLOTS));
    return [...DEFAULT_SLOTS];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...DEFAULT_SLOTS];
  }
}

export function saveSlots(slots) {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

export function addSlot(newSlotData) {
  const slots = getSlots();
  const created = {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...newSlotData,
    createdAt: Date.now(),
    status: "AVAILABLE"
  };
  slots.unshift(created);
  saveSlots(slots);
  return created;
}

export function clearDemoSlots() {
  const slots = getSlots().filter((s) => !s.id.startsWith("slot-demo-"));
  saveSlots(slots);
}

export function getBookings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function reserveSlot(slotId, customerName, lockedPrice) {
  const slots = getSlots();
  const targetIndex = slots.findIndex((s) => s.id === slotId);
  if (targetIndex === -1) {
    return { ok: false, message: "El hueco no existe." };
  }
  if (slots[targetIndex].status !== "AVAILABLE") {
    return { ok: false, message: "Este hueco ya fue reservado." };
  }

  slots[targetIndex].status = "RESERVED";
  saveSlots(slots);

  const bookings = getBookings();
  const booking = {
    code: `HR-${Math.floor(100000 + Math.random() * 900000)}`,
    slotId,
    businessName: slots[targetIndex].businessName,
    serviceName: slots[targetIndex].serviceName,
    category: slots[targetIndex].category,
    location: slots[targetIndex].location,
    timeLabel: slots[targetIndex].timeLabel,
    customerName: customerName.trim(),
    finalPrice: lockedPrice,
    reservedAt: new Date().toLocaleString("es-CO")
  };
  bookings.unshift(booking);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));

  return { ok: true, booking };
}

export function getSimOffsetMinutes() {
  return Number(localStorage.getItem(OFFSET_KEY) || 0);
}

export function addSimOffsetMinutes(mins) {
  const next = getSimOffsetMinutes() + Number(mins);
  localStorage.setItem(OFFSET_KEY, String(next));
  return next;
}

export function resetSimOffsetMinutes() {
  localStorage.setItem(OFFSET_KEY, "0");
  return 0;
}
