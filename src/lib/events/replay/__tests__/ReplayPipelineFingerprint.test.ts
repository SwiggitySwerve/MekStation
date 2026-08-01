import { SYNTHETIC_EVENT } from '../__fixtures__/ReplaySchemaRegistry.fixture';
import {
  ReplaySchemaRegistry,
  UnsupportedReplayHistoryError,
  type IReplayEventSchemaRegistration,
} from '../ReplaySchemaRegistry';

const { schemas: SCHEMAS, transitions: TRANSITIONS } = SYNTHETIC_EVENT;

function event(
  patch: Partial<IReplayEventSchemaRegistration> = {},
): IReplayEventSchemaRegistration {
  return {
    ...SYNTHETIC_EVENT,
    schemas: [...SCHEMAS],
    transitions: [...TRANSITIONS],
    ...patch,
  };
}

function identifiedEvent(eventType: string): IReplayEventSchemaRegistration {
  return event({
    eventType,
    schemas: SCHEMAS.map((schema) => ({
      ...schema,
      schemaId: `${eventType}.v${schema.schemaVersion}`,
    })),
    transitions: TRANSITIONS.map((transition) => ({
      ...transition,
      transitionId: `${eventType}.${transition.fromVersion}-to-${transition.toVersion}`,
    })),
  });
}

function registry(...events: IReplayEventSchemaRegistration[]) {
  return new ReplaySchemaRegistry({ events });
}

describe('ReplaySchemaRegistry fingerprintPipeline', () => {
  const v1History = [
    { eventType: SYNTHETIC_EVENT.eventType, schemaVersion: 1 },
  ] as const;

  it('returns a deterministic digest for empty history', () => {
    const subject = registry(event());

    const fingerprint = subject.fingerprintPipeline([]);

    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(subject.fingerprintPipeline([])).toBe(fingerprint);
  });

  it('ignores registration order, history order, and duplicate history', () => {
    const other = identifiedEvent('synthetic.unit-removed');
    const subject = registry(event(), other);
    const history = [
      ...v1History,
      { eventType: other.eventType, schemaVersion: 2 },
    ] as const;
    const fingerprint = subject.fingerprintPipeline(history);

    expect(registry(other, event()).fingerprintPipeline(history)).toBe(
      fingerprint,
    );
    expect(subject.fingerprintPipeline([...history].reverse())).toBe(
      fingerprint,
    );
    expect(subject.fingerprintPipeline([...history, ...v1History])).toBe(
      fingerprint,
    );
  });

  it('excludes schemas, events, and transitions unused by the history', () => {
    const changedUnusedIdentities = event({
      schemas: SCHEMAS.map((schema, index) => ({
        ...schema,
        schemaId: index === 0 ? 'unused' : schema.schemaId,
      })),
      transitions: TRANSITIONS.map((transition, index) => ({
        ...transition,
        transitionId: index === 0 ? 'unused' : transition.transitionId,
      })),
    });
    const history = [
      { eventType: SYNTHETIC_EVENT.eventType, schemaVersion: 2 },
    ] as const;

    const fingerprint = registry(event()).fingerprintPipeline(history);
    const withUnusedRegistrations = registry(
      identifiedEvent('synthetic.unused'),
      changedUnusedIdentities,
    ).fingerprintPipeline(history);

    expect(withUnusedRegistrations).toBe(fingerprint);
  });

  it('changes when a required target or transition identity changes', () => {
    const fingerprint = registry(event()).fingerprintPipeline(v1History);
    const changedTarget = event({
      schemas: SCHEMAS.map((schema) => ({
        ...schema,
        schemaId: `${schema.schemaId}.changed`,
      })),
    });
    const changedTransition = event({
      transitions: TRANSITIONS.map((transition) => ({
        ...transition,
        transitionId: `${transition.transitionId}.changed`,
      })),
    });

    expect([
      registry(changedTarget).fingerprintPipeline(v1History),
      registry(changedTransition).fingerprintPipeline(v1History),
    ]).not.toContain(fingerprint);
  });

  it.each([
    [
      'unknown-event-type',
      registry(event()),
      [{ eventType: 'unknown', schemaVersion: 1 }],
    ],
    [
      'unsupported-schema-version',
      registry(event()),
      [{ eventType: SYNTHETIC_EVENT.eventType, schemaVersion: 9 }],
    ],
    [
      'missing-transition',
      registry(event({ transitions: TRANSITIONS.slice(0, 1) })),
      v1History,
    ],
  ])(
    'fails unsupported required history with code %s',
    (code, subject, history) => {
      const run = () => subject.fingerprintPipeline(history);

      expect(run).toThrow(UnsupportedReplayHistoryError);
      expect(run).toThrow(expect.objectContaining({ code }));
    },
  );
});
