/**
 * Checkpoint-plus-tail equals full replay for the authoritative state AND
 * every viewer digest (umbrella task 15.2), against REAL SQLite files.
 *
 * The equivalence harness already proves one authoritative projector and
 * one audience-safe one agree across the two paths. What 15.2 asks is
 * narrower and harder: that a PRODUCTION checkpoint - written by the
 * writer, selected by the reader, admitted by the digest law - leaves
 * every audience's digest byte-identical, not merely deep-equal.
 *
 * Four pipelines, four distinct projector identities, four independent
 * checkpoint rows under the same stream and branch: the authoritative
 * fold plus the GM, player-one and player-two views. Each is recovered
 * through `BranchCheckpointCache.recover` (the `recoverState` door) and
 * compared to its own full replay.
 *
 * Two non-vacuity controls, because equal digests are only meaningful if
 * unequal ones were possible: the three viewer digests differ pairwise,
 * and the injected combat audience probe separates the GM from a player.
 *
 * The combat probe is `journalAuthorityShadow.audienceDigest`, consumed
 * through injection and never edited - it belongs to the multiplayer
 * server. With fog disabled it separates viewer CLASSES (gm vs player)
 * but not the two players from each other; that is stated here rather
 * than hidden, and the per-player separation is what the campaign
 * pipelines above prove.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';

import { audienceDigest } from '@/lib/multiplayer/server/journalAuthorityShadow';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';
import { sha256Sync } from '@/utils/events/hashUtils';

import type { IReplayEquivalenceEvent } from '../../replay/ReplayEquivalenceHarness';
import type { IBranchCheckpointPipeline } from '../BranchCheckpointCache';

import { canonicalizeJsonV1 } from '../../journal/EventJournalCanonicalizer';
import { runFullReplay } from '../../replay/ReplayEquivalenceHarness';
import { ReplayProjector } from '../../replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '../../replay/ReplaySchemaRegistry';
import { BranchCheckpointCache } from '../BranchCheckpointCache';

const FINGERPRINT = 'd'.repeat(64);
const RECORDED_AT = '2026-09-02T00:00:00.000Z';
const STREAM = { streamType: 'campaign', streamId: 'campaign-viewers' };
const BASE_REVISION = 4;
const HEAD_REVISION = 6;

/** One fact, stamped with who may see it. */
interface IScopedPayload {
  readonly amount: number;
  readonly audience: 'all' | 'gm' | 'p1' | 'p2';
}

const registry = new ReplaySchemaRegistry({
  events: [
    {
      eventType: 'scoped_fact',
      targetSchemaVersion: 1,
      schemas: [
        {
          schemaVersion: 1,
          schemaId: 'scoped.fact.v1',
          parse: (payload: unknown) => payload,
        },
      ],
      transitions: [],
    },
  ],
});

/** Six facts: shared, GM-only, P1-only, P2-only, and two more shared. */
const EVENTS: readonly IReplayEquivalenceEvent[] = Object.freeze(
  (
    [
      ['all', 10],
      ['gm', 20],
      ['p1', 30],
      ['p2', 40],
      ['all', 50],
      ['gm', 60],
    ] as const
  ).map(([audience, amount], index) => ({
    revision: index + 1,
    eventType: 'scoped_fact',
    schemaVersion: 1,
    payload: { amount, audience } satisfies IScopedPayload,
  })),
);

interface IViewState {
  readonly total: number;
  readonly seen: readonly number[];
}

const EMPTY_VIEW: IViewState = Object.freeze({ total: 0, seen: [] });

/**
 * One projector per audience. `admits` is the whole difference between
 * them, so the four folds are genuinely different views of one history
 * rather than four names for the same number.
 */
function viewProjector(
  projectorId: string,
  admits: (audience: IScopedPayload['audience']) => boolean,
): ReplayProjector<IViewState> {
  return new ReplayProjector<IViewState>({
    projectorId,
    projectorVersion: 1,
    initialState: () => EMPTY_VIEW,
    decisions: [
      {
        eventType: 'scoped_fact',
        decision: {
          kind: 'apply',
          apply: (state, event) => {
            const payload = event.payload as IScopedPayload;
            if (!admits(payload.audience)) return state;
            return {
              total: state.total + payload.amount,
              seen: [...state.seen, payload.amount],
            };
          },
        },
      },
    ],
  });
}

const VIEWS = [
  ['campaign.authoritative', () => true],
  ['campaign.viewer.gm', (a: IScopedPayload['audience']) => a !== 'p2'],
  [
    'campaign.viewer.p1',
    (a: IScopedPayload['audience']) => a === 'all' || a === 'p1',
  ],
  [
    'campaign.viewer.p2',
    (a: IScopedPayload['audience']) => a === 'all' || a === 'p2',
  ],
] as const;

function pipelineFor(projectorId: string): IBranchCheckpointPipeline {
  return {
    stream: STREAM,
    branchId: 'root',
    projectorId,
    projectorVersion: 1,
    schemaPipelineFingerprint: FINGERPRINT,
  };
}

/** A real chain over the history, the way the journal's digests chain. */
const CHAIN: readonly (string | undefined)[] = (() => {
  const chain: (string | undefined)[] = [];
  let previous: string | null = null;
  for (const event of EVENTS) {
    previous = sha256Sync(canonicalizeJsonV1({ event, previous }));
    chain[event.revision] = previous;
  }
  return chain;
})();

const history = {
  chainDigestAt: (revision: number) => Promise.resolve(CHAIN[revision] ?? null),
  readTail: (fromExclusive: number) =>
    Promise.resolve(EVENTS.filter((event) => event.revision > fromExclusive)),
};

/**
 * The injected combat probe: the shipped audience digest, over events
 * derived from a recovered state. Nothing in `journalAuthorityShadow` is
 * modified - it is called exactly as the shadow comparison calls it.
 */
const MINIMAL_GAME_STATE = {} as IGameState;

function combatProbe(
  state: IViewState,
  playerId: string,
  viewerClass: 'gm' | 'player',
): string {
  const events: IGameEvent[] = state.seen.map(
    (amount, index) =>
      ({
        id: `evt-${index}`,
        gameId: 'campaign-viewers',
        sequence: index,
        timestamp: RECORDED_AT,
        type: GameEventType.TurnStarted,
        turn: 1,
        phase: GamePhase.Initiative,
        payload: { turn: amount },
      }) as IGameEvent,
  );
  return audienceDigest(
    events,
    MINIMAL_GAME_STATE,
    { audience: `probe:${playerId}`, playerId, viewerClass },
    {
      gmPlayerId: 'gm',
      playerIds: ['p1', 'p2'],
      // Fog stays off: this probe is asserting that recovery preserves
      // the audience projection, not re-testing fog-of-war.
      config: {},
      sideAssignments: [],
    },
  );
}

describe('viewer digest equivalence across recovery paths', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'viewer-digest-equivalence-'));
    dbPath = path.join(dir, 'checkpoints.db');
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

  /** Write one checkpoint per pipeline at the same authority head. */
  function seedCheckpoints(db: Database.Database): void {
    const cache = new BranchCheckpointCache(db);
    for (const [projectorId, admits] of VIEWS) {
      const base = runFullReplay(
        registry,
        viewProjector(projectorId, admits),
        EVENTS.filter((event) => event.revision <= BASE_REVISION),
      );
      cache.record(
        pipelineFor(projectorId),
        BASE_REVISION,
        CHAIN[BASE_REVISION] as string,
        base.state,
        RECORDED_AT,
      );
    }
  }

  it('every pipeline gets its own row at the same head', () => {
    const db = database();
    seedCheckpoints(db);
    const rows = db
      .prepare(
        `SELECT projector_id FROM replay_checkpoints ORDER BY projector_id`,
      )
      .all() as { projector_id: string }[];
    expect(rows.map((row) => row.projector_id)).toEqual(
      [...VIEWS].map(([id]) => id).sort(),
    );
  });

  it.each(VIEWS.map(([id]) => id))(
    'checkpoint-plus-tail is byte-equal to full replay for %s',
    async (projectorId) => {
      const db = database();
      seedCheckpoints(db);
      const admits = VIEWS.find(([id]) => id === projectorId)?.[1];
      if (admits === undefined) throw new Error('unreachable');

      const reference = runFullReplay(
        registry,
        viewProjector(projectorId, admits),
        EVENTS,
      );
      const accelerated = await new BranchCheckpointCache(db).recover(
        pipelineFor(projectorId),
        HEAD_REVISION,
        history,
        registry,
        viewProjector(projectorId, admits),
      );

      expect(accelerated.path).toBe('checkpoint-plus-tail');
      // Byte-equal digests, not deep-equal shapes.
      expect(accelerated.stateDigest).toBe(reference.stateDigest);
      expect(accelerated.state).toEqual(reference.state);
      expect(accelerated.appliedRevisions).toBe(HEAD_REVISION - BASE_REVISION);
      expect(reference.appliedRevisions).toBe(HEAD_REVISION);
    },
  );

  it('the three viewer digests differ pairwise (the control)', () => {
    const digests = VIEWS.filter(([id]) => id !== 'campaign.authoritative').map(
      ([projectorId, admits]) =>
        runFullReplay(registry, viewProjector(projectorId, admits), EVENTS)
          .stateDigest,
    );
    expect(new Set(digests).size).toBe(3);
  });

  it('the injected combat audience digest survives recovery', async () => {
    const db = database();
    seedCheckpoints(db);
    const [projectorId, admits] = VIEWS[0];
    const reference = runFullReplay(
      registry,
      viewProjector(projectorId, admits),
      EVENTS,
    );
    const accelerated = await new BranchCheckpointCache(db).recover(
      pipelineFor(projectorId),
      HEAD_REVISION,
      history,
      registry,
      viewProjector(projectorId, admits),
    );
    if (accelerated.path !== 'checkpoint-plus-tail') {
      throw new Error('expected the accelerated path');
    }

    for (const [playerId, viewerClass] of [
      ['gm', 'gm'],
      ['p1', 'player'],
      ['p2', 'player'],
    ] as const) {
      expect(combatProbe(accelerated.state, playerId, viewerClass)).toBe(
        combatProbe(reference.state, playerId, viewerClass),
      );
    }
    // Non-vacuity: the probe really does separate viewer classes, so the
    // equalities above are not all the same constant.
    expect(combatProbe(reference.state, 'gm', 'gm')).not.toBe(
      combatProbe(reference.state, 'p1', 'player'),
    );
  });
});
