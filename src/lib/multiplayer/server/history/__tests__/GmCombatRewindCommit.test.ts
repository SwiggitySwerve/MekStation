/**
 * The GM's rewind COMMIT activates a verified candidate
 * (add-authoritative-history-branches; umbrella 13.5, seam 3b-iv-a).
 *
 * Harness copied from the preview suite: a migrated SQLite through
 * `SQLiteService`, four real journal events, genesis backfill. A real
 * `DurableMatchStore` sits beside it so R3 can ask the shipped 14.3
 * consult (`readMatchStreamRebuild`) while the lease is held.
 *
 * A live `ServerMatchHost.handleIntent` cannot be interleaved inside
 * this one `await` without standing up an engine the commit does not
 * own. R3 therefore injects a probe that reads the lease store and the
 * shipped rebuild consult between steps 3 and 8.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IViewerProjectionProbe } from '@/lib/events/journal/EventHistoryImpactDerivation';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IGmAuthorityContext } from '@/types/interventions';

import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { journalBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { ReplayProjector } from '@/lib/events/replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  commitGmCombatRewind,
  type IGmCombatRewindCommitDeps,
  type IGmCombatRewindCommitRequest,
} from '../GmCombatRewindCommit';

const MATCH_ID = 'stream-1';
const STREAM = { streamType: 'match', streamId: MATCH_ID } as const;
const AT = '2026-09-02T00:00:00.000Z';
const HEAD_REVISION = 4;
const TARGET_REVISION = 2;
const TTL_MS = 30_000;
const REASON = 'authorized rewind to turn 2';
const VIEWERS = ['gm', 'player-1', 'player-2'] as const;

type ProbePayload = { readonly amount: number };
interface IProbeState {
  readonly damage: number;
}

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

describe('commitGmCombatRewind', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rewind-commit-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'rewind.db') });
    service.initialize();
    db = service.getDatabase();
    store = new DurableMatchStore({ path: ':memory:' });
    await seedJournal();
    await seedMatchStore();
  });

  afterEach(async () => {
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function leases(): SQLiteEventHistoryCorrectionLeaseStore {
    return new SQLiteEventHistoryCorrectionLeaseStore(db, branches());
  }

  function manifests(): SQLiteEventHistoryArtifactManifestStore {
    return new SQLiteEventHistoryArtifactManifestStore(db);
  }

  function journal(): SQLiteEventJournal<ProbePayload> {
    return new SQLiteEventJournal<ProbePayload>(db, () => AT);
  }

  function probe(): IViewerProjectionProbe {
    return {
      digest: (_viewerId, events) =>
        events
          .map((event) => `${event.eventId}:${event.eventDigest}`)
          .join('|'),
    };
  }

  async function seedJournal(): Promise<void> {
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

  function matchEvent(sequence: number): IGameEvent {
    return {
      id: `match-event-${sequence}`,
      gameId: MATCH_ID,
      sequence,
      timestamp: AT,
      type: GameEventType.PhaseChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: {
        fromPhase: GamePhase.Initiative,
        toPhase: GamePhase.Movement,
      },
    };
  }

  async function seedMatchStore(): Promise<void> {
    const now = AT;
    await store.createMatch({
      matchId: MATCH_ID,
      hostPlayerId: 'gm-1',
      playerIds: ['gm-1', 'player-2'],
      sideAssignments: [
        { playerId: 'gm-1', side: 'player' },
        { playerId: 'player-2', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
    });
    for (const sequence of [0, 1, 2, 3]) {
      await store.appendEvent(MATCH_ID, matchEvent(sequence));
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

  function gmAuthority(
    role: IGmAuthorityContext['role'] = 'gm',
    actorId = 'gm-1',
  ): IGmAuthorityContext {
    return {
      actorId,
      role,
      gameId: MATCH_ID,
      ownedStateRefs: [`game:${MATCH_ID}`],
    };
  }

  function deps(
    overrides: Partial<IGmCombatRewindCommitDeps<IProbeState>> = {},
  ): IGmCombatRewindCommitDeps<IProbeState> {
    return {
      db,
      branches: branches(),
      leases: leases(),
      manifests: manifests(),
      reader: journalBranchSegmentReader<ProbePayload>(journal()),
      probe: probe(),
      readOutcomeId: async () => null,
      priorHeadRevision: HEAD_REVISION,
      viewerIds: [...VIEWERS],
      verification: { registry: REGISTRY, projector: projector() },
      owner: 'host-1',
      ttlMs: TTL_MS,
      nowIso: () => AT,
      ...overrides,
    };
  }

  function request(
    overrides: Partial<IGmCombatRewindCommitRequest> = {},
  ): IGmCombatRewindCommitRequest {
    return {
      matchId: MATCH_ID,
      targetRevision: TARGET_REVISION,
      expectedBranchId: 'root',
      expectedRevision: HEAD_REVISION,
      expectedDigest: headDigest(HEAD_REVISION),
      expectedGeneration: 1,
      actor: 'gm-1',
      reason: REASON,
      ...overrides,
    };
  }

  /** Full rows, not counts: a rewritten cell with the same count must fail. */
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
    };
  }

  function effectiveHead(): {
    readonly branchId: string;
    readonly generation: number;
  } {
    return db
      .prepare(
        `SELECT branch_id AS branchId, effective_generation AS generation
           FROM event_history_effective_heads
          WHERE stream_id = ?`,
      )
      .get(MATCH_ID) as {
      readonly branchId: string;
      readonly generation: number;
    };
  }

  function flappingReader(): IBranchSegmentReader<IProjectableBranchEvent> {
    const inner = journalBranchSegmentReader<ProbePayload>(journal());
    let reads = 0;
    return {
      read: async (stream, segment) => {
        const events = await inner.read(stream, segment);
        reads += 1;
        if (reads === 1) return events;
        return events.map((event, index) =>
          index === 0 ? { ...event, eventDigest: 'c'.repeat(64) } : event,
        );
      },
    };
  }

  it('R1 commits a rewind and activates the candidate', async () => {
    const prior = effectiveHead();
    const result = await commitGmCombatRewind(deps(), gmAuthority(), request());

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.matchId).toBe(MATCH_ID);
    expect(result.priorBranchId).toBe('root');
    expect(result.effectiveGeneration).toBe(prior.generation + 1);
    expect(effectiveHead()).toEqual({
      branchId: result.activatedBranchId,
      generation: prior.generation + 1,
    });
    // Cut at the target, not the fenced head: a head-cut would advance
    // the generation while leaving every event in place.
    expect(
      branches().requireBranch(STREAM, result.activatedBranchId).baseRevision,
    ).toBe(TARGET_REVISION);
    expect(leases().readLiveLease(STREAM)).toBeNull();
  });

  it('R2 refuses a rewind past a delivered campaign receipt and writes nothing', async () => {
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES ('outcome-1', 1, 'campaign-1', 'cmd-1', ?, 1, 1, 1, 1, ?)`,
    ).run('a'.repeat(64), AT);
    const before = census();

    const result = await commitGmCombatRewind(
      deps({ readOutcomeId: async () => 'outcome-1' }),
      gmAuthority(),
      request(),
    );

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        reason: 'campaign-receipt-delivered',
      }),
    );
    expect(census()).toStrictEqual(before);
  });

  it('R3 holds a live lease the shipped rebuild consult can see', async () => {
    const matchEventsBefore = (await store.getEvents(MATCH_ID)).length;
    const observed: Array<string | null> = [];

    const result = await commitGmCombatRewind(
      deps({
        onLeaseHeld: () => {
          observed.push(store.readMatchStreamRebuild(MATCH_ID)?.code ?? null);
          observed.push(
            leases().readLiveLease(STREAM) === null ? null : 'live',
          );
        },
      }),
      gmAuthority(),
      request(),
    );

    expect(result.kind).toBe('committed');
    // Cannot interleave handleIntent inside this await; the probe reads
    // the same consult refuseDuringHistoryRebuild already watches.
    expect(observed).toEqual([
      'PROJECTION_REBUILDING',
      'live',
      'PROJECTION_REBUILDING',
      'live',
    ]);
    expect((await store.getEvents(MATCH_ID)).length).toBe(matchEventsBefore);
    expect(leases().readLiveLease(STREAM)).toBeNull();
  });

  it('R4 a failed verification activates nothing and reopens the stream', async () => {
    const prior = effectiveHead();

    const result = await commitGmCombatRewind(
      deps({ reader: flappingReader() }),
      gmAuthority(),
      request(),
    );

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'refused',
        reason: 'candidate-verification-failed',
      }),
    );
    expect(effectiveHead()).toEqual(prior);
    expect(leases().readLiveLease(STREAM)).toBeNull();
    expect(
      db
        .prepare(`SELECT COUNT(*) AS n FROM event_history_supersessions`)
        .get() as { readonly n: number },
    ).toEqual({ n: 0 });
    const statuses = (
      db
        .prepare(
          `SELECT status FROM event_history_branches WHERE branch_id != 'root'`,
        )
        .all() as Array<{ readonly status: string }>
    ).map((row) => row.status);
    expect(statuses.every((status) => status !== 'effective')).toBe(true);
  });

  it.each([
    {
      name: 'gm-role-required' as const,
      run: () => commitGmCombatRewind(deps(), gmAuthority('player'), request()),
    },
    {
      name: 'actor-mismatch' as const,
      run: () =>
        commitGmCombatRewind(
          deps(),
          gmAuthority('gm', 'gm-1'),
          request({ actor: 'other-gm' }),
        ),
    },
    {
      name: 'campaign-receipt-delivered' as const,
      run: () => {
        db.prepare(
          `INSERT INTO campaign_combat_outcome_inbox
             (outcome_id, outcome_version, campaign_id, command_id, command_digest,
              first_stream_revision, last_stream_revision, first_commit_position,
              last_commit_position, received_at)
           VALUES ('outcome-1', 1, 'campaign-1', 'cmd-1', ?, 1, 1, 1, 1, ?)`,
        ).run('a'.repeat(64), AT);
        return commitGmCombatRewind(
          deps({ readOutcomeId: async () => 'outcome-1' }),
          gmAuthority(),
          request(),
        );
      },
    },
    {
      name: 'no-authoritative-history' as const,
      run: () =>
        commitGmCombatRewind(
          deps(),
          gmAuthority(),
          request({ matchId: 'stream-unregistered' }),
        ),
    },
    {
      name: 'rewind-target-above-head' as const,
      run: () =>
        commitGmCombatRewind(
          deps(),
          gmAuthority(),
          request({ targetRevision: HEAD_REVISION }),
        ),
    },
    {
      name: 'rewind-target-below-branch-base' as const,
      run: () =>
        commitGmCombatRewind(
          deps(),
          gmAuthority(),
          request({ targetRevision: 0 }),
        ),
    },
    {
      name: 'STALE_REVISION' as const,
      run: () =>
        commitGmCombatRewind(
          deps(),
          gmAuthority(),
          request({ expectedRevision: HEAD_REVISION - 1 }),
        ),
    },
    {
      name: 'correction-lease-held' as const,
      run: () => {
        leases().acquireCorrectionLease({
          ...STREAM,
          owner: 'host-other',
          actor: 'gm-2',
          reason: 'other correction',
          ttlMs: TTL_MS,
          expectedBranchId: 'root',
          expectedRevision: HEAD_REVISION,
          expectedDigest: headDigest(HEAD_REVISION),
          expectedGeneration: 1,
        });
        return commitGmCombatRewind(deps(), gmAuthority(), request());
      },
    },
    {
      name: 'candidate-verification-failed' as const,
      run: () =>
        commitGmCombatRewind(
          deps({ reader: flappingReader() }),
          gmAuthority(),
          request(),
        ),
    },
    {
      name: 'generation-exhausted' as const,
      run: () => {
        db.prepare(
          `UPDATE event_history_effective_heads
              SET effective_generation = ?
            WHERE stream_id = ?`,
        ).run(Number.MAX_SAFE_INTEGER, MATCH_ID);
        return commitGmCombatRewind(
          deps(),
          gmAuthority(),
          request({ expectedGeneration: Number.MAX_SAFE_INTEGER }),
        );
      },
    },
    {
      name: 'replacement-events-unsupported' as const,
      run: () =>
        commitGmCombatRewind(
          deps(),
          gmAuthority(),
          Object.assign(request(), { replacementEvents: [] }),
        ),
    },
  ])('R5 releases the lease on refusal $name', async ({ name, run }) => {
    const result = await run();
    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.reason).toBe(name);
    const live = leases().readLiveLease(STREAM);
    if (name === 'correction-lease-held') {
      expect(live?.owner).toBe('host-other');
      return;
    }
    expect(live).toBeNull();
  });
});
