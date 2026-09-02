/**
 * The GM's rewind preview answers, and changes nothing
 * (add-authoritative-history-branches; umbrella 13.4 / 13.5).
 *
 * Real all the way down: a migrated SQLite through the shipped
 * `SQLiteService` singleton, four real events through the shipped
 * journal writer, the shipped genesis backfill, and - for the lease
 * row - a real correction lease acquired through the shipped store, so
 * the DEFAULT durable rebuild reader is what answers rather than a seam.
 *
 * The two rows that carry this seam:
 *
 * - **A preview writes nothing.** Every history table is counted before
 *   and after. An operator cannot be asked to approve a blast radius
 *   that showing it to them has already committed.
 * - **A preview reports what activation would report.** Proven against
 *   the SEALING path for the same truncation, not against a restatement
 *   of the preview's own arithmetic.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IViewerProjectionProbe } from '@/lib/events/journal/EventHistoryImpactDerivation';
import type { IGmAuthorityContext } from '@/types/interventions';

import { journalBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import { deriveAndSealCandidateImpact } from '@/lib/events/journal/EventHistoryImpactDerivation';
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
  previewGmCombatRewind,
  type IGmCombatRewindPreviewDeps,
} from '../GmCombatRewindPreview';

const MATCH_ID = 'stream-1';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-02T00:00:00.000Z';
const HEAD_REVISION = 4;
const TARGET_REVISION = 2;
const TTL_MS = 30_000;
const CHECKPOINT_ABOVE_TARGET = 'checkpoint-above';
const CHECKPOINT_AT_TARGET = 'checkpoint-at-base';
const VIEWERS = ['gm', 'player-1', 'player-2'] as const;

type ProbePayload = { readonly amount: number };
interface IProbeState {
  readonly damage: number;
}

/** The same minimal schema/projector pair the derivation suite verifies with. */
const REGISTRY = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'probe_damage',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'probe.damage.v1',
          parse: (payload: unknown) => payload,
        },
      ],
      transitions: [],
    },
  ],
});

const projector = (): ReplayProjector<IProbeState> =>
  new ReplayProjector<IProbeState>({
    projectorId: 'rewind.probe',
    projectorVersion: 1,
    initialState: () => ({ damage: 0 }),
    decisions: [
      {
        eventType: 'probe_damage',
        decision: {
          kind: 'apply',
          apply: (state, event) => ({
            damage: state.damage + (event.payload as ProbePayload).amount,
          }),
        },
      },
    ],
  });

/**
 * A viewer sees the events its allowance covers. `player-1` only ever
 * saw the first two, so a rewind to revision 2 cannot change its view -
 * which is what makes "changed viewers" a real subset rather than
 * everybody.
 */
const VIEWER_CEILING: Readonly<Record<string, number>> = {
  gm: Number.MAX_SAFE_INTEGER,
  'player-1': TARGET_REVISION,
  'player-2': Number.MAX_SAFE_INTEGER,
};

describe('previewGmCombatRewind', () => {
  let dir: string;
  let db: Database.Database;
  let probeCalls: string[];

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rewind-preview-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'rewind.db') });
    service.initialize();
    db = service.getDatabase();
    probeCalls = [];
    await seedStream();
    seedCheckpoints();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function journal(): SQLiteEventJournal<ProbePayload> {
    return new SQLiteEventJournal<ProbePayload>(db, () => AT);
  }

  /** Records every call so a refused preview can be proven silent. */
  function probe(): IViewerProjectionProbe {
    return {
      digest: (viewerId, events) => {
        probeCalls.push(viewerId);
        return events
          .filter((event) => event.streamRevision <= VIEWER_CEILING[viewerId])
          .map((event) => `${event.eventId}:${event.eventDigest}`)
          .join('|');
      },
    };
  }

  /** Four real events through the shipped writer, plus the genesis branch. */
  async function seedStream(): Promise<void> {
    const result = await journal().append({
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

  /**
   * Two checkpoints that straddle the target: one recorded ABOVE it, and
   * one recorded AT it. Both must exist for the boundary to be provable -
   * with only the first, a preview that read checkpoints from the wrong
   * revision would still look right, and with only the second there is
   * nothing to stale.
   */
  function seedCheckpoints(): void {
    const insert = db.prepare(
      `INSERT INTO replay_checkpoints
         (checkpoint_id, stream_id, branch_id, revision,
          schema_pipeline_fingerprint, projector_id, projector_version,
          source_tail_digest, state_digest, state_json, recorded_at)
       VALUES (?, ?, 'root', ?, ?, 'rewind.probe', 1, ?, ?, '{}', ?)`,
    );
    for (const [id, revision] of [
      [CHECKPOINT_ABOVE_TARGET, TARGET_REVISION + 1],
      [CHECKPOINT_AT_TARGET, TARGET_REVISION],
    ] as const) {
      insert.run(
        id,
        MATCH_ID,
        revision,
        'e'.repeat(64),
        'f'.repeat(64),
        '9'.repeat(64),
        AT,
      );
    }
  }

  function headDigest(revision: number): string {
    return (
      db
        .prepare(
          `SELECT event_digest AS digest FROM event_journal_events
            WHERE stream_id = ? AND stream_revision = ?`,
        )
        .get(MATCH_ID, revision) as { readonly digest: string }
    ).digest;
  }

  function gmAuthority(role = 'gm'): IGmAuthorityContext {
    return {
      actorId: 'gm-1',
      role: role as IGmAuthorityContext['role'],
      gameId: MATCH_ID,
      ownedStateRefs: [`game:${MATCH_ID}`],
    };
  }

  function deps(
    overrides: Partial<IGmCombatRewindPreviewDeps> = {},
  ): IGmCombatRewindPreviewDeps {
    return {
      db,
      branches: branches(),
      reader: journalBranchSegmentReader<ProbePayload>(journal()),
      priorHeadRevision: HEAD_REVISION,
      viewerIds: [...VIEWERS],
      probe: probe(),
      readOutcomeId: async () => null,
      ...overrides,
    };
  }

  function request(targetRevision = TARGET_REVISION) {
    return {
      matchId: MATCH_ID,
      targetRevision,
      expectedBranchId: 'root',
      expectedRevision: HEAD_REVISION,
      expectedDigest: headDigest(HEAD_REVISION),
      expectedGeneration: 1,
    };
  }

  /** Every durable row a preview must not have touched. */
  function census(): Record<string, number> {
    const count = (table: string): number =>
      (
        db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
          readonly n: number;
        }
      ).n;
    return {
      events: count('event_journal_events'),
      branches: count('event_history_branches'),
      heads: count('event_history_effective_heads'),
      supersessions: count('event_history_supersessions'),
      leases: count('event_history_correction_leases'),
      manifests: count('event_history_artifact_manifests'),
      manifestEntries: count('event_history_artifact_manifest_entries'),
      checkpoints: count('replay_checkpoints'),
    };
  }

  it('answers the GM without writing anything', async () => {
    const before = census();

    const result = await previewGmCombatRewind(
      deps(),
      gmAuthority(),
      request(),
    );

    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;
    // The viewers whose view actually moves. `player-1` never saw past
    // revision 2, so truncating there changes nothing for it.
    expect([...result.changedViewerIds].sort()).toEqual(['gm', 'player-2']);
    expect(result.targetRevision).toBe(TARGET_REVISION);
    expect(result.priorHead.branchId).toBe('root');
    // Nothing was created, sealed, or activated to answer the question.
    expect(census()).toEqual(before);
  });

  it('stales only the checkpoints recorded above the target', async () => {
    const result = await previewGmCombatRewind(
      deps(),
      gmAuthority(),
      request(),
    );

    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;
    const checkpoints = result.entries
      .filter((entry) => entry.artifactKind === 'checkpoint')
      .map((entry) => ({
        artifactId: entry.artifactId,
        sourceRevision: entry.sourceRevision,
      }));
    // EXACTLY the one above the target. A checkpoint recorded AT the
    // target describes history the truncation KEEPS, so staling it would
    // throw away work the rewind never invalidated - and listing it would
    // inflate a blast radius somebody has to review.
    expect(checkpoints).toEqual([
      {
        artifactId: CHECKPOINT_ABOVE_TARGET,
        sourceRevision: TARGET_REVISION + 1,
      },
    ]);
  });

  it('reports exactly what sealing the same truncation would report', async () => {
    const preview = await previewGmCombatRewind(
      deps(),
      gmAuthority(),
      request(),
    );
    expect(preview.kind).toBe('preview');
    if (preview.kind !== 'preview') return;

    // Now do it for real: mint the candidate row a rewind to this target
    // produces, and run the SEALING path over it. A candidate whose base
    // equals the target contributes an empty segment, so the path it
    // materialises IS the truncation - the same history the preview read
    // without writing a row for it.
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', ?, 'candidate-1', 'root', 1, ?, ?, ?, 'building',
               'host-1', 'correction-rebuild:lease:1:rewind to turn 2', ?)`,
    ).run(
      MATCH_ID,
      TARGET_REVISION,
      `event-${TARGET_REVISION}`,
      headDigest(TARGET_REVISION),
      AT,
    );
    const sealed = await deriveAndSealCandidateImpact(
      db,
      branches(),
      journalBranchSegmentReader<ProbePayload>(journal()),
      {
        stream: STREAM,
        candidateBranchId: 'candidate-1',
        priorHeadRevision: HEAD_REVISION,
        viewerIds: [...VIEWERS],
        probe: probe(),
        derivedAt: AT,
        verification: { registry: REGISTRY, projector: projector() },
      },
    );

    // The preview is only worth showing if it is the same answer.
    expect(preview.changedViewerIds).toEqual(sealed.changedViewerIds);
    expect(preview.entries).toEqual(sealed.entries);
  });

  it('refuses a rewind past a campaign that already took delivery', async () => {
    const before = census();
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES ('outcome-1', 1, 'campaign-1', 'cmd-1', ?, 1, 1, 1, 1, ?)`,
    ).run('a'.repeat(64), AT);

    const result = await previewGmCombatRewind(
      deps({ readOutcomeId: async () => 'outcome-1' }),
      gmAuthority(),
      request(),
    );

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    // Receipt presence IS the rule: the outcome was derived from the
    // match's final state, so no revision of this match survives the
    // campaign having spent against it.
    expect(result.reason).toBe('campaign-receipt-delivered');
    expect(census()).toEqual({ ...before, checkpoints: before.checkpoints });
  });

  it('tells a non-GM nothing, and does not even ask the probe', async () => {
    const result = await previewGmCombatRewind(
      deps(),
      gmAuthority('player'),
      request(),
    );

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.reason).toBe('gm-role-required');
    // A refused caller must not learn the impact through a side channel.
    // The probe is the only thing that could compute it, and it was
    // never invoked.
    expect(probeCalls).toEqual([]);
  });

  it('says a match with no authoritative history has none, and asks no probe', async () => {
    // FINDING #48/#53: nothing writes match events to the journal, so a
    // real match has no stream-head row and therefore no genesis branch.
    // That is an ANSWER this surface gives, not an exception it raises -
    // `readEffectiveHead`, never `requireEffectiveHead`, exactly as
    // `campaignLaunchHead` decided for the same reason.
    const unregistered = 'stream-unregistered';

    const result = await previewGmCombatRewind(deps(), gmAuthority(), {
      matchId: unregistered,
      targetRevision: 1,
      expectedBranchId: 'root',
      expectedRevision: 2,
      expectedDigest: 'e'.repeat(64),
      expectedGeneration: 1,
    });

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.reason).toBe('no-authoritative-history');
    // Nothing was derived to answer it.
    expect(probeCalls).toEqual([]);
  });

  it('refuses while another correction holds the lease', async () => {
    // A real lease through the shipped store, answered by the DEFAULT
    // durable reader - no seam, so this is the production consult.
    new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      branches(),
    ).acquireCorrectionLease({
      ...STREAM,
      owner: 'host-1',
      actor: 'gm-2',
      reason: 'authorized rewind to turn 1',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: HEAD_REVISION,
      expectedDigest: headDigest(HEAD_REVISION),
      expectedGeneration: 1,
    });

    const result = await previewGmCombatRewind(
      deps(),
      gmAuthority(),
      request(),
    );

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    // Previewing history another correction is replacing would show the
    // GM a radius computed from events that are on their way out.
    expect(result.reason).toBe('PROJECTION_REBUILDING');
    expect(probeCalls).toEqual([]);
  });
});
