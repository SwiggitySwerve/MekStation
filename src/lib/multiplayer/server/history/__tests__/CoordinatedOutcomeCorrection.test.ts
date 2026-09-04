/**
 * Seam 17.1 admission. Harness matches the rewind-commit suite.
 * The pin row calls the shipped commit so 13.4 still refuses.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IGmAuthorityContext } from '@/types/interventions';

import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { ReplayProjector } from '@/lib/events/replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  COORDINATED_OUTCOME_CORRECTION_KIND,
  COORDINATED_OUTCOME_CORRECTION_REFUSALS,
  admitCoordinatedOutcomeCorrection,
  type ICoordinatedOutcomeCorrectionIntent,
} from '../CoordinatedOutcomeCorrection';
import { commitGmCombatRewind } from '../GmCombatRewindCommit';

const MATCH_ID = 'stream-1';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-02T00:00:00.000Z';
const HEAD = 4;
const TARGET = 2;
const OUTCOME = 'outcome-1';
const INBOX_DIGEST = 'a'.repeat(64);

const PIN_REGISTRY = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'probe_damage',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.damage.v1',
          parse: (p: unknown) => p,
        },
      ],
      transitions: [],
    },
  ],
});

describe('admitCoordinatedOutcomeCorrection', () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'outcome-correction-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'correction.db') });
    service.initialize();
    db = service.getDatabase();
    await seedJournal();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  async function seedJournal(): Promise<void> {
    const result = await new SQLiteEventJournal(db, () => AT).append({
      ...STREAM,
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'command-1',
      principal: {
        actorKind: 'human',
        actorId: 'player-1',
        authorityType: 'host',
        authorityId: 'host-1',
      },
      events: [1, 2, 3, 4].map((index) => ({
        eventId: `event-${index}`,
        eventType: 'probe_damage',
        eventVersion: 1,
        correlationId: 'correlation-1',
        causationEventIds: [],
        occurredAt: AT,
        payload: { amount: index },
        entityRefs: [
          { entityType: 'unit', entityId: 'unit-a', role: 'subject' },
        ],
      })),
    });
    expect(result.kind).toBe('committed');
    expect(branches().backfillGenesisBranches()).toBe(1);
  }

  function seedInbox(): void {
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES (?, 1, 'campaign-1', 'cmd-1', ?, 1, 1, 1, 1, ?)`,
    ).run(OUTCOME, INBOX_DIGEST, AT);
  }

  function digest(revision: number): string {
    return (
      db
        .prepare(
          `SELECT event_digest AS digest FROM event_journal_events
            WHERE stream_id = ? AND stream_revision = ?`,
        )
        .get(MATCH_ID, revision) as { readonly digest: string }
    ).digest;
  }

  function gm(role: IGmAuthorityContext['role'] = 'gm'): IGmAuthorityContext {
    return {
      actorId: 'gm-1',
      role,
      gameId: MATCH_ID,
      ownedStateRefs: [`game:${MATCH_ID}`],
    };
  }

  function intent(
    overrides: Partial<ICoordinatedOutcomeCorrectionIntent> = {},
  ): ICoordinatedOutcomeCorrectionIntent {
    return {
      kind: COORDINATED_OUTCOME_CORRECTION_KIND,
      matchId: MATCH_ID,
      outcomeId: OUTCOME,
      outcomeVersion: 2,
      targetRevision: TARGET,
      expectedBranchId: 'root',
      expectedRevision: HEAD,
      expectedDigest: INBOX_DIGEST,
      expectedGeneration: 1,
      actor: 'gm-1',
      ...overrides,
    };
  }

  function census(): Record<string, unknown> {
    const rows = (table: string, order: string): unknown[] =>
      db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all();
    return {
      branches: rows('event_history_branches', 'branch_id'),
      heads: rows('event_history_effective_heads', 'stream_id'),
      supersessions: rows(
        'event_history_supersessions',
        'superseded_branch_id',
      ),
      leases: rows('event_history_correction_leases', 'lease_id'),
      manifests: rows(
        'event_history_artifact_manifests',
        'candidate_branch_id',
      ),
      journal: rows('event_journal_events', 'stream_revision'),
      inbox: rows(
        'campaign_combat_outcome_inbox',
        'outcome_id, outcome_version',
      ),
    };
  }

  it('GM correction at delivered+1 is accepted-pending-saga and writes only the admission', () => {
    expect(COORDINATED_OUTCOME_CORRECTION_REFUSALS).toHaveLength(10);
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent(),
    );
    // Predicted red: Expected "accepted-pending-saga" Received "refused"
    expect(result).toEqual({
      kind: 'accepted-pending-saga',
      matchId: MATCH_ID,
      outcomeId: OUTCOME,
      outcomeVersion: 2,
      deliveredVersion: 1,
      targetRevision: TARGET,
    });
    expect(census()).toStrictEqual(before);
  });

  it('matching expectedDigest is admitted (control)', () => {
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent({ expectedDigest: INBOX_DIGEST }),
    );
    expect(result).toEqual({
      kind: 'accepted-pending-saga',
      matchId: MATCH_ID,
      outcomeId: OUTCOME,
      outcomeVersion: 2,
      deliveredVersion: 1,
      targetRevision: TARGET,
    });
    expect(census()).toStrictEqual(before);
  });

  it('mismatched expectedDigest is refused expected-digest-mismatch and writes nothing', () => {
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent({ expectedDigest: 'b'.repeat(64) }),
    );
    expect(result).toMatchObject({
      kind: 'refused',
      reason: 'expected-digest-mismatch',
    });
    expect(census()).toStrictEqual(before);
  });

  it('empty expectedDigest is refused expected-digest-mismatch and writes nothing', () => {
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent({ expectedDigest: '' }),
    );
    expect(result).toMatchObject({
      kind: 'refused',
      reason: 'expected-digest-mismatch',
    });
    expect(census()).toStrictEqual(before);
  });

  it('version delivered+2 is refused version-not-next', () => {
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent({ outcomeVersion: 3 }),
    );
    expect(result).toMatchObject({
      kind: 'refused',
      reason: 'version-not-next',
    });
    expect(census()).toStrictEqual(before);
  });

  it('undelivered outcome is refused outcome-not-delivered', () => {
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent(),
    );
    expect(result).toMatchObject({
      kind: 'refused',
      reason: 'outcome-not-delivered',
    });
    expect(census()).toStrictEqual(before);
  });

  it('non-GM is refused gm-role-required', () => {
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm('player'),
      intent(),
    );
    expect(result).toMatchObject({
      kind: 'refused',
      reason: 'gm-role-required',
    });
    expect(census()).toStrictEqual(before);
  });

  it('stale expected revision is refused STALE_REVISION', () => {
    seedInbox();
    const before = census();
    const result = admitCoordinatedOutcomeCorrection(
      { db, branches: branches(), priorHeadRevision: HEAD },
      gm(),
      intent({ expectedRevision: HEAD - 1 }),
    );
    expect(result).toMatchObject({ kind: 'refused', reason: 'STALE_REVISION' });
    expect(census()).toStrictEqual(before);
  });

  it('plain rewind onto a delivered receipt is still refused campaign-receipt-delivered', async () => {
    seedInbox();
    const before = census();
    const result = await commitGmCombatRewind(
      {
        db,
        branches: branches(),
        leases: new SQLiteEventHistoryCorrectionLeaseStore(db, branches()),
        manifests: new SQLiteEventHistoryArtifactManifestStore(db),
        reader: { read: async () => [] },
        probe: { digest: () => '' },
        readOutcomeId: async () => OUTCOME,
        priorHeadRevision: HEAD,
        viewerIds: ['gm-1'],
        verification: {
          registry: PIN_REGISTRY,
          projector: new ReplayProjector({
            projectorId: 'correction.pin',
            projectorVersion: 1,
            initialState: () => ({ n: 0 }),
            decisions: [
              {
                eventType: 'probe_damage',
                decision: {
                  kind: 'apply',
                  apply: (state: { readonly n: number }) => state,
                },
              },
            ],
          }),
        },
        owner: 'host-1',
        nowIso: () => AT,
      },
      gm(),
      {
        matchId: MATCH_ID,
        targetRevision: TARGET,
        expectedBranchId: 'root',
        expectedRevision: HEAD,
        expectedDigest: digest(HEAD),
        expectedGeneration: 1,
        actor: 'gm-1',
        reason: 'must still be refused after 17.1',
      },
    );
    expect(result).toMatchObject({
      kind: 'refused',
      reason: 'campaign-receipt-delivered',
    });
    expect(census()).toStrictEqual(before);
  });
});
