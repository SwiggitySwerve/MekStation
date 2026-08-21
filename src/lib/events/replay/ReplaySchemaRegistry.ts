import { canonicalizeJsonV1 } from '../journal/EventJournalCanonicalizer';
import {
  fingerprintReplayPipeline,
  type IHistoricalEventVersion,
} from './ReplayPipelineFingerprint';
import {
  assertReplayIdentity,
  assertReplayVersion,
  indexReplaySchemas,
  indexReplayTransitions,
  type IndexedReplayEvent,
} from './ReplaySchemaRegistryIndex';
export type { IHistoricalEventVersion } from './ReplayPipelineFingerprint';
export type ReplaySchemaRegistrationErrorCode =
  | 'ambiguous-transition'
  | 'conflicting-schema-registration'
  | 'conflicting-target-registration'
  | 'duplicate-event-registration'
  | 'duplicate-schema-registration'
  | 'duplicate-transition-registration'
  | 'invalid-registration'
  | 'invalid-transition';
type RegCode = ReplaySchemaRegistrationErrorCode;
export class ReplaySchemaRegistrationError extends Error {
  public readonly name = 'ReplaySchemaRegistrationError';
  public constructor(
    public readonly code: RegCode,
    message: string,
  ) {
    super(message);
  }
}
export type UnsupportedReplayHistoryCode =
  | 'invalid-payload'
  | 'missing-required-input'
  | 'missing-transition'
  | 'unknown-event-type'
  | 'unsupported-schema-version'
  | 'upcast-failed';
export class UnsupportedReplayHistoryError extends Error {
  public readonly name = 'UnsupportedReplayHistoryError';
  public constructor(
    public readonly code: UnsupportedReplayHistoryCode,
    public readonly eventType: string,
    public readonly schemaVersion: number,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
export interface IReplaySchemaVersionRegistration {
  readonly schemaVersion: number;
  readonly schemaId: string;
  readonly parse: (payload: unknown) => unknown;
}
export interface IReplayUpcastRegistration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly transitionId: string;
  readonly upcast: (payload: unknown) => unknown;
}
export interface IReplayEventSchemaRegistration {
  readonly eventType: string;
  readonly targetSchemaVersion: number;
  readonly schemas: readonly IReplaySchemaVersionRegistration[];
  readonly transitions: readonly IReplayUpcastRegistration[];
}
export interface IReplaySchemaRegistryDefinition {
  readonly events: readonly IReplayEventSchemaRegistration[];
}
export interface ICurrentReplayPayload {
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: unknown;
}
function registrationFailure(code: RegCode, message: string): never {
  throw new ReplaySchemaRegistrationError(code, message);
}
function unsupported(
  code: UnsupportedReplayHistoryCode,
  eventType: string,
  schemaVersion: number,
  message: string,
  cause?: unknown,
): never {
  throw new UnsupportedReplayHistoryError(
    code,
    eventType,
    schemaVersion,
    message,
    cause,
  );
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function clonePayload(value: unknown): unknown {
  return deepFreeze(JSON.parse(canonicalizeJsonV1(value)));
}
export class ReplaySchemaRegistry {
  private readonly events = new Map<string, IndexedReplayEvent>();
  public constructor(definition: IReplaySchemaRegistryDefinition) {
    for (const candidate of definition.events) {
      assertReplayIdentity(
        candidate.eventType,
        'eventType',
        registrationFailure,
      );
      assertReplayVersion(
        candidate.targetSchemaVersion,
        'targetSchemaVersion',
        registrationFailure,
      );
      const existing = this.events.get(candidate.eventType);
      if (existing)
        registrationFailure(
          existing.targetSchemaVersion === candidate.targetSchemaVersion
            ? 'duplicate-event-registration'
            : 'conflicting-target-registration',
          `Event registration already exists for ${candidate.eventType}`,
        );

      const schemas = indexReplaySchemas(candidate, registrationFailure);
      const transitions = indexReplayTransitions(
        candidate,
        schemas,
        registrationFailure,
      );
      if (!schemas.has(candidate.targetSchemaVersion))
        registrationFailure(
          'invalid-registration',
          `Target schema is not registered for ${candidate.eventType}`,
        );
      this.events.set(
        candidate.eventType,
        Object.freeze({
          eventType: candidate.eventType,
          targetSchemaVersion: candidate.targetSchemaVersion,
          schemas,
          transitions,
        }),
      );
    }
  }
  public upcast(
    eventType: string,
    fromVersion: number,
    payload: unknown,
  ): ICurrentReplayPayload {
    const { event, transitions } = this.resolvePath(eventType, fromVersion);
    let current = this.parsePayload(event, fromVersion, payload);
    for (const transition of transitions) {
      try {
        current = transition.upcast(current);
      } catch (cause) {
        unsupported(
          'upcast-failed',
          eventType,
          transition.fromVersion,
          `Upcast ${transition.transitionId} failed`,
          cause,
        );
      }
      current = this.parsePayload(event, transition.toVersion, current);
    }
    return Object.freeze({
      eventType,
      schemaVersion: event.targetSchemaVersion,
      payload: current,
    });
  }
  public fingerprintPipeline(
    historicalVersions: readonly IHistoricalEventVersion[],
  ): string {
    return fingerprintReplayPipeline(
      historicalVersions,
      ({ eventType, schemaVersion }) =>
        this.resolvePath(eventType, schemaVersion),
      registrationFailure,
    );
  }
  private resolvePath(
    eventType: string,
    fromVersion: number,
  ): {
    event: IndexedReplayEvent;
    transitions: readonly IReplayUpcastRegistration[];
  } {
    const event = this.events.get(eventType);
    if (!event)
      unsupported(
        'unknown-event-type',
        eventType,
        fromVersion,
        `Event type ${eventType} is not registered`,
      );
    if (!event.schemas.has(fromVersion))
      unsupported(
        'unsupported-schema-version',
        eventType,
        fromVersion,
        `Schema v${fromVersion} is not registered for ${eventType}`,
      );
    const transitions: IReplayUpcastRegistration[] = [];
    for (
      let version = fromVersion;
      version < event.targetSchemaVersion;
      version += 1
    ) {
      const transition = event.transitions.get(version);
      if (!transition)
        unsupported(
          'missing-transition',
          eventType,
          version,
          `No transition is registered from ${eventType} v${version}`,
        );
      transitions.push(transition);
    }
    return { event, transitions };
  }
  private parsePayload(
    event: IndexedReplayEvent,
    schemaVersion: number,
    payload: unknown,
  ): unknown {
    const schema = event.schemas.get(schemaVersion);
    if (!schema)
      registrationFailure('invalid-registration', 'Missing indexed schema');
    try {
      return clonePayload(schema.parse(clonePayload(payload)));
    } catch (cause) {
      unsupported(
        'invalid-payload',
        event.eventType,
        schemaVersion,
        `Payload does not match ${schema.schemaId}`,
        cause,
      );
    }
  }
}
