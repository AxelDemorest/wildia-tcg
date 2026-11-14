/**
 * Pure farm accrual for tests and docs.
 * Must match SQL: floor(ratePerSecond * deltaSeconds * multiplier)
 */
export function computeFarmAccrual(
  ratePerSecond: number,
  deltaSeconds: number,
  multiplier = 1,
): number {
  if (deltaSeconds <= 0 || ratePerSecond <= 0) return 0;
  return Math.floor(ratePerSecond * deltaSeconds * multiplier);
}

export function aggregateFarmRate(
  entries: { farmRateBase: number; quantity: number }[],
): number {
  return entries.reduce((sum, e) => sum + e.farmRateBase * e.quantity, 0);
}
