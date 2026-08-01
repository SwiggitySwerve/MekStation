import { canonicalizeJsonV1 } from '../../journal/EventJournalCanonicalizer';
import { SYNTHETIC_EVENT } from '../__fixtures__/ReplaySchemaRegistry.fixture';
import {
  ReplaySchemaRegistrationError,
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
function registry(...events: IReplayEventSchemaRegistration[]) {
  return new ReplaySchemaRegistry({ events });
}
function invalidPayload(payload: unknown) {
  return () => registry(event()).upcast(SYNTHETIC_EVENT.eventType, 1, payload);
}
function appendSchema(schema = SCHEMAS[0]) {
  return event({ schemas: [...SCHEMAS, schema] });
}
function appendTransition(transition = TRANSITIONS[0]) {
  return event({ transitions: [...TRANSITIONS, transition] });
}
function captureError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected operation to fail');
}
describe('ReplaySchemaRegistry', () => {
  it('upcasts deterministically without changing source payload bytes', () => {
    const payload = { label: 'Atlas', tags: ['assault'] };
    const before = new TextEncoder().encode(canonicalizeJsonV1(payload));
    const subject = registry(event());
    const first = subject.upcast('synthetic.unit-added', 1, payload);
    expect(first).toEqual({
      eventType: 'synthetic.unit-added',
      schemaVersion: 3,
      payload: {
        label: 'Atlas',
        tags: ['assault'],
        count: 0,
        active: true,
      },
    });
    expect(subject.upcast('synthetic.unit-added', 1, payload)).toEqual(first);
    expect(first.payload).not.toBe(payload);
    expect(Object.isFrozen(first.payload)).toBe(true);
    expect(Object.isFrozen((first.payload as { tags: string[] }).tags)).toBe(
      true,
    );
    expect(new TextEncoder().encode(canonicalizeJsonV1(payload))).toEqual(
      before,
    );
  });
  it('snapshots registrations before callers can mutate them', () => {
    const schema = { ...SCHEMAS[0] };
    const transition = { ...TRANSITIONS[0] };
    const subject = registry(
      event({
        schemas: [schema, ...SCHEMAS.slice(1)],
        transitions: [transition, ...TRANSITIONS.slice(1)],
      }),
    );
    schema.parse = () => ({ broken: true });
    transition.upcast = () => ({ broken: true });
    expect(
      subject.upcast('synthetic.unit-added', 1, { label: 'Atlas', tags: [] }),
    ).toMatchObject({ schemaVersion: 3, payload: { count: 0, active: true } });
  });
  it.each([
    ['unknown-event-type', () => registry(event()).upcast('unknown', 1, {})],
    [
      'unsupported-schema-version',
      () => registry(event()).upcast('synthetic.unit-added', 9, {}),
    ],
    [
      'missing-transition',
      () =>
        registry(event({ transitions: TRANSITIONS.slice(0, 1) })).upcast(
          'synthetic.unit-added',
          1,
          { label: 'Atlas', tags: [] },
        ),
    ],
    [
      'invalid-payload',
      invalidPayload({ label: 'Atlas', tags: [], extra: true }),
    ],
    ['invalid-payload', invalidPayload({ label: 'Atlas' })],
    ['invalid-payload', invalidPayload({ label: 'Atlas', tags: [9] })],
  ])('fails unsupported history with code %s', (code, run) => {
    const error = captureError(run);
    expect(error).toBeInstanceOf(UnsupportedReplayHistoryError);
    expect(error).toMatchObject({ code });
  });
  it.each([
    ['duplicate-schema-registration', () => registry(appendSchema())],
    ['duplicate-event-registration', () => registry(event(), event())],
    [
      'conflicting-schema-registration',
      () =>
        registry(
          appendSchema({
            ...SCHEMAS[0],
            schemaId: 'synthetic.unit-added.alternative-v1',
          }),
        ),
    ],
    [
      'conflicting-target-registration',
      () => registry(event(), event({ targetSchemaVersion: 2 })),
    ],
    [
      'ambiguous-transition',
      () =>
        registry(
          appendTransition({
            ...TRANSITIONS[0],
            transitionId: 'synthetic.unit-added.alternative-1-to-2',
          }),
        ),
    ],
    ['duplicate-transition-registration', () => registry(appendTransition())],
    [
      'invalid-transition',
      () =>
        registry(
          appendTransition({
            fromVersion: 1,
            toVersion: 3,
            transitionId: 'synthetic.unit-added.1-to-3',
            upcast: (payload) => payload,
          }),
        ),
    ],
  ])('rejects invalid registration with code %s', (code, run) => {
    const error = captureError(run);
    expect(error).toBeInstanceOf(ReplaySchemaRegistrationError);
    expect(error).toMatchObject({ code });
  });
});
