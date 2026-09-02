/**
 * Idempotent campaign snapshot backfill + ambiguous-ownership gate
 * (umbrella task 8.2).
 *
 * Pins, in order of what could actually go wrong:
 *  - ownership is READ from the durable participant and force-claim rows,
 *    never inferred from the snapshot's shape;
 *  - every way ownership can fail to settle blocks the cutover and
 *    appends NOTHING, so a blocked campaign is still a legacy campaign;
 *  - an audited GM remapping is the only thing that resolves a block, it
 *    cannot install a non-player as an owner, and it cannot paper over a
 *    unit two forces both claim;
 *  - the baseline lands on the genesis (`root`) branch at sequence 0, and
 *    a repeat run - identical, or across a cold database reopen - appends
 *    nothing and does not rewrite when the import happened;
 *  - the materialized campaign snapshot is still there, untouched.
 *
 * Real SQLite through the shipped service on a temp file, because every
 * claim above is a durability claim; a mocked store would prove none.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';
import type {
  ICampaignOwnershipEvidence,
  ICampaignOwnershipRemapping,
} from '../campaignSnapshotBackfill';

import { readCampaignJournalHighestSequence } from '../../sync/campaignJournalReads';
import { type ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import {
  backfillCampaignFromSnapshot,
  mapCampaignForceOwnership,
  maybeBackfillCampaignFromSnapshot,
  readCampaignOwnershipEvidence,
} from '../campaignSnapshotBackfill';

const CAMPAIGN_ID = 'campaign-backfill';
const SESSION_ID = 'match-backfill';
const NOW = '3025-02-01T00:00:00.000Z';

/** Two forces, one unit each: the shape a clean two-player session has. */
function twoForceState(
  forceUnits: Record<string, readonly string[]> = {
    'force-a': ['unit-a'],
    'force-b': ['unit-b'],
  },
): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    balance: 500_000,
    rosterUnits: {
      'unit-a': {
        unitId: 'unit-a',
        designation: 'Atlas',
        status: 'operational',
      },
      'unit-b': {
        unitId: 'unit-b',
        designation: 'Locust',
        status: 'operational',
      },
    },
    forceUnits,
  };
}

/** `mission/force/participant` shorthand for one durable claim row. */
function claim(missionId: string, forceId: string, participantId: string) {
  return { missionId, forceId, participantId };
}

const SETTLED_CLAIMS = [
  claim('mission-1', 'force-a', 'player-1'),
  claim('mission-1', 'force-b', 'player-2'),
];

function evidence(
  forceClaims: readonly ReturnType<typeof claim>[] = SETTLED_CLAIMS,
): ICampaignOwnershipEvidence {
  return { tacticalPlayerIds: ['player-1', 'player-2'], forceClaims };
}

function gmRemapping(
  forceOwners: Record<string, string>,
): ICampaignOwnershipRemapping {
  return { decidedByParticipantId: 'gm-1', decidedAt: NOW, forceOwners };
}

describe('mapCampaignForceOwnership', () => {
  it('maps each force to the tactical player who durably claimed it', () => {
    expect(mapCampaignForceOwnership(twoForceState(), evidence())).toEqual({
      kind: 'unambiguous',
      forceOwners: { 'force-a': 'player-1', 'force-b': 'player-2' },
    });
  });

  it('blocks a force nobody durably claimed', () => {
    const mapping = mapCampaignForceOwnership(
      twoForceState(),
      evidence([claim('mission-1', 'force-a', 'player-1')]),
    );

    expect(mapping).toEqual({
      kind: 'ambiguous',
      ambiguities: [{ kind: 'force-unclaimed', forceId: 'force-b' }],
    });
  });

  it('blocks a force claimed by someone who is not a tactical player', () => {
    // The GM, or a revoked member. Their claim is real and still does not
    // fill one of the two player slots.
    const mapping = mapCampaignForceOwnership(
      twoForceState(),
      evidence([
        claim('mission-1', 'force-a', 'player-1'),
        claim('mission-1', 'force-b', 'gm-1'),
      ]),
    );

    expect(mapping).toEqual({
      kind: 'ambiguous',
      ambiguities: [
        {
          kind: 'force-owner-not-a-player',
          forceId: 'force-b',
          participantId: 'gm-1',
        },
      ],
    });
  });

  it('blocks a force two players claimed on different missions', () => {
    // The claim table is per-mission, so a force CAN carry two holders
    // across a campaign's history. Which of them owns it going forward is
    // exactly the question migration must not answer by guessing.
    const mapping = mapCampaignForceOwnership(
      twoForceState(),
      evidence([
        claim('mission-1', 'force-a', 'player-1'),
        claim('mission-2', 'force-a', 'player-2'),
        claim('mission-1', 'force-b', 'player-2'),
      ]),
    );

    expect(mapping).toEqual({
      kind: 'ambiguous',
      ambiguities: [
        {
          kind: 'force-claimed-by-several',
          forceId: 'force-a',
          participantIds: ['player-1', 'player-2'],
        },
      ],
    });
  });

  it('reads a repeated claim by the same player as one claim', () => {
    const mapping = mapCampaignForceOwnership(
      twoForceState(),
      evidence([
        claim('mission-1', 'force-a', 'player-1'),
        claim('mission-2', 'force-a', 'player-1'),
        claim('mission-1', 'force-b', 'player-2'),
      ]),
    );

    expect(mapping.kind).toBe('unambiguous');
  });

  it('lets an audited GM remapping resolve an unclaimed force', () => {
    const mapping = mapCampaignForceOwnership(
      twoForceState(),
      evidence([claim('mission-1', 'force-a', 'player-1')]),
      gmRemapping({ 'force-b': 'player-2' }),
    );

    expect(mapping).toEqual({
      kind: 'unambiguous',
      forceOwners: { 'force-a': 'player-1', 'force-b': 'player-2' },
    });
  });

  it('refuses a remapping that names someone who is not a player', () => {
    // A GM cannot resolve the block by assigning the force to
    // themselves; the two tactical slots are the only legal answers.
    const mapping = mapCampaignForceOwnership(
      twoForceState(),
      evidence([claim('mission-1', 'force-a', 'player-1')]),
      gmRemapping({ 'force-b': 'gm-1' }),
    );

    expect(mapping).toEqual({
      kind: 'ambiguous',
      ambiguities: [
        {
          kind: 'force-owner-not-a-player',
          forceId: 'force-b',
          participantId: 'gm-1',
        },
      ],
    });
  });

  it('cannot paper over a unit two forces both claim', () => {
    // A force-level decision does not settle a unit-level collision: the
    // unit is in both forces, so it is owned twice whichever way the
    // forces are assigned. The roster has to be fixed first.
    const mapping = mapCampaignForceOwnership(
      twoForceState({ 'force-a': ['unit-a'], 'force-b': ['unit-a'] }),
      evidence(),
      gmRemapping({ 'force-a': 'player-1', 'force-b': 'player-2' }),
    );

    expect(mapping).toEqual({
      kind: 'ambiguous',
      ambiguities: [
        {
          kind: 'unit-in-several-forces',
          unitId: 'unit-a',
          forceIds: ['force-a', 'force-b'],
        },
      ],
    });
  });
});

describe('campaign snapshot backfill against real SQLite', () => {
  let dir: string;
  let dbPath: string;

  const markerIo = {
    read: (campaignId: string): ICampaignCutoverMarker | null => {
      const result = readCampaignMigrationMarker(campaignId);
      return result.kind === 'ok' ? result.marker : null;
    },
    write: writeCampaignMigrationMarker,
  };

  /** A journal over whichever database handle is currently open. */
  function journal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
    return new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => NOW,
    );
  }

  /** The standard clean-session backfill call, minus per-row overrides. */
  function backfill(
    overrides: Partial<Parameters<typeof backfillCampaignFromSnapshot>[2]> = {},
  ) {
    return backfillCampaignFromSnapshot(journal(), markerIo, {
      campaignId: CAMPAIGN_ID,
      state: twoForceState(),
      sourceSnapshotRevision: 7,
      evidence: evidence(),
      importedAt: NOW,
      ...overrides,
    });
  }

  const highestSequence = () =>
    readCampaignJournalHighestSequence(journal(), CAMPAIGN_ID);

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-backfill-'));
    dbPath = path.join(dir, 'backfill.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('reads ownership evidence from the durable participant and claim rows', () => {
    for (const [participantId, seat] of [
      ['gm-1', 'gm'],
      ['player-1', 'player'],
    ] as const) {
      bindCampaignSessionParticipant({
        campaignId: CAMPAIGN_ID,
        sessionId: SESSION_ID,
        participantId,
        seat,
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

    const read = readCampaignOwnershipEvidence(CAMPAIGN_ID, SESSION_ID);

    // The GM is a member and is NOT a tactical player - the distinction
    // the whole ownership gate rests on.
    expect(read.tacticalPlayerIds).toEqual(['player-1']);
    expect(read.forceClaims).toEqual([
      claim('mission-1', 'force-a', 'player-1'),
    ]);
  });

  it('backfills the snapshot as a genesis baseline on the root branch', async () => {
    const result = await backfill();

    expect(result.kind).toBe('backfilled');
    if (result.kind !== 'backfilled') return;
    expect(result.forceOwners).toEqual({
      'force-a': 'player-1',
      'force-b': 'player-2',
    });
    expect(result.marker.state).toBe('shadowing');
    expect(result.marker.importedBaseline?.sourceSnapshotRevision).toBe(7);
    expect(result.marker.importedBaseline?.baselineSequence).toBe(0);

    expect(await highestSequence()).toBe(0);
    const rows = getSQLiteService()
      .getDatabase()
      .prepare(
        'SELECT branch_id, stream_revision FROM event_journal_events WHERE stream_id = ?',
      )
      .all(CAMPAIGN_ID) as { branch_id: string; stream_revision: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].branch_id).toBe(ROOT_EVENT_BRANCH_ID);
    // Sequence 0 lives at stream revision 1 - journal revisions are
    // 1-based, campaign sequences are 0-based.
    expect(rows[0].stream_revision).toBe(1);
    // And the marker is durable, not merely returned.
    expect(markerIo.read(CAMPAIGN_ID)?.state).toBe('shadowing');
  });

  it('reports a byte-identical retry as already backfilled, not a fresh import', async () => {
    // The journal REPLAYS an identical command rather than refusing it,
    // so the append cannot be what makes a retry idempotent - the
    // recorded marker is. Without that check the caller is told it just
    // imported a campaign that was imported long ago.
    await backfill();

    const second = await backfill();

    expect(second.kind).toBe('already-backfilled');
    expect(await highestSequence()).toBe(0);
  });

  it('keeps the original import when run again after a cold reopen', async () => {
    await backfill();

    // Close the database and open it again from the same file: the
    // idempotency has to come from the DISK, not from process memory.
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();

    const second = await backfill({
      sourceSnapshotRevision: 9,
      importedAt: '3025-06-06T00:00:00.000Z',
    });

    expect(second.kind).toBe('already-backfilled');
    expect(await highestSequence()).toBe(0);
    // The second run's later revision and timestamp must NOT overwrite
    // the recorded provenance - the first import is when it happened.
    const marker = markerIo.read(CAMPAIGN_ID);
    expect(marker?.importedBaseline?.sourceSnapshotRevision).toBe(7);
    expect(marker?.importedBaseline?.importedAt).toBe(NOW);
  });

  it('appends nothing at all when ownership is ambiguous', async () => {
    const result = await backfill({ evidence: evidence([]) });

    expect(result.kind).toBe('ambiguous-ownership');
    if (result.kind !== 'ambiguous-ownership') return;
    expect(result.ambiguities.map((entry) => entry.kind)).toEqual([
      'force-unclaimed',
      'force-unclaimed',
    ]);
    // Fail CLOSED: no baseline, no marker. A blocked campaign is still a
    // plain legacy campaign, and cutover is what stopped.
    expect(await highestSequence()).toBe(-1);
    expect(markerIo.read(CAMPAIGN_ID)).toBeNull();
  });

  it('records the GM who resolved an ambiguous ownership', async () => {
    const result = await backfill({
      evidence: evidence([]),
      remapping: gmRemapping({
        'force-a': 'player-1',
        'force-b': 'player-2',
      }),
    });

    expect(result.kind).toBe('backfilled');
    // Audited: the marker says a GM decided this, so a later reader can
    // tell an inferred mapping from a decided one.
    expect(
      markerIo.read(CAMPAIGN_ID)?.importedBaseline?.ownershipRemapping,
    ).toEqual({ decidedByParticipantId: 'gm-1', decidedAt: NOW });
  });

  it('leaves the materialized campaign snapshot exactly where it was', async () => {
    const envelope = buildSerializedCampaign(
      buildPopulatedCampaign(),
      'device-backfill',
      3,
    );
    expect(saveCampaign(envelope, 0).kind).toBe('ok');
    const before = readCampaign(envelope.campaignId);

    await backfill({
      campaignId: envelope.campaignId,
      sourceSnapshotRevision: envelope.version,
    });

    // Additive: migration adds journal rows, it does not touch the
    // snapshot it imported from.
    expect(readCampaign(envelope.campaignId)).toEqual(before);
  });

  it('is inert while journal authority is off', async () => {
    const result = await maybeBackfillCampaignFromSnapshot({
      enabled: false,
      journal,
      markerIo,
      campaignId: CAMPAIGN_ID,
      state: twoForceState(),
      sourceSnapshotRevision: 7,
      evidence: evidence(),
      importedAt: NOW,
    });

    expect(result.kind).toBe('skipped');
    expect(await highestSequence()).toBe(-1);
  });
});
