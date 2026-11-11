import type { IGameEvent } from '@/types/gameplay';

import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { createReplayBaselineDomainRegistry } from './ReplayBaselineDomainRegistry';
import { assertReplayInputProvenance } from './ReplayInputProvenanceManifest';
import {
  LEGACY_SOURCE_FORMATS,
  LegacySourceAttributionError,
  bindLegacyByteEvent,
  bindLegacyObjectEvent,
  type IAttributedLegacyEvent,
} from './ReplayLegacySourceAdapters';
import {
  UnsupportedReplayHistoryError,
  type ICurrentReplayPayload,
} from './ReplaySchemaRegistry';

/** One registry and one acceptance rule for readers and stored-image writers. */
export const REPLAY_SURFACE_REGISTRY = createReplayBaselineDomainRegistry();

export class ReplayUnverifiableEventError extends UnsupportedReplayHistoryError {
  constructor(eventType: string, schemaVersion: number) {
    super(
      'invalid-payload',
      eventType,
      schemaVersion,
      'The recording writer marked this event unverifiable.',
    );
  }
}

const HOST_STAMPED_FORMATS: ReadonlySet<string> = new Set(['match-broadcast']);
const HOST_STAMP_KEYS = ['rolls', 'intentId'] as const;

/** Host transport stamps stay in consumed envelopes, outside canonical payloads. */
export function splitHostStamps(
  formatId: string,
  payload: unknown,
): { canonical: unknown; stamped: boolean } {
  if (
    !HOST_STAMPED_FORMATS.has(formatId) ||
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  )
    return { canonical: payload, stamped: false };
  const record = payload as Record<string, unknown>;
  if (HOST_STAMP_KEYS.every((key) => !(key in record)))
    return { canonical: payload, stamped: false };
  const canonical: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!(HOST_STAMP_KEYS as readonly string[]).includes(key))
      canonical[key] = value;
  }
  return { canonical, stamped: true };
}

export interface IAcceptedReplayEvent {
  readonly event: IGameEvent;
  readonly current: ICurrentReplayPayload;
}

/** Attribution owns version/Unicode; this owns envelope, mark, schema and provenance acceptance. */
export function acceptAttributedReplayEvent(
  attributed: IAttributedLegacyEvent,
  formatId: string,
  invalidEnvelopeMessage = 'Stored record is not a valid IGameEvent envelope',
): IAcceptedReplayEvent {
  const event = attributed.payload;
  if (!isGameEvent(event))
    throw new UnsupportedReplayHistoryError(
      'invalid-payload',
      attributed.eventType,
      attributed.schemaVersion,
      invalidEnvelopeMessage,
    );
  if (event.replayIntegrity !== undefined)
    throw new ReplayUnverifiableEventError(
      event.type,
      attributed.schemaVersion,
    );
  const { canonical } = splitHostStamps(formatId, event.payload);
  const current = REPLAY_SURFACE_REGISTRY.upcast(
    event.type,
    attributed.schemaVersion,
    canonical,
  );
  assertReplayInputProvenance(current.eventType, current.payload);
  return { event, current };
}

/** Bind the writer's exact stored image using the reader-owned source-format/version contract. */
export function acceptReplayStoredImage(
  image: IGameEvent,
  formatId: string,
): IAcceptedReplayEvent {
  const format = LEGACY_SOURCE_FORMATS.find(
    (entry) => entry.formatId === formatId,
  );
  if (!format)
    throw new LegacySourceAttributionError(
      'unknown-source-format',
      formatId,
      0,
      `Unknown legacy source format ${formatId}`,
    );
  const attributed =
    format.binding === 'byte-backed'
      ? bindLegacyByteEvent(
          format.formatId,
          format.formatVersion,
          new TextEncoder().encode(JSON.stringify(image)),
        )
      : bindLegacyObjectEvent(format.formatId, format.formatVersion, image);
  return acceptAttributedReplayEvent(attributed, formatId);
}
