/**
 * /api/matches/[id]/rewind-commit (umbrella 13.5, seam 3b-iv-b).
 *
 * Harness copied from the preview route: a real `DurableMatchStore` with
 * real seats and events, migrated SQLite through `SQLiteService`, real
 * bearer tokens, the shipped handler. Journal rows are aligned to the
 * match-store reader so the candidate can anchor to a real event
 * (finding #48: nothing writes match events to the journal yet).
 *
 * The two things these rows exist to hold:
 *
 * - **The actor is the token, never the body.** A route that read the
 *   caller from the request would let anyone rewind wearing the host.
 * - **A refused caller writes nothing.** The storage census is the
 *   assertion, the same way the commit module test proves it.
 */

import type Database from 'better-sqlite3';
import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IVaultIdentity } from '@/types/vault';

import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { matchStoreBranchSegmentReader } from '@/lib/multiplayer/server/history/matchStoreBranchSegmentReader';
import commitHandler from '@/pages/api/matches/[id]/rewind-commit';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import {
  CombatEndReason,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

/**
 * Every viewer the probe was asked about. The probe is built INSIDE the
 * handler, so counting from out here is the only way to prove a refusal
 * derived nothing.
 */
const mockProbeCalls: string[] = [];

jest.mock('@/lib/multiplayer/server/projection/combatViewerProbe', () => {
  const actual = jest.requireActual(
    '@/lib/multiplayer/server/projection/combatViewerProbe',
  ) as typeof import('@/lib/multiplayer/server/projection/combatViewerProbe');
  return {
    ...actual,
    combatViewerProbe: (
      deps: Parameters<typeof actual.combatViewerProbe>[0],
    ) => {
      const probe = actual.combatViewerProbe(deps);
      return {
        digest: (
          viewerId: string,
          events: Parameters<typeof probe.digest>[1],
        ) => {
          mockProbeCalls.push(viewerId);
          return probe.digest(viewerId, events);
        },
      };
    },
  };
});

const MATCH_ID = 'match-rewind-commit-route';
const AT = '2026-09-02T00:00:00.000Z';
const HEAD_REVISION = 4;
const HEAD_DIGEST = 'd'.repeat(64);

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

async function mintHolder(name: string): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${name}`,
    displayName: name,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

function gameEvent(sequence: number, matchId = MATCH_ID): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: AT,
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: { index: sequence },
  } as unknown as IGameEvent;
}

describe('POST /api/matches/[id]/rewind-commit', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;
  let host: IHolder;
  let guest: IHolder;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rewind-commit-route-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'route.db') });
    service.initialize();
    db = service.getDatabase();
    host = await mintHolder('host');
    guest = await mintHolder('guest');

    mockProbeCalls.length = 0;
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await seedMatch(MATCH_ID);
  });

  async function seedMatch(matchId: string): Promise<void> {
    await store.createMatch(
      activeMeta({
        matchId,
        config: { mapRadius: 4, turnLimit: 5 },
      }),
    );
    for (const sequence of [0, 1, 2, 3]) {
      await store.appendEvent(matchId, gameEvent(sequence, matchId));
    }
    await seedAuthoritativeHistory(matchId);
  }

  afterEach(async () => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function activeMeta(overrides: Partial<IMatchMeta> = {}): IMatchMeta {
    const seats = defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: host.playerId, displayName: 'Host' },
          ready: true,
        };
      }
      if (seat.slotId === 'bravo-1') {
        return {
          ...seat,
          occupant: { playerId: guest.playerId, displayName: 'Guest' },
          ready: true,
        };
      }
      return seat;
    });
    return {
      matchId: MATCH_ID,
      hostPlayerId: host.playerId,
      playerIds: [host.playerId, guest.playerId],
      sideAssignments: [
        { playerId: host.playerId, side: 'player' },
        { playerId: guest.playerId, side: 'opponent' },
      ],
      status: 'active',
      createdAt: AT,
      updatedAt: AT,
      config: { mapRadius: 4, turnLimit: 5 },
      layout: '1v1',
      seats,
      ...overrides,
    };
  }

  /**
   * Stand-in for the combat cutover: a head row, genesis branch, and
   * journal events whose id/digest match the match-store reader so a
   * candidate can anchor without lying about which event it cut at.
   */
  async function seedAuthoritativeHistory(matchId: string): Promise<void> {
    const chained = await matchStoreBranchSegmentReader(store).read(
      { streamType: 'match', streamId: matchId },
      {
        kind: 'prefix',
        branchId: 'root',
        fromRevision: 0,
        throughRevision: HEAD_REVISION,
        baseEventId: null,
        baseDigest: '0'.repeat(64),
      },
    );
    db.prepare(
      `INSERT INTO event_journal_batches (
         command_id, command_digest, canonicalizer_version, stream_type,
         stream_id, branch_id, event_count, first_stream_revision,
         last_stream_revision, first_commit_position, last_commit_position,
         recorded_at)
       VALUES (?, ?, 1, 'match', ?, 'root', ?, 1, ?, 1, ?, ?)`,
    ).run(
      `cmd-${matchId}`,
      'a'.repeat(64),
      matchId,
      chained.length,
      chained.length,
      chained.length,
      AT,
    );
    const insert = db.prepare(
      `INSERT INTO event_journal_events (
         event_id, command_id, stream_type, stream_id, branch_id,
         stream_revision, commit_position, command_index, event_type,
         event_version, correlation_id, actor_kind, actor_id,
         authority_type, authority_id, occurred_at, recorded_at,
         canonicalizer_version, previous_stream_event_digest, event_digest,
         payload_json)
       VALUES (?, ?, 'match', ?, 'root', ?, ?, ?, ?, 1, ?, 'human', ?,
               'host', ?, ?, ?, 1, ?, ?, '{}')`,
    );
    chained.forEach((event, index) => {
      insert.run(
        event.eventId,
        `cmd-${matchId}`,
        matchId,
        event.streamRevision,
        index + 1,
        index,
        event.eventType,
        `corr-${matchId}`,
        host.playerId,
        matchId,
        AT,
        AT,
        event.previousStreamEventDigest,
        event.eventDigest,
      );
    });
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', ?, ?)`,
    ).run(matchId, HEAD_REVISION, HEAD_DIGEST);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  function body(overrides: Record<string, unknown> = {}) {
    return {
      targetRevision: 2,
      expectedBranchId: 'root',
      expectedRevision: HEAD_REVISION,
      expectedDigest: HEAD_DIGEST,
      expectedGeneration: 1,
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

  function effectiveGeneration(): number {
    return (
      db
        .prepare(
          `SELECT effective_generation AS generation
             FROM event_history_effective_heads
            WHERE stream_id = ?`,
        )
        .get(MATCH_ID) as { readonly generation: number }
    ).generation;
  }

  async function call(options: {
    readonly bearer?: string;
    readonly body?: unknown;
    readonly method?: 'POST' | 'GET';
    readonly id?: string;
  }) {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: options.method ?? 'POST',
      query: { id: options.id ?? MATCH_ID },
      body: options.body ?? body(),
      ...(options.bearer !== undefined
        ? { headers: { authorization: `Bearer ${options.bearer}` } }
        : {}),
    });
    await commitHandler(req, res);
    return {
      status: res._getStatusCode(),
      json: res._getJSONData() as Record<string, unknown>,
    };
  }

  it('gives the host a committed rewind and advances the effective generation', async () => {
    const prior = effectiveGeneration();
    const { status, json } = await call({ bearer: host.wire });

    expect(status).toBe(200);
    expect(json.kind).toBe('committed');
    expect(json.effectiveGeneration).toBe(prior + 1);
    expect(effectiveGeneration()).toBe(prior + 1);
  });

  it('refuses a seated non-host with 403 and writes nothing', async () => {
    const before = census();
    const { status, json } = await call({ bearer: guest.wire });

    expect(status).toBe(403);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('gm-role-required');
    expect(census()).toStrictEqual(before);
    expect(mockProbeCalls).toEqual([]);
  });

  it('takes the actor from the token, never from the body', async () => {
    const { status, json } = await call({
      bearer: guest.wire,
      body: body({
        actor: host.playerId,
        actorId: host.playerId,
        playerId: host.playerId,
        authorPlayerId: host.playerId,
        role: 'gm',
      }),
    });

    expect(status).toBe(403);
    expect(json.reason).toBe('gm-role-required');
  });

  it('tells an unauthenticated caller only that it must authenticate', async () => {
    const { status, json } = await call({ body: body() });

    expect(status).toBe(401);
    expect(json.kind).toBeUndefined();
    expect(String(json.error)).toContain('Unauthorized');
  });

  it('refuses a body carrying replacement events rather than stripping them', async () => {
    const before = census();
    const { status, json } = await call({
      bearer: host.wire,
      body: body({ replacementEvents: [{ id: 'forged' }] }),
    });

    expect(status).toBe(400);
    expect(json.reason).toBe('replacement-events-unsupported');
    expect(json.kind).toBeUndefined();
    expect(census()).toStrictEqual(before);
    expect(mockProbeCalls).toEqual([]);
  });

  it('answers 404 for a match with no authoritative history', async () => {
    db.prepare(
      `DELETE FROM event_history_effective_heads WHERE stream_id = ?`,
    ).run(MATCH_ID);

    const { status, json } = await call({ bearer: host.wire });

    expect(status).toBe(404);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('no-authoritative-history');
  });

  it('answers 404 for a match nobody has created, not a body the client could mistake for success', async () => {
    const { status, json } = await call({ bearer: host.wire, id: 'no-such-match' });

    expect(status).toBe(404);
    expect(json.kind).toBeUndefined();
    expect(json.reason).toBe('unknown-match');
  });

  it('refuses a delivered campaign receipt with 409 and writes nothing', async () => {
    const batched = await store.appendCommandBatch(MATCH_ID, {
      commandId: 'terminal-outcome',
      actorId: host.playerId,
      expectedRevision: 4,
      events: [gameEvent(4)],
      combatOutcome: {
        outcomeId: 'outcome-1',
        outcomeVersion: 1,
        outcome: {
          version: 1,
          matchId: MATCH_ID,
          contractId: null,
          scenarioId: null,
          endReason: CombatEndReason.Destruction,
          report: {} as ICombatOutcome['report'],
          unitDeltas: [],
          capturedAt: AT,
        },
      },
    });
    expect(batched.kind).toBe('committed');
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES ('outcome-1', 1, 'campaign-1', 'cmd-1', ?, 1, 1, 1, 1, ?)`,
    ).run('a'.repeat(64), AT);
    const before = census();

    const { status, json } = await call({ bearer: host.wire });

    expect(status).toBe(409);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('campaign-receipt-delivered');
    expect(census()).toStrictEqual(before);
  });

  it('refuses an authenticated non-member with 403 and writes nothing', async () => {
    const stranger = await mintHolder('stranger');
    const before = census();
    mockProbeCalls.length = 0;

    const { status, json } = await call({ bearer: stranger.wire });

    expect(status).toBe(403);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('state-not-owned');
    expect(JSON.stringify(json)).not.toContain(MATCH_ID);
    expect(census()).toStrictEqual(before);
    expect(mockProbeCalls).toEqual([]);
  });

  it('refuses a method it does not serve', async () => {
    const { status, json } = await call({
      bearer: host.wire,
      method: 'GET',
    });

    expect(status).toBe(405);
    expect(json.kind).toBeUndefined();
  });
});
