import type { ISaveResult } from './CustomUnitApiService';

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

/** Keep the legacy save result while retaining the import route's diagnostics. */
export function parseUnitImportResponse(
  value: unknown,
  ok: boolean,
  status: number,
): ISaveResult {
  const result = isRecord(value) ? value : {};
  const data = isRecord(result.data) ? result.data : {};
  const error = isRecord(result.error) ? result.error : {};
  const strings = (items: unknown): string[] | undefined =>
    Array.isArray(items)
      ? items.filter((item): item is string => typeof item === 'string')
      : undefined;
  if (ok && typeof data.unitId === 'string' && data.unitId) {
    return {
      success: true,
      id: data.unitId,
      version: 1,
      ...(Array.isArray(data.warnings)
        ? { warnings: strings(data.warnings) }
        : {}),
    };
  }
  return {
    success: false,
    error:
      typeof result.error === 'string'
        ? result.error
        : typeof error.message === 'string'
          ? error.message
          : 'Failed to import unit',
    requiresRename: status === 409,
    suggestedName:
      typeof error.suggestedName === 'string'
        ? { chassis: '', variant: '', suggestedVariant: error.suggestedName }
        : undefined,
    validationErrors: strings(error.validationErrors),
    warnings: strings(error.warnings),
  };
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
