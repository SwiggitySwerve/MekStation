/**
 * GM + two-player campaign authority pack 1.
 *
 * E2E-03 and E2E-08 are LIVE again: the join-arm live-delivery finding
 * that blocked them (umbrella 21.1 Progress, finding #12 - a committed
 * command's event reached NO connected campaign client) is resolved by
 * the delivery unification: every join arm now attaches the same
 * scoped live sink (`CampaignSyncSession.attachLiveParticipant`), and
 * grant-arm guests are retained in the convergence set. The letters:
 * E2E-03: WHEN an accepted campaign command produces a player-visible fact
 * THEN read-only SQLite evidence SHALL show the committed batch before either
 * eligible player renders it.
 * E2E-08: WHEN a client resends the same command and idempotency identity
 * THEN the store SHALL contain one receipt and one event batch and the client
 * SHALL render one effect. NOTE: because guests now sit in the
 * convergence set, the resend is preceded by each guest acknowledging
 * the post-advance revision - otherwise the duplicate would be refused
 * CAMPAIGN_NOT_CONVERGED and the scenario would pass for the wrong
 * reason (refusal, not idempotency). The spec asserts no Error frame
 * reached the GM so the dedupe, not a refusal, carried the row.
 * E2E-17: WHEN a participant cold-reloads an active match after the invite
 * code expired THEN the route SHALL recover by durable session and match
 * identity while a newcomer using the invite is rejected.
 * E2E-18: WHEN the three contexts exchange valid heartbeat traffic without
 * gameplay commands THEN the session SHALL remain connected beyond the
 * liveness timeout interval.
 *
 * @tags @authority-e2e
 */

import { expect, test, type Page } from '@playwright/test';

import { HEARTBEAT_TIMEOUT_MS } from '@/types/multiplayer/Protocol';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';

const SOCKET_KEY = '__gmAuthorityPackSocket';
type Fixture = Awaited<ReturnType<typeof createGmTwoPlayerCampaignFixture>>;
type Role = Fixture['clients'][number]['role'];
type Identity = {
  readonly playerId: string;
  readonly wireToken: string;
  readonly displayName: string;
};
type Session = {
  readonly campaignId: string;
  readonly matchId: string;
  readonly roomCode: string;
};
type Frame = {
  readonly kind: string;
  readonly eventType: string | null;
  readonly eventDay: number | null;
  /**
   * The event's journal sequence, captured so E2E-08 can acknowledge
   * the post-advance revision before resending the duplicate intent.
   */
  readonly eventSequence: number | null;
};
type Client = { readonly page: Page; readonly identity: Identity };
type Clients = {
  readonly gm: Client;
  readonly playerOne: Client;
  readonly playerTwo: Client;
};
type SocketState = {
  readonly readyState: number;
  readonly closed: boolean;
  readonly heartbeats: number;
  readonly frames: readonly Frame[];
};
type Batch = {
  readonly command_id: string;
  readonly event_count: number;
  readonly recorded_at: string;
};

test('E2E-18 quiet heartbeats keep three campaign clients connected @authority-e2e', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    const session = await openSession(fixture);
    const clients = await connectClients(fixture, session);
    await acknowledge(clients, session);

    // Page sockets answer production Heartbeat frames; the assertion crosses
    // the imported timeout rather than a guessed duration or fake clock.
    // The letter asks exactly this: heartbeat traffic flowing, and the
    // session still connected beyond the liveness timeout interval. A
    // post-idle command round-trip belongs to the delivery scenarios
    // (E2E-03/08), which are blocked on the join-arm live-delivery
    // finding recorded in the umbrella's 21.1 Progress notes.
    // A poll that resolves on first success would pass in seconds and
    // prove nothing. The letter is survival BEYOND the interval, so the
    // three contexts sit quiet for the full timeout plus a server
    // heartbeat period, and only THEN is still-connected asserted.
    expect(await connected(clients)).toBe(true);
    await clients.gm.page.waitForTimeout(HEARTBEAT_TIMEOUT_MS + 15_000);
    expect(await connected(clients)).toBe(true);
    expect(await heartbeatsSeen(clients)).toBe(true);
  } finally {
    await closeSockets(fixture);
    await fixture.cleanup();
  }
});

test('E2E-03 a committed command is durable before every eligible player renders it @authority-e2e', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    const session = await openSession(fixture);
    const clients = await connectClients(fixture, session);
    await acknowledge(clients, session);

    const commandId = await advance(clients.gm, session, 'e2e03-advance');

    // The durable half FIRST: read-only SQLite evidence shows the
    // committed batch. The broadcast only ever runs after the durable
    // append, so the batch existing here is the commit the renders
    // below are downstream of.
    const batch = await committedBatch(fixture, session, commandId);
    expect(batch.event_count).toBeGreaterThan(0);

    // Then the player-visible fact reaches EVERY connected client
    // exactly once - the delivery-unification letter. Before finding
    // #12 was fixed this is precisely what failed live: the batch
    // committed and no browser rendered it.
    await renderedOnce(clients.gm.page, 1);
    await renderedOnce(clients.playerOne.page, 1);
    await renderedOnce(clients.playerTwo.page, 1);
  } finally {
    await closeSockets(fixture);
    await fixture.cleanup();
  }
});

test('E2E-08 a resent command identity commits once and renders once @authority-e2e', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    const session = await openSession(fixture);
    const clients = await connectClients(fixture, session);
    await acknowledge(clients, session);

    const commandId = await advance(clients.gm, session, 'e2e08-duplicate');
    const batch = await committedBatch(fixture, session, commandId);
    await renderedOnce(clients.gm.page, 1);
    await renderedOnce(clients.playerOne.page, 1);
    await renderedOnce(clients.playerTwo.page, 1);

    // Guests sit in the convergence set since the delivery unification,
    // so the resend must happen from a CONVERGED session: each guest
    // acknowledges the post-advance revision it was actually delivered.
    // Without this the duplicate is refused CAMPAIGN_NOT_CONVERGED and
    // the row would pass for the wrong reason (refusal, not
    // idempotency).
    await ackDeliveredDay(clients.playerOne, session, 1);
    await ackDeliveredDay(clients.playerTwo, session, 1);
    // The acks travel on the guests' sockets and the resend on the
    // GM's; cross-socket ordering is not guaranteed, so give the server
    // a bounded beat to record convergence before the duplicate lands.
    await clients.gm.page.waitForTimeout(1_500);

    // The same command identity again, verbatim.
    await hostIntent(clients.gm, session, 'e2e08-duplicate');
    // A bounded settle window: a wrongful second commit or second
    // broadcast needs time to arrive before "still exactly one" means
    // anything.
    await clients.gm.page.waitForTimeout(3_000);

    // One receipt and one event batch in the store...
    const rows = batches(fixture, session, commandId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.event_count).toBe(batch.event_count);
    // ...no refusal carried the row (the dedupe did)...
    expect(await errorFramesSeen(clients.gm.page)).toEqual([]);
    // ...and every client still rendered exactly one effect: the day
    // advanced once and never re-advanced.
    await renderedOnce(clients.gm.page, 1);
    await renderedOnce(clients.playerOne.page, 1);
    await renderedOnce(clients.playerTwo.page, 1);
    expect(await daySeen(clients.gm.page, 2)).toBe(false);
    expect(await daySeen(clients.playerOne.page, 2)).toBe(false);
    expect(await daySeen(clients.playerTwo.page, 2)).toBe(false);
  } finally {
    await closeSockets(fixture);
    await fixture.cleanup();
  }
});

async function openSession(fixture: Fixture): Promise<Session> {
  const gm = fixtureClient(fixture, 'future-gm');
  const identity = await fixtureIdentity(gm.page, fixture.session.id);
  return createSession(gm.page, identity, await createCampaign(gm.page));
}

async function connectClients(
  fixture: Fixture,
  session: Session,
): Promise<Clients> {
  const gm = fixtureClient(fixture, 'future-gm');
  const playerOne = fixtureClient(fixture, 'future-player-1');
  const playerTwo = fixtureClient(fixture, 'future-player-2');
  const clients = {
    gm: {
      page: gm.page,
      identity: await fixtureIdentity(gm.page, fixture.session.id),
    },
    playerOne: {
      page: playerOne.page,
      identity: await fixtureIdentity(playerOne.page, fixture.session.id),
    },
    playerTwo: {
      page: playerTwo.page,
      identity: await fixtureIdentity(playerTwo.page, fixture.session.id),
    },
  };
  await Promise.all([
    connectSocket(clients.gm, session, 'host'),
    connectSocket(clients.playerOne, session, 'guest'),
    connectSocket(clients.playerTwo, session, 'guest'),
  ]);
  return clients;
}

function fixtureClient(
  fixture: Fixture,
  role: Role,
): Fixture['clients'][number] {
  const found = fixture.clients.find((candidate) => candidate.role === role);
  if (!found) throw new Error('Fixture client missing role=' + role);
  return found;
}

async function fixtureIdentity(
  page: Page,
  sessionId: string,
): Promise<Identity> {
  const value = await page.evaluate((id) => {
    const raw = sessionStorage.getItem('mekstation.coopCampaign.token.' + id);
    return raw === null ? null : JSON.parse(raw);
  }, sessionId);
  if (!record(value)) throw new Error('Fixture wire identity missing');
  const playerId = string(value, 'playerId');
  const wireToken = string(value, 'wireToken');
  const displayName = string(value, 'displayName');
  if (!playerId || !wireToken || !displayName)
    throw new Error('Fixture wire identity invalid');
  return { playerId, wireToken, displayName };
}

async function createCampaign(page: Page): Promise<string> {
  await page.waitForFunction(
    () =>
      window.__ZUSTAND_STORES__?.campaign !== undefined &&
      window.__ZUSTAND_STORES__?.campaignPersistence !== undefined,
  );
  const result = await page.evaluate(async () => {
    const stores = window.__ZUSTAND_STORES__;
    if (!stores?.campaign || !stores.campaignPersistence)
      throw new Error('Campaign stores unavailable');
    const campaignId = stores.campaign
      .getState()
      .createCampaign('GM authority pack', 'mercenary', {
        startingFunds: 1_000_000,
      });
    const saved = await stores.campaignPersistence.getState().saveCampaign();
    return { campaignId, status: saved.status };
  });
  expect(result.status).toBe('saved');
  return result.campaignId;
}

async function createSession(
  page: Page,
  identity: Identity,
  campaignId: string,
): Promise<Session> {
  const result = await page.evaluate(
    async ({ gm, id }) => {
      const response = await fetch('/api/multiplayer/matches', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + gm.wireToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
          displayName: gm.displayName,
          layout: '1v1',
          coopCampaign: {
            campaignId: id,
            arbitrationMode: 'host-review',
            state: {
              campaignId: id,
              day: 0,
              balance: 0,
              rosterUnits: {},
              forceUnits: {},
              pilots: {},
              contracts: {},
              factionStanding: {},
              salvagePool: 0,
            },
          },
        }),
      });
      return { status: response.status, body: await response.json() };
    },
    { gm: identity, id: campaignId },
  );
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  if (!record(result.body))
    throw new Error('Campaign session response invalid');
  const matchId = string(result.body, 'matchId');
  const roomCode = string(result.body, 'roomCode');
  if (!matchId || !roomCode)
    throw new Error('Campaign session identifiers missing');
  return { campaignId, matchId, roomCode };
}

async function connectSocket(
  client: Client,
  session: Session,
  role: 'host' | 'guest',
): Promise<void> {
  const connected = await client.page.evaluate(
    async ({ identity, campaign, campaignRole, stateKey }) =>
      new Promise<boolean>((resolve) => {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const token = identity.wireToken
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const params = new URLSearchParams({
          channel: 'campaign',
          matchId: campaign.matchId,
          playerId: identity.playerId,
        });
        const socket = new WebSocket(
          protocol + '//' + location.host + '/api/multiplayer/socket?' + params,
          ['mekstation.v1', 'mekstation.token.' + token],
        );
        const state = {
          socket,
          closed: false,
          heartbeats: 0,
          raw: 0,
          frames: [] as Frame[],
        };
        Reflect.set(window, stateKey, state);
        const timeout = window.setTimeout(() => resolve(false), 15_000);
        socket.addEventListener('open', () =>
          socket.send(
            JSON.stringify({
              kind: 'CampaignJoin',
              matchId: campaign.matchId,
              ts: new Date().toISOString(),
              playerId: identity.playerId,
              role: campaignRole,
              token: identity.wireToken,
              ...(campaignRole === 'guest'
                ? { roomCode: campaign.roomCode }
                : {}),
            }),
          ),
        );
        socket.addEventListener('message', (message) => {
          state.raw += 1;
          if (typeof message.data !== 'string') return;
          try {
            const frame = JSON.parse(message.data) as unknown;
            // Browser scope - no spec helpers here; inline the record check.
            const isRecord = (
              value: unknown,
            ): value is Record<string, unknown> =>
              value !== null && typeof value === 'object';
            if (!isRecord(frame)) return;
            if (frame.kind === 'Heartbeat') {
              state.heartbeats += 1;
              socket.send(
                JSON.stringify({
                  kind: 'Heartbeat',
                  matchId: campaign.matchId,
                  ts: new Date().toISOString(),
                }),
              );
              return;
            }
            const event = isRecord(frame.event) ? frame.event : null;
            const payload =
              event && isRecord(event.payload) ? event.payload : null;
            state.frames.push({
              kind: typeof frame.kind === 'string' ? frame.kind : 'unknown',
              eventType:
                event && typeof event.type === 'string' ? event.type : null,
              eventDay:
                payload && typeof payload.newDay === 'number'
                  ? payload.newDay
                  : null,
              eventSequence:
                event && typeof event.sequence === 'number'
                  ? event.sequence
                  : null,
            });
            if (frame.kind === 'CampaignSnapshot') {
              window.clearTimeout(timeout);
              resolve(true);
            }
            if (frame.kind === 'Error') {
              window.clearTimeout(timeout);
              resolve(false);
            }
          } catch {
            state.closed = true;
          }
        });
        socket.addEventListener('close', () => {
          state.closed = true;
        });
        socket.addEventListener('error', () => {
          state.closed = true;
        });
      }),
    {
      identity: client.identity,
      campaign: session,
      campaignRole: role,
      stateKey: SOCKET_KEY,
    },
  );
  if (!connected) {
    // Surface WHY: the refusal or silence is in the captured frames.
    const state = await socketState(client.page);
    throw new Error(
      'Campaign socket not admitted for ' +
        role +
        ': ' +
        JSON.stringify(state.frames.slice(-4)),
    );
  }
}

async function acknowledge(clients: Clients, session: Session): Promise<void> {
  await Promise.all(
    [clients.gm, clients.playerOne, clients.playerTwo].map((client) =>
      send(client.page, {
        kind: 'CampaignAck',
        matchId: session.matchId,
        ts: new Date().toISOString(),
        playerId: client.identity.playerId,
        campaignId: session.campaignId,
        revision: 0,
      }),
    ),
  );
}

async function advance(
  client: Client,
  session: Session,
  intentId: string,
): Promise<string> {
  await hostIntent(client, session, intentId);
  return 'campaign-intent:' + session.campaignId + ':' + intentId;
}

async function hostIntent(
  client: Client,
  session: Session,
  intentId: string,
): Promise<void> {
  await send(client.page, {
    kind: 'CampaignHostIntent',
    matchId: session.matchId,
    ts: new Date().toISOString(),
    playerId: client.identity.playerId,
    intent: {
      kind: 'AdvanceDay',
      campaignId: session.campaignId,
      intentId,
      payload: { days: 1 },
    },
  });
}

async function send(
  page: Page,
  message: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ({ frame, stateKey }) => {
      const state = Reflect.get(window, stateKey);
      const socket =
        state !== null && typeof state === 'object'
          ? Reflect.get(state, 'socket')
          : null;
      if (
        !(socket instanceof WebSocket) ||
        socket.readyState !== WebSocket.OPEN
      )
        throw new Error('Campaign socket unavailable');
      socket.send(JSON.stringify(frame));
    },
    { frame: message, stateKey: SOCKET_KEY },
  );
}

async function committedBatch(
  fixture: Fixture,
  session: Session,
  commandId: string,
): Promise<Batch> {
  await expect
    .poll(() => batches(fixture, session, commandId), { timeout: 20_000 })
    .toHaveLength(1);
  const batch = batches(fixture, session, commandId)[0];
  if (!batch) throw new Error('Committed batch disappeared');
  return batch;
}

function batches(
  fixture: Fixture,
  session: Session,
  commandId: string,
): readonly Batch[] {
  const evidence = fixture.openEvidence('app');
  try {
    const hash = evidence.fileHash();
    const rows = evidence.select<Batch>(
      'SELECT command_id, event_count, recorded_at FROM event_journal_batches WHERE stream_type = ? AND stream_id = ? AND command_id = ?',
      ['campaign', session.campaignId, commandId],
    );
    expect(evidence.fileHash()).toBe(hash);
    return rows;
  } finally {
    evidence.close();
  }
}

async function renderedOnce(page: Page, day: number): Promise<void> {
  try {
    await expect
      .poll(
        async () => {
          const state = await socketState(page);
          return state.frames.filter(
            (frame) =>
              frame.eventType === 'CampaignDayAdvanced' &&
              frame.eventDay === day,
          ).length;
        },
        { timeout: 20_000 },
      )
      .toBe(1);
  } catch (error) {
    const state = await socketState(page);
    const raw = await page.evaluate((k) => {
      const st = Reflect.get(window, k) as { raw?: number } | null;
      return st && typeof st === 'object' ? (st.raw ?? -1) : -2;
    }, SOCKET_KEY);
    throw new Error(
      'renderedOnce day=' +
        day +
        ' raw=' +
        raw +
        ' frames=' +
        JSON.stringify(state.frames) +
        ' original=' +
        String(error),
    );
  }
}

/**
 * Acknowledges the revision a client was actually DELIVERED for the
 * given day's CampaignDayAdvanced frame. The sequence is read from the
 * captured frame rather than guessed, because the ack guard refuses a
 * claim about a revision the session never handed this participant.
 */
async function ackDeliveredDay(
  client: Client,
  session: Session,
  day: number,
): Promise<void> {
  const state = await socketState(client.page);
  const frame = state.frames.find(
    (candidate) =>
      candidate.eventType === 'CampaignDayAdvanced' &&
      candidate.eventDay === day &&
      candidate.eventSequence !== null,
  );
  if (!frame || frame.eventSequence === null) {
    throw new Error(
      'No delivered CampaignDayAdvanced frame to acknowledge for day=' + day,
    );
  }
  await send(client.page, {
    kind: 'CampaignAck',
    matchId: session.matchId,
    ts: new Date().toISOString(),
    playerId: client.identity.playerId,
    campaignId: session.campaignId,
    revision: frame.eventSequence,
  });
}

/** Error frames a socket captured; empty means no refusal arrived. */
async function errorFramesSeen(page: Page): Promise<readonly Frame[]> {
  const state = await socketState(page);
  return state.frames.filter((frame) => frame.kind === 'Error');
}

/** True when a CampaignDayAdvanced frame for `day` reached the socket. */
async function daySeen(page: Page, day: number): Promise<boolean> {
  const state = await socketState(page);
  return state.frames.some(
    (frame) =>
      frame.eventType === 'CampaignDayAdvanced' && frame.eventDay === day,
  );
}

async function socketState(page: Page): Promise<SocketState> {
  return page.evaluate((stateKey) => {
    const state = Reflect.get(window, stateKey);
    if (state === null || typeof state !== 'object')
      throw new Error('Campaign socket state missing');
    const socket = Reflect.get(state, 'socket');
    const heartbeatValue = Reflect.get(state, 'heartbeats');
    return {
      readyState:
        socket instanceof WebSocket ? socket.readyState : WebSocket.CLOSED,
      closed: Reflect.get(state, 'closed') === true,
      heartbeats: typeof heartbeatValue === 'number' ? heartbeatValue : 0,
      frames: Array.isArray(Reflect.get(state, 'frames'))
        ? (Reflect.get(state, 'frames') as Frame[])
        : [],
    };
  }, SOCKET_KEY);
}

async function connected(clients: Clients): Promise<boolean> {
  const states = await Promise.all([
    socketState(clients.gm.page),
    socketState(clients.playerOne.page),
    socketState(clients.playerTwo.page),
  ]);
  return states.every(
    (state) => state.readyState === WebSocket.OPEN && !state.closed,
  );
}

async function heartbeatsSeen(clients: Clients): Promise<boolean> {
  const states = await Promise.all([
    socketState(clients.gm.page),
    socketState(clients.playerOne.page),
    socketState(clients.playerTwo.page),
  ]);
  return states.every((state) => state.heartbeats > 0);
}

async function closeSockets(fixture: Fixture): Promise<void> {
  await Promise.all(
    fixture.clients.map((client) =>
      client.page.evaluate((stateKey) => {
        const state = Reflect.get(window, stateKey);
        // Runs in the BROWSER - no spec-scope helpers exist here.
        const socket =
          state !== null && typeof state === 'object'
            ? Reflect.get(state, 'socket')
            : null;
        if (socket instanceof WebSocket) socket.close();
      }, SOCKET_KEY),
    ),
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function string(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' ? field : null;
}
