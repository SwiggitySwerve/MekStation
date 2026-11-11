import { isDeepStrictEqual } from 'node:util';

export interface ChangedDocumentField {
  readonly path: readonly string[];
  readonly present: boolean;
  readonly value: unknown;
}

export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseBody(body: string | null | undefined): unknown {
  try {
    return body ? JSON.parse(body) : undefined;
  } catch {
    return undefined;
  }
}

export function putBaseVersion(
  body: string | null | undefined,
): number | undefined {
  const parsed = parseBody(body);
  return isJsonRecord(parsed) &&
    typeof parsed.baseVersion === 'number' &&
    Number.isSafeInteger(parsed.baseVersion) &&
    parsed.baseVersion >= 0
    ? parsed.baseVersion
    : undefined;
}

function document(
  body: string | null | undefined,
): Record<string, unknown> | undefined {
  const parsed = parseBody(body);
  return isJsonRecord(parsed) &&
    isJsonRecord(parsed.envelope) &&
    isJsonRecord(parsed.envelope.body)
    ? parsed.envelope.body
    : undefined;
}

export function fieldPointer(field: ChangedDocumentField): string {
  return (
    '/' +
    field.path
      .map((key) => key.replaceAll('~', '~0').replaceAll('/', '~1'))
      .join('/')
  );
}

/** Diff document values, excluding envelope metadata and the CAS token. */
export function compareAcknowledgedPut(
  postData: string | null | undefined,
  acknowledged: string | undefined,
):
  | { readonly comparable: false; readonly reason: string }
  | {
      readonly comparable: true;
      readonly fields: readonly ChangedDocumentField[];
    } {
  if (acknowledged === undefined) {
    return {
      comparable: false,
      reason:
        'no acknowledged PUT predecessor for this resource in this test (fail closed)',
    };
  }
  const current = document(postData);
  const previous = document(acknowledged);
  if (!current || !previous) {
    return {
      comparable: false,
      reason:
        'request or acknowledged PUT has no parseable object envelope.body (fail closed)',
    };
  }
  const fields: ChangedDocumentField[] = [];
  const visit = (
    before: unknown,
    after: unknown,
    path: readonly string[],
    present: boolean,
  ): void => {
    if (present && isDeepStrictEqual(before, after)) return;
    if (present && isJsonRecord(before) && isJsonRecord(after)) {
      for (const key of [
        ...new Set([...Object.keys(before), ...Object.keys(after)]),
      ].sort()) {
        visit(
          before[key],
          after[key],
          [...path, key],
          Object.hasOwn(after, key),
        );
      }
    } else {
      // Arrays, object replacement, additions and removals are atomic. This
      // preserves array order and distinguishes absence from JSON null.
      fields.push({ path, present, value: after });
    }
  };
  visit(previous, current, [], true);
  return { comparable: true, fields };
}

export function storedFieldMatches(
  stored: unknown,
  field: ChangedDocumentField,
): boolean {
  let value = stored;
  for (const key of field.path) {
    if (!isJsonRecord(value) || !Object.hasOwn(value, key))
      return !field.present;
    value = value[key];
  }
  return field.present && isDeepStrictEqual(value, field.value);
}

export function diffAcknowledgedPut(
  postData: string | null | undefined,
  acknowledged: string | undefined,
): string {
  const comparison = compareAcknowledgedPut(postData, acknowledged);
  if (!comparison.comparable) return comparison.reason;
  return comparison.fields.length === 0
    ? 'identical document: redundant write at navigation'
    : `changed document fields (JSON pointers relative to envelope.body): ${comparison.fields.map(fieldPointer).join(', ')}`;
}
