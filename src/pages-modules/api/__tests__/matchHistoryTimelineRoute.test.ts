/**
 * HTTP lineage rows for timeline + export (seam 18.1).
 *
 * Reuses the seated-match harness shape of matchHistoryExportRoute.test
 * but seeds one activated candidate on streamType `match` so both
 * routes read the same lineage block.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IViewerHistoryLineage } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';
import type { IVaultIdentity } from '@/types/vault';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { _branchCreationSeamForTests } from '@/lib/events/journal/EventHistoryBranchContract';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { isGmLineageTransition } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';
import { viewerTimelineDigest } from '@/lib/multiplayer/server/history/viewerTimelineDigest';
import exportHandler from '@/pages-modules/api/matchHistoryExportRoute';
import timelineHandler from '@/pages-modules/api/matchHistoryTimelineRoute';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const MATCH_ID = 'match-history-lineage-http';
const STREAM_TYPE = 'match';
const AT = '2026-09-02T00:00:00.000Z';
const DIGEST = 'a'.repeat(64);
const REASON = 'authorized rewind to turn 2';
const BASE_REVISION = 2;

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

interface IResult {
  statusCode: number;
  body: unknown;
}

describe('GET /api/matches/:id/timeline and /export lineage', () => {
  let dir: string;
  let store: DurableMatchStore;
  let host: IHolder;
  let player: IHolder;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'match-history-lineage-http-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'history.db') }).initialize();
    host = await mintHolder('host');
    player = await mintHolder('player');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await store.createMatch(activeMeta());
    seedActivatedLineage();
  });

  afterEach(async () => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

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
    const token = await issuePlayerToken(identity, {
      scope: { kind: 'match', id: MATCH_ID },
    });
    return { playerId: token.playerId, wire: encodeTokenForWire(token) };
  }

  function activeMeta(): IMatchMeta {
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
          occupant: { playerId: player.playerId, displayName: 'Player' },
          ready: true,
        };
      }
      return seat;
    });
    return {
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
      seats,
    };
  }

  function seedActivatedLineage(): void {
    const db = getSQLiteService().getDatabase();
    const stream = { streamType: STREAM_TYPE, streamId: MATCH_ID };
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES (?, ?, 'root', 4, ?)`,
    ).run(STREAM_TYPE, MATCH_ID, DIGEST);
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
      baseRevision: BASE_REVISION,
      baseEventId: 'event-2',
      baseDigest: 'b'.repeat(64),
      status: 'building',
      createdBy: 'host-1',
      reason: 'correction-rebuild',
      createdAt: AT,
    });
    const artifacts: readonly IAffectedArtifact[] = [
      { artifactKind: 'projection', artifactId: player.playerId, sourceRevision: 2 },
      { artifactKind: 'checkpoint', artifactId: 'ckpt-3', sourceRevision: 3 },
    ];
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    manifests.sealArtifactManifest(stream, 'candidate-1', artifacts, AT);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => 1_000_000,
    });
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: 'host-1',
      actor: 'gm-1',
      reason: REASON,
      ttlMs: 30_000,
      expectedBranchId: 'root',
      expectedRevision: 4,
      expectedDigest: DIGEST,
      expectedGeneration: 1,
    });
    activateCandidateBranch(db, branches, leases, manifests, {
      stream,
      candidateBranchId: 'candidate-1',
      held: {
        leaseId: lease.leaseId,
        owner: lease.owner,
        fencingEpoch: lease.fencingEpoch,
      },
      reason: REASON,
      activatedAt: AT,
    });
  }

  function mockReqRes(
    query: Record<string, unknown>,
    wire: string,
  ): { req: NextApiRequest; res: NextApiResponse; result: IResult } {
    const result: IResult = { statusCode: 0, body: undefined };
    const req = {
      method: 'GET',
      headers: { authorization: `Bearer ${wire}` },
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
      setHeader() {
        return this;
      },
    } as unknown as NextApiResponse;
    return { req, res, result };
  }

  /**
   * Type the captured handler json() at the read point.
   *
   * Sibling route tests cast `_getJSONData()` to the known body shape.
   * This mock stores that payload on `result.body`; asserting the whole
   * object (not Record-to-IViewerHistoryLineage) avoids TS2352 without
   * a double cast through unknown.
   */
  function readLineageHttpBody(body: unknown): {
    lineage: IViewerHistoryLineage;
    timeline: unknown[];
    timelineDigest: string;
  } {
    return body as {
      lineage: IViewerHistoryLineage;
      timeline: unknown[];
      timelineDigest: string;
    };
  }

  function lineageOf(body: unknown): IViewerHistoryLineage {
    return readLineageHttpBody(body).lineage;
  }

  async function getTimeline(wire: string): Promise<IResult> {
    const { req, res, result } = mockReqRes({ id: MATCH_ID }, wire);
    await timelineHandler(req, res);
    return result;
  }

  async function getExport(wire: string): Promise<IResult> {
    const { req, res, result } = mockReqRes(
      { id: MATCH_ID, streamType: STREAM_TYPE },
      wire,
    );
    await exportHandler(req, res);
    return result;
  }

  it('timeline body carries lineage and timelineDigest ignores it', async () => {
    const result = await getTimeline(host.wire);
    expect(result.statusCode).toBe(200);
    const body = readLineageHttpBody(result.body);
    const digest = body.timelineDigest;
    expect(digest).toBe(
      viewerTimelineDigest(
        body.timeline as Parameters<typeof viewerTimelineDigest>[0],
      ),
    );
    const { lineage: _dropped, ...withoutLineage } = body;
    expect(digest).toBe(
      viewerTimelineDigest(
        withoutLineage.timeline as Parameters<typeof viewerTimelineDigest>[0],
      ),
    );
    const transition = body.lineage.transitions[0];
    if (transition === undefined || !isGmLineageTransition(transition)) {
      throw new Error('expected a GM lineage transition');
    }
    expect(transition.reason).toBe(REASON);
  });

  it('export body carries the same lineage as the timeline body for the same viewer', async () => {
    const timeline = await getTimeline(host.wire);
    const exported = await getExport(host.wire);
    expect(timeline.statusCode).toBe(200);
    expect(exported.statusCode).toBe(200);
    expect(lineageOf(exported.body)).toEqual(lineageOf(timeline.body));
  });

  it('player bearer lineage has no reason key while the GM lineage does', async () => {
    const gm = lineageOf((await getTimeline(host.wire)).body);
    const guest = lineageOf((await getTimeline(player.wire)).body);
    expect(gm.transitions).toHaveLength(1);
    expect(guest.transitions).toHaveLength(1);
    expect('reason' in (gm.transitions[0] ?? {})).toBe(true);
    expect('reason' in (guest.transitions[0] ?? {})).toBe(false);
  });
});
