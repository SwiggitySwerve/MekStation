import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import {
  EVENT_HISTORY_GENESIS_DIGEST,
  EventHistoryBranchError,
} from '@/lib/events/journal/EventHistoryBranchContract';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { createDurableCampaignProgressionReaders } from '@/lib/multiplayer/server/campaignProgressionReaders.durable';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-durable-integrity';
const HOST_ID = 'host-player';
const CORRUPT_DIGEST = 'a'.repeat(64);
const CANDIDATE_DIGEST = 'b'.repeat(64);

type Corruption = 'forged-root' | 'building-head';

function seedRoot(): void {
  const stream = campaignStreamRef(CAMPAIGN_ID);
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES (?, ?, 'root', NULL, 0, 0, NULL, ?, 'effective',
               'migration', 'genesis', '2026-09-13T00:00:00.000Z')`,
    )
    .run(stream.streamType, stream.streamId, EVENT_HISTORY_GENESIS_DIGEST);
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO event_history_effective_heads
         (stream_type, stream_id, branch_id, effective_generation, installed_at)
       VALUES (?, ?, 'root', 1, '2026-09-13T00:00:00.000Z')`,
    )
    .run(stream.streamType, stream.streamId);
}

function corruptPersistedAuthority(corruption: Corruption): void {
  const db = getSQLiteService().getDatabase();
  const stream = campaignStreamRef(CAMPAIGN_ID);
  seedRoot();

  if (corruption === 'forged-root') {
    db.exec('DROP TRIGGER IF EXISTS event_history_branches_immutable_lineage');
    db.prepare(
      `UPDATE event_history_branches SET base_digest = ?
       WHERE stream_type = ? AND stream_id = ? AND branch_id = 'root'`,
    ).run(CORRUPT_DIGEST, stream.streamType, stream.streamId);
    return;
  }

  db.prepare(
    `INSERT INTO event_history_branches
       (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
        base_revision, base_event_id, base_digest, status, created_by,
        reason, created_at)
     VALUES (?, ?, 'candidate-1', 'root', 1, 1, 'event-1', ?, 'building',
             'host-player', 'legacy fixture', '2026-09-13T00:00:00.000Z')`,
  ).run(stream.streamType, stream.streamId, CANDIDATE_DIGEST);
  // A pre-integrity database has no such guard; dropping it is harmless when
  // this test runs against that historical schema.
  db.exec(
    'DROP TRIGGER IF EXISTS event_history_effective_heads_branch_must_be_effective_on_update',
  );
  db.prepare(
    `UPDATE event_history_effective_heads SET branch_id = 'candidate-1'
     WHERE stream_type = ? AND stream_id = ?`,
  ).run(stream.streamType, stream.streamId);
}

async function fullyAcknowledgedSession(): Promise<{
  readonly session: CampaignSyncSession;
  readonly stop: () => void;
}> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: createEmptyCampaignState(CAMPAIGN_ID),
  });
  const session = new CampaignSyncSession(host, {
    progressionReaders: createDurableCampaignProgressionReaders(),
  });
  await session.open();
  const one = await session.joinMember(() => {}, 'player-one');
  const two = await session.joinMember(() => {}, 'player-two');
  await host.handleIntent({
    kind: 'AdvanceDay',
    campaignId: CAMPAIGN_ID,
    intentId: 'advance-1',
    payload: {},
  });
  expect(session.noteParticipantAcknowledged('player-one', 1)).toBe('applied');
  expect(session.noteParticipantAcknowledged('player-two', 1)).toBe('applied');
  return {
    session,
    stop: () => {
      one.disconnect();
      two.disconnect();
    },
  };
}

describe('durable campaign progression readers integrity', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-durable-integrity-'));
    dbPath = path.join(dir, 'campaign.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('keeps unavailable persistence as the existing absent-authority answer', () => {
    const readers = createDurableCampaignProgressionReaders();

    expect(readers.readEffectiveHead(CAMPAIGN_ID)).toBeNull();
    expect(readers.readBranch(CAMPAIGN_ID, 'root')).toBeNull();
  });

  it('keeps a healthy initialized durable head launchable after acknowledgement', async () => {
    getSQLiteService({ path: dbPath }).initialize();
    seedRoot();
    const { session, stop } = await fullyAcknowledgedSession();

    try {
      await expect(session.evaluateScenarioLaunch()).resolves.toEqual({
        ok: true,
        requiredRevision: 1,
      });
    } finally {
      stop();
    }
  });

  it.each<Corruption>(['forged-root', 'building-head'])(
    'refuses a fully acknowledged launch when durable authority is %s',
    async (corruption) => {
      getSQLiteService({ path: dbPath }).initialize();
      corruptPersistedAuthority(corruption);
      const readers = createDurableCampaignProgressionReaders();

      const { session, stop } = await fullyAcknowledgedSession();
      try {
        await expect(session.evaluateScenarioLaunch()).rejects.toMatchObject({
          code: 'branch-integrity',
        });
        if (corruption === 'forged-root') {
          expect(() => readers.readBranch(CAMPAIGN_ID, 'root')).toThrow(
            EventHistoryBranchError,
          );
        }
        expect(() => readers.readEffectiveHead(CAMPAIGN_ID)).toThrow(
          EventHistoryBranchError,
        );
      } finally {
        stop();
      }
    },
  );
});
