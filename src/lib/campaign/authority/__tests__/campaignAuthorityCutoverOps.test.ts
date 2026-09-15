/**
 * The operator surfaces for cutover and rollback (task 5.7, D10).
 *
 * The parity gate and the rollback law were both built, both correct, and
 * both unreachable: neither `runCampaignShadowParity` nor
 * `rollbackToSnapshotAuthority` had a production caller, so a campaign
 * that entered `shadowing` had no route to `journal` or `blocked`, and a
 * campaign entitled to its snapshot back had no route at all.
 *
 * These rows are about the COMPOSITION, not the machinery underneath it
 * (which has its own suites): what the tools read, what they refuse and
 * with which typed answer, what they persist, and what a second run does.
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';
import type { ICampaignMarkerIo } from '../campaignLegacyAdoption';

import { freezeCampaignEvent } from '../../sync/campaignEventScope';
import { JournalCampaignEventStore } from '../../sync/JournalCampaignEventStore';
import {
  rollbackCampaignAuthority,
  runCampaignParityCutover,
  type ICampaignAuthorityCutoverDeps,
} from '../campaignAuthorityCutoverOps';
import {
  createJournalNativeMarker,
  importCampaignBaseline,
  recordFirstJournalAuthorityCommand,
} from '../campaignAuthorityMigration';
import { resolveCampaignAuthorityMode } from '../campaignAuthorityMode';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-cutover-ops';
const OPENING_BALANCE = 500_000;

function stateWithBalance(balance: number): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), balance };
}

describe('campaign authority cutover operator surfaces', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;
  let stored: Map<string, ICampaignCutoverMarker>;
  let snapshots: Map<string, ICampaignAuthoritativeState>;
  let writes: ICampaignCutoverMarker[];
  let deps: ICampaignAuthorityCutoverDeps;

  const markerIo = (): ICampaignMarkerIo => ({
    read: (campaignId) => stored.get(campaignId) ?? null,
    write: (marker) => {
      writes.push(marker);
      stored.set(marker.campaignId, marker);
    },
  });

  /** Imports a baseline so the campaign is genuinely `shadowing`. */
  async function shadowing(
    balance = OPENING_BALANCE,
  ): Promise<ICampaignCutoverMarker> {
    const result = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: stateWithBalance(balance),
      sourceSnapshotRevision: 4,
      importedAt: NOW,
    });
    if (result.kind !== 'imported') throw new Error(result.kind);
    stored.set(CAMPAIGN_ID, result.marker);
    return result.marker;
  }

  beforeEach(() => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    stored = new Map();
    snapshots = new Map();
    writes = [];
    deps = {
      journal: () => journal,
      markerIo: markerIo(),
      readSnapshotProjection: (campaignId) => snapshots.get(campaignId) ?? null,
    };
  });

  describe('parity cutover', () => {
    it('cuts a shadowing campaign over when the projections agree', async () => {
      await shadowing();
      snapshots.set(CAMPAIGN_ID, stateWithBalance(OPENING_BALANCE));

      const outcome = await runCampaignParityCutover(deps, CAMPAIGN_ID);

      expect(outcome.kind).toBe('cutover');
      // Persisted, not merely returned: a cutover the operator was told
      // about but the database never recorded is the worst of both.
      expect(stored.get(CAMPAIGN_ID)?.state).toBe('journal');
      expect(
        resolveCampaignAuthorityMode({
          marker: stored.get(CAMPAIGN_ID) ?? null,
          journalHasStream: true,
        }),
      ).toEqual({ kind: 'journal' });
    });

    it('blocks on a mismatch and keeps both digests', async () => {
      await shadowing();
      snapshots.set(CAMPAIGN_ID, stateWithBalance(OPENING_BALANCE + 1));

      const outcome = await runCampaignParityCutover(deps, CAMPAIGN_ID);

      expect(outcome.kind).toBe('blocked');
      if (outcome.kind !== 'blocked') return;
      // A human has to be able to see WHICH two things disagreed.
      expect(outcome.journalDigest).not.toBe(outcome.snapshotDigest);
      const marker = stored.get(CAMPAIGN_ID);
      expect(marker?.state).toBe('blocked');
      expect(marker?.blocked?.journalDigest).toBe(outcome.journalDigest);
      expect(marker?.blocked?.snapshotDigest).toBe(outcome.snapshotDigest);
    });

    it('refuses a campaign that is not shadowing, naming the state', async () => {
      stored.set(CAMPAIGN_ID, createJournalNativeMarker(CAMPAIGN_ID));
      snapshots.set(CAMPAIGN_ID, stateWithBalance(OPENING_BALANCE));

      const outcome = await runCampaignParityCutover(deps, CAMPAIGN_ID);

      expect(outcome).toEqual({ kind: 'not-shadowing', state: 'journal' });
      expect(writes).toEqual([]);
    });

    it('refuses a campaign with no marker at all', async () => {
      const outcome = await runCampaignParityCutover(deps, CAMPAIGN_ID);

      expect(outcome).toEqual({ kind: 'marker-absent' });
      expect(writes).toEqual([]);
    });

    it('refuses when no snapshot projection is available to compare', async () => {
      // Defaulting to an empty campaign would either block a healthy one
      // or "prove" equality against an empty journal.
      await shadowing();

      const outcome = await runCampaignParityCutover(deps, CAMPAIGN_ID);

      expect(outcome).toEqual({ kind: 'snapshot-absent' });
      expect(writes).toEqual([]);
    });

    it('is idempotent: the second run declines instead of re-comparing', async () => {
      await shadowing();
      snapshots.set(CAMPAIGN_ID, stateWithBalance(OPENING_BALANCE));
      const first = await runCampaignParityCutover(deps, CAMPAIGN_ID);
      expect(first.kind).toBe('cutover');

      const second = await runCampaignParityCutover(deps, CAMPAIGN_ID);

      expect(second).toEqual({ kind: 'not-shadowing', state: 'journal' });
      // Nothing was written the second time: after cutover nothing
      // maintains the snapshot, so a mismatch would be an artefact.
      expect(writes).toHaveLength(1);
    });
  });

  describe('rollback', () => {
    it('returns a campaign to snapshot authority while the head is the baseline', async () => {
      const marker = await shadowing();
      // Cut over without committing anything, which is exactly the window
      // D10 leaves open.
      stored.set(CAMPAIGN_ID, { ...marker, state: 'journal' });

      const outcome = await rollbackCampaignAuthority(deps, CAMPAIGN_ID);

      expect(outcome.kind).toBe('rolled-back');
      expect(stored.get(CAMPAIGN_ID)?.state).toBe('legacy');
      expect(
        resolveCampaignAuthorityMode({
          marker: stored.get(CAMPAIGN_ID) ?? null,
          journalHasStream: true,
        }),
      ).toEqual({ kind: 'snapshot' });
      // The journal is never deleted by a rollback (D10).
      expect(stored.get(CAMPAIGN_ID)?.importedBaseline).not.toBeNull();
    });

    it('refuses once a journal-authority command has committed', async () => {
      const marker = await shadowing();
      const journalState = { ...marker, state: 'journal' as const };
      const recorded = recordFirstJournalAuthorityCommand(
        journalState,
        'cmd-first',
      );
      if (recorded.kind !== 'ok') throw new Error(recorded.kind);
      stored.set(CAMPAIGN_ID, recorded.marker);

      const outcome = await rollbackCampaignAuthority(deps, CAMPAIGN_ID);

      expect(outcome).toEqual({
        kind: 'rollback-prohibited',
        reason: 'journal-authority-command-committed',
      });
      // A refused rollback writes nothing.
      expect(writes).toEqual([]);
      expect(stored.get(CAMPAIGN_ID)?.state).toBe('journal');
    });

    it('allows a blocked campaign back while both guards still pass', async () => {
      // D10 permits rollback "only while the journal head equals the
      // imported baseline and no journal-authority command has committed"
      // and says nothing about the state being left. A campaign blocked by
      // a parity mismatch has committed nothing of its own, and its
      // snapshot is the authority it never actually left.
      await shadowing();
      snapshots.set(CAMPAIGN_ID, stateWithBalance(OPENING_BALANCE + 1));
      const blocked = await runCampaignParityCutover(deps, CAMPAIGN_ID);
      expect(blocked.kind).toBe('blocked');

      const outcome = await rollbackCampaignAuthority(deps, CAMPAIGN_ID);

      expect(outcome.kind).toBe('rolled-back');
      const after = stored.get(CAMPAIGN_ID);
      expect(after?.state).toBe('legacy');
      // The block is cleared, not carried into a legacy marker that would
      // then read as blocked forever.
      expect(after?.blocked).toBeNull();
    });

    it('refuses once the journal head has moved past the baseline', async () => {
      const marker = await shadowing();
      stored.set(CAMPAIGN_ID, { ...marker, state: 'journal' });
      // A second event in the stream, with no command recorded: the OTHER
      // guard, and it has to stay distinguishable from the first, because
      // the two have different remedies.
      await new JournalCampaignEventStore(journal).appendEvent(
        CAMPAIGN_ID,
        freezeCampaignEvent({
          sequence: 1,
          campaignId: CAMPAIGN_ID,
          ts: NOW,
          authorPlayerId: 'migration',
          type: 'CampaignSnapshotPublished',
          scope: 'campaign',
          payload: { state: stateWithBalance(OPENING_BALANCE), revision: 1 },
        }),
      );

      const outcome = await rollbackCampaignAuthority(deps, CAMPAIGN_ID);

      expect(outcome).toEqual({
        kind: 'rollback-prohibited',
        reason: 'journal-head-past-baseline',
      });
      expect(writes).toEqual([]);
    });

    it('refuses a campaign with no marker at all', async () => {
      const outcome = await rollbackCampaignAuthority(deps, CAMPAIGN_ID);

      expect(outcome).toEqual({ kind: 'marker-absent' });
      expect(writes).toEqual([]);
    });
  });
});
