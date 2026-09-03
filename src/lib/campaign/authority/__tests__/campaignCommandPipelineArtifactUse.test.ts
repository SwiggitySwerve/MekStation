/**
 * 16.4-c: the command pipeline consults later-use before validate.
 *
 * Predicted red before the product edit:
 *   - sealed AcceptContract commits instead of invalidated-artifact
 *   - artifactUse on deps is an excess-property type error
 * Never-activated, unknown-id, and uninitialized-SQLite already commit
 * today; those rows pin the usable answers so the default cannot start
 * throwing.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { CampaignArtifactUseReader } from '@/lib/interventions/GmCampaignArtifactUseDurable';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-artifact-use';
const AUTHOR = 'pid-solo';
const CONTRACT_ID = 'contract-new-avalon-3025';
const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };
const STREAM = {
  streamType: CAMPAIGN_STREAM_TYPE,
  streamId: CAMPAIGN_ID,
} as const;
const SEALED: readonly IAffectedArtifact[] = [
  { artifactKind: 'contract', artifactId: CONTRACT_ID, sourceRevision: 3 },
];

function acceptContract(
  contractId: string,
  intentId = 'intent-accept',
): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'AcceptContract',
    payload: {
      contract: {
        contractId,
        name: 'New Avalon garrison',
        employerFactionId: 'davion',
      },
    },
  };
}

function spend(amount: number, intentId = 'intent-spend'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  };
}

function hirePilot(intentId = 'intent-hire'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'HirePilot',
    payload: {
      pilot: { pilotId: 'pilot-1', name: 'Jane Doe' },
      cost: 1,
    },
  };
}

function allocateSalvage(intentId = 'intent-salvage'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'AllocateSalvage',
    payload: { value: 1 },
  };
}

describe('campaign command pipeline artifact use', () => {
  describe('in-memory journal (no manifest table)', () => {
    let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;

    beforeEach(async () => {
      journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
      const imported = await importCampaignBaseline(journal, {
        campaignId: CAMPAIGN_ID,
        state: {
          ...createEmptyCampaignState(CAMPAIGN_ID),
          balance: 1_000_000,
        },
        sourceSnapshotRevision: 1,
        importedAt: NOW,
      });
      if (imported.kind !== 'imported') throw new Error(imported.kind);
    });

    it('AllocateSalvage, HirePilot, and SpendFunds never consult', async () => {
      const artifactUse = jest.fn<
        ReturnType<CampaignArtifactUseReader>,
        Parameters<CampaignArtifactUseReader>
      >(() => null);
      for (const intent of [allocateSalvage(), hirePilot(), spend(1)]) {
        artifactUse.mockClear();
        await executeCampaignCommand(
          { journal, authority: JOURNAL_AUTHORITY, artifactUse },
          {
            campaignId: CAMPAIGN_ID,
            intent,
            authorPlayerId: AUTHOR,
            commandId: `cmd-${intent.kind}`,
            ts: NOW,
          },
        );
        expect(artifactUse).not.toHaveBeenCalled();
      }
    });

    it('commits when artifactUse is absent and SQLite is not initialized', async () => {
      resetSQLiteService();
      expect(getSQLiteService().isInitialized()).toBe(false);
      const result = await executeCampaignCommand(
        { journal, authority: JOURNAL_AUTHORITY },
        {
          campaignId: CAMPAIGN_ID,
          intent: acceptContract(CONTRACT_ID),
          authorPlayerId: AUTHOR,
          commandId: 'cmd-uninitialized',
          ts: NOW,
        },
      );
      expect(result.kind).toBe('committed');
    });
  });

  describe('durable sealed-branch fixture', () => {
    let dir: string;
    let db: Database.Database;
    let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'camp-cmd-use-'));
      resetSQLiteService();
      getSQLiteService({ path: path.join(dir, 'use.db') }).initialize();
      db = getSQLiteService().getDatabase();
      journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => NOW);
      const imported = await importCampaignBaseline(journal, {
        campaignId: CAMPAIGN_ID,
        state: {
          ...createEmptyCampaignState(CAMPAIGN_ID),
          balance: 1_000_000,
        },
        sourceSnapshotRevision: 1,
        importedAt: NOW,
      });
      if (imported.kind !== 'imported') throw new Error(imported.kind);
    });

    afterEach(async () => {
      resetSQLiteService();
      await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });

    async function seedAndMint(): Promise<{
      branchId: string;
      held: { leaseId: string; owner: string; fencingEpoch: number };
    }> {
      const branches = new SQLiteEventHistoryBranchStore(db);
      branches.backfillGenesisBranches();
      const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
        nowMs: () => Date.parse(NOW),
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
        createdAt: NOW,
        baseRevision: head.revision,
      });
      new SQLiteEventHistoryArtifactManifestStore(db).sealArtifactManifest(
        STREAM,
        candidate.branchId,
        SEALED,
        NOW,
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
          nowMs: () => Date.parse(NOW),
        }),
        new SQLiteEventHistoryArtifactManifestStore(db),
        {
          stream: STREAM,
          candidateBranchId: minted.branchId,
          held: minted.held,
          reason: 'use-guard',
          activatedAt: NOW,
        },
      );
    }

    function release(minted: {
      held: { leaseId: string; owner: string };
    }): void {
      // A live lease is a rebuild; the pipeline would answer `blocked`
      // before later-use. Release so this row proves the consult, not
      // the rebuild gate.
      const branches = new SQLiteEventHistoryBranchStore(db);
      new SQLiteEventHistoryCorrectionLeaseStore(
        db,
        branches,
      ).releaseCorrectionLease(STREAM, minted.held);
    }

    function run(intent: ICampaignIntent, commandId: string) {
      return executeCampaignCommand(
        // The activation leaves the stream under the 1.x rebuild gate
        // (PROJECTION_REBUILDING), which is pinned by its own suite; this
        // seam asks only what the artifact consult answers past it.
        { journal, authority: JOURNAL_AUTHORITY, rebuild: () => null },
        {
          campaignId: CAMPAIGN_ID,
          intent,
          authorPlayerId: AUTHOR,
          commandId,
          ts: NOW,
        },
      );
    }

    it('AcceptContract whose id the effective branch sealed is invalidated-artifact and appends nothing', async () => {
      const minted = await seedAndMint();
      activate(minted);
      const before = await readCampaignJournalEvents(journal, CAMPAIGN_ID);

      const result = await run(acceptContract(CONTRACT_ID), 'cmd-sealed');

      expect(result).toStrictEqual({
        kind: 'invalidated-artifact',
        artifactKind: 'contract',
        artifactId: CONTRACT_ID,
        branchId: minted.branchId,
        revision: 3,
      });
      const after = await readCampaignJournalEvents(journal, CAMPAIGN_ID);
      expect(after).toHaveLength(before.length);
    });

    it('the same id sealed only on a never-activated candidate commits', async () => {
      const minted = await seedAndMint();
      release(minted);

      const result = await run(acceptContract(CONTRACT_ID), 'cmd-draft');

      expect(result.kind).toBe('committed');
    });

    it('an unknown contract id commits', async () => {
      const minted = await seedAndMint();
      activate(minted);

      const result = await run(
        acceptContract('contract-never-named'),
        'cmd-unknown',
      );

      expect(result.kind).toBe('committed');
    });
  });
});
