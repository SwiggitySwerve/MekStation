import { execFileSync } from 'node:child_process';

import type { IStoredEvent } from '../EventJournalContract';

import {
  EVENT_JOURNAL_CANONICALIZER_V1_EXPECTED_SHA256,
  EVENT_JOURNAL_CANONICALIZER_V1_EXPECTED_UTF8_HEX,
  EVENT_JOURNAL_CANONICALIZER_V1_FIXTURE,
  type ICanonicalizerFixturePayload,
} from '../__fixtures__/EventJournalCanonicalizer.v1.fixture';
import {
  canonicalizeEventDigestV1,
  canonicalizeJsonV1,
  EventJournalCanonicalizationError,
} from '../EventJournalCanonicalizer';

type FixtureEvent = IStoredEvent<ICanonicalizerFixturePayload>;
const fixture = EVENT_JOURNAL_CANONICALIZER_V1_FIXTURE as FixtureEvent;
function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}
function digestWith(overrides: Partial<FixtureEvent>): string {
  return canonicalizeEventDigestV1({ ...fixture, ...overrides }).digest;
}
describe('canonicalizeJsonV1', () => {
  it('matches the RFC 8785 primitive and recursive ordering sample', () => {
    expect(
      canonicalizeJsonV1({
        numbers: [333333333.33333329, 1e30, 4.5, 0.002, 1e-27],
        string: '€$\u000f\nA\'B"\\\\"/',
        literals: [null, true, false],
      }),
    ).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}',
    );
  });

  it('sorts non-ASCII property names by raw UTF-16 code units', () => {
    const canonical = canonicalizeJsonV1({
      '€': 'Euro Sign',
      '\r': 'Carriage Return',
      דּ: 'Hebrew Letter Dalet With Dagesh',
      '1': 'One',
      '😀': 'Emoji: Grinning Face',
      '\u0080': 'Control',
      ö: 'Latin Small Letter O With Diaeresis',
    });
    expect(canonical).toBe(
      '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    );
    expect(bytesToHex(new TextEncoder().encode(canonical))).toBe(
      '7b225c72223a2243617272696167652052657475726e222c2231223a224f6e65222c22c280223a22436f6e74726f6c222c22c3b6223a224c6174696e20536d616c6c204c6574746572204f205769746820446961657265736973222c22e282ac223a224575726f205369676e222c22f09f9880223a22456d6f6a693a204772696e6e696e672046616365222c22efacb3223a22486562726577204c65747465722044616c6574205769746820446167657368227d',
    );
  });

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite number %s',
    (value) => {
      expect(() => canonicalizeJsonV1({ value })).toThrow(
        EventJournalCanonicalizationError,
      );
    },
  );

  it.each([
    ['undefined', { value: undefined }],
    ['bigint', { value: BigInt(1) }],
    ['function', { value: () => undefined }],
    ['symbol', { value: Symbol('unsupported') }],
    ['date', { value: new Date('2026-07-31T00:00:00.000Z') }],
  ])('rejects unsupported %s values', (_label, value) => {
    expect(() => canonicalizeJsonV1(value)).toThrow(
      EventJournalCanonicalizationError,
    );
  });

  it('rejects sparse arrays, cycles, and lone UTF-16 surrogates', () => {
    const sparse = Array.from({ length: 2 }) as unknown[];
    sparse[1] = 'present';
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    for (const value of [sparse, cyclic, '\ud800', '\udc00']) {
      expect(() => canonicalizeJsonV1(value)).toThrow(
        EventJournalCanonicalizationError,
      );
    }
  });
});

describe('canonicalizeEventDigestV1', () => {
  it('publishes stable canonical UTF-8 bytes and lowercase SHA-256', () => {
    const result = canonicalizeEventDigestV1(fixture);
    expect(bytesToHex(result.bytes)).toBe(
      EVENT_JOURNAL_CANONICALIZER_V1_EXPECTED_UTF8_HEX,
    );
    expect(result.digest).toBe(EVENT_JOURNAL_CANONICALIZER_V1_EXPECTED_SHA256);
  });

  it('sorts set-like fields without mutating them and preserves payload arrays', () => {
    const result = canonicalizeEventDigestV1(fixture);
    const json = JSON.parse(new TextDecoder().decode(result.bytes)) as {
      causationEventIds: string[];
      entityRefs: Array<{ entityType: string; entityId: string; role: string }>;
      payload: { orderedSteps: string[] };
    };

    expect(json.causationEventIds).toEqual(['event-a', 'event-z']);
    expect(json.entityRefs).toEqual([
      { entityType: 'pilot', entityId: 'pilot-0001', role: 'actor' },
      { entityType: 'unit', entityId: 'unit-0001', role: 'subject' },
      { entityType: 'unit', entityId: 'unit-0002', role: 'target' },
    ]);
    expect(json.payload.orderedSteps).toEqual(['third', 'first', 'second']);
    expect(fixture.causationEventIds).toEqual(['event-z', 'event-a']);
    expect(fixture.entityRefs[0].entityId).toBe('unit-0002');
  });

  it('is independent of object and set input order', () => {
    const reordered = {
      ...fixture,
      causationEventIds: [...fixture.causationEventIds].reverse(),
      entityRefs: [...fixture.entityRefs].reverse(),
      payload: {
        unicode: fixture.payload.unicode,
        orderedSteps: fixture.payload.orderedSteps,
        numbers: fixture.payload.numbers,
        nested: { a: 'first', z: 'last' },
      },
    } satisfies FixtureEvent;

    expect(canonicalizeEventDigestV1(reordered)).toEqual(
      canonicalizeEventDigestV1(fixture),
    );
  });

  it('does not normalize Unicode', () => {
    expect(
      digestWith({ payload: { ...fixture.payload, unicode: 'é' } }),
    ).not.toBe(canonicalizeEventDigestV1(fixture).digest);
  });

  const includedMutations: ReadonlyArray<
    readonly [string, Partial<FixtureEvent>]
  > = [
    ['eventId', { eventId: 'event-0003' }],
    ['streamType', { streamType: 'campaign' }],
    ['streamId', { streamId: 'match-0002' }],
    ['branchId', { branchId: 'candidate' as 'root' }],
    ['streamRevision', { streamRevision: 3 }],
    ['commitPosition', { commitPosition: 8 }],
    ['commandId', { commandId: 'command-0003' }],
    ['commandIndex', { commandIndex: 1 }],
    ['eventType', { eventType: 'UnitMoved' }],
    ['eventVersion', { eventVersion: 2 }],
    ['correlationId', { correlationId: 'correlation-0002' }],
    ['causationEventIds', { causationEventIds: ['event-a'] }],
    ['actorKind', { actorKind: 'system' }],
    ['actorId', { actorId: 'system-0001' }],
    ['authorityType', { authorityType: 'campaign-host' }],
    ['authorityId', { authorityId: 'host-0002' }],
    ['occurredAt', { occurredAt: '2026-07-31T12:00:01.000Z' }],
    ['recordedAt', { recordedAt: '2026-07-31T12:00:01.123Z' }],
    ['previousStreamEventDigest', { previousStreamEventDigest: null }],
    [
      'payload',
      { payload: { ...fixture.payload, nested: { a: 'changed', z: 'last' } } },
    ],
    ['entityRefs', { entityRefs: fixture.entityRefs.slice(1) }],
  ];

  it.each(includedMutations)(
    'changes the digest when %s changes',
    (_name, change) => {
      expect(digestWith(change)).not.toBe(
        canonicalizeEventDigestV1(fixture).digest,
      );
    },
  );

  it('excludes the digest and adapter-only storage fields', () => {
    const withStorageOnlyFields = {
      ...fixture,
      eventDigest: 'a'.repeat(64),
      adapterRowId: 999,
    } as FixtureEvent;

    expect(canonicalizeEventDigestV1(withStorageOnlyFields)).toEqual(
      canonicalizeEventDigestV1(fixture),
    );
  });

  it('rejects unsupported canonicalizer versions and duplicate set entries', () => {
    expect(() => digestWith({ canonicalizerVersion: 2 })).toThrow(
      EventJournalCanonicalizationError,
    );
    expect(() =>
      digestWith({ causationEventIds: ['event-a', 'event-a'] }),
    ).toThrow(EventJournalCanonicalizationError);
    expect(() =>
      digestWith({
        entityRefs: [fixture.entityRefs[0], fixture.entityRefs[0]],
      }),
    ).toThrow(EventJournalCanonicalizationError);
  });

  it('repeats the published digest in isolated Node processes', () => {
    const script = [
      "import { canonicalizeEventDigestV1 } from './src/lib/events/journal/EventJournalCanonicalizer.ts';",
      "import { EVENT_JOURNAL_CANONICALIZER_V1_FIXTURE } from './src/lib/events/journal/__fixtures__/EventJournalCanonicalizer.v1.fixture.ts';",
      'process.stdout.write(canonicalizeEventDigestV1(EVENT_JOURNAL_CANONICALIZER_V1_FIXTURE).digest);',
    ].join('');
    const run = () =>
      execFileSync(
        process.execPath,
        ['node_modules/tsx/dist/cli.mjs', '--eval', script],
        { cwd: process.cwd(), encoding: 'utf8' },
      );

    expect(run()).toBe(EVENT_JOURNAL_CANONICALIZER_V1_EXPECTED_SHA256);
    expect(run()).toBe(EVENT_JOURNAL_CANONICALIZER_V1_EXPECTED_SHA256);
  });
});
