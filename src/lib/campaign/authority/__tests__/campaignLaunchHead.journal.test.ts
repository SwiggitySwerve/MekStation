/**
 * The launch head is the journal's effective head (roadmap unit U20,
 * owner decision OD-launch-head-gate).
 *
 * Real SQLite throughout, and no backfill call anywhere: every effective
 * head this suite reads was installed by the stream's own first journal
 * append (U19b) or was never installed. The rule pinned here:
 *
 * - a campaign with a journal stream answers the journal's effective head
 *   - the branch and revision `readEffectiveStreamHead` reads, the same
 *   seam the correction lease compares against;
 * - `no-authoritative-stream` means the campaign has no journal stream,
 *   and nothing else;
 * - a journaled campaign whose effective head is missing is refused, never
 *   answered `no-authoritative-stream` (that answer launches ungated).
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  appendCampaignCommandBatch,
  CAMPAIGN_STREAM_TYPE,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { validateExpectedBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  campaignLaunchHeadPorts,
  campaignStreamRef,
  resolveCampaignLaunchHead,
} from '../campaignLaunchHead';
import { appendCampaignGenesis } from '../campaignSourceGenesis';

const NOW = '3025-07-04T00:00:00.000Z';

/**
 * Persists one campaign whose forces claim disjoint units (the shared
 * fixture gives both forces the same unit ids, which the genesis
 * projection rejects as a double claim) and returns the stored envelope.
 * Nothing is appended to the journal.
 */
function seedCampaign(): SerializedCampaign {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  const disjoint = {
    ...campaign,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
  const roster = {
    campaignId: disjoint.id,
    units: forces.map((_, index) => ({
      unitId: `unit-${index}`,
      unitRef: `catalog-ref-${index}`,
      unitSource: 'canonical' as const,
      unitName: `Unit ${index}`,
      chassisVariant: `V-${index}`,
      readiness: 'Ready' as const,
    })),
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  };
  const saved = saveCampaign(
    buildSerializedCampaign(disjoint, 'device-1', 0, roster),
    0,
  );
  if (saved.kind !== 'ok') throw new Error(`seed failed: ${saved.kind}`);
  return saved.record;
}

/** A journal over the test database, stamping every batch with NOW. */
function journal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
  return new SQLiteEventJournal(getSQLiteService().getDatabase(), () => NOW);
}

/**
 * Appends the campaign's genesis snapshot: its first journal append, at
 * journal revision 1. The writer installs the genesis branch and the
 * effective head in the same transaction; no backfill runs.
 */
async function appendFirst(record: SerializedCampaign): Promise<void> {
  const genesis = await appendCampaignGenesis(journal(), () => undefined, {
    envelope: record,
    occurredAt: NOW,
  });
  expect(genesis.kind).toBe('genesis-appended');
}

/** Appends one CampaignDayAdvanced event at `sequence` (revision + 1). */
async function appendDayAdvanced(
  campaignId: string,
  sequence: number,
): Promise<void> {
  const event: ICampaignEvent<'CampaignDayAdvanced'> = {
    sequence,
    campaignId,
    ts: NOW,
    authorPlayerId: 'pid-host',
    type: 'CampaignDayAdvanced',
    scope: 'campaign',
    payload: { newDay: sequence + 1 },
  };
  const result = await appendCampaignCommandBatch(journal(), {
    campaignId,
    commandId: `u20-day-advanced:${campaignId}:${sequence}`,
    events: [event],
    expectedPostStateDigest: null,
  });
  expect(result.kind).toBe('committed');
}

/** The branch store over the test database. */
function branches(): SQLiteEventHistoryBranchStore {
  return new SQLiteEventHistoryBranchStore(getSQLiteService().getDatabase());
}

/** The journal's effective head, read directly through the shared seam. */
function journalHead(campaignId: string) {
  return readEffectiveStreamHead(
    getSQLiteService().getDatabase(),
    branches(),
    campaignStreamRef(campaignId),
  );
}

/** How many committed journal events the campaign's stream holds. */
function eventCount(campaignId: string): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT COUNT(*) AS count FROM event_journal_events
        WHERE stream_type = ? AND stream_id = ?`,
    )
    .get(CAMPAIGN_STREAM_TYPE, campaignId) as { readonly count: number };
  return row.count;
}

describe('resolveCampaignLaunchHead reads the journal effective head (U20)', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'u20-launch-head-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'launch-head.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('(a) after one campaign-stream append the head is the journal effective head', async () => {
    const record = seedCampaign();
    await appendFirst(record);

    const result = resolveCampaignLaunchHead(
      campaignLaunchHeadPorts(),
      record.campaignId,
    );

    const direct = journalHead(record.campaignId);
    const effective = branches().requireEffectiveHead(
      campaignStreamRef(record.campaignId),
    );
    expect(result).toEqual({
      kind: 'head',
      branchId: direct.branchId,
      revision: direct.revision,
      effectiveGeneration: effective.effectiveGeneration,
    });
    // Literal pins as well as the read-back: one append on the genesis
    // branch is journal revision 1, not the branch record's base (0).
    expect(result).toMatchObject({ branchId: 'root', revision: 1 });
    expect(eventCount(record.campaignId)).toBe(1);
  });

  it('(b) a campaign with no journal stream answers no-authoritative-stream', () => {
    const record = seedCampaign();
    expect(eventCount(record.campaignId)).toBe(0);

    expect(
      resolveCampaignLaunchHead(campaignLaunchHeadPorts(), record.campaignId),
    ).toEqual({ kind: 'no-authoritative-stream' });
  });

  it('(c) a second append advances the revision and stales the first head', async () => {
    const record = seedCampaign();
    await appendFirst(record);
    const first = resolveCampaignLaunchHead(
      campaignLaunchHeadPorts(),
      record.campaignId,
    );
    expect(first).toMatchObject({ kind: 'head', revision: 1 });

    await appendDayAdvanced(record.campaignId, 1);
    const second = resolveCampaignLaunchHead(
      campaignLaunchHeadPorts(),
      record.campaignId,
    );

    expect(second).toMatchObject({ kind: 'head', revision: 2 });
    expect(second).toMatchObject({
      revision: journalHead(record.campaignId).revision,
    });
    if (first.kind !== 'head' || second.kind !== 'head') {
      throw new Error('both reads must answer a head');
    }
    expect(second.branchId).toBe(first.branchId);
    expect(second.effectiveGeneration).toBe(first.effectiveGeneration);

    // The launch compares the head a client was handed against this
    // answer: the first head is now refused, the second is current.
    const stream = campaignStreamRef(record.campaignId);
    expect(
      validateExpectedBranchHead(branches(), stream, second.revision, first),
    ).toMatchObject({ kind: 'refused', code: 'STALE_REVISION' });
    expect(
      validateExpectedBranchHead(branches(), stream, second.revision, second),
    ).toMatchObject({ kind: 'current' });
  });

  it('(d) a journaled campaign whose effective head is missing is refused, never no-authoritative-stream', async () => {
    const record = seedCampaign();
    await appendFirst(record);
    // The state a stream first appended before U19b and never backfilled
    // is in: journal events, no effective head. Reproduced by dropping the
    // head row the append installed (the rewind route suites use the same
    // move for a match with no authoritative history).
    getSQLiteService()
      .getDatabase()
      .prepare(
        `DELETE FROM event_history_effective_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .run(CAMPAIGN_STREAM_TYPE, record.campaignId);
    expect(eventCount(record.campaignId)).toBe(1);
    expect(
      branches().readEffectiveHead(campaignStreamRef(record.campaignId)),
    ).toBeNull();

    const outcome = (() => {
      try {
        return resolveCampaignLaunchHead(
          campaignLaunchHeadPorts(),
          record.campaignId,
        );
      } catch (error) {
        return error;
      }
    })();

    // The answer that must never come back: no-authoritative-stream
    // launches a journaled campaign ungated (CO3 F1).
    expect(outcome).not.toEqual({ kind: 'no-authoritative-stream' });
    expect(outcome).toBeInstanceOf(EventHistoryBranchError);
    expect((outcome as EventHistoryBranchError).code).toBe(
      'no-effective-branch',
    );
  });
});
