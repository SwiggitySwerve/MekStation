/**
 * Seam pins for the GM private-draft read path (U5a).
 *
 * Drafted as the U5a admission probe by the codex lane and verified
 * green on the U5a baseline by the parent, then kept as a pin because
 * the two facts it measures are the whole reason the read route needs a
 * ref and its own membership source:
 *
 * 1. `exportForViewer` discovers no private refs by itself, so
 *    includePrivate alone returns an empty `privateRecords` and writes
 *    no export-attempt row.
 * 2. The PRODUCTION factory resolves the match host as `player`, so a
 *    named ref is answered payload-free and audited as denied.
 *
 * Both must keep holding after the new route lands: the route earns the
 * payload by naming a ref AND branding the host, never by loosening
 * either of these.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import type { IPrivateRecordOpenView } from '@/lib/events/privacy/IPrivateRecordRepository';
import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IVaultIdentity } from '@/types/vault';

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
import { createViewerHistoryService } from '@/pages-modules/api/matchHistoryViewerChain';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const MATCH_ID = 'u5a-admission';
const AT = '2026-09-17T12:00:00.000Z';
const REQUEST_AT = '2026-09-17T12:01:00.000Z';
const PREVIEW = { targetRevision: 2, changedViewerIds: ['player'] };
const SUMMARY = 'GM rewind preview to revision 2';

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
    createdAt: AT,
  };
  const token = await issuePlayerToken(identity, {
    scope: { kind: 'match', id: MATCH_ID },
  });
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

describe('U5a admission: production export reachability', () => {
  let store: DurableMatchStore;
  let host: IHolder;
  let player: IHolder;
  let privateRepo: SQLitePrivateRecordRepository;
  let draft: IPrivateRecordOpenView;
  let writerResolver: AuthorizedViewerResolver;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    host = await mintHolder('host');
    player = await mintHolder('player');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    const seats = defaultSeats('1v1').map((seat) => ({
      ...seat,
      occupant:
        seat.slotId === 'alpha-1'
          ? { playerId: host.playerId, displayName: 'Host' }
          : { playerId: player.playerId, displayName: 'Player' },
      ready: true,
    }));
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
      seats,
    };
    await store.createMatch(meta);
    writerResolver = new AuthorizedViewerResolver(
      new HostAsGmMembershipSource(
        new MatchSeatMembershipSource(store),
        meta.hostPlayerId,
      ),
    );
    privateRepo = new SQLitePrivateRecordRepository(
      getSQLiteService().getDatabase(),
    );
    const records = await new GmPrivatePreviewRecordWriter(privateRepo).store({
      resolver: writerResolver,
      principalId: host.playerId,
      campaignSessionId: MATCH_ID,
      commandId: null,
      createdAt: AT,
      preview: PREVIEW,
      derivedSummary: SUMMARY,
    });
    if (records.preview === undefined) throw new Error('expected stored draft');
    draft = records.preview;
  });

  afterEach(() => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
  });

  it('stored draft exists but the specified request returns zero private records and adds zero export audit rows for both callers', async () => {
    expect(draft.recordKind).toBe('gm-draft');
    expect(JSON.parse(draft.payload)).toEqual({
      preview: PREVIEW,
      derivedSummary: SUMMARY,
    });
    const before = privateRepo.listAccessAudit(draft.opaqueRef);
    expect(before).toEqual([
      expect.objectContaining({ purpose: 'write', result: 'granted' }),
    ]);
    for (const caller of [host, player]) {
      const body = await createViewerHistoryService().exportForViewer(
        caller.playerId,
        MATCH_ID,
        {
          streamType: 'match',
          streamId: MATCH_ID,
          includePrivate: true,
          occurredAt: REQUEST_AT,
        },
      );
      expect(body.privateRecords).toEqual([]);
      expect(privateRepo.listAccessAudit(draft.opaqueRef)).toEqual(before);
    }
    const control = await privateRepo.exportView({
      opaqueRef: draft.opaqueRef,
      includePrivate: true,
      resolver: writerResolver,
      principalId: host.playerId,
      matchId: MATCH_ID,
      streamId: MATCH_ID,
      occurredAt: REQUEST_AT,
    });
    expect(control).toHaveProperty('payload', draft.payload);
    expect(privateRepo.listAccessAudit(draft.opaqueRef)).toHaveLength(2);
  });

  it('even with an explicit known ref, the production service denies the tactical host as player and returns a payload-free view', async () => {
    const membership = await new MatchSeatMembershipSource(
      store,
    ).lookupMembership(host.playerId, MATCH_ID);
    expect(membership?.role).toBe('player');
    const body = await createViewerHistoryService().exportForViewer(
      host.playerId,
      MATCH_ID,
      {
        streamType: 'match',
        streamId: MATCH_ID,
        includePrivate: true,
        occurredAt: REQUEST_AT,
        privateRefs: [draft.opaqueRef],
      },
    );
    expect(body.privateRecords).toEqual([
      {
        opaqueRef: draft.opaqueRef,
        payloadState: 'present',
        recordKind: 'gm-draft',
      },
    ]);
    expect(privateRepo.listAccessAudit(draft.opaqueRef)).toEqual([
      expect.objectContaining({
        purpose: 'write',
        result: 'granted',
        actorRole: 'gm',
      }),
      expect.objectContaining({
        purpose: 'export-attempt',
        result: 'denied',
        actorRole: 'player',
        safeReasonCode: 'role-denied',
      }),
    ]);
  });

  it('existing export returns lineage in addition to the verbatim service body', async () => {
    const serviceBody = await createViewerHistoryService().exportForViewer(
      player.playerId,
      MATCH_ID,
      {
        streamType: 'match',
        streamId: MATCH_ID,
        includePrivate: true,
        occurredAt: REQUEST_AT,
      },
    );
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: MATCH_ID, streamType: 'match' },
      headers: { authorization: `Bearer ${player.wire}` },
    });
    await exportHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const httpBody: Record<string, unknown> = res._getJSONData();
    expect(httpBody).toHaveProperty('lineage');
    expect(serviceBody).not.toHaveProperty('lineage');
    const { lineage: _lineage, ...withoutLineage } = httpBody;
    expect(withoutLineage).toEqual(serviceBody);
    expect(httpBody).not.toEqual(serviceBody);
  });
});
