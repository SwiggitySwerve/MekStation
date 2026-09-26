/**
 * U95: the durable progression readers find the process match store's
 * database whichever module graph constructed that store.
 *
 * The match store lives in a globalThis slot (getDefaultMatchStore), and
 * in the running server the socket runtime's tsx graph constructs it at
 * boot, before Next's API graph asks for it. Once the campaign host
 * registry is shared too, an entry built by the API graph reads that
 * store through these readers. jest.isolateModules stands in for the
 * other graph's DurableMatchStore class.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { IMatchMeta } from '../IMatchStore';

import { createDurableCampaignProgressionReaders } from '../campaignProgressionReaders.durable';
import { DurableMatchStore } from '../DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '../getDefaultMatchStore';
import {
  COORDINATED_CORRECTION_SAGA_TABLE,
  migrateCoordinatedCorrectionSaga,
} from '../history/CoordinatedOutcomeCorrectionSaga';

const CAMPAIGN_ID = 'campaign-cross-graph';
const MATCH_ID = 'match-cross-graph';
const OUTCOME_ID = 'outcome-cross-graph';
const AT = '2026-09-26T00:00:00.000Z';

type DurableMatchStoreClass = typeof DurableMatchStore;

/** Loads DurableMatchStore in a fresh module graph and returns its class. */
function durableMatchStoreFromAnotherGraph(): DurableMatchStoreClass {
  let loaded: DurableMatchStoreClass | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = (
      require('../DurableMatchStore') as typeof import('../DurableMatchStore')
    ).DurableMatchStore;
  });
  if (!loaded)
    throw new Error('isolated DurableMatchStore load returned nothing');
  return loaded;
}

function matchMeta(): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host'],
    sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1',
  };
}

/** One inbox receipt on the journal and one open correction saga on the match store. */
async function seedPendingCorrection(store: DurableMatchStore): Promise<void> {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES (?, 1, ?, 'command-cross-graph', ?, 1, 1, 1, 1, ?)`,
    )
    .run(OUTCOME_ID, CAMPAIGN_ID, 'c'.repeat(64), AT);
  await store.createMatch(matchMeta());
  const matchDb = store.getDatabase();
  migrateCoordinatedCorrectionSaga(matchDb);
  matchDb
    .prepare(
      `INSERT INTO ${COORDINATED_CORRECTION_SAGA_TABLE}
         (match_id, outcome_id, outcome_version, target_revision, state,
          source_recorded_at, updated_at)
       VALUES (?, ?, 1, 1, 'source-recorded', ?, ?)`,
    )
    .run(MATCH_ID, OUTCOME_ID, AT, AT);
}

describe('durable progression readers across module graphs', () => {
  let dir: string;
  let store: DurableMatchStore | null = null;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-readers-cross-graph-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
  });

  afterEach(async () => {
    store?.close();
    store = null;
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('reads the pending saga from a match store this graph constructed', async () => {
    store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
    _setDefaultMatchStoreForTests(store);
    await seedPendingCorrection(store);

    const saga =
      createDurableCampaignProgressionReaders().readSagaForCampaign(
        CAMPAIGN_ID,
      );

    expect(saga?.outcomeId).toBe(OUTCOME_ID);
    expect(saga?.state).toBe('source-recorded');
  });

  it('reads the pending saga from a match store another graph constructed', async () => {
    const OtherGraphDurableMatchStore = durableMatchStoreFromAnotherGraph();
    expect(OtherGraphDurableMatchStore).not.toBe(DurableMatchStore);
    store = new OtherGraphDurableMatchStore({
      path: path.join(dir, 'matches.db'),
    });
    _setDefaultMatchStoreForTests(store);
    await seedPendingCorrection(store);

    const saga =
      createDurableCampaignProgressionReaders().readSagaForCampaign(
        CAMPAIGN_ID,
      );

    expect(saga?.outcomeId).toBe(OUTCOME_ID);
    expect(saga?.state).toBe('source-recorded');
  });
});
