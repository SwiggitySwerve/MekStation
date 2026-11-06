// R7 linear interpolation: rank = (n - 1) * p. Shared by all CI consumers.
export function quantile(values, probability) {
  if (
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1 ||
    values.some((value) => !Number.isFinite(value))
  )
    throw new RangeError('Invalid quantile input');
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * probability;
  const lower = Math.floor(rank),
    upper = Math.ceil(rank),
    fraction = rank - lower;
  if (lower === upper) return sorted[lower];
  // Preserve the existing median's arithmetic for scheduling weights.
  return fraction === 0.5
    ? (sorted[lower] + sorted[upper]) / 2
    : sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

export const median = (values) => quantile(values, 0.5);
