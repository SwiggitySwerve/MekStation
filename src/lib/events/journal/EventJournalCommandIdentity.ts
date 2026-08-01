import { sha256 } from 'js-sha256';

import type * as Journal from './EventJournalContract';

import {
  canonicalizeJsonV1,
  normalizeEntityRefsV1,
  normalizeStringSetV1,
} from './EventJournalCanonicalizer';

export interface ICanonicalCommandIdentity<TPayload = unknown> {
  readonly command: Journal.IAppendEventBatch<TPayload>;
  readonly bytes: Uint8Array;
  readonly digest: string;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function canonicalizeCommandIdentityV1<TPayload>(
  input: Journal.IAppendEventBatch<TPayload>,
): ICanonicalCommandIdentity<TPayload> {
  const cloned = JSON.parse(
    canonicalizeJsonV1(input),
  ) as Journal.IAppendEventBatch<TPayload>;
  const command: Journal.IAppendEventBatch<TPayload> = {
    ...cloned,
    events: cloned.events.map((event) => ({
      ...event,
      causationEventIds: normalizeStringSetV1(
        event.causationEventIds,
        'causationEventIds',
      ),
      entityRefs: normalizeEntityRefsV1(event.entityRefs),
    })),
  };
  const bytes = new TextEncoder().encode(canonicalizeJsonV1(command));
  return { command: deepFreeze(command), bytes, digest: sha256(bytes) };
}
