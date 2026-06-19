export function recordField(
  value: unknown,
): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

export function numberField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): number | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

export function stringField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): string | undefined {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

export function stringArrayField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): readonly string[] {
  for (const fieldName of fieldNames) {
    const value = source?.[fieldName];
    if (Array.isArray(value)) {
      return value.filter(
        (entry): entry is string => typeof entry === 'string',
      );
    }
  }
  return [];
}

export function booleanField(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): boolean {
  return fieldNames.some((fieldName) => source?.[fieldName] === true);
}

export function normalizedKey(value: unknown): string {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, '')
    : '';
}

export function normalizedStringFields(
  source: Record<string, unknown> | undefined,
  ...fieldNames: readonly string[]
): readonly string[] {
  const values: string[] = [];
  for (const fieldName of fieldNames) {
    const normalized = normalizedKey(source?.[fieldName]);
    if (normalized && !values.includes(normalized)) {
      values.push(normalized);
    }
  }
  return values;
}
