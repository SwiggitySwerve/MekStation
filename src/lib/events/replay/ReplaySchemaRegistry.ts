import { canonicalizeJsonV1 } from '../journal/EventJournalCanonicalizer';
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
type IndexedEvent = Readonly<{
  eventType: string;
  targetSchemaVersion: number;
  schemas: ReadonlyMap<number, IReplaySchemaVersionRegistration>;
  transitions: ReadonlyMap<number, IReplayUpcastRegistration>;
}>;
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
function assertIdentity(value: string, field: string): void {
  if (value.trim().length === 0)
    registrationFailure('invalid-registration', `${field} must not be empty`);
}
function assertVersion(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 1)
    registrationFailure(
      'invalid-registration',
      `${field} must be a positive safe integer`,
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
  private readonly events = new Map<string, IndexedEvent>();
  public constructor(definition: IReplaySchemaRegistryDefinition) {
    for (const candidate of definition.events) {
      assertIdentity(candidate.eventType, 'eventType');
      assertVersion(candidate.targetSchemaVersion, 'targetSchemaVersion');
      const existing = this.events.get(candidate.eventType);
      if (existing)
        registrationFailure(
          existing.targetSchemaVersion === candidate.targetSchemaVersion
            ? 'duplicate-event-registration'
            : 'conflicting-target-registration',
          `Event registration already exists for ${candidate.eventType}`,
        );

      const schemas = this.indexSchemas(candidate);
      const transitions = this.indexTransitions(candidate, schemas);
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
  private indexSchemas(
    event: IReplayEventSchemaRegistration,
  ): Map<number, IReplaySchemaVersionRegistration> {
    const schemas = new Map<number, IReplaySchemaVersionRegistration>();
    for (const schema of event.schemas) {
      assertIdentity(schema.schemaId, 'schemaId');
      assertVersion(schema.schemaVersion, 'schemaVersion');
      if (schema.schemaVersion > event.targetSchemaVersion)
        registrationFailure(
          'invalid-registration',
          `Schema exceeds the target for ${event.eventType}`,
        );
      const existing = schemas.get(schema.schemaVersion);
      if (existing)
        registrationFailure(
          existing.schemaId === schema.schemaId
            ? 'duplicate-schema-registration'
            : 'conflicting-schema-registration',
          `Schema v${schema.schemaVersion} already exists for ${event.eventType}`,
        );
      schemas.set(schema.schemaVersion, Object.freeze({ ...schema }));
    }
    return schemas;
  }
  private indexTransitions(
    event: IReplayEventSchemaRegistration,
    schemas: ReadonlyMap<number, IReplaySchemaVersionRegistration>,
  ): Map<number, IReplayUpcastRegistration> {
    const transitions = new Map<number, IReplayUpcastRegistration>();
    for (const transition of event.transitions) {
      assertIdentity(transition.transitionId, 'transitionId');
      assertVersion(transition.fromVersion, 'fromVersion');
      assertVersion(transition.toVersion, 'toVersion');
      if (
        transition.toVersion !== transition.fromVersion + 1 ||
        !schemas.has(transition.fromVersion) ||
        !schemas.has(transition.toVersion)
      )
        registrationFailure(
          'invalid-transition',
          `${transition.transitionId} must join adjacent registered schemas`,
        );
      const existing = transitions.get(transition.fromVersion);
      if (existing)
        registrationFailure(
          existing.transitionId === transition.transitionId
            ? 'duplicate-transition-registration'
            : 'ambiguous-transition',
          `Transition from v${transition.fromVersion} is not unique`,
        );
      transitions.set(transition.fromVersion, Object.freeze({ ...transition }));
    }
    return transitions;
  }
  private resolvePath(
    eventType: string,
    fromVersion: number,
  ): {
    event: IndexedEvent;
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
    event: IndexedEvent,
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
