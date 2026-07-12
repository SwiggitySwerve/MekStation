const MEANINGFUL_PAYLOAD_KEYS = [
  'name',
  'damage',
  'target',
  'source',
  'amount',
  'skill',
  'result',
  'location',
] as const;

/**
 * Generate the concise, human-readable payload summary used by timeline rows.
 */
export function generatePayloadSummary(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const objectPayload = payload as Record<string, unknown>;
  const keys = Object.keys(objectPayload);
  if (keys.length === 0) {
    return '';
  }

  for (const key of MEANINGFUL_PAYLOAD_KEYS) {
    const value = objectPayload[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return `${key}: ${value}`;
    }
  }

  const firstKey = keys[0];
  const firstValue =
    firstKey === undefined ? undefined : objectPayload[firstKey];
  if (
    typeof firstValue === 'string' ||
    typeof firstValue === 'number' ||
    typeof firstValue === 'boolean'
  ) {
    return `${firstKey}: ${firstValue}`;
  }

  return `${keys.length} field${keys.length !== 1 ? 's' : ''}`;
}
