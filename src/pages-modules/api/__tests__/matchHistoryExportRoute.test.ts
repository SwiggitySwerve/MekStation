/**
 * HTTP timeline + export for a seated match viewer (E8 / leftover 12.x).
 *
 * Real SQLite and a real DurableMatchStore because the route's job is
 * the service graph, not argument forwarding. A mocked export would
 * still pass if the handler skipped the viewer resolver and read the
 * audit table raw — which is exactly the mutant these rows exist to
 * catch.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IActionAuditInsert } from '@/lib/events/audit/IActionAuditRepository';
import type { IViewerTimelineEntry } from '@/lib/multiplayer/server/history/ViewerHistoryTypes';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IVaultIdentity } from '@/types/vault';

import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
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

const MATCH_ID = 'match-history-http';
const STREAM_TYPE = 'history-proof';
const AT = '2026-08-21T20:00:00.000Z';
const HIDDEN_SECRET = 'HIDDEN-AUTHORITY-BODY-PR9';
const PRIVATE_SECRET = 'GM-PRIVATE-PAYLOAD-HISTORY-PR9';
const GM_FIRST_REV = 9001;
const GM_LAST_REV = 9003;

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

interface IResult {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
}

interface IStreamFact {
  readonly factType: string;
  readonly payload: unknown;
}

/** Minimal Next req/res pair capturing what the handler wrote. */
function mockReqRes(
  query: Record<string, unknown>,
  method = 'GET',
  wire?: string,
): { req: NextApiRequest; res: NextApiResponse; result: IResult } {
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
  return { req, res, result };
}

async function mintHolder(name: string, scoped = true): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${name}`,
    displayName: name,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(
    identity,
    scoped ? { scope: { kind: 'match', id: MATCH_ID } } : undefined,
  );
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timelineRows(body: unknown): readonly IViewerTimelineEntry[] {
  if (!isRecord(body) || !Array.isArray(body['timeline'])) {
    throw new Error('expected a timeline array');
  }
  return body['timeline'] as readonly IViewerTimelineEntry[];
}

function timelineDigestOf(body: unknown): string {
  if (!isRecord(body) || typeof body['timelineDigest'] !== 'string') {
    throw new Error('expected timelineDigest');
  }
  return body['timelineDigest'];
}

function streamFacts(body: unknown): readonly IStreamFact[] {
  if (!isRecord(body) || !isRecord(body['stream'])) {
    throw new Error('expected an export stream');
  }
  const facts = body['stream']['facts'];
  if (!Array.isArray(facts)) throw new Error('expected stream.facts');
  return facts as readonly IStreamFact[];
}

describe('GET /api/matches/:id/timeline and /export', () => {
  let dir: string;
  let store: DurableMatchStore;
  let host: IHolder;
  let player: IHolder;
  let stranger: IHolder;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'match-history-http-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'history.db') }).initialize();
    host = await mintHolder('host');
    player = await mintHolder('player');
    stranger = await mintHolder('stranger');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await store.createMatch(activeMeta());
    await seedAuditAndJournal();
  });

  afterEach(async () => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

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

  /**
   * GM-revision audit row plus the public/hidden journal pair the
   * service tests use. Hidden stays off the player stream; revisions
   * stay off the player timeline.
   */
  async function seedAuditAndJournal(): Promise<void> {
    const db = getSQLiteService().getDatabase();
    const audit = new SQLiteActionAuditRepository(db);
    const gmAccepted: IActionAuditInsert = {
      campaignSessionId: MATCH_ID,
      matchId: MATCH_ID,
      streamType: STREAM_TYPE,
      streamId: MATCH_ID,
      commandId: 'cmd-gm-revision',
      commandDigest: 'a'.repeat(64),
      actor: {
        principalId: host.playerId,
        participantId: host.playerId,
        role: 'gm',
      },
      correlationId: 'corr-gm',
      createdAt: AT,
      lifecycleState: 'accepted',
      safeReasonCode: null,
      committedFirstRevision: GM_FIRST_REV,
      committedLastRevision: GM_LAST_REV,
      committedEventCount: 3,
    };
    const playerAccepted: IActionAuditInsert = {
      campaignSessionId: MATCH_ID,
      matchId: MATCH_ID,
      streamType: STREAM_TYPE,
      streamId: MATCH_ID,
      commandId: 'cmd-player-accepted',
      commandDigest: 'b'.repeat(64),
      actor: {
        principalId: player.playerId,
        participantId: player.playerId,
        role: 'player',
      },
      correlationId: 'corr-player',
      createdAt: '2026-08-21T20:01:00.000Z',
      lifecycleState: 'accepted',
      safeReasonCode: null,
      committedFirstRevision: 8111,
      committedLastRevision: 8112,
      committedEventCount: 2,
    };
    expect(audit.recordLifecycle(gmAccepted).kind).toBe('created');
    expect(audit.recordLifecycle(playerAccepted).kind).toBe('created');

    const journal = new SQLiteEventJournal(db, () => AT);
    const publicAppend = await journal.append({
      streamType: STREAM_TYPE,
      streamId: MATCH_ID,
      expectedBranchId: ROOT_EVENT_BRANCH_ID,
      expectedRevision: 0,
      commandId: 'cmd-parity-public',
      principal: {
        actorKind: 'human',
        actorId: 'actor-journal',
        authorityType: 'test-host',
        authorityId: 'host-1',
      },
      events: [
        {
          eventId: 'cmd-parity-public-event',
          eventType: 'public_notice',
          eventVersion: 1,
          correlationId: 'correlation-public',
          causationEventIds: [],
          occurredAt: AT,
          payload: { headline: 'PARITY-PUBLIC' },
          entityRefs: [],
        },
      ],
    });
    expect(publicAppend.kind).toBe('committed');
    const hiddenAppend = await journal.append({
      streamType: STREAM_TYPE,
      streamId: MATCH_ID,
      expectedBranchId: ROOT_EVENT_BRANCH_ID,
      expectedRevision: 1,
      commandId: 'cmd-gap-hidden',
      principal: {
        actorKind: 'human',
        actorId: 'actor-journal',
        authorityType: 'test-host',
        authorityId: 'host-1',
      },
      events: [
        {
          eventId: 'cmd-gap-hidden-event',
          eventType: 'hidden_authority',
          eventVersion: 1,
          correlationId: 'correlation-hidden',
          causationEventIds: [],
          occurredAt: AT,
          payload: { secret: HIDDEN_SECRET, private: PRIVATE_SECRET },
          entityRefs: [],
        },
      ],
    });
    expect(hiddenAppend.kind).toBe('committed');
  }

  async function getTimeline(wire?: string): Promise<IResult> {
    const { req, res, result } = mockReqRes({ id: MATCH_ID }, 'GET', wire);
    await timelineHandler(req, res);
    return result;
  }

  async function getExport(wire?: string): Promise<IResult> {
    const { req, res, result } = mockReqRes(
      { id: MATCH_ID, streamType: STREAM_TYPE },
      'GET',
      wire,
    );
    await exportHandler(req, res);
    return result;
  }

  it('seated participant: both GETs 200 and the three digests are equal', async () => {
    const timeline = await getTimeline(player.wire);
    const exported = await getExport(player.wire);

    expect(timeline.statusCode).toBe(200);
    expect(exported.statusCode).toBe(200);
    const exportDigest = timelineDigestOf(exported.body);
    expect(exportDigest).toBe(timelineDigestOf(timeline.body));
    expect(exportDigest).toBe(
      viewerTimelineDigest(timelineRows(exported.body)),
    );
  });

  it('guest parity by SETS not counts', async () => {
    const timeline = await getTimeline(player.wire);
    const exported = await getExport(player.wire);
    expect(timeline.statusCode).toBe(200);
    expect(exported.statusCode).toBe(200);

    const exportIds = new Set(
      timelineRows(exported.body).map((row) => row.commandId),
    );
    const timelineIds = new Set(
      timelineRows(timeline.body).map((row) => row.commandId),
    );
    expect(exportIds).toEqual(timelineIds);

    for (const row of [
      ...timelineRows(exported.body),
      ...timelineRows(timeline.body),
    ]) {
      expect('committedFirstRevision' in row).toBe(false);
      expect('committedLastRevision' in row).toBe(false);
    }

    const facts = streamFacts(exported.body).map((fact) => ({
      factType: fact.factType,
      payload: fact.payload,
    }));
    expect(facts).toEqual([
      { factType: 'public_notice', payload: { headline: 'PARITY-PUBLIC' } },
    ]);
    const blob = JSON.stringify(exported.body);
    expect(blob).not.toContain(HIDDEN_SECRET);
    expect(blob).not.toContain(PRIVATE_SECRET);
  });

  it('no bearer -> 401 {error}', async () => {
    const timeline = await getTimeline();
    const exported = await getExport();
    expect(timeline.statusCode).toBe(401);
    expect(exported.statusCode).toBe(401);
    expect(
      isRecord(timeline.body) && typeof timeline.body['error'] === 'string',
    ).toBe(true);
    expect(
      isRecord(exported.body) && typeof exported.body['error'] === 'string',
    ).toBe(true);
  });

  it('authenticated non-member -> 403 {error} naming no match id', async () => {
    const timeline = await getTimeline(stranger.wire);
    const exported = await getExport(stranger.wire);
    expect(timeline.statusCode).toBe(403);
    expect(exported.statusCode).toBe(403);
    const timelineBlob = JSON.stringify(timeline.body);
    const exportBlob = JSON.stringify(exported.body);
    expect(
      isRecord(timeline.body) && typeof timeline.body['error'] === 'string',
    ).toBe(true);
    expect(
      isRecord(exported.body) && typeof exported.body['error'] === 'string',
    ).toBe(true);
    expect(timelineBlob).not.toContain(MATCH_ID);
    expect(exportBlob).not.toContain(MATCH_ID);
  });

  it('POST -> 405', async () => {
    const timelineCall = mockReqRes({ id: MATCH_ID }, 'POST', player.wire);
    await timelineHandler(timelineCall.req, timelineCall.res);
    const exportCall = mockReqRes(
      { id: MATCH_ID, streamType: STREAM_TYPE },
      'POST',
      player.wire,
    );
    await exportHandler(exportCall.req, exportCall.res);
    expect(timelineCall.result.statusCode).toBe(405);
    expect(exportCall.result.statusCode).toBe(405);
    expect(timelineCall.result.headers.Allow).toEqual(['GET']);
    expect(exportCall.result.headers.Allow).toEqual(['GET']);
  });
});
