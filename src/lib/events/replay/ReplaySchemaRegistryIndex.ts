import type {
  IReplayEventSchemaRegistration,
  IReplaySchemaVersionRegistration,
  IReplayUpcastRegistration,
  ReplaySchemaRegistrationErrorCode,
} from './ReplaySchemaRegistry';

export type IndexedReplayEvent = Readonly<{
  eventType: string;
  targetSchemaVersion: number;
  schemas: ReadonlyMap<number, IReplaySchemaVersionRegistration>;
  transitions: ReadonlyMap<number, IReplayUpcastRegistration>;
}>;

type RegistrationFailure = (
  code: ReplaySchemaRegistrationErrorCode,
  message: string,
) => never;

export function assertReplayIdentity(
  value: string,
  field: string,
  registrationFailure: RegistrationFailure,
): void {
  if (value.trim().length === 0)
    registrationFailure('invalid-registration', `${field} must not be empty`);
}

export function assertReplayVersion(
  value: number,
  field: string,
  registrationFailure: RegistrationFailure,
): void {
  if (!Number.isSafeInteger(value) || value < 1)
    registrationFailure(
      'invalid-registration',
      `${field} must be a positive safe integer`,
    );
}

export function indexReplaySchemas(
  event: IReplayEventSchemaRegistration,
  registrationFailure: RegistrationFailure,
): Map<number, IReplaySchemaVersionRegistration> {
  const schemas = new Map<number, IReplaySchemaVersionRegistration>();
  for (const schema of event.schemas) {
    assertReplayIdentity(schema.schemaId, 'schemaId', registrationFailure);
    assertReplayVersion(
      schema.schemaVersion,
      'schemaVersion',
      registrationFailure,
    );
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

export function indexReplayTransitions(
  event: IReplayEventSchemaRegistration,
  schemas: ReadonlyMap<number, IReplaySchemaVersionRegistration>,
  registrationFailure: RegistrationFailure,
): Map<number, IReplayUpcastRegistration> {
  const transitions = new Map<number, IReplayUpcastRegistration>();
  for (const transition of event.transitions) {
    assertReplayIdentity(
      transition.transitionId,
      'transitionId',
      registrationFailure,
    );
    assertReplayVersion(
      transition.fromVersion,
      'fromVersion',
      registrationFailure,
    );
    assertReplayVersion(transition.toVersion, 'toVersion', registrationFailure);
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
