/**
 * `CampaignEventLog.reconstructState` through the authority recovery port
 * (umbrella task 15.3 adoption), against a REAL SQLite checkpoint store.
 *
 * `reconstructState` is the campaign's only full replay, and it has two
 * live callers: the D10 divergence rebuild in `CampaignMatchHost`
 * (`this.state = await this.log.reconstructState()` before the typed
 * `CampaignProjectionDivergenceError`) and the outcome inbox's
 * `host.setState(await host.reconstructState())`. Adopting the port here
 * is what puts a checkpoint on a hot path and gives the blocked verdict
 * somewhere truthful to land.
 *
 * Pins: an unconfigured log is byte-identical to reading everything and
 * folding it (adoption changes nothing); a configured log CONSULTS the
 * checkpoint offer and folds only the tail; a stale or unattested row is
 * refused and the reference state comes back instead; and a blocked
 * verdict throws rather than returning a state, so neither live caller
 * can publish a partial rebuild.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  IBranchCheckpointPipeline,
  IBranchHistoryReader,
} from '@/lib/events/checkpoints/AuthorityRecoveryPort';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import {
  AuthorityRecoveryBlockedError,
  BranchCheckpointCache,
  checkpointRecoveryPort,
} from '@/lib/events/checkpoints/AuthorityRecoveryPort';
import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { sha256Sync } from '@/utils/events/hashUtils';

import { replayCampaignEvents } from '../applyCampaignEvent';
import { CampaignEventLog } from '../campaignEventLog';
import { InMemoryCampaignEventStore } from '../InMemoryCampaignEventStore';

const CAMPAIGN_ID = 'campaign-recovery';
const TS = '2026-09-02T00:00:00.000Z';
const FINGERPRINT = 'c'.repeat(64);

const PIPELINE: IBranchCheckpointPipeline = {
  stream: { streamType: 'campaign', streamId: CAMPAIGN_ID },
  branchId: 'root',
  projectorId: 'campaign.authoritative',
  projectorVersion: 1,
  schemaPipelineFingerprint: FINGERPRINT,
};

/** Genesis at sequence 0, then five incremental balance facts. */
function history(): readonly ICampaignEvent[] {
  const genesis: ICampaignEvent = {
    type: 'CampaignSnapshotPublished',
    sequence: 0,
    campaignId: CAMPAIGN_ID,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 0 },
    },
  };
  const funds = [1, 2, 3, 4, 5].map<ICampaignEvent>((sequence) => ({
    type: 'FundsChanged',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      delta: sequence * 100,
      reason: `probe-${sequence}`,
      balance: ((sequence * (sequence + 1)) / 2) * 100,
    },
  }));
  return Object.freeze([genesis, ...funds]);
}

const EVENTS = history();

/** A real chain over the log, so an edited past moves every later digest. */
function chainDigests(
  events: readonly ICampaignEvent[],
): readonly (string | undefined)[] {
  const chain: (string | undefined)[] = [];
  let previous: string | null = null;
  for (const event of events) {
    previous = sha256Sync(canonicalizeJsonV1({ event, previous }));
    chain[event.sequence] = previous;
  }
  return chain;
}

const CHAIN = chainDigests(EVENTS);

function chainReader(
  chain: readonly (string | undefined)[] = CHAIN,
): IBranchHistoryReader {
  return {
    chainDigestAt: (revision) => Promise.resolve(chain[revision] ?? null),
    readTail: () => Promise.resolve([]),
  };
}

async function seededStore(
  events: readonly ICampaignEvent[] = EVENTS,
): Promise<InMemoryCampaignEventStore> {
  const store = new InMemoryCampaignEventStore();
  for (const event of events) await store.appendEvent(CAMPAIGN_ID, event);
  return store;
}

describe('campaign event log recovery port adoption', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-recovery-port-'));
    dbPath = path.join(dir, 'recovery.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  const REFERENCE = replayCampaignEvents(CAMPAIGN_ID, EVENTS);

  function acceleratedPort(
    db: Database.Database,
    reader: IBranchHistoryReader = chainReader(),
  ) {
    return checkpointRecoveryPort<ICampaignEvent, ICampaignAuthoritativeState>({
      cache: new BranchCheckpointCache(db),
      pipeline: PIPELINE,
      headRevision: 5,
      history: reader,
      parse: (stateJson) =>
        JSON.parse(stateJson) as ICampaignAuthoritativeState,
    });
  }

  it('an unconfigured log is byte-identical to today', async () => {
    const log = new CampaignEventLog(CAMPAIGN_ID, await seededStore());
    expect(await log.reconstructState()).toEqual(REFERENCE);
  });

  it('an empty log is a fresh campaign, not a corrupt one', async () => {
    const log = new CampaignEventLog(
      CAMPAIGN_ID,
      new InMemoryCampaignEventStore(),
    );
    expect(await log.reconstructState()).toEqual(
      createEmptyCampaignState(CAMPAIGN_ID),
    );
  });

  it('consults the checkpoint offer and folds only the tail', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      3,
      CHAIN[3] as string,
      replayCampaignEvents(
        CAMPAIGN_ID,
        EVENTS.filter((event) => event.sequence <= 3),
      ),
      TS,
    );
    const reads: number[] = [];
    const store = await seededStore();
    const log = new CampaignEventLog(
      CAMPAIGN_ID,
      {
        ...store,
        getEvents: (campaignId: string, fromSeq = 0) => {
          reads.push(fromSeq);
          return store.getEvents(campaignId, fromSeq);
        },
      } as unknown as InMemoryCampaignEventStore,
      acceleratedPort(db),
    );

    expect(await log.reconstructState()).toEqual(REFERENCE);
    // The store read starts at sequence 4 - after the cached base at 3.
    // Unwired, this is [0]: the whole log, every time.
    expect(reads).toEqual([4]);
  });

  it('refuses a stale row and returns the reference state instead', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      3,
      CHAIN[3] as string,
      // A cached state that is a lie about this history.
      { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 999_999 },
      TS,
    );
    // History the row is not a claim about: sequence 2 changed.
    const forked = EVENTS.map((event) =>
      event.sequence === 2
        ? ({
            ...event,
            payload: { delta: 7, reason: 'forked', balance: 7 },
          } as ICampaignEvent)
        : event,
    );
    const log = new CampaignEventLog(
      CAMPAIGN_ID,
      await seededStore(forked),
      acceleratedPort(db, chainReader(chainDigests(forked))),
    );

    const state = await log.reconstructState();
    expect(state).toEqual(replayCampaignEvents(CAMPAIGN_ID, forked));
    expect(state.balance).not.toBe(999_999);
  });

  it('throws rather than returning a partially rebuilt state', async () => {
    const db = database();
    new BranchCheckpointCache(db).record(
      PIPELINE,
      3,
      CHAIN[3] as string,
      replayCampaignEvents(
        CAMPAIGN_ID,
        EVENTS.filter((event) => event.sequence <= 3),
      ),
      TS,
    );
    const gapped = await seededStore(
      EVENTS.filter((event) => event.sequence !== 4),
    );
    const log = new CampaignEventLog(CAMPAIGN_ID, gapped, acceleratedPort(db));

    await expect(log.reconstructState()).rejects.toThrow(
      AuthorityRecoveryBlockedError,
    );
  });
});
