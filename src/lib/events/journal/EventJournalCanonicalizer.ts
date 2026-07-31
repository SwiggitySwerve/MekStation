import { sha256 as sha256Pure } from 'js-sha256';

import {
  CURRENT_EVENT_CANONICALIZER_VERSION,
  type IEntityEventRef,
  type IStoredEvent,
} from './EventJournalContract';

export type EventJournalCanonicalizationFailureCode =
  | 'circular-reference'
  | 'duplicate-set-entry'
  | 'invalid-unicode'
  | 'non-finite-number'
  | 'sparse-array'
  | 'unsupported-canonicalizer-version'
  | 'unsupported-value';
export class EventJournalCanonicalizationError extends Error {
  public readonly name = 'EventJournalCanonicalizationError';

  public constructor(
    public readonly code: EventJournalCanonicalizationFailureCode,
    message: string,
  ) {
    super(message);
  }
}
export type EventDigestEnvelope<TPayload = unknown> = Omit<
  IStoredEvent<TPayload>,
  'eventDigest'
> &
  Partial<Pick<IStoredEvent<TPayload>, 'eventDigest'>>;
export interface ICanonicalEventDigest {
  readonly bytes: Uint8Array;
  readonly digest: string;
}
function fail(
  code: EventJournalCanonicalizationFailureCode,
  message: string,
): never {
  throw new EventJournalCanonicalizationError(code, message);
}
function assertValidUnicode(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) {
        fail('invalid-unicode', 'Lone high surrogate is not valid I-JSON');
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      fail('invalid-unicode', 'Lone low surrogate is not valid I-JSON');
    }
  }
}
function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
function canonicalize(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) {
        fail('non-finite-number', 'JCS supports only finite numbers');
      }
      return JSON.stringify(value);
    case 'string':
      assertValidUnicode(value);
      return JSON.stringify(value);
    case 'object':
      break;
    default:
      fail('unsupported-value', `JCS cannot represent ${typeof value}`);
  }

  if (ancestors.has(value)) {
    fail('circular-reference', 'JCS cannot represent circular references');
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          fail('sparse-array', 'JCS cannot represent sparse arrays');
        }
        items.push(canonicalize(value[index], ancestors));
      }
      return `[${items.join(',')}]`;
    }

    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      fail('unsupported-value', 'JCS input must contain plain JSON objects');
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      fail('unsupported-value', 'JCS cannot represent symbol properties');
    }

    const enumerableKeys = Object.keys(value);
    if (Object.getOwnPropertyNames(value).length !== enumerableKeys.length) {
      fail('unsupported-value', 'JCS cannot represent hidden properties');
    }

    const properties = enumerableKeys.sort(compareUtf16).map((key) => {
      assertValidUnicode(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) {
        fail('unsupported-value', 'JCS cannot represent accessor properties');
      }
      return `${JSON.stringify(key)}:${canonicalize(descriptor.value, ancestors)}`;
    });
    return `{${properties.join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalizeJsonV1(value: unknown): string {
  return canonicalize(value, new Set<object>());
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') {
    fail('unsupported-value', `${field} must be a string`);
  }
}

function sortedUniqueStrings(
  values: readonly string[],
  field: string,
): string[] {
  const sorted = [...values];
  for (const value of sorted) assertString(value, field);
  sorted.sort(compareUtf16);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === sorted[index - 1]) {
      fail('duplicate-set-entry', `${field} contains a duplicate entry`);
    }
  }
  return sorted;
}

function sortedUniqueEntityRefs(
  refs: readonly IEntityEventRef[],
): IEntityEventRef[] {
  const sorted = refs.map(({ entityType, entityId, role }) => {
    assertString(entityType, 'entityType');
    assertString(entityId, 'entityId');
    assertString(role, 'role');
    return { entityType, entityId, role };
  });
  sorted.sort(
    (left, right) =>
      compareUtf16(left.entityType, right.entityType) ||
      compareUtf16(left.entityId, right.entityId) ||
      compareUtf16(left.role, right.role),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      current.entityType === previous.entityType &&
      current.entityId === previous.entityId &&
      current.role === previous.role
    ) {
      fail('duplicate-set-entry', 'entityRefs contains a duplicate entry');
    }
  }
  return sorted;
}

export function canonicalizeEventDigestV1<TPayload>(
  event: EventDigestEnvelope<TPayload>,
): ICanonicalEventDigest {
  if (event.canonicalizerVersion !== CURRENT_EVENT_CANONICALIZER_VERSION) {
    fail(
      'unsupported-canonicalizer-version',
      `Canonicalizer v1 cannot encode version ${event.canonicalizerVersion}`,
    );
  }

  const material = {
    eventId: event.eventId,
    streamType: event.streamType,
    streamId: event.streamId,
    branchId: event.branchId,
    streamRevision: event.streamRevision,
    commitPosition: event.commitPosition,
    commandId: event.commandId,
    commandIndex: event.commandIndex,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    correlationId: event.correlationId,
    causationEventIds: sortedUniqueStrings(
      event.causationEventIds,
      'causationEventIds',
    ),
    actorKind: event.actorKind,
    actorId: event.actorId,
    authorityType: event.authorityType,
    authorityId: event.authorityId,
    occurredAt: event.occurredAt,
    recordedAt: event.recordedAt,
    canonicalizerVersion: event.canonicalizerVersion,
    previousStreamEventDigest: event.previousStreamEventDigest,
    payload: event.payload,
    entityRefs: sortedUniqueEntityRefs(event.entityRefs),
  };
  const bytes = new TextEncoder().encode(canonicalizeJsonV1(material));
  return { bytes, digest: sha256Pure(bytes) };
}
