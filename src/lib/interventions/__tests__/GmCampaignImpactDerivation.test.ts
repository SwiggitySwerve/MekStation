/**
 * Campaign impact deriver (16.4-a). Predicted red: module missing, or
 * `CHECK constraint failed` / `Unknown artifact kind` when sealing
 * scenario / contract / salvage ids.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { appendCampaignCommandBatch } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { CAMPAIGN_AFFECTED_FAMILIES } from '../GmCampaignAffectedFamilies';
import {
  deriveAndSealCampaignImpact,
  type CampaignFoldFact,
} from '../GmCampaignImpactDerivation';

const TS = '2026-09-02T00:00:00.000Z';
const CAMPAIGN_ID = 'camp-impact-1';
const STREAM = { streamType: 'campaign' as const, streamId: CAMPAIGN_ID };
const SCN = 'scn-contract-new-3025-06-15-force-alpha';
const CONTRACT_NEW = 'contract-new';
const MATCH = 'match-77';

function campaignEvent<T extends ICampaignEvent['type']>(
  type: T,
  sequence: number,
  payload: Extract<ICampaignEvent, { type: T }>['payload'],
): ICampaignEvent {
  return {
    type,
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: TS,
    authorPlayerId: 'gm-1',
    scope: 'campaign',
    payload,
  } as ICampaignEvent;
}

describe('deriveAndSealCampaignImpact', () => {
  let dir: string;
  let db: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'camp-impact-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'impact.db') }).initialize();
    db = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  async function commit(
    commandId: string,
    event: ICampaignEvent,
    expectedRevision: number,
  ): Promise<void> {
    const result = await appendCampaignCommandBatch(journal, {
      campaignId: CAMPAIGN_ID,
      commandId,
      events: [event],
      expectedPostStateDigest: null,
      expectedRevision,
    });
    if (result.kind !== 'committed') {
      throw new Error(`seed ${commandId} ${result.kind}`);
    }
  }

  async function seedThroughCutoff(): Promise<void> {
    await commit(
      'C1',
      campaignEvent('FundsChanged', 1, {
        delta: 100,
        reason: 'before',
        balance: 100,
      }),
      0,
    );
    await commit(
      'C2',
      campaignEvent('ContractAccepted', 2, {
        contract: {
          contractId: 'contract-old',
          name: 'Old',
          employerFactionId: 'davion',
        },
      }),
      1,
    );
    await commit(
      'C3',
      campaignEvent('ContractAccepted', 3, {
        contract: {
          contractId: CONTRACT_NEW,
          name: 'New',
          employerFactionId: 'davion',
        },
      }),
      2,
    );
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  function mintAt(baseRevision: number) {
    const branches = new SQLiteEventHistoryBranchStore(db);
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
      reason: 'impact-test',
      ttlMs: 60_000,
      expectedBranchId: 'root',
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: 1,
    });
    return createCorrectionCandidateBranch(db, leases, {
      ...STREAM,
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
      createdAt: TS,
      baseRevision,
    });
  }

  const afterCutoffExtras: readonly CampaignFoldFact[] = [
    { kind: 'scenario', scenarioId: SCN, sourceRevision: 3 },
    { kind: 'salvage', matchId: MATCH, sourceRevision: 3 },
    {
      kind: 'scenario',
      scenarioId: 'scn-contract-old-3025-01-01-force-a',
      sourceRevision: 2,
    },
  ];

  it('seals scenario, contract, and salvage ids after the cutoff with their source revisions and names nothing at or before the cutoff', async () => {
    await seedThroughCutoff();
    const candidate = mintAt(2);
    const derived = await deriveAndSealCampaignImpact(db, journal, {
      stream: STREAM,
      candidateBranchId: candidate.branchId,
      cutoffRevision: 2,
      derivedAt: TS,
      extras: afterCutoffExtras,
    });
    expect(derived.entries).toEqual([
      { artifactKind: 'contract', artifactId: CONTRACT_NEW, sourceRevision: 3 },
      { artifactKind: 'salvage', artifactId: MATCH, sourceRevision: 3 },
      { artifactKind: 'scenario', artifactId: SCN, sourceRevision: 3 },
    ]);
    expect(derived.entries.map((entry) => entry.artifactId)).toEqual([
      CONTRACT_NEW,
      MATCH,
      SCN,
    ]);
    expect(derived.entries.map((entry) => entry.artifactId)).not.toContain(
      'contract-old',
    );
    expect(derived.entries.map((entry) => entry.artifactId)).not.toContain(
      'scenario-artifacts',
    );
    const sealed = new SQLiteEventHistoryArtifactManifestStore(
      db,
    ).readArtifactManifest(STREAM, candidate.branchId);
    expect(sealed?.entries).toEqual(derived.entries);
  });

  it('an empty tail seals an empty manifest, not a family list', async () => {
    await commit(
      'C1',
      campaignEvent('FundsChanged', 1, {
        delta: 1,
        reason: 'only',
        balance: 1,
      }),
      0,
    );
    await commit(
      'C2',
      campaignEvent('ContractAccepted', 2, {
        contract: {
          contractId: 'contract-head',
          name: 'Head',
          employerFactionId: 'davion',
        },
      }),
      1,
    );
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
    const candidate = mintAt(2);
    const derived = await deriveAndSealCampaignImpact(db, journal, {
      stream: STREAM,
      candidateBranchId: candidate.branchId,
      cutoffRevision: 2,
      derivedAt: TS,
      extras: [],
    });
    expect(derived.entries).toEqual([]);
    expect(derived.header.entryCount).toBe(0);
    expect(derived.entries.map((entry) => entry.artifactId)).toEqual(
      expect.not.arrayContaining([...CAMPAIGN_AFFECTED_FAMILIES]),
    );
  });

  it('names unprojected externalEffectRefs and ignores projected ones', async () => {
    await seedThroughCutoff();
    const candidate = mintAt(2);
    const derived = await deriveAndSealCampaignImpact(db, journal, {
      stream: STREAM,
      candidateBranchId: candidate.branchId,
      cutoffRevision: 2,
      derivedAt: TS,
      extras: [
        {
          kind: 'external-effect',
          ref: 'ext-unprojected',
          sourceRevision: 3,
          projected: false,
        },
        {
          kind: 'external-effect',
          ref: 'ext-projected',
          sourceRevision: 3,
          projected: true,
        },
      ],
    });
    expect(
      derived.entries.filter((entry) => entry.artifactKind === 'external-effect'),
    ).toEqual([
      {
        artifactKind: 'external-effect',
        artifactId: 'ext-unprojected',
        sourceRevision: 3,
      },
    ]);
  });
});
