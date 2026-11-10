import { stagedContract } from '../../contracts/__tests__/contractCompletion.fixtures';
import {
  judgeLifecycleGate,
  scanLifecycleRequirement,
} from '../lifecycleReaderGate';

const v2 = stagedContract();
const legacy = { ...stagedContract(), id: 'legacy' } as Record<string, unknown>;
delete legacy.lifecycleRulesVersion;
delete legacy.lifecycle;

const bodyWith = (...contracts: unknown[]) => ({
  missions: contracts.map((c, i) => [`m${i}`, c]),
  contractMarket: { offers: [], declinedOfferIds: [] },
});

describe('scanLifecycleRequirement', () => {
  it('is 1 for legacy, absent, empty and non-object bodies', () => {
    for (const body of [
      bodyWith(legacy),
      bodyWith({ ...legacy, lifecycleRulesVersion: 1 }),
      { missions: [] },
      {},
      null,
      'text',
      { missions: 'not-an-array' },
    ]) {
      expect(scanLifecycleRequirement(body)).toEqual({
        required: 1,
        unreadable: false,
      });
    }
  });

  it('reads the highest version across missions and market offers', () => {
    expect(scanLifecycleRequirement(bodyWith(legacy, v2))).toEqual({
      required: 2,
      unreadable: false,
    });
    expect(
      scanLifecycleRequirement({
        missions: [],
        contractMarket: {
          offers: [{ ...v2, lifecycleRulesVersion: 5 }],
          declinedOfferIds: [],
        },
      }),
    ).toEqual({ required: 5, unreadable: false });
  });

  it('flags an unreadable value without raising the requirement', () => {
    for (const bad of [0, -1, 1.5, null, '2']) {
      expect(
        scanLifecycleRequirement(
          bodyWith({ ...v2, lifecycleRulesVersion: bad }),
        ),
      ).toEqual({ required: 1, unreadable: true });
    }
  });
});

describe('judgeLifecycleGate', () => {
  const stored = bodyWith(v2);
  const clean = bodyWith(legacy);
  const NEWER = 'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED';

  it('allows when nothing needs more than the reader', () => {
    expect(
      judgeLifecycleGate({
        operation: 'write',
        reader: { level: 1, declared: true },
        bodies: [{ source: 'stored', body: clean }],
      }),
    ).toEqual({ kind: 'allow' });
  });

  it('refuses a too-old reader with 426 naming the stored source', () => {
    expect(
      judgeLifecycleGate({
        operation: 'read',
        reader: { level: 1, declared: false },
        bodies: [{ source: 'stored', body: stored }],
      }),
    ).toEqual({
      kind: 'refuse',
      status: 426,
      code: NEWER,
      reason: 'lifecycle-rules-unsupported',
      requiredLifecycleRules: 2,
      readerLifecycleRules: 1,
      source: 'stored',
    });
  });

  it('allows a reader whose declared level covers the requirement', () => {
    expect(
      judgeLifecycleGate({
        operation: 'read',
        reader: { level: 2, declared: true },
        bodies: [{ source: 'stored', body: stored }],
      }),
    ).toEqual({ kind: 'allow' });
  });

  it('names the first body, in the order given, that trips the gate', () => {
    const verdict = judgeLifecycleGate({
      operation: 'write',
      reader: { level: 1, declared: true },
      bodies: [
        { source: 'incoming', body: bodyWith(v2) },
        {
          source: 'stored',
          body: bodyWith({ ...v2, lifecycleRulesVersion: 3 }),
        },
      ],
    });
    expect(verdict).toMatchObject({
      kind: 'refuse',
      status: 426,
      source: 'incoming',
      // The requirement is the highest of every body, so the message is true
      // for whichever one the caller fixes first.
      requiredLifecycleRules: 3,
    });
  });

  describe('an unreadable version value (answer 7)', () => {
    const unreadable = bodyWith({ ...v2, lifecycleRulesVersion: 'two' });

    it('is read-only for a reader that declares itself, with a diagnostic', () => {
      expect(
        judgeLifecycleGate({
          operation: 'read',
          reader: { level: 1, declared: true },
          bodies: [{ source: 'stored', body: unreadable }],
        }),
      ).toEqual({
        kind: 'allow-read-only',
        diagnostic: 'unreadable-contract-version',
      });
    });

    it('refuses every write, even from a declared reader, with a named code', () => {
      expect(
        judgeLifecycleGate({
          operation: 'write',
          reader: { level: 1, declared: true },
          bodies: [{ source: 'stored', body: unreadable }],
        }),
      ).toEqual({
        kind: 'refuse',
        status: 422,
        code: 'CAMPAIGN_LIFECYCLE_RULES_UNREADABLE',
        reason: 'lifecycle-rules-unreadable',
        requiredLifecycleRules: null,
        readerLifecycleRules: 1,
        source: 'stored',
      });
    });

    it('is a 426 only for a reader that cannot display it (header absent)', () => {
      for (const operation of ['read', 'write'] as const) {
        expect(
          judgeLifecycleGate({
            operation,
            reader: { level: 1, declared: false },
            bodies: [{ source: 'stored', body: unreadable }],
          }),
        ).toMatchObject({
          kind: 'refuse',
          status: 426,
          code: NEWER,
          requiredLifecycleRules: null,
        });
      }
    });
  });
});
