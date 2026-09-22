import type { NextApiRequest, NextApiResponse } from 'next';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IVaultIdentity } from '@/types/vault';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { _branchCreationSeamForTests } from '@/lib/events/journal/EventHistoryBranchContract';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { matchStreamRef } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import { readMatchHistoryLineage } from '@/pages-modules/api/matchHistoryViewerChain';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const MATCH_ID = 'match-head';
const AT = '2026-09-21T12:00:00.000Z';
const ROOT_DIGEST = 'a'.repeat(64);
const ACTIVE_DIGEST = 'b'.repeat(64);

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

interface IResult {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
}

async function mintHolder(name: string, matchId = MATCH_ID): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${name}`,
    displayName: name,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: AT,
  };
  const token = await issuePlayerToken(identity, {
    scope: { kind: 'match', id: matchId },
  });
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

async function getHead(
  wire?: string,
  method = 'GET',
  query: Record<string, unknown> = { id: MATCH_ID },
): Promise<IResult> {
  const { default: handler } = await import('@/pages/api/matches/[id]/head');
  const result: IResult = { statusCode: 0, body: undefined, headers: {} };
  const req = {
    method,
    headers: wire ? { authorization: `Bearer ${wire}` } : {},
    query,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    setHeader(name: string, value: unknown) {
      result.headers[name] = value;
      return this;
    },
  } as unknown as NextApiResponse;
  await handler(req, res);
  return result;
}

describe('GET /api/matches/:id/head', () => {
  let store: DurableMatchStore;
  let host: IHolder;
  let player: IHolder;
  let stranger: IHolder;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    host = await mintHolder('host');
    player = await mintHolder('player');
    stranger = await mintHolder('stranger');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    const meta: IMatchMeta = {
      matchId: MATCH_ID,
      hostPlayerId: host.playerId,
      playerIds: [host.playerId, player.playerId],
      sideAssignments: [
        { playerId: host.playerId, side: 'player' },
        { playerId: player.playerId, side: 'opponent' },
      ],
      status: 'active',
      createdAt: AT,
      updatedAt: AT,
      config: { mapRadius: 4, turnLimit: 5 },
      layout: '1v1',
      seats: defaultSeats('1v1').map((seat) => ({
        ...seat,
        occupant: {
          playerId: seat.slotId === 'alpha-1' ? host.playerId : player.playerId,
          displayName: seat.slotId === 'alpha-1' ? 'Host' : 'Player',
        },
        ready: true,
      })),
    };
    await store.createMatch(meta);
  });

  afterEach(() => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
  });

  // Same persisted-head fixture as the rewind and lineage route tests.
  function seedActivatedHead(): void {
    const db = getSQLiteService().getDatabase();
    const stream = matchStreamRef(MATCH_ID);
    const insert = db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES (?, ?, ?, ?, ?)`,
    );
    insert.run('match', MATCH_ID, 'root', 4, ROOT_DIGEST);
    const branches = new SQLiteEventHistoryBranchStore(
      db,
      _branchCreationSeamForTests(),
    );
    expect(branches.backfillGenesisBranches()).toBe(1);
    branches.createBranch({
      ...stream,
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 2,
      baseEventId: 'event-2',
      baseDigest: ACTIVE_DIGEST,
      status: 'building',
      createdBy: host.playerId,
      reason: 'correction-rebuild',
      createdAt: AT,
    });
    insert.run('match', MATCH_ID, 'candidate-1', 2, ACTIVE_DIGEST);
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    manifests.sealArtifactManifest(stream, 'candidate-1', [], AT);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches);
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: host.playerId,
      actor: host.playerId,
      reason: 'rewind',
      ttlMs: 30_000,
      expectedBranchId: 'root',
      expectedRevision: 4,
      expectedDigest: ROOT_DIGEST,
      expectedGeneration: 1,
    });
    activateCandidateBranch(db, branches, leases, manifests, {
      stream,
      candidateBranchId: 'candidate-1',
      held: lease,
      reason: 'rewind',
      activatedAt: AT,
    });
  }

  it('publishes a handler at the Pages Router head entrypoint', async () => {
    await expect(import('@/pages/api/matches/[id]/head')).resolves.toEqual(
      expect.objectContaining({ default: expect.any(Function) }),
    );
  });

  it('gives the host exactly the effective head the lease compares', async () => {
    seedActivatedHead();
    const db = getSQLiteService().getDatabase();
    const branches = new SQLiteEventHistoryBranchStore(db);
    const stream = matchStreamRef(MATCH_ID);
    const journalHead = readEffectiveStreamHead(db, branches, stream);
    const lineage = await readMatchHistoryLineage(
      { playerId: host.playerId, matchId: MATCH_ID },
      'match',
    );
    const result = await getHead(host.wire, 'GET', {
      id: MATCH_ID,
      streamType: 'campaign',
      streamId: 'foreign-match',
    });
    expect(result.statusCode).toBe(200);
    expect(result.body).toStrictEqual({
      branchId: 'candidate-1',
      revision: 2,
      effectiveGeneration: 2,
      digest: journalHead.digest,
    });
    const body = result.body as {
      branchId: string;
      revision: number;
      effectiveGeneration: number;
      digest: string;
    };
    expect(body.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(body.digest).toBe(ACTIVE_DIGEST);
    expect(body.digest).not.toBe(ROOT_DIGEST);
    expect(body.revision).toBe(journalHead.revision);
    expect(lineage.effectiveHead).toStrictEqual({
      branchId: body.branchId,
      revision: body.revision,
      generation: body.effectiveGeneration,
    });
    expect(() =>
      new SQLiteEventHistoryCorrectionLeaseStore(
        db,
        branches,
      ).assertExpectedHeadIsCurrent(stream, {
        expectedBranchId: body.branchId,
        expectedRevision: body.revision,
        expectedGeneration: body.effectiveGeneration,
        expectedDigest: body.digest,
      }),
    ).not.toThrow();
    expect(Object.keys(body).sort()).toEqual([
      'branchId',
      'digest',
      'effectiveGeneration',
      'revision',
    ]);
  });

  it.each([false, true])(
    'refuses player and stranger identically (head present: %s)',
    async (withHead) => {
      if (withHead) seedActivatedHead();
      const seated = await getHead(player.wire);
      const outsider = await getHead(stranger.wire);
      expect(seated.statusCode).toBe(403);
      expect(seated.body).toStrictEqual({ error: 'Authorization refused' });
      expect(outsider).toStrictEqual(seated);
    },
  );

  it('requires a bearer', async () => {
    const result = await getHead();
    expect(result.statusCode).toBe(401);
    expect(result.body).toEqual({
      error: expect.stringContaining('Unauthorized'),
    });
  });

  it('requires a bearer scoped to this match', async () => {
    const other = await mintHolder('other', 'other-match');
    expect((await getHead(other.wire)).statusCode).toBe(401);
  });

  it('refuses POST before reading a bearer', async () => {
    const result = await getHead(undefined, 'POST');
    expect(result.statusCode).toBe(405);
    expect(result.body).toStrictEqual({ error: 'method not allowed' });
    expect(result.headers.Allow).toEqual(['GET']);
  });

  it('rejects a missing match id', async () => {
    const result = await getHead(host.wire, 'GET', {});
    expect(result.statusCode).toBe(400);
    expect(result.body).toStrictEqual({ error: 'missing or invalid match id' });
  });

  it('answers an unknown match with the private-preview 404 body', async () => {
    const unknown = await mintHolder('unknown', 'unknown-match');
    const result = await getHead(unknown.wire, 'GET', { id: 'unknown-match' });
    expect(result.statusCode).toBe(404);
    expect(result.body).toStrictEqual({ error: 'unknown match' });
  });

  it('answers no head without inventing a genesis digest', async () => {
    const result = await getHead(host.wire);
    expect(result.statusCode).toBe(404);
    expect(result.body).toStrictEqual({ error: 'no head' });
  });

  it('answers no head when the effective branch has no journal head row', async () => {
    seedActivatedHead();
    getSQLiteService()
      .getDatabase()
      .prepare(
        `DELETE FROM event_journal_stream_heads
         WHERE stream_type = 'match' AND stream_id = ? AND branch_id = 'candidate-1'`,
      )
      .run(MATCH_ID);
    const result = await getHead(host.wire);
    expect(result.statusCode).toBe(404);
    expect(result.body).toStrictEqual({ error: 'no head' });
  });
});
