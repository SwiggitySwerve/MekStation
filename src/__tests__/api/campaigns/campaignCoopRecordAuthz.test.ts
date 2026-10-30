/**
 * Who may save or delete a campaign a live co-op host holds (roadmap unit
 * CAMPAIGN-LIVE-WRITE-1; LSC-2P finding F1, security half; owner decisions
 * 2026-10-25 items 1, 2 and 6).
 *
 * The real item route, real SQLite on a temp file, real Ed25519 bearers and a
 * live co-op host in the shared CampaignHostRegistry with a guest attached to
 * its live delivery. The server decides from the VERIFIED BEARER whether a
 * write is the host's own. `body.coopSession` is a client-written field and
 * decides nothing.
 *
 * Every refusal leaves the stored row, its version, the journal and the live
 * host untouched and sends the guest nothing.
 *
 * - (LW01) host, same window after a reload: its stored bearer still
 *   verifies, so the save is taken and adopted, twice.
 * - (LW02) host in a NEW window (no session token): refused 401
 *   HOST_SESSION_REQUIRED even with a host-shaped co-op session in the body.
 * - (LW03/LW16) the body claim decides nothing, either way.
 * - (LW04/LW05/LW06) a malformed, wrong-session or expired bearer is refused;
 *   an expired one is HOST_SESSION_EXPIRED, and a renewed sign-in saves.
 * - (LW07..LW09) DELETE follows the same rule while the host is live.
 * - (LW10..LW12) with no live host the record is unprotected: pinned as the
 *   disclosed v2.2.0 behaviour (app restart before a member reconnects, a
 *   closed host), so a later change is deliberate.
 * - (LW13) restart after a guest reconnected: refused again until the host
 *   signs in.
 * - (LW14) the rule is keyed on the principal, not the window: a second
 *   window holding the same identity saves too (MULTI-WINDOW-SESSION-1).
 * - (LW15) a guest mirror's save of its own record is unchanged.
 * - (LW17) F1 on the dashboard: a profile that adopted the host-shaped record
 *   has no token; its Advance Day is refused, the save card says why, and the
 *   unsaved change is kept.
 */

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IVaultIdentity } from '@/types/vault';

import CampaignDashboardPage from '@/components/gameplay/pages/campaigns/dashboard/CampaignDashboardPage';
import { ToastProvider } from '@/components/shared/Toast';
import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import { _resetCoopRuntimeSessions } from '@/lib/campaign/coop/coopRuntimeSession';
import * as auth from '@/lib/multiplayer/server/auth';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
  type ICampaignHostRegistryEntry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { uninstallCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';

import {
  bearerOf,
  callId,
  createJournalNative,
  eventTypes,
  intentOf,
  mintIdentity,
  storedRow,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

let routeCampaignId = 'lw-page-a';
jest.mock('@/lib/multiplayer/server/auth', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/multiplayer/server/auth')
  >('@/lib/multiplayer/server/auth');
  return {
    ...actual,
    authenticateRequest: jest.fn(actual.authenticateRequest),
  };
});
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    pathname: '/gameplay/campaigns/[id]',
    query: { id: routeCampaignId },
    asPath: `/gameplay/campaigns/${routeCampaignId}`,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

const ROOM = 'ABC234';

let hostIdentity: IVaultIdentity;
let hostBearer: Awaited<ReturnType<typeof bearerOf>>;
let memberBearer: Awaited<ReturnType<typeof bearerOf>>;

/** A live co-op host for `campaignId` (hosted by the host identity) and the event types a guest is sent. */
async function liveHost(
  campaignId: string,
  matchId: string,
): Promise<{
  readonly record: SerializedCampaign;
  readonly entry: ICampaignHostRegistryEntry;
  readonly guestFrames: string[];
}> {
  const { record } = await createJournalNative(campaignId);
  const entry = await registerHostFor(
    campaignId,
    matchId,
    authoritativeStateFromSerializedCampaign(record),
  );
  const guestFrames: string[] = [];
  entry.syncSession.attachLiveParticipant(
    (event) => guestFrames.push(event.type),
    'guest-lw',
  );
  return { record, entry, guestFrames };
}

function registerHostFor(
  campaignId: string,
  matchId: string,
  state: ICampaignAuthoritativeState,
  options?: { readonly rebuilt?: boolean },
): Promise<ICampaignHostRegistryEntry> {
  return getCampaignHostRegistry().register(
    matchId,
    { campaignId, hostPlayerId: hostBearer.playerId, roomCode: ROOM, state },
    options,
  );
}

/** A whole-campaign PUT of `record` at its own version, optionally with a co-op session claim in the body. */
function putRecord(
  record: SerializedCampaign,
  claim: SerializedCampaign['body']['coopSession'] | undefined,
  wire?: string,
  balance = record.body.finances.balance + 100,
): ReturnType<typeof callId> {
  return callId(
    'PUT',
    record.campaignId,
    {
      envelope: {
        ...record,
        version: record.version + 1,
        body: {
          ...record.body,
          finances: { ...record.body.finances, balance },
          ...(claim === undefined ? {} : { coopSession: claim }),
        },
      },
      baseVersion: record.version,
    },
    wire,
  );
}

const hostClaim = (
  matchId: string,
): SerializedCampaign['body']['coopSession'] => ({
  mode: 'host',
  roomCode: ROOM,
  matchId,
});

/** Everything a refused write must leave alone. */
async function observe(
  campaignId: string,
  entry: ICampaignHostRegistryEntry,
): Promise<unknown> {
  return {
    row: readCampaign(campaignId),
    types: eventTypes(campaignId),
    journal: getSQLiteService()
      .getDatabase()
      .prepare(
        'SELECT * FROM event_journal_events WHERE stream_id = ? ORDER BY stream_revision',
      )
      .all(campaignId),
    hostState: entry.host.getState(),
  };
}

describe('CAMPAIGN-LIVE-WRITE-1 who may save or delete a campaign a live co-op host holds', () => {
  useTempCampaignDatabase('lw1-authz-');

  beforeEach(() => {
    jest
      .mocked(auth.authenticateRequest)
      .mockReset()
      .mockImplementation(
        jest.requireActual<typeof import('@/lib/multiplayer/server/auth')>(
          '@/lib/multiplayer/server/auth',
        ).authenticateRequest,
      );
  });

  beforeAll(async () => {
    hostIdentity = await mintIdentity('lw1-host');
    hostBearer = await bearerOf(hostIdentity);
    memberBearer = await bearerOf(await mintIdentity('lw1-member'));
  });

  afterEach(() => {
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  it("(LW01) the host's own window saves after a reload: the same stored bearer is taken twice and adopted", async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-reload',
      'match-lw-reload',
    );

    const first = await putRecord(
      record,
      hostClaim('match-lw-reload'),
      hostBearer.wire,
      382_500,
    );
    const reloaded = first.json as unknown as SerializedCampaign;
    const second = await putRecord(
      reloaded,
      hostClaim('match-lw-reload'),
      hostBearer.wire,
      383_000,
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(entry.host.getState().balance).toBe(383_000);
    expect(storedRow('lw-reload').balance).toBe(383_000);
    expect(guestFrames).toEqual([
      'CampaignSnapshotPublished',
      'CampaignSnapshotPublished',
    ]);
  });

  it('(LW02) the host in a NEW window has no session token: refused 401 HOST_SESSION_REQUIRED, nothing written, nothing sent, even with a host-shaped co-op session in the body', async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-newwin',
      'match-lw-newwin',
    );
    const before = await observe('lw-newwin', entry);

    const put = await putRecord(
      record,
      hostClaim('match-lw-newwin'),
      undefined,
    );

    expect(put.status).toBe(401);
    expect(put.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_REQUIRED',
      matchId: 'match-lw-newwin',
    });
    expect(typeof put.json.error).toBe('string');
    expect(put.json.current).toBeUndefined();
    expect(await observe('lw-newwin', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it('(LW03) a verified principal that is not the host is refused 409 live-coop-session even when its body claims the host role; nothing is adopted', async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-claim',
      'match-lw-claim',
    );
    const before = await observe('lw-claim', entry);

    const put = await putRecord(
      record,
      hostClaim('match-lw-claim'),
      memberBearer.wire,
    );

    expect(put.status).toBe(409);
    expect(put.json).toMatchObject({
      kind: 'conflict',
      reason: 'live-coop-session',
      matchId: 'match-lw-claim',
    });
    expect(await observe('lw-claim', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it('(LW04) a malformed bearer is refused 401 HOST_SESSION_REQUIRED', async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-garbled',
      'match-lw-garbled',
    );
    const before = await observe('lw-garbled', entry);

    const put = await putRecord(
      record,
      hostClaim('match-lw-garbled'),
      'not-a-token',
    );

    expect(put.status).toBe(401);
    expect(put.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_REQUIRED',
    });
    expect(await observe('lw-garbled', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it("(LW05) the host's identity scoped to another session is refused: the scope is the live entry's, not the token's", async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-scope',
      'match-lw-scope',
    );
    const before = await observe('lw-scope', entry);
    const elsewhere = await bearerOf(hostIdentity, {
      scope: { kind: 'campaign-session', id: 'match-lw-other-session' },
    });

    const put = await putRecord(
      record,
      hostClaim('match-lw-scope'),
      elsewhere.wire,
    );

    expect(put.status).toBe(401);
    expect(put.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_REQUIRED',
      reason: 'scope-mismatch',
    });
    expect(await observe('lw-scope', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it('(LW06) an expired host token is refused 401 HOST_SESSION_EXPIRED, never as a conflict; a renewed sign-in then saves', async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-expired',
      'match-lw-expired',
    );
    const before = await observe('lw-expired', entry);
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const stale = await bearerOf(hostIdentity, {
      nowMs: twoHoursAgo,
      ttlMs: 60 * 60 * 1000,
    });

    const refused = await putRecord(
      record,
      hostClaim('match-lw-expired'),
      stale.wire,
    );
    expect(await observe('lw-expired', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
    const renewed = await bearerOf(hostIdentity);
    const saved = await putRecord(
      record,
      hostClaim('match-lw-expired'),
      renewed.wire,
      382_500,
    );

    expect(refused.status).toBe(401);
    expect(refused.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_EXPIRED',
      reason: 'expired',
    });
    expect(saved.status).toBe(200);
    expect(entry.host.getState().balance).toBe(382_500);
    expect(guestFrames).toEqual(['CampaignSnapshotPublished']);
  });

  it('(LW07) an anonymous DELETE while the host is live is refused 401; the row, journal and host survive', async () => {
    const { entry, guestFrames } = await liveHost(
      'lw-del-anon',
      'match-lw-del-anon',
    );
    const before = await observe('lw-del-anon', entry);

    const del = await callId('DELETE', 'lw-del-anon');

    expect(del.status).toBe(401);
    expect(del.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_REQUIRED',
      error: 'end the live co-op session before deleting this campaign',
    });
    expect(await observe('lw-del-anon', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it('(LW08) a DELETE by a verified non-host is refused 403 not-live-host; the row survives', async () => {
    const { entry, guestFrames } = await liveHost(
      'lw-del-member',
      'match-lw-del-member',
    );
    const before = await observe('lw-del-member', entry);

    const del = await callId(
      'DELETE',
      'lw-del-member',
      undefined,
      memberBearer.wire,
    );

    expect(del.status).toBe(403);
    expect(del.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_REQUIRED',
      reason: 'not-live-host',
      error: 'end the live co-op session before deleting this campaign',
    });
    expect(await observe('lw-del-member', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it("(LW09) the host's own DELETE is refused until the session ends", async () => {
    const { entry, guestFrames } = await liveHost(
      'lw-del-host',
      'match-lw-del-host',
    );
    const before = await observe('lw-del-host', entry);

    const del = await callId(
      'DELETE',
      'lw-del-host',
      undefined,
      hostBearer.wire,
    );

    expect(del.status).toBe(403);
    expect(del.json).toMatchObject({
      kind: 'refused',
      code: 'LIVE_SESSION_ACTIVE',
      reason: 'live-coop-session',
      error: 'end the live co-op session before deleting this campaign',
    });
    expect(await observe('lw-del-host', entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
    entry.host.close();
    expect(
      (await callId('DELETE', 'lw-del-host', undefined, hostBearer.wire))
        .status,
    ).toBe(204);
    expect(storedRow('lw-del-host').version).toBeNull();
  });

  it('(LW10) pinned, disclosed: app restart before any member reconnects (no live entry) takes the offline path; another profile saves and deletes with no bearer', async () => {
    const { record } = await liveHost('lw-restart-a', 'match-lw-restart-a');
    const { record: second } = await createJournalNative('lw-restart-b');
    _resetCampaignHostRegistry();

    const put = await putRecord(
      record,
      hostClaim('match-lw-restart-a'),
      undefined,
      382_500,
    );
    const del = await callId('DELETE', second.campaignId);

    expect(put.status).toBe(200);
    expect(storedRow('lw-restart-a').balance).toBe(382_500);
    expect(del.status).toBe(204);
    expect(storedRow('lw-restart-b').version).toBeNull();
  });

  it('(LW11) pinned, disclosed: a closed host is not live, so an anonymous DELETE is taken', async () => {
    const { entry } = await liveHost('lw-closed', 'match-lw-closed');
    entry.host.close();

    const del = await callId('DELETE', 'lw-closed');

    expect(del.status).toBe(204);
    expect(storedRow('lw-closed').version).toBeNull();
  });

  it('(LW12) pinned, disclosed: an offline host (never registered) takes an anonymous PUT from another profile', async () => {
    const { record } = await createJournalNative('lw-offline');

    const put = await putRecord(
      record,
      hostClaim('match-lw-offline'),
      undefined,
      382_500,
    );

    expect(put.status).toBe(200);
    expect(storedRow('lw-offline').balance).toBe(382_500);
  });

  it('(LW13) app restart AFTER a guest reconnected (entry live again): refused with no bearer, taken once the host signs in again', async () => {
    const { record } = await liveHost('lw-reconnect', 'match-lw-reconnect');
    _resetCampaignHostRegistry();
    const rebuilt = await registerHostFor(
      'lw-reconnect',
      'match-lw-reconnect',
      authoritativeStateFromSerializedCampaign(record),
      { rebuilt: true },
    );
    const guestFrames: string[] = [];
    rebuilt.syncSession.attachLiveParticipant(
      (event) => guestFrames.push(event.type),
      'guest-lw',
    );
    const before = await observe('lw-reconnect', rebuilt);

    const refused = await putRecord(
      record,
      hostClaim('match-lw-reconnect'),
      undefined,
    );
    expect(await observe('lw-reconnect', rebuilt)).toEqual(before);
    expect(guestFrames).toEqual([]);
    const signedIn = await bearerOf(hostIdentity);
    const saved = await putRecord(
      record,
      hostClaim('match-lw-reconnect'),
      signedIn.wire,
      382_500,
    );

    expect(refused.status).toBe(401);
    expect(refused.json).toMatchObject({ code: 'HOST_SESSION_REQUIRED' });
    expect(saved.status).toBe(200);
    expect(rebuilt.host.getState().balance).toBe(382_500);
    expect(guestFrames).toEqual(['CampaignSnapshotPublished']);
  });

  it('(LW14) keyed on the principal, not the window: a second window holding the same identity saves too', async () => {
    const { record, entry } = await liveHost('lw-twowin', 'match-lw-twowin');
    const windowOne = await bearerOf(hostIdentity);
    const windowTwo = await bearerOf(hostIdentity, { nowMs: Date.now() + 1 });

    const first = await putRecord(record, undefined, windowOne.wire, 382_500);
    expect(first.status).toBe(200);
    const second = await putRecord(
      first.json as unknown as SerializedCampaign,
      undefined,
      windowTwo.wire,
      383_000,
    );

    expect(windowOne.wire).not.toBe(windowTwo.wire);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(entry.host.getState().balance).toBe(383_000);
  });

  it("(LW15) a guest mirror's save of its own record (no live host for it) is unchanged: 200", async () => {
    await liveHost('lw-host-campaign', 'match-lw-own');
    const { record: own } = await createJournalNative('lw-guest-own');

    const put = await putRecord(
      own,
      { mode: 'guest', roomCode: ROOM, hostMatchId: 'match-lw-own' },
      memberBearer.wire,
      382_500,
    );

    expect(put.status).toBe(200);
    expect(storedRow('lw-guest-own').balance).toBe(382_500);
  });

  it("(LW16) the verified host's save does not need a host-shaped body: a guest-shaped or absent co-op session is still taken", async () => {
    const { record, entry } = await liveHost(
      'lw-bodyfree',
      'match-lw-bodyfree',
    );

    const put = await putRecord(
      record,
      { mode: 'guest', roomCode: ROOM, hostMatchId: 'match-lw-bodyfree' },
      hostBearer.wire,
      382_500,
    );

    expect(put.status).toBe(200);
    expect(entry.host.getState().balance).toBe(382_500);
  });

  it.each([undefined, 'Basic unusable', 'Bearer   '])(
    '(LW18) a query token cannot substitute for Authorization %s',
    async (authorization) => {
      const { record, entry, guestFrames } = await liveHost(
        'lw-query',
        'match-lw-query',
      );
      const before = await observe('lw-query', entry);
      const answer = await callId(
        'PUT',
        record.campaignId,
        {
          envelope: {
            ...record,
            body: { ...record.body, coopSession: hostClaim(entry.matchId) },
          },
          baseVersion: record.version,
        },
        undefined,
        { authorization, queryToken: hostBearer.wire },
      );
      expect(answer.status).toBe(401);
      expect(answer.json).toMatchObject({
        kind: 'refused',
        code: 'HOST_SESSION_REQUIRED',
      });
      expect(await observe('lw-query', entry)).toEqual(before);
      expect(guestFrames).toEqual([]);
    },
  );

  it('(LW19) a correctly scoped host bearer saves through a paused reconstructed entry', async () => {
    const { record } = await createJournalNative('lw-paused');
    const entry = await registerHostFor(
      'lw-paused',
      'match-lw-paused',
      authoritativeStateFromSerializedCampaign(record),
      { rebuilt: true },
    );
    const token = await bearerOf(hostIdentity, {
      scope: { kind: 'campaign-session', id: entry.matchId },
    });
    expect(getCampaignHostRegistry().liveEntryFor(record.campaignId)).toBe(
      entry,
    );
    expect(
      (await putRecord(record, undefined, token.wire, 382_500)).status,
    ).toBe(200);
    expect(entry.host.getState().balance).toBe(382_500);
  });

  it('(LW23) a database error with the session-change message stays a persistence failure and releases the host writer', async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-save-error',
      'match-lw-save-error',
    );
    const before = await observe(record.campaignId, entry);
    const db = getSQLiteService().getDatabase();
    // A different error object must not become the route's session refusal.
    db.exec(`CREATE TRIGGER lw_fail_save BEFORE INSERT ON campaigns
      BEGIN SELECT RAISE(ABORT, 'live-session-changed'); END`);
    try {
      const failed = await putRecord(
        record,
        hostClaim(entry.matchId),
        hostBearer.wire,
      );
      expect(failed.status).toBe(500);
      expect(failed.json).toEqual({ error: 'live-session-changed' });
      expect(await observe(record.campaignId, entry)).toEqual(before);
      expect(guestFrames).toEqual([]);
    } finally {
      db.exec('DROP TRIGGER lw_fail_save');
    }
    const saved = await putRecord(
      record,
      hostClaim(entry.matchId),
      hostBearer.wire,
    );
    expect(saved.status).toBe(200);
    expect(entry.host.getState().balance).toBe(
      record.body.finances.balance + 100,
    );
    expect(storedRow(record.campaignId).balance).toBe(
      record.body.finances.balance + 100,
    );
    expect(guestFrames.length).toBeGreaterThan(0);
  });

  it.each([
    ['verification', 'closed', false],
    ['verification', 'replaced', false],
    ['verification', 'replaced-same-match', false],
    ['writer-queue', 'closed', false],
    ['writer-queue', 'replaced', false],
    ['writer-queue', 'replaced-same-match', false],
    ['sequence-read', 'closed', false],
    ['sequence-read', 'replaced', false],
    ['sequence-read', 'replaced-same-match', false],
    ['sequence-read', 'replaced', true],
    ['sequence-read', 'replaced-same-match', true],
  ] as const)(
    '(LW20) refuses a host %s race when the entry is %s (replacement commit: %s)',
    async (phase, change, commit) => {
      const { record, entry, guestFrames } = await liveHost(
        'lw-race',
        'match-lw-race',
      );
      const entered = deferred(),
        release = deferred();
      let lock: Promise<void> | undefined;
      let boundary: jest.SpyInstance;
      if (phase === 'verification') {
        const verify = jest.requireActual<
          typeof import('@/lib/multiplayer/server/auth')
        >('@/lib/multiplayer/server/auth').authenticateRequest;
        boundary = jest
          .mocked(auth.authenticateRequest)
          .mockImplementationOnce(async (...args) => {
            const verdict = await verify(...args);
            entered.resolve();
            await release.promise;
            return verdict;
          });
      } else if (phase === 'writer-queue') {
        lock = entry.host.runBatchExclusive(() => release.promise);
        const adopt = entry.host.adoptSavedCheckpoint;
        boundary = jest
          .spyOn(entry.host, 'adoptSavedCheckpoint')
          .mockImplementation((save) => {
            const result = adopt(save);
            entered.resolve();
            return result;
          });
      } else {
        const log = entry.host.getEventLog(),
          next = log.nextSequence.bind(log);
        boundary = jest
          .spyOn(log, 'nextSequence')
          .mockImplementationOnce(async () => {
            const value = await next();
            entered.resolve();
            await release.promise;
            return value;
          });
      }
      const request = putRecord(
        record,
        hostClaim(entry.matchId),
        hostBearer.wire,
      );
      try {
        await Promise.race([entered.promise, request]);
        expect(boundary).toHaveBeenCalledTimes(1);
        entry.host.close();
        let replacement: ICampaignHostRegistryEntry | undefined;
        const replacementFrames: string[] = [];
        if (change !== 'closed') {
          if (change === 'replaced-same-match')
            getCampaignHostRegistry().dispose(entry.matchId);
          replacement = await registerHostFor(
            record.campaignId,
            change === 'replaced-same-match'
              ? entry.matchId
              : 'match-lw-replacement',
            authoritativeStateFromSerializedCampaign(record),
            { rebuilt: true },
          );
          replacement.syncSession.attachLiveParticipant(
            (event) => replacementFrames.push(event.type),
            'replacement-guest',
          );
          if (commit) {
            const outcome = await replacement.host.applyHostIntent(
              intentOf(record.campaignId, 'replacement-spend', 'SpendFunds', {
                amount: 1_000,
                reason: 'repairs',
              }),
            );
            expect(outcome.ok).toBe(true);
            expect(replacement.host.getState().balance).toBe(379_000);
            expect(storedRow(record.campaignId).balance).toBe(379_000);
            expect(replacementFrames.length).toBeGreaterThan(0);
          }
        }
        // Attribute the legitimate replacement write before judging the refused PUT.
        const before = await observe(record.campaignId, entry);
        const replacementBefore = replacement?.host.getState();
        const framesBefore = [...replacementFrames];
        release.resolve();
        expect((await request).json).toMatchObject({
          kind: 'refused',
          code: 'HOST_SESSION_REQUIRED',
          reason: 'live-session-changed',
        });
        expect((await request).status).toBe(403);
        expect(await observe(record.campaignId, entry)).toEqual(before);
        expect(replacement?.host.getState()).toEqual(replacementBefore);
        expect(guestFrames).toEqual([]);
        expect(replacementFrames).toEqual(framesBefore);
      } finally {
        release.resolve();
        await lock;
        await request;
      }
    },
  );
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// =============================================================================
// (LW17) F1 on the dashboard: the profile that adopted the host-shaped record
// =============================================================================

function resetClient(): void {
  uninstallCampaignPersistenceWiring();
  resetCampaignStore();
  _resetCoopRuntimeSessions();
  useCampaignMirrorStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
  window.localStorage.clear();
  window.sessionStorage.clear();
}

/** Routes the page's campaign item calls into the real route (with the bearer the page sent); everything else 404s. */
function routeFetchIntoRealServer(
  requests: { method: string; status: number; authorization: string | null }[],
): void {
  jest.spyOn(global, 'fetch').mockImplementation(async (input, init) => {
    const method = init?.method ?? 'GET';
    const match = /^\/api\/campaigns\/([^/?]+)$/.exec(String(input));
    const respond = (status: number, body: unknown): Response =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      }) as Response;
    if (!match || !['GET', 'PUT', 'DELETE'].includes(method)) {
      return respond(404, { error: 'not found (test)' });
    }
    const authorization = new Headers(init?.headers).get('authorization');
    const answer = await callId(
      method as 'GET' | 'PUT' | 'DELETE',
      decodeURIComponent(match[1]),
      init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization?.replace(/^Bearer /, ''),
    );
    requests.push({ method, status: answer.status, authorization });
    return respond(answer.status, answer.json);
  });
}

describe('CAMPAIGN-LIVE-WRITE-1 F1 on the dashboard', () => {
  useTempCampaignDatabase('lw1-page-');

  beforeAll(async () => {
    hostIdentity = await mintIdentity('lw1-page-host');
    hostBearer = await bearerOf(hostIdentity);
  });

  beforeEach(() => {
    resetClient();
    routeCampaignId = 'lw-page-a';
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    resetClient();
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  it.each(['missing', 'expired'] as const)(
    '(LW17) %s host token: save refusal keeps edits; renewal then saves them',
    async (tokenState) => {
      const { record, entry, guestFrames } = await liveHost(
        'lw-page-a',
        'match-lw-page-a',
      );
      // The GM's own save stamps the host session into the shared record.
      const hostSave = await putRecord(
        record,
        hostClaim('match-lw-page-a'),
        hostBearer.wire,
      );
      expect(hostSave.status).toBe(200);
      guestFrames.length = 0;
      const expired =
        tokenState === 'expired'
          ? await bearerOf(hostIdentity, {
              nowMs: Date.now() - 7_200_000,
              ttlMs: 3_600_000,
            })
          : undefined;
      if (expired)
        storeCoopCampaignToken({
          matchId: entry.matchId,
          playerId: hostBearer.playerId,
          displayName: 'Host',
          wireToken: expired.wire,
        });

      useCampaignStore()
        .getState()
        .createGuestMirrorCampaign('match-lw-page-b', {
          campaignId: 'lw-page-b',
          campaignName: 'Guest mirror B',
          factionId: 'mercenary',
          roomCode: 'BBBB22',
        });
      const requests: {
        method: string;
        status: number;
        authorization: string | null;
      }[] = [];
      routeFetchIntoRealServer(requests);
      render(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(CampaignDashboardPage),
        ),
      );
      await screen.findByTestId('coop-session-badge', {}, { timeout: 15000 });
      const before = storedRow('lw-page-a');
      const hostDayBefore = entry.host.getState().day;

      if (expired) {
        // Pending edits made before a credential expired; Save now must retain them.
        act(() => {
          const store = useCampaignStore();
          const current = store.getState().campaign!;
          store.setState({
            campaign: {
              ...current,
              currentDate: new Date(current.currentDate.getTime() + 86_400_000),
            },
          });
          useCampaignPersistenceStore.getState().markDirty();
        });
        await userEvent.click(screen.getByTestId('campaign-save-now-btn'));
      } else {
        await userEvent.click(screen.getByTestId('advance-day-btn'));
      }
      await waitFor(
        () => expect(requests.some((r) => r.method === 'PUT')).toBe(true),
        {
          timeout: 15000,
        },
      );

      expect(requests.filter((r) => r.method === 'PUT')).toEqual([
        {
          method: 'PUT',
          status: 401,
          authorization: expired ? `Bearer ${expired.wire}` : null,
        },
      ]);
      const refused = await screen.findByTestId('campaign-save-refused');
      expect(refused).toHaveTextContent(
        expired ? 'HOST_SESSION_EXPIRED' : 'HOST_SESSION_REQUIRED',
      );
      expect(screen.queryByText(/playing offline/i)).not.toBeInTheDocument();
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(storedRow('lw-page-a')).toEqual(before);
      expect(entry.host.getState().day).toBe(hostDayBefore);
      expect(guestFrames).toEqual([]);
      const edited = useCampaignStore()
        .getState()
        .campaign?.currentDate.toISOString();
      expect(edited).not.toBe(before.currentDate);
      const renewed = await bearerOf(hostIdentity);
      storeCoopCampaignToken({
        matchId: entry.matchId,
        playerId: hostBearer.playerId,
        displayName: 'Host',
        wireToken: renewed.wire,
      });
      await userEvent.click(screen.getByTestId('campaign-save-now-btn'));
      await waitFor(() =>
        expect(useCampaignPersistenceStore.getState().saveState).toBe('saved'),
      );
      expect(requests.filter((r) => r.method === 'PUT').at(-1)).toMatchObject({
        status: 200,
        authorization: `Bearer ${renewed.wire}`,
      });
      expect(
        screen.queryByTestId('campaign-save-refused'),
      ).not.toBeInTheDocument();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      expect(storedRow('lw-page-a').currentDate).toBe(edited);
      expect(guestFrames).toEqual(['CampaignSnapshotPublished']);
    },
  );

  it('(LW21) the dashboard displays the live DELETE refusal and keeps the campaign', async () => {
    const { record, entry, guestFrames } = await liveHost(
      'lw-page-a',
      'match-lw-page-a',
    );
    expect(
      (await putRecord(record, hostClaim(entry.matchId), hostBearer.wire))
        .status,
    ).toBe(200);
    storeCoopCampaignToken({
      matchId: entry.matchId,
      playerId: hostBearer.playerId,
      displayName: 'Host',
      wireToken: hostBearer.wire,
    });
    guestFrames.length = 0;
    const before = await observe(record.campaignId, entry);
    const requests: {
      method: string;
      status: number;
      authorization: string | null;
    }[] = [];
    routeFetchIntoRealServer(requests);
    render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(CampaignDashboardPage),
      ),
    );
    await screen.findByTestId('coop-session-badge', {}, { timeout: 15000 });
    await userEvent.click(screen.getByTestId('delete-campaign-btn'));
    await userEvent.click(screen.getByTestId('confirm-delete-btn'));
    const message = await screen.findByTestId('delete-campaign-error');
    expect(message).toHaveTextContent(
      'end the live co-op session before deleting this campaign',
    );
    expect(requests.filter((r) => r.method === 'DELETE')).toEqual([
      {
        method: 'DELETE',
        status: 403,
        authorization: `Bearer ${hostBearer.wire}`,
      },
    ]);
    expect(useCampaignStore().getState().campaign?.id).toBe(record.campaignId);
    expect(await observe(record.campaignId, entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });

  it('(LW22) an expired bearer cannot DELETE a live campaign', async () => {
    const { entry, guestFrames } = await liveHost(
      'lw-del-expired',
      'match-lw-del-expired',
    );
    const before = await observe(entry.campaignId, entry);
    const expired = await bearerOf(hostIdentity, {
      nowMs: Date.now() - 7_200_000,
      ttlMs: 3_600_000,
    });
    const answer = await callId(
      'DELETE',
      entry.campaignId,
      undefined,
      expired.wire,
    );
    expect(answer.status).toBe(401);
    expect(answer.json).toMatchObject({
      kind: 'refused',
      code: 'HOST_SESSION_EXPIRED',
      reason: 'expired',
    });
    expect(await observe(entry.campaignId, entry)).toEqual(before);
    expect(guestFrames).toEqual([]);
  });
});
