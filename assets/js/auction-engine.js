export function formatCOP(amount) {
  const safe = Math.max(0, Math.round(Number(amount) || 0));
  return `$${safe.toLocaleString("es-CO")} COP`;
}

export function computeSlotState(slot, nowMs = Date.now(), offsetMinutes = 0) {
  const effectiveNow = nowMs + offsetMinutes * 60 * 1000;
  const elapsedMs = Math.max(0, effectiveNow - Number(slot.createdAt));
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  const intervalMin = Math.max(1, Number(slot.intervalMinutes) || 10);
  const stepCOP = Math.max(100, Number(slot.stepCOP) || 5000);
  const startPrice = Math.max(100, Number(slot.startPrice) || 0);
  const minPrice = Math.max(0, Math.min(startPrice, Number(slot.minPrice) || 0));

  const dropsCompleted = Math.floor(elapsedMinutes / intervalMin);
  const rawPrice = startPrice - dropsCompleted * stepCOP;
  const currentPrice = Math.max(minPrice, rawPrice);

  const reachedFloor = currentPrice <= minPrice;
  const secondsIntoInterval = Math.floor((elapsedMs % (intervalMin * 60000)) / 1000);
  const secondsToNextDrop = reachedFloor
    ? 0
    : Math.max(0, intervalMin * 60 - secondsIntoInterval);

  const totalDropRange = Math.max(1, startPrice - minPrice);
  const droppedSoFar = Math.max(0, startPrice - currentPrice);
  const progressPercent = Math.min(100, Math.round((droppedSoFar / totalDropRange) * 100));

  const discountPercent =
    startPrice > 0 ? Math.max(0, Math.round(((startPrice - currentPrice) / startPrice) * 100)) : 0;

  return {
    currentPrice,
    reachedFloor,
    dropsCompleted,
    secondsToNextDrop,
    progressPercent,
    discountPercent
  };
}

export function formatCountdown(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
