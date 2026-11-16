export function normalizeWeights(weights: number[]) {
  if (weights.length === 0) return [];
  const safe = weights.map((weight) => Math.max(0, Math.round(Number.isFinite(weight) ? weight : 0)));
  const total = safe.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return equalWeights(weights.length);
  const scaled = safe.map((weight) => Math.floor((weight * 100) / total));
  let remainder = 100 - scaled.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % scaled.length) {
    scaled[index] += 1;
    remainder -= 1;
  }
  return scaled;
}

export function equalWeights(count: number) {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function adjustBoundary(weights: number[], boundaryIndex: number, delta: number) {
  const next = [...weights];
  if (boundaryIndex < 0 || boundaryIndex >= next.length - 1) return next;
  const amount = Math.round(delta);
  const applied = Math.max(-next[boundaryIndex], Math.min(next[boundaryIndex + 1], amount));
  next[boundaryIndex] += applied;
  next[boundaryIndex + 1] -= applied;
  return next;
}

export function allocateAll(count: number, selectedIndex: number) {
  return Array.from({ length: count }, (_, index) => index === selectedIndex ? 100 : 0);
}

export function cumulativeBoundaries(weights: number[]) {
  let total = 0;
  return weights.slice(0, -1).map((weight) => {
    total += weight;
    return total;
  });
}
