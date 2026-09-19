/**
 * E2E-25 server boundary: a commit preserves the GM's private reason.
 * The durable match, bearer and aligned journal fixtures follow
 * rewindCommitRoute.test.ts; private reads use the shipped GM gate.
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
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
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { matchStoreBranchSegmentReader } from '@/lib/multiplayer/server/history/matchStoreBranchSegmentReader';
import { HostAsGmMembershipSource } from '@/pages-modules/api/hostAsGmMembershipSource';
import exportHandler from '@/pages/api/matches/[id]/export';
import commitHandler from '@/pages/api/matches/[id]/rewind-commit';
import timelineHandler from '@/pages/api/matches/[id]/timeline';
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

const MATCH_ID = 'match-rewind-commit-reason';
const AT = '2026-09-19T00:00:00.000Z';
const HEAD_REVISION = 4;
const HEAD_DIGEST = 'd'.repeat(64);
const PRIVATE_REASON = 'GM-only: hidden ambush metadata justified correction';
const DEFAULT_REASON = 'authorized combat rewind';

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
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

function gameEvent(sequence: number): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: MATCH_ID,
    sequence,
    timestamp: AT,
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: { index: sequence },
  } as unknown as IGameEvent;
}

describe('POST /api/matches/[id]/rewind-commit private reason', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;
  let host: IHolder;
  let guest: IHolder;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rewind-commit-reason-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'route.db') });
    service.initialize();
    db = service.getDatabase();
    host = await mintHolder('host');
    guest = await mintHolder('guest');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await store.createMatch(activeMeta());
    for (const sequence of [0, 1, 2, 3]) {
      await store.appendEvent(MATCH_ID, gameEvent(sequence));
    }
    await seedAuthoritativeHistory();
  });

  afterEach(async () => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function activeMeta(): IMatchMeta {
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
      seats: defaultSeats('1v1').map((seat) => ({
        ...seat,
        occupant: {
          playerId: seat.slotId === 'alpha-1' ? host.playerId : guest.playerId,
          displayName: seat.slotId === 'alpha-1' ? 'Host' : 'Guest',
        },
        ready: true,
      })),
    };
  }

  async function seedAuthoritativeHistory(): Promise<void> {
    const chained = await matchStoreBranchSegmentReader(store).read(
      { streamType: 'match', streamId: MATCH_ID },
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
    ).run('cmd-reason', 'a'.repeat(64), MATCH_ID, 4, 4, 4, AT);
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
        'cmd-reason',
        MATCH_ID,
        event.streamRevision,
        index + 1,
        index,
        event.eventType,
        'corr-reason',
        host.playerId,
        MATCH_ID,
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
    ).run(MATCH_ID, HEAD_REVISION, HEAD_DIGEST);
    db.prepare(
      'UPDATE event_journal_store_state SET last_commit_position = ? WHERE singleton_id = 1',
    ).run(HEAD_REVISION);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  }

  async function commit(overrides: Record<string, unknown> = {}) {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: MATCH_ID },
      headers: { authorization: `Bearer ${host.wire}` },
      body: {
        targetRevision: 2,
        expectedBranchId: 'root',
        expectedRevision: HEAD_REVISION,
        expectedDigest: HEAD_DIGEST,
        expectedGeneration: 1,
        ...overrides,
      },
    });
    await commitHandler(req, res);
    return {
      status: res._getStatusCode(),
      json: res._getJSONData() as Record<string, unknown>,
    };
  }

  function effectiveHead() {
    return new SQLiteEventHistoryBranchStore(db).readEffectiveHead({
      streamType: 'match',
      streamId: MATCH_ID,
    });
  }

  function committedReason(): unknown {
    return db
      .prepare(
        'SELECT reason FROM event_history_supersessions WHERE stream_id = ?',
      )
      .get(MATCH_ID);
  }

  function privateRecords() {
    return db
      .prepare(
        `SELECT opaque_ref AS opaqueRef FROM private_record
         WHERE campaign_session_id = ?`,
      )
      .all(MATCH_ID) as { readonly opaqueRef: string }[];
  }

  function privateGate(principalId: string) {
    return {
      resolver: new AuthorizedViewerResolver(
        new HostAsGmMembershipSource(
          new MatchSeatMembershipSource(store),
          host.playerId,
        ),
      ),
      principalId,
      matchId: MATCH_ID,
      occurredAt: AT,
    };
  }

  async function readPrivateReasonAsGm() {
    const rows = privateRecords();
    expect(rows).toHaveLength(1);
    return new SQLitePrivateRecordRepository(db).exportView({
      opaqueRef: rows[0].opaqueRef,
      includePrivate: true,
      ...privateGate(host.playerId),
    });
  }

  it('keeps the constant in committed history even with a private reason', async () => {
    expect((await commit({ reason: PRIVATE_REASON })).status).toBe(200);
    expect(committedReason()).toEqual({ reason: DEFAULT_REASON });
  });

  it('writes the supplied reason into the GM private record', async () => {
    expect((await commit({ reason: PRIVATE_REASON })).status).toBe(200);
    expect(await readPrivateReasonAsGm()).toMatchObject({
      recordKind: 'gm-reason',
      payload: PRIVATE_REASON,
    });
  });

  it('keeps the constant in committed history when reason is absent', async () => {
    expect((await commit()).status).toBe(200);
    expect(committedReason()).toEqual({ reason: DEFAULT_REASON });
  });

  it('writes no private record when reason is absent', async () => {
    expect((await commit()).status).toBe(200);
    expect(privateRecords()).toEqual([]);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', ' \t\n '],
    ['number', 42],
    ['null', null],
    ['object', { detail: PRIVATE_REASON }],
    ['array', [PRIVATE_REASON]],
    ['boolean', true],
    ['undefined', undefined],
    ['over-long', 'x'.repeat(2001)],
    ['padded over-long', ` ${'x'.repeat(2001)} `],
  ])(
    'rejects a %s reason with 400 and leaves the match head unchanged',
    async (_label, reason) => {
      const before = effectiveHead();
      const { status, json } = await commit({ reason });
      expect({
        status,
        head: effectiveHead(),
        committed: committedReason(),
        records: privateRecords(),
      }).toEqual({
        status: 400,
        head: before,
        committed: undefined,
        records: [],
      });
      expect(json.kind).toBeUndefined();
      expect(String(json.error)).toContain('reason');
    },
  );

  it.each([
    ['one character', 'x'],
    ['trimmed upper boundary', ` \t${'x'.repeat(2000)}\n `],
  ])(
    'accepts a reason at the %s without changing its content',
    async (_label, reason) => {
      expect((await commit({ reason })).status).toBe(200);
      expect(await readPrivateReasonAsGm()).toMatchObject({ payload: reason });
    },
  );

  it('omits the reason key and text from the committed response', async () => {
    const { status, json } = await commit({ reason: PRIVATE_REASON });
    expect(status).toBe(200);
    expect(json.kind).toBe('committed');
    expect(json).not.toHaveProperty('reason');
    expect(json).not.toHaveProperty('privateRefs');
    for (const { opaqueRef } of privateRecords()) {
      expect(JSON.stringify(json)).not.toContain(opaqueRef);
    }
    expect(JSON.stringify(json)).not.toContain(PRIVATE_REASON);
    expect(JSON.stringify(json)).not.toContain('"reason"');
  });

  it('shows the authorized result without the reason in the seated player timeline', async () => {
    const committed = await commit({ reason: PRIVATE_REASON });
    expect(committed.status).toBe(200);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: MATCH_ID, streamType: 'match' },
      headers: { authorization: `Bearer ${guest.wire}` },
    });
    await timelineHandler(req, res);
    const json = res._getJSONData() as Record<string, unknown>;
    expect(json).not.toHaveProperty('error');
    expect(res._getStatusCode()).toBe(200);
    expect(json.lineage).toMatchObject({
      effectiveHead: {
        branchId: committed.json.activatedBranchId,
        revision: 2,
        generation: 2,
      },
      transitions: [
        {
          fromBranchId: 'root',
          toBranchId: committed.json.activatedBranchId,
        },
      ],
    });
    expect(JSON.stringify(json)).not.toContain(PRIVATE_REASON);
    expect(JSON.stringify(json)).not.toContain('"reason"');
  });

  it('omits the reason from the seated player export over the export-route fixture', async () => {
    const journal = new SQLiteEventJournal(db, () => AT);
    expect(
      (
        await journal.append({
          streamType: 'history-proof',
          streamId: MATCH_ID,
          expectedBranchId: 'root',
          expectedRevision: 0,
          commandId: 'cmd-export-public',
          principal: {
            actorKind: 'human',
            actorId: host.playerId,
            authorityType: 'test-host',
            authorityId: MATCH_ID,
          },
          events: [
            {
              eventId: 'export-public',
              eventType: 'public_notice',
              eventVersion: 1,
              correlationId: 'corr-export',
              causationEventIds: [],
              occurredAt: AT,
              payload: { headline: 'Authorized public result' },
              entityRefs: [],
            },
          ],
        })
      ).kind,
    ).toBe('committed');
    expect((await commit({ reason: PRIVATE_REASON })).status).toBe(200);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: MATCH_ID, streamType: 'history-proof' },
      headers: { authorization: `Bearer ${guest.wire}` },
    });
    await exportHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const json = res._getJSONData();
    expect(json.stream.facts).toEqual([
      {
        factType: 'public_notice',
        sequenceHint: 1,
        payload: { headline: 'Authorized public result' },
      },
    ]);
    expect(JSON.stringify(json)).not.toContain(PRIVATE_REASON);
    expect(JSON.stringify(json)).not.toContain('"reason"');
  });

  it('gives players a payload-free view and audits denied private reads', async () => {
    expect((await commit({ reason: PRIVATE_REASON })).status).toBe(200);
    const records = privateRecords();
    expect(records).toHaveLength(1);
    const opaqueRef = records[0].opaqueRef;
    const repository = new SQLitePrivateRecordRepository(db);
    expect(await repository.exportView({ opaqueRef })).toEqual({
      opaqueRef,
      payloadState: 'present',
      recordKind: 'gm-reason',
    });
    await expect(
      repository.exportView({
        opaqueRef,
        includePrivate: true,
        ...privateGate(guest.playerId),
      }),
    ).rejects.toMatchObject({ code: 'access-denied' });
    await expect(
      repository.lookupPrivate({ opaqueRef, ...privateGate(guest.playerId) }),
    ).rejects.toMatchObject({ code: 'access-denied' });
    const audit = repository.listAccessAudit(opaqueRef);
    expect(
      audit.filter((row) => row.actorPrincipalId === guest.playerId),
    ).toMatchObject([
      {
        purpose: 'export-attempt',
        result: 'denied',
        safeReasonCode: 'role-denied',
      },
      { purpose: 'lookup', result: 'denied', safeReasonCode: 'role-denied' },
    ]);
    expect(JSON.stringify(audit)).not.toContain(PRIVATE_REASON);
  });

  it('writes no private record after a refused commit', async () => {
    const before = effectiveHead();
    const result = await commit({
      reason: PRIVATE_REASON,
      expectedGeneration: 0,
    });
    expect(result.status).toBe(409);
    expect(result.json.kind).toBe('refused');
    expect(effectiveHead()).toEqual(before);
    expect(privateRecords()).toEqual([]);
  });
});
