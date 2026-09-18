/**
 * `GET /api/matches/:id/private-preview?ref=...` — the GM reads back one
 * private draft record that a rewind preview already stored (E2E-19's
 * GM half; roadmap unit U5a).
 *
 * Real SQLite, a real DurableMatchStore, real scoped bearer tokens and a
 * real private record written through the shipped writer, because the
 * claim under test is the authorization graph, not argument forwarding.
 * The three things these rows exist to hold:
 *
 * - **The GM gets the payload; the player never does.** Same route, same
 *   ref, two callers, two bodies.
 * - **A denied read is not a typed refusal.** The player receives the
 *   payload-free shape with a 200, so the route cannot be used to ask
 *   "does this ref exist and am I allowed to see it".
 * - **Every attempt is recorded.** Granted for the GM, denied for the
 *   player, in the private access audit.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IActionAuditInsert } from '@/lib/events/audit/IActionAuditRepository';
import type { IPrivateRecordOpenView } from '@/lib/events/privacy/IPrivateRecordRepository';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IVaultIdentity } from '@/types/vault';

import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { GmPrivatePreviewRecordWriter } from '@/lib/multiplayer/server/history/GmPrivatePreviewRecordWriter';
import { HostAsGmMembershipSource } from '@/pages-modules/api/hostAsGmMembershipSource';
import exportHandler from '@/pages-modules/api/matchHistoryExportRoute';
import privatePreviewHandler from '@/pages-modules/api/matchPrivatePreviewRoute';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const MATCH_ID = 'match-private-preview';
const OTHER_MATCH_ID = 'match-private-preview-other';
const AT = '2026-09-17T12:00:00.000Z';
const PREVIEW = { targetRevision: 2, changedViewerIds: ['viewer-1'] };
const SUMMARY = 'GM rewind preview to revision 2';
const OTHER_SUMMARY = 'GM rewind preview for another match';
const GM_FIRST_REV = 7001;
const GM_LAST_REV = 7003;

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

interface IResult {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
}

/** Minimal Next req/res pair capturing exactly what the handler wrote. */
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('expected a JSON object body');
  return value;
}

/**
 * Every key in the body, at every depth. A `payload` nested three levels
 * down is still the draft leaking, so the absence claim is walked rather
 * than spot-checked on the top level.
 */
function everyKey(value: unknown, keys: string[] = []): readonly string[] {
  if (Array.isArray(value)) {
    for (const item of value) everyKey(item, keys);
    return keys;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      keys.push(key);
      everyKey(item, keys);
    }
  }
  return keys;
}

describe('GET /api/matches/:id/private-preview', () => {
  let store: DurableMatchStore;
  let host: IHolder;
  let player: IHolder;
  let stranger: IHolder;
  let privateRepo: SQLitePrivateRecordRepository;
  let draft: IPrivateRecordOpenView;
  let foreignDraft: IPrivateRecordOpenView;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    host = await mintHolder('host');
    player = await mintHolder('player');
    stranger = await mintHolder('stranger');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await store.createMatch(activeMeta(MATCH_ID));
    await store.createMatch(activeMeta(OTHER_MATCH_ID));
    privateRepo = new SQLitePrivateRecordRepository(
      getSQLiteService().getDatabase(),
    );
    draft = await storeDraft(MATCH_ID, SUMMARY);
    foreignDraft = await storeDraft(OTHER_MATCH_ID, OTHER_SUMMARY);
    seedTimeline();
  });

  afterEach(() => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
  });

  function activeMeta(matchId: string): IMatchMeta {
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
      matchId,
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

  /** The record the rewind-preview route writes, written the same way. */
  async function storeDraft(
    matchId: string,
    derivedSummary: string,
  ): Promise<IPrivateRecordOpenView> {
    const records = await new GmPrivatePreviewRecordWriter(privateRepo).store({
      resolver: new AuthorizedViewerResolver(
        new HostAsGmMembershipSource(
          new MatchSeatMembershipSource(store),
          host.playerId,
        ),
      ),
      principalId: host.playerId,
      campaignSessionId: matchId,
      commandId: null,
      createdAt: AT,
      preview: PREVIEW,
      derivedSummary,
    });
    const stored = records.preview;
    if (stored === undefined) throw new Error('expected a stored gm-draft');
    return stored;
  }

  /**
   * One GM-authored and one player-authored audit row, so the timeline
   * this export carries is non-empty and the GM/player redaction
   * difference is observable rather than vacuous.
   */
  function seedTimeline(): void {
    const audit = new SQLiteActionAuditRepository(
      getSQLiteService().getDatabase(),
    );
    const gmRow: IActionAuditInsert = {
      campaignSessionId: MATCH_ID,
      matchId: MATCH_ID,
      streamType: 'match',
      streamId: MATCH_ID,
      commandId: 'cmd-gm-rewind',
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
    expect(audit.recordLifecycle(gmRow).kind).toBe('created');
  }

  async function getPrivatePreview(
    wire?: string,
    ref?: string,
    method = 'GET',
    id: string = MATCH_ID,
  ): Promise<IResult> {
    const { req, res, result } = mockReqRes(
      ref === undefined ? { id } : { id, ref },
      method,
      wire,
    );
    await privatePreviewHandler(req, res);
    return result;
  }

  async function getExport(wire: string): Promise<IResult> {
    const { req, res, result } = mockReqRes(
      { id: MATCH_ID, streamType: 'match' },
      'GET',
      wire,
    );
    await exportHandler(req, res);
    return result;
  }

  it('gives the GM the draft payload and records the granted access', async () => {
    const result = await getPrivatePreview(host.wire, draft.opaqueRef);

    expect(result.statusCode).toBe(200);
    expect(asRecord(result.body)['privateRecords']).toEqual([
      {
        opaqueRef: draft.opaqueRef,
        payloadState: 'present',
        recordKind: 'gm-draft',
        payload: draft.payload,
      },
    ]);
    expect(JSON.parse(draft.payload)).toEqual({
      preview: PREVIEW,
      derivedSummary: SUMMARY,
    });
    expect(privateRepo.listAccessAudit(draft.opaqueRef)).toEqual([
      expect.objectContaining({
        purpose: 'write',
        result: 'granted',
        actorRole: 'gm',
        actorPrincipalId: host.playerId,
      }),
      expect.objectContaining({
        purpose: 'export-attempt',
        result: 'granted',
        actorRole: 'gm',
        actorPrincipalId: host.playerId,
      }),
    ]);
  });

  it('gives a seated player no payload anywhere and records the denial', async () => {
    const result = await getPrivatePreview(player.wire, draft.opaqueRef);

    expect(result.statusCode).toBe(200);
    expect(asRecord(result.body)['privateRecords']).toEqual([
      {
        opaqueRef: draft.opaqueRef,
        payloadState: 'present',
        recordKind: 'gm-draft',
      },
    ]);
    // Walked, not spot-checked: no `payload` key at any depth, and the
    // draft's own text nowhere in the serialized body.
    expect(everyKey(result.body)).not.toContain('payload');
    expect(JSON.stringify(result.body)).not.toContain(SUMMARY);
    expect(privateRepo.listAccessAudit(draft.opaqueRef)).toEqual([
      expect.objectContaining({ purpose: 'write', result: 'granted' }),
      expect.objectContaining({
        purpose: 'export-attempt',
        result: 'denied',
        actorRole: 'player',
        actorPrincipalId: player.playerId,
        safeReasonCode: 'role-denied',
      }),
    ]);
  });

  it("leaves the player's projection identical to that player's export", async () => {
    const preview = await getPrivatePreview(player.wire, draft.opaqueRef);
    const exported = await getExport(player.wire);

    expect(preview.statusCode).toBe(200);
    expect(exported.statusCode).toBe(200);
    const { privateRecords: previewPrivate, ...previewRest } = asRecord(
      preview.body,
    );
    const {
      lineage: _lineage,
      privateRecords: exportPrivate,
      ...exportRest
    } = asRecord(exported.body);
    // Stream, timeline and digest are the same player projection; only
    // the named private ref differs, and it arrives payload-free.
    expect(previewRest).toEqual(exportRest);
    expect(exportPrivate).toEqual([]);
    expect(previewPrivate).toEqual([
      {
        opaqueRef: draft.opaqueRef,
        payloadState: 'present',
        recordKind: 'gm-draft',
      },
    ]);
  });

  it('brands the host as GM for the whole export, not only the record', async () => {
    // The widening this route buys with the host-as-gm membership
    // source, pinned rather than argued: the GM's timeline rows carry
    // the raw committed revisions the same GM's /export does not.
    const preview = await getPrivatePreview(host.wire, draft.opaqueRef);
    const exported = await getExport(host.wire);

    expect(preview.statusCode).toBe(200);
    expect(exported.statusCode).toBe(200);
    const previewRows = asRecord(preview.body)['timeline'];
    const exportRows = asRecord(exported.body)['timeline'];
    expect(previewRows).toEqual([
      expect.objectContaining({
        commandId: 'cmd-gm-rewind',
        committedFirstRevision: GM_FIRST_REV,
        committedLastRevision: GM_LAST_REV,
      }),
    ]);
    expect(everyKey(exportRows)).not.toContain('committedFirstRevision');
  });

  it('answers a ref from another match without its payload', async () => {
    const result = await getPrivatePreview(host.wire, foreignDraft.opaqueRef);

    expect(result.statusCode).toBe(200);
    expect(asRecord(result.body)['privateRecords']).toEqual([
      {
        opaqueRef: foreignDraft.opaqueRef,
        payloadState: 'present',
        recordKind: 'gm-draft',
      },
    ]);
    expect(everyKey(result.body)).not.toContain('payload');
    expect(JSON.stringify(result.body)).not.toContain(OTHER_SUMMARY);
    expect(privateRepo.listAccessAudit(foreignDraft.opaqueRef)).toEqual([
      expect.objectContaining({ purpose: 'write', result: 'granted' }),
      expect.objectContaining({
        purpose: 'export-attempt',
        result: 'denied',
        actorPrincipalId: host.playerId,
      }),
    ]);
  });

  it('answers an unknown ref with an empty private slice', async () => {
    const result = await getPrivatePreview(host.wire, 'f'.repeat(32));

    expect(result.statusCode).toBe(200);
    expect(asRecord(result.body)['privateRecords']).toEqual([]);
  });

  it('refuses a request that names no ref', async () => {
    const result = await getPrivatePreview(host.wire);

    expect(result.statusCode).toBe(400);
    expect(typeof asRecord(result.body)['error']).toBe('string');
  });

  it('tells an unauthenticated caller only that it must authenticate', async () => {
    const result = await getPrivatePreview(undefined, draft.opaqueRef);

    expect(result.statusCode).toBe(401);
    expect(String(asRecord(result.body)['error'])).toContain('Unauthorized');
  });

  it('refuses an authenticated non-member with 403 naming no match', async () => {
    const result = await getPrivatePreview(stranger.wire, draft.opaqueRef);

    expect(result.statusCode).toBe(403);
    expect(typeof asRecord(result.body)['error']).toBe('string');
    expect(JSON.stringify(result.body)).not.toContain(MATCH_ID);
    // A refused caller never reaches the record.
    expect(privateRepo.listAccessAudit(draft.opaqueRef)).toEqual([
      expect.objectContaining({ purpose: 'write', result: 'granted' }),
    ]);
  });

  it('refuses a method it does not serve', async () => {
    const result = await getPrivatePreview(host.wire, draft.opaqueRef, 'POST');

    expect(result.statusCode).toBe(405);
    expect(result.headers.Allow).toEqual(['GET']);
  });
});
