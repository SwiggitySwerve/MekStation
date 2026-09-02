/**
 * /api/matches/[id]/rewind-preview (umbrella 13.4 / 13.5).
 *
 * Real all the way down: a real `DurableMatchStore` with real seats and
 * real events, a migrated SQLite through the shipped `SQLiteService`
 * singleton, real bearer tokens, and the shipped handler. The two things
 * these rows exist to hold:
 *
 * - **The actor is the token, never the body.** A route that read the
 *   caller from the request would let anyone preview - and later rewind -
 *   wearing the host's identity.
 * - **A refused caller learns nothing.** Not the impact, not whether the
 *   match exists. The probe is the only thing that can compute the
 *   impact, so "was the probe asked" is the assertion.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
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
import previewHandler from '@/pages/api/matches/[id]/rewind-preview';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

/**
 * Every viewer the probe was asked about. The probe is built INSIDE the
 * handler, so counting from out here is the only way to prove a refusal
 * derived nothing - and "derived nothing" is the whole claim a refusal
 * makes.
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

const MATCH_ID = 'match-rewind-route';
const FOGGED_MATCH_ID = 'match-rewind-fogged';
const CLEAR_MATCH_ID = 'match-rewind-clear';
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

describe('POST /api/matches/[id]/rewind-preview', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;
  let host: IHolder;
  let guest: IHolder;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rewind-route-'));
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

  /**
   * One complete match: durable meta, four real events, and the
   * stand-in stream head + genesis branch a combat cutover will
   * eventually write (findings #48/#53).
   */
  async function seedMatch(
    matchId: string,
    config: Partial<IMatchMeta['config']> = {},
  ): Promise<void> {
    await store.createMatch(
      activeMeta({
        matchId,
        config: { mapRadius: 4, turnLimit: 5, ...config },
      }),
    );
    for (const sequence of [0, 1, 2, 3]) {
      await store.appendEvent(matchId, gameEvent(sequence, matchId));
    }
    seedStreamHead(matchId);
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
   * FINDING #48/#53: nothing writes match events to the journal, so a
   * real match has no head row and no genesis branch. This seed stands
   * in for what a combat cutover will write - and its absence is exactly
   * what the 404 row below exercises.
   */
  function seedStreamHead(matchId = MATCH_ID): void {
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
    await previewHandler(req, res);
    return {
      status: res._getStatusCode(),
      json: res._getJSONData() as Record<string, unknown>,
    };
  }

  it('gives the host a preview of what the rewind would touch', async () => {
    const { status, json } = await call({ bearer: host.wire });

    expect(status).toBe(200);
    expect(json.kind).toBe('preview');
    // NON-EMPTY: dropping two of four events moves what both audiences
    // see. An empty answer here is the false "nothing changes" this
    // route was deferred until it could avoid.
    expect((json.changedViewerIds as string[]).length).toBeGreaterThan(0);
    expect(json.targetRevision).toBe(2);
  });

  it('refuses a seated non-host with 403 and no preview', async () => {
    const { status, json } = await call({ bearer: guest.wire });

    expect(status).toBe(403);
    expect(json.kind).toBe('refused');
    // The guest is a real, active member - the brand resolves. What it
    // is not is this match's GM.
    expect(json.reason).toBe('gm-role-required');
    expect(json.changedViewerIds).toBeUndefined();
  });

  it('takes the actor from the token, never from the body', async () => {
    // The guest's token, with a body that names the host every way a
    // client could think to. Authorization must not move.
    const { status, json } = await call({
      bearer: guest.wire,
      body: body({
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
    // Transport shape, not the domain union: no `kind` to branch on.
    expect(json.kind).toBeUndefined();
    expect(String(json.error)).toContain('Unauthorized');
  });

  it('refuses a body carrying replacement events rather than stripping them', async () => {
    const { status, json } = await call({
      bearer: host.wire,
      body: body({ replacementEvents: [{ id: 'forged' }] }),
    });

    expect(status).toBe(400);
    expect(json.reason).toBe('replacement-events-unsupported');
    // Transport shape: this is a malformed request, not a rewind verdict.
    expect(json.kind).toBeUndefined();
  });

  it('answers 404 for a match with no authoritative history', async () => {
    // Drop the stand-in head row: back to what a real match looks like
    // today, per finding #53.
    db.prepare(
      `DELETE FROM event_history_effective_heads WHERE stream_id = ?`,
    ).run(MATCH_ID);

    const { status, json } = await call({ bearer: host.wire });

    expect(status).toBe(404);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('no-authoritative-history');
  });

  it('reads the head of the EFFECTIVE branch, not whichever row comes first', async () => {
    // Finding #81, pinned before it can bite: a candidate head row sits
    // BELOW the effective one and sorts before 'root' by branch id. An
    // unqualified read returns it and the preview compares against a
    // revision the stream never answered at.
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'candidate-1', 2, ?)`,
    ).run(MATCH_ID, 'c'.repeat(64));

    const { status, json } = await call({ bearer: host.wire });

    expect(status).toBe(200);
    expect(json.kind).toBe('preview');
    expect((json.priorHead as { revision: number }).revision).toBe(
      HEAD_REVISION,
    );
  });

  it('refuses a fogged match instead of previewing it from a placeholder', async () => {
    await seedMatch(FOGGED_MATCH_ID, { fogOfWar: true });
    mockProbeCalls.length = 0;

    const { status, json } = await call({
      bearer: host.wire,
      id: FOGGED_MATCH_ID,
    });

    expect(status).toBe(409);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('fog-preview-unsupported');
    // Nothing was derived. Fog makes the projection depend on engine
    // state this route does not hold, so answering at all would show the
    // GM a blast radius computed against the wrong fog - worse than
    // showing none.
    expect(mockProbeCalls).toEqual([]);
  });

  it('previews an otherwise identical match once fog is off', async () => {
    // The vacuity control for the row above: same seats, same events,
    // same head - one flag different. Without this, a route that refused
    // EVERY match would pass the fog row.
    await seedMatch(CLEAR_MATCH_ID, { fogOfWar: false });
    mockProbeCalls.length = 0;

    const { status, json } = await call({
      bearer: host.wire,
      id: CLEAR_MATCH_ID,
    });

    expect(status).toBe(200);
    expect(json.kind).toBe('preview');
    expect(mockProbeCalls.length).toBeGreaterThan(0);
  });

  it('refuses an authenticated non-member with 403, naming no match', async () => {
    // A real principal with a real token who is simply not in this
    // match. The brand refuses, and a refused brand is not a fault.
    const stranger = await mintHolder('stranger');
    mockProbeCalls.length = 0;

    const { status, json } = await call({ bearer: stranger.wire });

    expect(status).toBe(403);
    expect(json.kind).toBe('refused');
    expect(json.reason).toBe('state-not-owned');
    // The gate's constant, id-free refusal is preserved: a 403 must not
    // become a way to probe which matches exist.
    expect(JSON.stringify(json)).not.toContain(MATCH_ID);
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
