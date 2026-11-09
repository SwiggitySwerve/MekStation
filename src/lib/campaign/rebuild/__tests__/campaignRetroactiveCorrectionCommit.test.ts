/**
 * Retroactive correction commit (umbrella 16.2 + 16.4 writer).
 * Predicted red before the product file exists: H1, B1, L1, D1 fail to
 * import; C1 is in this file so it is red for the same reason.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICandidateVerificationOptions } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { ICampaignBatchCommitHost } from '@/lib/multiplayer/server/campaignHostBatchCommit';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import {
  appendCampaignCommandBatch,
  envelopeOf,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { ReplayProjector } from '@/lib/events/replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import { commitCampaignEventBatch } from '@/lib/multiplayer/server/campaignHostBatchCommit';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { IRetainedSourceEvent } from '../CampaignReplacementReplay';

import {
  commitCampaignRetroactiveCorrection,
  type ICampaignRetroactiveCorrectionCommitDeps,
} from '../CampaignRetroactiveCorrectionCommit';

// Counts anchor reads and fails the Nth one on request; otherwise a
// pass-through. Lets a test make the commit's own read throw, which no
// input can.
const mockAnchorReads = { count: 0, failOn: 0 };
jest.mock('@/lib/campaign/rebuild/CampaignBranchAnchor', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/rebuild/CampaignBranchAnchor')
  >('@/lib/campaign/rebuild/CampaignBranchAnchor');
  return {
    ...actual,
    readCampaignBranchAnchor: (
      ...args: Parameters<typeof actual.readCampaignBranchAnchor>
    ) => {
      mockAnchorReads.count += 1;
      if (mockAnchorReads.count === mockAnchorReads.failOn) {
        throw new Error('injected: anchor read failed');
      }
      return actual.readCampaignBranchAnchor(...args);
    },
  };
});

const TS = '2026-09-02T00:00:00.000Z';
const CAMPAIGN_TYPES = ['FundsChanged', 'ContractAccepted'] as const;

function fundsEvent(campaignId: string, sequence: number): ICampaignEvent {
  return {
    type: 'FundsChanged',
    sequence,
    campaignId,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      delta: 100,
      reason: `fact-${sequence}`,
      balance: sequence * 100,
    },
  };
}

function contractEvent(
  campaignId: string,
  sequence: number,
  contractId: string,
): ICampaignEvent {
  return {
    type: 'ContractAccepted',
    sequence,
    campaignId,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      contract: {
        contractId,
        name: contractId,
        employerFactionId: 'davion',
      },
    },
  };
}

function verification(): ICandidateVerificationOptions<{ seen: number }> {
  return {
    registry: new ReplaySchemaRegistry({
      events: CAMPAIGN_TYPES.map((eventType) => ({
        eventType,
        targetSchemaVersion: 1,
        schemas: [
          {
            schemaVersion: 1,
            schemaId: `correction-commit.${eventType}.v1`,
            parse: (payload: unknown) => payload,
          },
        ],
        transitions: [],
      })),
    }),
    projector: new ReplayProjector({
      projectorId: 'campaign.correction.commit.probe',
      projectorVersion: 1,
      initialState: () => ({ seen: 0 }),
      decisions: CAMPAIGN_TYPES.map((eventType) => ({
        eventType,
        decision: {
          kind: 'apply' as const,
          apply: (state: { seen: number }) => ({ seen: state.seen + 1 }),
        },
      })),
    }),
  };
}

describe('campaign retroactive correction commit', () => {
  let dir: string;
  let db: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-correction-commit-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
    db = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function commitCommand(
    campaignId: string,
    commandId: string,
    event: ICampaignEvent,
    expectedRevision: number,
  ): Promise<void> {
    const result = await appendCampaignCommandBatch(journal, {
      campaignId,
      commandId,
      events: [event],
      expectedPostStateDigest: null,
      expectedRevision,
    });
    if (result.kind !== 'committed') {
      throw new Error(`seed ${commandId} ${result.kind}`);
    }
  }

  /** Four facts on root; cutoff 2 drops C3 and keeps C4. */
  async function seedPinned(campaignId: string): Promise<void> {
    await commitCommand(campaignId, 'C1', fundsEvent(campaignId, 1), 0);
    await commitCommand(
      campaignId,
      'C2',
      contractEvent(campaignId, 2, 'contract-old'),
      1,
    );
    await commitCommand(
      campaignId,
      'C3',
      contractEvent(campaignId, 3, 'contract-new'),
      2,
    );
    await commitCommand(campaignId, 'C4', fundsEvent(campaignId, 4), 3);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  async function retainedOf(
    campaignId: string,
    commandIds: readonly string[],
  ): Promise<readonly IRetainedSourceEvent[]> {
    const wanted = new Set(commandIds);
    const stored = await journal.readStream({
      streamType: 'campaign',
      streamId: campaignId,
      branchId: 'root',
      afterRevision: 0,
      limit: 20,
    });
    return stored
      .filter((row) => wanted.has(row.commandId))
      .map((row) => ({ commandId: row.commandId, event: envelopeOf(row) }));
  }

  function deps(): ICampaignRetroactiveCorrectionCommitDeps<{
    seen: number;
  }> {
    return {
      db,
      journal,
      verification: verification(),
      nowIso: () => TS,
    };
  }

  function rootHead(campaignId: string): {
    revision: number;
    branchId: string;
  } {
    const row = db
      .prepare(
        `SELECT stream_revision AS revision, branch_id AS branchId
           FROM event_journal_stream_heads
          WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(campaignId) as { revision: number; branchId: string };
    return row;
  }

  function candidateCount(campaignId: string): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count FROM event_history_branches
          WHERE stream_id = ? AND branch_id != 'root'`,
      )
      .get(campaignId) as { count: number };
    return row.count;
  }

  function liveLeaseCount(campaignId: string): number {
    return new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      new SQLiteEventHistoryBranchStore(db),
    ).readLiveLease(campaignStreamRef(campaignId)) === null
      ? 0
      : 1;
  }

  it('H1: seals a candidate with replayed events, leaves the source head in place, and releases the lease', async () => {
    const campaignId = 'campaign-h1';
    await seedPinned(campaignId);
    const sourceBefore = rootHead(campaignId);
    const result = await commitCampaignRetroactiveCorrection(deps(), {
      campaignId,
      baseRevision: 2,
      retainedEvents: await retainedOf(campaignId, ['C4']),
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'rewind-h1',
    });
    expect(result.kind).toBe('sealed');
    if (result.kind !== 'sealed') return;
    expect(rootHead(campaignId)).toEqual(sourceBefore);
    expect(
      new SQLiteEventHistoryBranchStore(db).readEffectiveHead(
        campaignStreamRef(campaignId),
      )?.branchId,
    ).toBe('root');
    expect(liveLeaseCount(campaignId)).toBe(0);
    const candidateRows = db
      .prepare(
        `SELECT COUNT(*) AS count FROM event_journal_events
          WHERE stream_id = ? AND branch_id = ?`,
      )
      .get(campaignId, result.candidateBranchId) as { count: number };
    expect(candidateRows.count).toBe(1);
    const sealed = new SQLiteEventHistoryArtifactManifestStore(
      db,
    ).readArtifactManifest(
      campaignStreamRef(campaignId),
      result.candidateBranchId,
    );
    expect(sealed).not.toBeNull();
    expect(sealed?.entries).toEqual([
      {
        artifactKind: 'contract',
        artifactId: 'contract-new',
        sourceRevision: 3,
      },
    ]);
    expect(result.manifest.entries).toEqual(sealed?.entries);
  });

  it('B1: a base ahead of the head is refused typed and mints no candidate', async () => {
    const campaignId = 'campaign-b1';
    await seedPinned(campaignId);
    const result = await commitCampaignRetroactiveCorrection(deps(), {
      campaignId,
      baseRevision: 99,
      retainedEvents: await retainedOf(campaignId, ['C4']),
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'rewind-b1',
    });
    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        reason: 'base-ahead-of-head',
      }),
    );
    expect(candidateCount(campaignId)).toBe(0);
    expect(liveLeaseCount(campaignId)).toBe(0);
  });

  it('L1: a second commit while the lease is held is refused typed', async () => {
    const campaignId = 'campaign-l1';
    await seedPinned(campaignId);
    const retained = await retainedOf(campaignId, ['C4']);
    let nested:
      | Awaited<ReturnType<typeof commitCampaignRetroactiveCorrection>>
      | undefined;
    const first = await commitCampaignRetroactiveCorrection(
      {
        ...deps(),
        onLeaseHeld: async () => {
          nested = await commitCampaignRetroactiveCorrection(deps(), {
            campaignId,
            baseRevision: 2,
            retainedEvents: retained,
            owner: 'host-2',
            actor: 'gm-2',
            reason: 'rewind-l1-nested',
          });
        },
      },
      {
        campaignId,
        baseRevision: 2,
        retainedEvents: retained,
        owner: 'host-1',
        actor: 'gm-1',
        reason: 'rewind-l1',
      },
    );
    expect(first.kind).toBe('sealed');
    expect(nested).toEqual(
      expect.objectContaining({
        kind: 'refused',
        reason: 'correction-lease-held',
      }),
    );
    expect(candidateCount(campaignId)).toBe(1);
    expect(liveLeaseCount(campaignId)).toBe(0);
  });

  it('D1: replay divergence is refused typed and the candidate is not the effective head', async () => {
    const campaignId = 'campaign-d1';
    await seedPinned(campaignId);
    const result = await commitCampaignRetroactiveCorrection(deps(), {
      campaignId,
      baseRevision: 2,
      retainedEvents: [
        { commandId: 'C4', event: fundsEvent(campaignId, 4) },
        { commandId: 'C4', event: fundsEvent(campaignId, 6) },
      ],
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'rewind-d1',
    });
    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        reason: 'replay-divergence',
      }),
    );
    expect(
      new SQLiteEventHistoryBranchStore(db).readEffectiveHead(
        campaignStreamRef(campaignId),
      )?.branchId,
    ).toBe('root');
    expect(rootHead(campaignId).revision).toBe(4);
    expect(liveLeaseCount(campaignId)).toBe(0);
  });

  describe('D-3a candidate lifecycle', () => {
    const request = async (campaignId: string, reason: string) => ({
      campaignId,
      baseRevision: 2,
      retainedEvents: await retainedOf(campaignId, ['C4']),
      owner: 'host-1',
      actor: 'gm-1',
      reason,
    });

    /** Every non-root branch of the campaign stream: id and status. */
    function candidates(campaignId: string): {
      readonly branchId: string;
      readonly status: string;
    }[] {
      return new SQLiteEventHistoryBranchStore(db)
        .listBranches(campaignStreamRef(campaignId))
        .filter((branch) => branch.branchId !== 'root')
        .map(({ branchId, status }) => ({ branchId, status }));
    }

    function isSealed(campaignId: string, branchId: string): boolean {
      return (
        new SQLiteEventHistoryArtifactManifestStore(db).readArtifactManifest(
          campaignStreamRef(campaignId),
          branchId,
        ) !== null
      );
    }

    /** A candidate whose correction crashed: built under a lease, never sealed. */
    function strandCandidate(campaignId: string): string {
      const stream = campaignStreamRef(campaignId);
      const branches = new SQLiteEventHistoryBranchStore(db);
      const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches);
      const head = readEffectiveStreamHead(db, branches, stream);
      const lease = leases.acquireCorrectionLease({
        ...stream,
        owner: 'crashed-host',
        actor: 'gm-0',
        reason: 'crashed correction',
        ttlMs: 30_000,
        expectedBranchId: head.branchId,
        expectedRevision: head.revision,
        expectedDigest: head.digest,
        expectedGeneration:
          branches.requireEffectiveHead(stream).effectiveGeneration,
      });
      const candidate = createCorrectionCandidateBranch(db, leases, {
        ...stream,
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
        baseRevision: 2,
        createdAt: TS,
      });
      leases.releaseCorrectionLease(stream, {
        leaseId: lease.leaseId,
        owner: lease.owner,
      });
      return candidate.branchId;
    }

    afterEach(() => {
      jest.restoreAllMocks();
      mockAnchorReads.count = 0;
      mockAnchorReads.failOn = 0;
    });

    it('blocks the candidate when replay diverges', async () => {
      const campaignId = 'campaign-d3a-replay';
      await seedPinned(campaignId);
      const result = await commitCampaignRetroactiveCorrection(deps(), {
        ...(await request(campaignId, 'rewind-replay')),
        retainedEvents: [
          { commandId: 'C4', event: fundsEvent(campaignId, 4) },
          { commandId: 'C4', event: fundsEvent(campaignId, 6) },
        ],
      });
      expect(result).toMatchObject({
        kind: 'refused',
        reason: 'replay-divergence',
      });
      expect(candidates(campaignId).map((c) => c.status)).toEqual(['blocked']);
      expect(liveLeaseCount(campaignId)).toBe(0);
    });

    it('blocks the candidate when its path does not verify', async () => {
      const campaignId = 'campaign-d3a-verify';
      await seedPinned(campaignId);
      const unknownFunds = verification();
      const result = await commitCampaignRetroactiveCorrection(
        {
          ...deps(),
          verification: {
            ...unknownFunds,
            registry: new ReplaySchemaRegistry({
              events: [
                {
                  eventType: 'ContractAccepted',
                  targetSchemaVersion: 1,
                  schemas: [
                    {
                      schemaVersion: 1,
                      schemaId: 'correction-commit.ContractAccepted.v1',
                      parse: (payload: unknown) => payload,
                    },
                  ],
                  transitions: [],
                },
              ],
            }),
          },
        },
        await request(campaignId, 'rewind-verify'),
      );
      expect(result).toMatchObject({
        kind: 'refused',
        reason: 'candidate-verification-failed',
      });
      expect(candidates(campaignId).map((c) => c.status)).toEqual(['blocked']);
      expect(liveLeaseCount(campaignId)).toBe(0);
    });

    it('blocks the candidate when the impact sealer fails', async () => {
      const campaignId = 'campaign-d3a-sealer';
      await seedPinned(campaignId);
      jest
        .spyOn(
          SQLiteEventHistoryArtifactManifestStore.prototype,
          'sealArtifactManifest',
        )
        .mockImplementation(() => {
          throw new Error('injected: sealer failed');
        });
      const result = await commitCampaignRetroactiveCorrection(
        deps(),
        await request(campaignId, 'rewind-sealer'),
      );
      expect(result).toMatchObject({
        kind: 'refused',
        reason: 'sealer-failure',
        detail: 'injected: sealer failed',
      });
      expect(candidates(campaignId).map((c) => c.status)).toEqual(['blocked']);
      expect(liveLeaseCount(campaignId)).toBe(0);
    });

    it('blocks the candidate when an unexpected error escapes after it was built, and rethrows it', async () => {
      // The commit's own anchor read is the last one of a clean run, so
      // count a clean run first and fail that call on the next one.
      const campaignId = 'campaign-d3a-escape';
      await seedPinned(campaignId);
      const cleanRequest = await request(campaignId, 'rewind-clean');
      mockAnchorReads.count = 0;
      const clean = await commitCampaignRetroactiveCorrection(
        deps(),
        cleanRequest,
      );
      if (clean.kind !== 'sealed') throw new Error('the clean run must seal');
      const readsInACleanRun = mockAnchorReads.count;

      const escaping = await request(campaignId, 'rewind-escape');
      mockAnchorReads.count = 0;
      mockAnchorReads.failOn = readsInACleanRun;
      await expect(
        commitCampaignRetroactiveCorrection(deps(), escaping),
      ).rejects.toThrow('injected: anchor read failed');
      // The clean run's sealed candidate waits for activation; the
      // escaped one is dead.
      const after = candidates(campaignId);
      expect(after).toHaveLength(2);
      expect(
        after.find((c) => c.branchId === clean.candidateBranchId)?.status,
      ).toBe('building');
      expect(
        after.find((c) => c.branchId !== clean.candidateBranchId)?.status,
      ).toBe('blocked');
      expect(liveLeaseCount(campaignId)).toBe(0);
    });

    it('blocks an unsealed stranded candidate once it holds the lease, and keeps its own', async () => {
      const campaignId = 'campaign-d3a-sweep';
      await seedPinned(campaignId);
      const stranded = strandCandidate(campaignId);
      const result = await commitCampaignRetroactiveCorrection(
        deps(),
        await request(campaignId, 'rewind-sweep'),
      );
      expect(result.kind).toBe('sealed');
      if (result.kind !== 'sealed') return;
      expect(candidates(campaignId)).toEqual(
        expect.arrayContaining([
          { branchId: stranded, status: 'blocked' },
          { branchId: result.candidateBranchId, status: 'building' },
        ]),
      );
      expect(candidates(campaignId)).toHaveLength(2);
    });

    it('leaves a sealed candidate awaiting activation alone', async () => {
      const campaignId = 'campaign-d3a-sealed';
      await seedPinned(campaignId);
      const first = await commitCampaignRetroactiveCorrection(
        deps(),
        await request(campaignId, 'rewind-first'),
      );
      const second = await commitCampaignRetroactiveCorrection(
        deps(),
        await request(campaignId, 'rewind-second'),
      );
      if (first.kind !== 'sealed' || second.kind !== 'sealed') {
        throw new Error('both corrections should have sealed');
      }
      expect(isSealed(campaignId, first.candidateBranchId)).toBe(true);
      expect(candidates(campaignId)).toEqual(
        expect.arrayContaining([
          { branchId: first.candidateBranchId, status: 'building' },
          { branchId: second.candidateBranchId, status: 'building' },
        ]),
      );
    });

    it('does not sweep unless it holds the lease', async () => {
      const campaignId = 'campaign-d3a-held';
      await seedPinned(campaignId);
      const stranded = strandCandidate(campaignId);
      // Another owner now holds the stream's lease.
      const stream = campaignStreamRef(campaignId);
      const branches = new SQLiteEventHistoryBranchStore(db);
      const head = readEffectiveStreamHead(db, branches, stream);
      new SQLiteEventHistoryCorrectionLeaseStore(
        db,
        branches,
      ).acquireCorrectionLease({
        ...stream,
        owner: 'other-host',
        actor: 'gm-9',
        reason: 'concurrent correction',
        ttlMs: 30_000,
        expectedBranchId: head.branchId,
        expectedRevision: head.revision,
        expectedDigest: head.digest,
        expectedGeneration:
          branches.requireEffectiveHead(stream).effectiveGeneration,
      });
      const result = await commitCampaignRetroactiveCorrection(
        deps(),
        await request(campaignId, 'rewind-held'),
      );
      expect(result).toMatchObject({
        kind: 'refused',
        reason: 'correction-lease-held',
      });
      expect(candidates(campaignId)).toEqual([
        { branchId: stranded, status: 'building' },
      ]);
    });
  });

  it('C1: appendCommandBatch without the new fields still lands at the first event sequence', async () => {
    const campaignId = 'campaign-c1-store';
    const store = new JournalCampaignEventStore(journal);
    const appended = await store.appendCommandBatch(campaignId, {
      commandId: 'host-like-1',
      events: [fundsEvent(campaignId, 0)],
      expectedPostStateDigest: 'd'.repeat(64),
    });
    expect(appended.kind).toBe('committed');
    if (appended.kind !== 'committed') return;
    expect(appended.receipt.firstStreamRevision).toBe(1);
    expect(appended.receipt.lastStreamRevision).toBe(1);

    const batchCampaign = 'campaign-c1-host';
    const hostStore = new JournalCampaignEventStore(journal);
    let state = createEmptyCampaignState(batchCampaign);
    const host: ICampaignBatchCommitHost = {
      campaignId: batchCampaign,
      nextSequence: async () =>
        (await hostStore.highestSequence(batchCampaign)) + 1,
      readState: () => state,
      writeState: (next) => {
        state = next;
      },
      rebuildState: async () => state,
      markDivergence: () => undefined,
      publish: () => undefined,
    };
    const outcome = await commitCampaignEventBatch(
      host,
      [
        {
          type: 'FundsChanged',
          campaignId: batchCampaign,
          ts: TS,
          authorPlayerId: 'pid_host',
          scope: 'campaign',
          payload: { delta: 1, reason: 'control', balance: 1 },
        },
      ],
      hostStore.appendCommandBatch,
    );
    expect(outcome.kind).toBe('committed');
    if (outcome.kind !== 'committed') return;
    expect(outcome.events[0].sequence).toBe(0);
    expect(rootHead(batchCampaign).revision).toBe(1);
  });
});
