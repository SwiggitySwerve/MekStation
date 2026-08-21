/**
 * Legacy source-format adapter contract (replay-safety PR 2).
 *
 * Pins: the named-format inventory is the only door to baseline v1; byte- and
 * object-backed bindings capture pre-normalization evidence whose digest
 * survives caller mutation; unknown format/version, binding mismatch,
 * ambiguous attribution, and the generic missing-version fallback all fail
 * closed with typed source identity.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import {
  bindLegacyByteEvent,
  bindLegacyObjectEvent,
  LEGACY_SOURCE_FORMATS,
  LegacySourceAttributionError,
  requireJournalEventVersion,
} from '../ReplayLegacySourceAdapters';

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof LegacySourceAttributionError) return error.code;
    throw error;
  }
  throw new Error('expected LegacySourceAttributionError');
}

const combatLine = (payload: object): Uint8Array =>
  new TextEncoder().encode(
    JSON.stringify({
      id: 'evt-1',
      gameId: 'game-1',
      sequence: 4,
      timestamp: '3025-01-03T00:00:00.000Z',
      type: 'DamageApplied',
      payload,
    }),
  );

const campaignEnvelope = {
  sequence: 9,
  campaignId: 'campaign-legacy',
  ts: '3025-01-03T00:00:00.000Z',
  authorPlayerId: 'pid-host',
  type: 'FundsChanged',
  payload: { delta: -1000, reason: 'repair', balance: 4_999_000 },
};

describe('legacy source-format adapters', () => {
  it('names exactly the four readable versionless formats', () => {
    expect(
      LEGACY_SOURCE_FORMATS.map((f) => `${f.formatId}@${f.formatVersion}`),
    ).toEqual([
      'simulation-report-jsonl@1',
      'match-log-idb@2',
      'campaign-sync-envelope@1',
      // Added by replay-safety PR 19B for the live catch-up surface.
      'match-broadcast@1',
    ]);
    expect(Object.isFrozen(LEGACY_SOURCE_FORMATS)).toBe(true);
  });

  it('binds a byte-backed line to its exact raw bytes at baseline v1', () => {
    const raw = combatLine({ amount: 5, location: 'CT' });
    const attributed = bindLegacyByteEvent('simulation-report-jsonl', 1, raw);

    expect(attributed.eventType).toBe('DamageApplied');
    expect(attributed.schemaVersion).toBe(1);
    expect(attributed.source.binding).toBe('byte-backed');
    expect(attributed.source.evidenceByteLength).toBe(raw.byteLength);
    expect(attributed.source.evidenceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(attributed.payload)).toBe(true);
  });

  it('byte evidence survives caller mutation of the passed buffer', () => {
    const raw = combatLine({ amount: 5, location: 'CT' });
    const attributed = bindLegacyByteEvent('simulation-report-jsonl', 1, raw);
    const digestBefore = attributed.source.evidenceDigest;

    raw.fill(0);

    const fresh = bindLegacyByteEvent(
      'simulation-report-jsonl',
      1,
      combatLine({ amount: 5, location: 'CT' }),
    );
    expect(attributed.source.evidenceDigest).toBe(digestBefore);
    expect(fresh.source.evidenceDigest).toBe(digestBefore);
    expect(
      (attributed.payload as { payload: { amount: number } }).payload.amount,
    ).toBe(5);
  });

  it('binds an object-backed record to a canonical snapshot that survives record mutation', () => {
    // Deep copy: the test mutates nested payload fields and must not leak
    // into the shared module fixture.
    const record: Record<string, unknown> = JSON.parse(
      JSON.stringify(campaignEnvelope),
    ) as Record<string, unknown>;
    const attributed = bindLegacyObjectEvent(
      'campaign-sync-envelope',
      1,
      record,
    );
    const digestBefore = attributed.source.evidenceDigest;
    const snapshotBefore = attributed.source.canonicalSnapshot;

    record['type'] = 'CampaignDayAdvanced';
    (record['payload'] as { balance: number }).balance = 0;

    expect(attributed.eventType).toBe('FundsChanged');
    expect(attributed.source.evidenceDigest).toBe(digestBefore);
    expect(attributed.source.canonicalSnapshot).toBe(snapshotBefore);
    expect(
      (attributed.payload as { payload: { balance: number } }).payload.balance,
    ).toBe(4_999_000);
    expect(() => {
      (attributed.payload as { type: string }).type = 'mutated';
    }).toThrow();
  });

  it('object-backed digests are canonical-encoding stable, not key-order sensitive', () => {
    const reordered = {
      type: 'FundsChanged',
      payload: { balance: 4_999_000, reason: 'repair', delta: -1000 },
      authorPlayerId: 'pid-host',
      ts: '3025-01-03T00:00:00.000Z',
      campaignId: 'campaign-legacy',
      sequence: 9,
    };
    expect(
      bindLegacyObjectEvent('campaign-sync-envelope', 1, campaignEnvelope)
        .source.evidenceDigest,
    ).toBe(
      bindLegacyObjectEvent('campaign-sync-envelope', 1, reordered).source
        .evidenceDigest,
    );
  });

  it('accepts the match-log IndexedDB record shape at its DB version', () => {
    const attributed = bindLegacyObjectEvent('match-log-idb', 2, {
      id: 'evt-2',
      gameId: 'game-2',
      sequence: 1,
      timestamp: '3025-01-03T00:00:00.000Z',
      type: 'GameCreated',
      payload: {},
    });
    expect(attributed.eventType).toBe('GameCreated');
    expect(attributed.source.formatVersion).toBe(2);
  });

  it('rejects unknown format, unknown version, and binding mismatch with typed source identity', () => {
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('unknown-format', 1, campaignEnvelope),
      ),
    ).toBe('unknown-source-format');
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('campaign-sync-envelope', 7, campaignEnvelope),
      ),
    ).toBe('unknown-format-version');
    expect(
      codeOf(() =>
        bindLegacyByteEvent(
          'campaign-sync-envelope',
          1,
          combatLine({ amount: 1 }),
        ),
      ),
    ).toBe('binding-mismatch');
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('simulation-report-jsonl', 1, campaignEnvelope),
      ),
    ).toBe('binding-mismatch');
    try {
      bindLegacyObjectEvent('unknown-format', 3, campaignEnvelope);
    } catch (error) {
      const typed = error as LegacySourceAttributionError;
      expect(typed.formatId).toBe('unknown-format');
      expect(typed.formatVersion).toBe(3);
    }
  });

  it('rejects records carrying their own version identity as ambiguous attribution', () => {
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('campaign-sync-envelope', 1, {
          ...campaignEnvelope,
          eventVersion: 3,
        }),
      ),
    ).toBe('ambiguous-attribution');
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('campaign-sync-envelope', 1, {
          ...campaignEnvelope,
          schemaVersion: 1,
        }),
      ),
    ).toBe('ambiguous-attribution');
  });

  it('rejects structurally invalid source events', () => {
    expect(
      codeOf(() =>
        bindLegacyByteEvent(
          'simulation-report-jsonl',
          1,
          new TextEncoder().encode('not json {'),
        ),
      ),
    ).toBe('invalid-source-event');
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('campaign-sync-envelope', 1, ['array']),
      ),
    ).toBe('invalid-source-event');
    expect(
      codeOf(() =>
        bindLegacyObjectEvent('campaign-sync-envelope', 1, {
          ...campaignEnvelope,
          type: '',
        }),
      ),
    ).toBe('invalid-source-event');
  });

  it('journal envelopes require an explicit eventVersion — no implicit default', () => {
    expect(requireJournalEventVersion({ eventVersion: 4 })).toBe(4);
    expect(codeOf(() => requireJournalEventVersion({}))).toBe(
      'missing-event-version',
    );
    expect(codeOf(() => requireJournalEventVersion({ eventVersion: 0 }))).toBe(
      'missing-event-version',
    );
    expect(
      codeOf(() => requireJournalEventVersion({ eventVersion: '1' })),
    ).toBe('missing-event-version');
  });
});
