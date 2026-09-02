/**
 * Seam 2.4: two seats claiming one force is not "pick the first row".
 * 8.2 already types the mapper refusal; this row is the write path —
 * durable claim rows in, typed refusal out, journal and marker empty.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';

import { readCampaignJournalHighestSequence } from '../../sync/campaignJournalReads';
import {
  backfillCampaignFromSnapshot,
  readCampaignOwnershipEvidence,
} from '../campaignSnapshotBackfill';

const CAMPAIGN_ID = 'campaign-two-seat';
const SESSION_ID = 'session-two-seat';
const NOW = '3025-02-01T00:00:00.000Z';

describe('campaign snapshot backfill two-seat ownership', () => {
  let dir: string;

  const markerIo = {
    read: (campaignId: string): ICampaignCutoverMarker | null => {
      const result = readCampaignMigrationMarker(campaignId);
      return result.kind === 'ok' ? result.marker : null;
    },
    write: writeCampaignMigrationMarker,
  };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-two-seat-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'backfill.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('refuses when two seats claimed the same force and writes nothing', async () => {
    for (const participantId of ['player-1', 'player-2'] as const) {
      bindCampaignSessionParticipant({
        campaignId: CAMPAIGN_ID,
        sessionId: SESSION_ID,
        participantId,
        seat: 'player',
        boundAt: NOW,
      });
    }
    claimCampaignSessionForce({
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      missionId: 'mission-1',
      forceId: 'force-a',
      participantId: 'player-1',
      claimedAt: NOW,
    });
    claimCampaignSessionForce({
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      missionId: 'mission-2',
      forceId: 'force-a',
      participantId: 'player-2',
      claimedAt: NOW,
    });
    claimCampaignSessionForce({
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      missionId: 'mission-1',
      forceId: 'force-b',
      participantId: 'player-2',
      claimedAt: NOW,
    });

    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => NOW,
    );
    const result = await backfillCampaignFromSnapshot(journal, markerIo, {
      campaignId: CAMPAIGN_ID,
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        forceUnits: { 'force-a': ['unit-a'], 'force-b': ['unit-b'] },
      },
      sourceSnapshotRevision: 7,
      evidence: readCampaignOwnershipEvidence(CAMPAIGN_ID, SESSION_ID),
      importedAt: NOW,
    });

    expect(result).toEqual({
      kind: 'ambiguous-ownership',
      ambiguities: [
        {
          kind: 'force-claimed-by-several',
          forceId: 'force-a',
          participantIds: ['player-1', 'player-2'],
        },
      ],
    });
    expect(await readCampaignJournalHighestSequence(journal, CAMPAIGN_ID)).toBe(
      -1,
    );
    expect(markerIo.read(CAMPAIGN_ID)).toBeNull();
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare(
          `SELECT COUNT(*) AS c FROM event_journal_events WHERE stream_id = ?`,
        )
        .get(CAMPAIGN_ID),
    ).toEqual({ c: 0 });
  });
});
