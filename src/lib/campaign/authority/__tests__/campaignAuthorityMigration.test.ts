/**
 * Campaign authority migration laws (task 5.2 / design D10).
 *
 * Pins: baseline import writes exactly one CampaignSnapshotPublished at
 * sequence 0 with source digest metadata and no fabricated history (empty
 * stream required, retries hit the duplicate guard); shadow parity equality
 * cuts over while a mismatch blocks truthfully preserving BOTH evidence
 * digests; the first journal-authority command records exactly once; the
 * rollback law (only while head == baseline and no journal command); and
 * fingerprint-bound materializations go stale on a pipeline change even
 * with an unchanged projector version and digest.
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import {
  appendCampaignCommandBatch,
  computeCampaignStateDigest,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import {
  advanceAfterShadowParity,
  CAMPAIGN_PROJECTOR_VERSION,
  campaignSchemaPipelineFingerprint,
  createJournalNativeMarker,
  createLegacyMarker,
  evaluateShadowParity,
  importCampaignBaseline,
  isMaterializedSnapshotCompatible,
  recordFirstJournalAuthorityCommand,
  rollbackToSnapshotAuthority,
  type ICampaignCutoverMarker,
} from '../campaignAuthorityMigration';

const NOW = '3025-01-03T00:00:00.000Z';

function state(balance: number): ICampaignAuthoritativeState {
  return {
    campaignId: 'campaign-migrate',
    day: 4,
    balance,
    rosterUnits: {},
    pilots: {},
    contracts: {},
    factionStanding: {},
    salvagePool: 0,
  };
}

describe('campaign authority migration', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;

  beforeEach(() => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
  });

  async function importedMarker(): Promise<ICampaignCutoverMarker> {
    const result = await importCampaignBaseline(journal, {
      campaignId: 'campaign-migrate',
      state: state(1_000_000),
      sourceSnapshotRevision: 7,
      importedAt: NOW,
    });
    expect(result.kind).toBe('imported');
    if (result.kind !== 'imported') throw new Error('unreachable');
    return result.marker;
  }

  it('imports a snapshot-only campaign as one explicit baseline event', async () => {
    const marker = await importedMarker();

    expect(marker.state).toBe('shadowing');
    expect(marker.importedBaseline).toEqual({
      sourceSnapshotRevision: 7,
      sourceSnapshotDigest: computeCampaignStateDigest(state(1_000_000)),
      baselineSequence: 0,
      baselineCommandId: 'campaign-baseline:campaign-migrate',
      importedAt: NOW,
    });
    expect(marker.projectorVersion).toBe(CAMPAIGN_PROJECTOR_VERSION);
    expect(marker.schemaPipelineFingerprint).toBe(
      campaignSchemaPipelineFingerprint(),
    );

    const store = new JournalCampaignEventStore(journal);
    const events = await store.getEvents('campaign-migrate');
    expect(events).toHaveLength(1);
    expect(events[0].sequence).toBe(0);
    expect(events[0].type).toBe('CampaignSnapshotPublished');
    expect(events[0].authorPlayerId).toBe('migration');

    const rows = await journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-migrate',
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(rows[0].actorKind).toBe('migration');
    expect(rows[0].payload.expectedPostStateDigest).toBe(
      computeCampaignStateDigest(state(1_000_000)),
    );
  });

  it('refuses to fabricate history: non-empty streams and retries fail typed', async () => {
    await importedMarker();

    const retry = await importCampaignBaseline(journal, {
      campaignId: 'campaign-migrate',
      state: state(999),
      sourceSnapshotRevision: 8,
      importedAt: NOW,
    });
    // Same campaign, same deterministic import command id: the journal's
    // command-identity guard fires before anything appends.
    expect(retry).toEqual({
      kind: 'duplicate-import',
      commandId: 'campaign-baseline:campaign-migrate',
    });

    const store = new JournalCampaignEventStore(journal);
    expect(await store.highestSequence('campaign-migrate')).toBe(0);
  });

  it('cuts over on shadow parity equality and blocks truthfully on mismatch', async () => {
    const marker = await importedMarker();

    const equal = evaluateShadowParity(state(1_000_000), state(1_000_000));
    expect(equal.equal).toBe(true);
    const journalState = advanceAfterShadowParity(marker, equal);
    expect(journalState.kind).toBe('ok');
    if (journalState.kind !== 'ok') return;
    expect(journalState.marker.state).toBe('journal');
    expect(journalState.marker.blocked).toBeNull();

    const mismatch = evaluateShadowParity(state(1_000_000), state(999_999));
    expect(mismatch.equal).toBe(false);
    const blocked = advanceAfterShadowParity(marker, mismatch);
    expect(blocked.kind).toBe('ok');
    if (blocked.kind !== 'ok') return;
    expect(blocked.marker.state).toBe('blocked');
    expect(blocked.marker.blocked).toEqual({
      reason: 'shadow-projection-mismatch',
      journalDigest: mismatch.journalDigest,
      snapshotDigest: mismatch.snapshotDigest,
    });
    expect(blocked.marker.blocked?.journalDigest).not.toBe(
      blocked.marker.blocked?.snapshotDigest,
    );
  });

  it('rejects parity advancement from any non-shadowing state', () => {
    for (const marker of [
      createLegacyMarker('campaign-migrate'),
      createJournalNativeMarker('campaign-migrate'),
    ]) {
      const result = advanceAfterShadowParity(
        marker,
        evaluateShadowParity(state(1), state(1)),
      );
      expect(result.kind).toBe('invalid-transition');
    }
  });

  it('records exactly one first journal-authority command, idempotently', () => {
    const journalMarker = createJournalNativeMarker('campaign-migrate');

    const first = recordFirstJournalAuthorityCommand(journalMarker, 'cmd-1');
    expect(first.kind).toBe('ok');
    if (first.kind !== 'ok') return;
    expect(first.marker.firstJournalAuthorityCommandId).toBe('cmd-1');

    expect(recordFirstJournalAuthorityCommand(first.marker, 'cmd-1').kind).toBe(
      'ok',
    );
    expect(recordFirstJournalAuthorityCommand(first.marker, 'cmd-2').kind).toBe(
      'invalid-transition',
    );
    expect(
      recordFirstJournalAuthorityCommand(
        createLegacyMarker('campaign-migrate'),
        'cmd-1',
      ).kind,
    ).toBe('invalid-transition');
  });

  it('permits snapshot-authority rollback only at the imported baseline head', async () => {
    const marker = await importedMarker();
    const store = new JournalCampaignEventStore(journal);

    const allowed = rollbackToSnapshotAuthority(
      marker,
      await store.highestSequence('campaign-migrate'),
    );
    expect(allowed.kind).toBe('rolled-back');
    if (allowed.kind !== 'rolled-back') return;
    expect(allowed.marker.state).toBe('legacy');
    // Rollback never deletes journal rows.
    expect(await store.highestSequence('campaign-migrate')).toBe(0);

    // Head past the baseline: prohibited.
    await appendCampaignCommandBatch(journal, {
      campaignId: 'campaign-migrate',
      commandId: 'cmd-after-baseline',
      events: [
        {
          sequence: 1,
          campaignId: 'campaign-migrate',
          ts: NOW,
          authorPlayerId: 'pid-host',
          type: 'CampaignDayAdvanced',
          payload: { newDay: 5 },
        } as never,
      ],
      expectedPostStateDigest: null,
    });
    expect(
      rollbackToSnapshotAuthority(
        marker,
        await store.highestSequence('campaign-migrate'),
      ),
    ).toEqual({
      kind: 'rollback-prohibited',
      reason: 'journal-head-past-baseline',
    });

    // A recorded journal-authority command prohibits rollback regardless.
    const withCommand: ICampaignCutoverMarker = {
      ...marker,
      state: 'journal',
      firstJournalAuthorityCommandId: 'cmd-after-baseline',
    };
    expect(rollbackToSnapshotAuthority(withCommand, 0)).toEqual({
      kind: 'rollback-prohibited',
      reason: 'journal-authority-command-committed',
    });
  });

  it('invalidates a materialized snapshot on a fingerprint change even with matching projector and digest', () => {
    const fingerprint = campaignSchemaPipelineFingerprint();
    const meta = {
      branchId: 'root' as const,
      revision: 12,
      projectorVersion: CAMPAIGN_PROJECTOR_VERSION,
      schemaPipelineFingerprint: fingerprint,
      stateDigest: computeCampaignStateDigest(state(1)),
    };
    expect(
      isMaterializedSnapshotCompatible(meta, {
        projectorVersion: CAMPAIGN_PROJECTOR_VERSION,
        schemaPipelineFingerprint: fingerprint,
      }),
    ).toBe(true);
    // The D10 fixture: pipeline changed, projector version and digest
    // untouched - the materialization is stale anyway.
    expect(
      isMaterializedSnapshotCompatible(meta, {
        projectorVersion: CAMPAIGN_PROJECTOR_VERSION,
        schemaPipelineFingerprint: 'f'.repeat(64),
      }),
    ).toBe(false);
    expect(
      isMaterializedSnapshotCompatible(meta, {
        projectorVersion: CAMPAIGN_PROJECTOR_VERSION + 1,
        schemaPipelineFingerprint: fingerprint,
      }),
    ).toBe(false);
  });

  it('derives a stable non-trivial campaign pipeline fingerprint', () => {
    expect(campaignSchemaPipelineFingerprint()).toMatch(/^[0-9a-f]{64}$/);
    expect(campaignSchemaPipelineFingerprint()).toBe(
      campaignSchemaPipelineFingerprint(),
    );
  });
});
