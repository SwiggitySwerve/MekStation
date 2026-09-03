/**
 * 16.4-b guard. Predicted red today: module missing
 * (`Cannot find module '@/lib/interventions/GmCampaignArtifactUseGuard'`).
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { appendCampaignCommandBatch } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  consultCampaignArtifactUse,
  type ICampaignArtifactUseStores,
} from '../GmCampaignArtifactUseGuard';

const TS = '2026-09-02T00:00:00.000Z';
const CAMPAIGN_ID = 'camp-use-1';
const STREAM = { streamType: 'campaign' as const, streamId: CAMPAIGN_ID };
const SCN = 'scn-contract-new-3025-06-15-force-alpha';
const SEALED: readonly IAffectedArtifact[] = [
  { artifactKind: 'scenario', artifactId: SCN, sourceRevision: 3 },
];

function funds(sequence: number): ICampaignEvent {
  return {
    type: 'FundsChanged',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: TS,
    authorPlayerId: 'gm-1',
    scope: 'campaign',
    payload: { delta: sequence, reason: `f-${sequence}`, balance: sequence },
  };
}

describe('consultCampaignArtifactUse', () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'camp-use-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'use.db') }).initialize();
    db = getSQLiteService().getDatabase();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function stores(): ICampaignArtifactUseStores {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    return {
      readEffectiveHead: (stream) => branches.readEffectiveHead(stream),
      readArtifactManifest: (stream, branchId) =>
        manifests.readArtifactManifest(stream, branchId),
    };
  }

  async function seedAndMint(): Promise<{
    branchId: string;
    held: { leaseId: string; owner: string; fencingEpoch: number };
  }> {
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      db,
      () => TS,
    );
    for (const sequence of [1, 2] as const) {
      const appended = await appendCampaignCommandBatch(journal, {
        campaignId: CAMPAIGN_ID,
        commandId: `cmd-${sequence}`,
        events: [funds(sequence)],
        expectedPostStateDigest: null,
        expectedRevision: sequence - 1,
      });
      if (appended.kind !== 'committed') {
        throw new Error(`seed ${sequence} ${appended.kind}`);
      }
    }
    const branches = new SQLiteEventHistoryBranchStore(db);
    branches.backfillGenesisBranches();
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(TS),
    });
    const head = db
      .prepare(
        `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
         WHERE stream_id = ? AND branch_id = 'root'`,
      )
      .get(CAMPAIGN_ID) as { revision: number; digest: string };
    const lease = leases.acquireCorrectionLease({
      ...STREAM,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'use-guard',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    const candidate = createCorrectionCandidateBranch(db, leases, {
      ...STREAM,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
      baseRevision: 2,
    });
    new SQLiteEventHistoryArtifactManifestStore(db).sealArtifactManifest(
      STREAM,
      candidate.branchId,
      SEALED,
      TS,
    );
    return {
      branchId: candidate.branchId,
      held: {
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
      },
    };
  }

  function activate(minted: {
    branchId: string;
    held: { leaseId: string; owner: string; fencingEpoch: number };
  }): void {
    const branches = new SQLiteEventHistoryBranchStore(db);
    activateCandidateBranch(
      db,
      branches,
      new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
        nowMs: () => Date.parse(TS),
      }),
      new SQLiteEventHistoryArtifactManifestStore(db),
      {
        stream: STREAM,
        candidateBranchId: minted.branchId,
        held: minted.held,
        reason: 'use-guard',
        activatedAt: TS,
      },
    );
  }

  it('an id the effective branch sealed is refused with that branch and revision', async () => {
    const minted = await seedAndMint();
    activate(minted);
    expect(
      consultCampaignArtifactUse(stores(), STREAM, {
        artifactKind: 'scenario',
        artifactId: SCN,
      }),
    ).toStrictEqual({
      kind: 'invalidated-artifact',
      artifactKind: 'scenario',
      artifactId: SCN,
      branchId: minted.branchId,
      revision: 3,
    });
  });

  it('an id sealed only on a never-activated candidate is usable', async () => {
    await seedAndMint();
    expect(
      consultCampaignArtifactUse(stores(), STREAM, {
        artifactKind: 'scenario',
        artifactId: SCN,
      }),
    ).toBeNull();
  });

  it('a stream with no effective head blocks nothing', () => {
    // A campaign whose journal has no branches yet has invalidated nothing:
    // the guard must answer usable, never a refusal minted from thin air.
    expect(
      consultCampaignArtifactUse(stores(), STREAM, {
        artifactKind: 'scenario',
        artifactId: SCN,
      }),
    ).toBeNull();
  });

  it('an unknown id is usable', async () => {
    const minted = await seedAndMint();
    activate(minted);
    expect(
      consultCampaignArtifactUse(stores(), STREAM, {
        artifactKind: 'scenario',
        artifactId: 'scn-never-named',
      }),
    ).toBeNull();
  });

  it('matching kind and id: same id of another kind is usable', async () => {
    const minted = await seedAndMint();
    activate(minted);
    expect(
      consultCampaignArtifactUse(stores(), STREAM, {
        artifactKind: 'encounter',
        artifactId: SCN,
      }),
    ).toBeNull();
  });
});
