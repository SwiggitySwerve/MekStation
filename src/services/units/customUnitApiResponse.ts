type UnitDetailsRecord = {
  readonly id: string;
  readonly chassis: string;
  readonly variant: string;
  readonly parsedData: Record<string, unknown>;
  readonly currentVersion?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUnitDetailsRecord(value: unknown): value is UnitDetailsRecord {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.chassis === 'string' &&
    typeof value.variant === 'string' &&
    isRecord(value.parsedData)
  );
}

export function parseCustomUnitDetailsResponse(
  value: unknown,
): UnitDetailsRecord {
  if (isUnitDetailsRecord(value)) {
    return value;
  }

  if (isRecord(value) && isUnitDetailsRecord(value.data)) {
    return value.data;
  }

  const message =
    isRecord(value) && typeof value.error === 'string'
      ? value.error
      : 'Unknown error';
  throw new Error(`Failed to get unit: ${message}`);
}
