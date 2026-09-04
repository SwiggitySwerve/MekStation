/**
 * Durable GM + two-player campaign membership smoke proof.
 *
 * This intentionally drives the production match API and campaign WebSocket
 * protocol with the three tokens issued by gmTwoPlayerCampaignFixture. The
 * fixture creates all three identities in one vault process, so only its last
 * identity remains active for password minting; reusing the already-issued
 * tokens is the production-equivalent path that proves each fixture context's
 * distinct authenticated principal reaches the server.
 *
 * @tags @membership-smoke
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

type CampaignSeat = 'gm' | 'player';

interface IFixtureIdentity {
  readonly playerId: string;
  readonly wireToken: string;
  readonly displayName: string;
}

interface ICreatedCampaignSession {
  readonly matchId: string;
  readonly roomCode: string;
}

interface IWireFrame {
  readonly kind: string;
  readonly matchId: string | null;
  readonly code: string | null;
  readonly reason: string | null;
  readonly campaignId: string | null;
  readonly eventType: string | null;
}

interface IAdmissionAttempt {
  readonly frames: readonly IWireFrame[];
  readonly terminal: 'snapshot' | 'refusal' | 'closed' | 'timeout';
}

interface ICampaignParticipantRow {
  readonly campaign_id: string;
  readonly session_id: string;
  readonly participant_id: string;
  readonly seat: CampaignSeat;
  readonly revoked_at: string | null;
}

interface ISeededFourthIdentity extends IFixtureIdentity {
  readonly id: string;
}

test('binds GM and two tactical seats durably and refuses a fourth identity @membership-smoke', async ({
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
  let fourthContext: Awaited<ReturnType<Browser['newContext']>> | null = null;
  let fourthIdentity: ISeededFourthIdentity | null = null;

  try {
    const gm = findFixtureClient(fixture.clients, 'future-gm');
    const playerOne = findFixtureClient(fixture.clients, 'future-player-1');
    const playerTwo = findFixtureClient(fixture.clients, 'future-player-2');
    const gmIdentity = await readFixtureIdentity(gm.page, fixture.session.id);
    const playerOneIdentity = await readFixtureIdentity(
      playerOne.page,
      fixture.session.id,
    );
    const playerTwoIdentity = await readFixtureIdentity(
      playerTwo.page,
      fixture.session.id,
    );

    expect(
      new Set([
        gmIdentity.playerId,
        playerOneIdentity.playerId,
        playerTwoIdentity.playerId,
      ]).size,
    ).toBe(3);
    expect(gmIdentity.playerId).toBe(gm.identity.playerId);
    expect(playerOneIdentity.playerId).toBe(playerOne.identity.playerId);
    expect(playerTwoIdentity.playerId).toBe(playerTwo.identity.playerId);

    const campaignId = await createDurableHostCampaign(gm.page);
    const created = await createCampaignSession(
      gm.page,
      gmIdentity,
      campaignId,
    );

    const gmAdmission = await joinCampaignSession(gm.page, {
      ...gmIdentity,
      campaignId,
      matchId: created.matchId,
      role: 'host',
    });
    expectAdmitted(gmAdmission, created.matchId, campaignId);

    const playerOneAdmission = await joinCampaignSession(playerOne.page, {
      ...playerOneIdentity,
      campaignId,
      matchId: created.matchId,
      role: 'guest',
      roomCode: created.roomCode,
    });
    expectAdmitted(playerOneAdmission, created.matchId, campaignId);

    const playerTwoAdmission = await joinCampaignSession(playerTwo.page, {
      ...playerTwoIdentity,
      campaignId,
      matchId: created.matchId,
      role: 'guest',
      roomCode: created.roomCode,
    });
    expectAdmitted(playerTwoAdmission, created.matchId, campaignId);

    fourthIdentity = await seedFourthIdentity(request, fixture.runId);
    fourthContext = await browser.newContext({ baseURL });
    const fourthPage = await fourthContext.newPage();
    await fourthPage.goto('/gameplay/campaigns');
    const fourthAdmission = await joinCampaignSession(fourthPage, {
      ...fourthIdentity,
      campaignId,
      matchId: created.matchId,
      role: 'guest',
      roomCode: created.roomCode,
    });

    // The production socket names the tactical-cap control more precisely
    // than the task shorthand: campaign-tactical-seats-full.
    expectRefused(
      fourthAdmission,
      created.matchId,
      'campaign-tactical-seats-full',
    );

    const participants = readDurableParticipants({
      fixture,
      campaignId,
      matchId: created.matchId,
    });
    // The read orders by (seat, participant_id); the ids are random, so
    // the two player rows sort lexicographically, not in join order.
    const playerIds = [
      playerOneIdentity.playerId,
      playerTwoIdentity.playerId,
    ].sort();
    expect(participants).toEqual([
      {
        campaign_id: campaignId,
        session_id: created.matchId,
        participant_id: gmIdentity.playerId,
        seat: 'gm',
        revoked_at: null,
      },
      ...playerIds.map((participantId) => ({
        campaign_id: campaignId,
        session_id: created.matchId,
        participant_id: participantId,
        seat: 'player',
        revoked_at: null,
      })),
    ]);

    writeEvidenceBundle({
      fixture,
      campaignId,
      matchId: created.matchId,
      admissions: [
        { label: 'gm', identity: gmIdentity, result: gmAdmission },
        {
          label: 'p1',
          identity: playerOneIdentity,
          result: playerOneAdmission,
        },
        {
          label: 'p2',
          identity: playerTwoIdentity,
          result: playerTwoAdmission,
        },
        {
          label: 'fourth-control',
          identity: fourthIdentity,
          result: fourthAdmission,
        },
      ],
      participants,
    });
  } finally {
    await fourthContext?.close();
    if (fourthIdentity) {
      await deleteIdentity(request, fixture.runId, fourthIdentity.id);
    }
    await fixture.cleanup();
  }
});

function findFixtureClient<T extends { readonly role: string }>(
  clients: readonly T[],
  role: T['role'],
): T {
  const client = clients.find((candidate) => candidate.role === role);
  if (!client) throw new Error(`Fixture client missing role=${role}`);
  return client;
}

async function readFixtureIdentity(
  page: Page,
  fixtureSessionId: string,
): Promise<IFixtureIdentity> {
  const value = await page.evaluate((sessionId) => {
    const raw = sessionStorage.getItem(
      `mekstation.coopCampaign.token.${sessionId}`,
    );
    return raw === null ? null : (JSON.parse(raw) as unknown);
  }, fixtureSessionId);
  if (!isRecord(value)) {
    throw new Error(
      `Fixture wire token missing for session=${fixtureSessionId}`,
    );
  }
  const playerId = readString(value, 'playerId');
  const wireToken = readString(value, 'wireToken');
  const displayName = readString(value, 'displayName');
  if (!playerId || !wireToken || !displayName) {
    throw new Error('Fixture stored token has an invalid production shape');
  }
  return { playerId, wireToken, displayName };
}

async function createCampaignSession(
  page: Page,
  gm: IFixtureIdentity,
  campaignId: string,
): Promise<ICreatedCampaignSession> {
  const value = await page.evaluate(
    async ({ campaignId: id, gmIdentity }) => {
      const response = await fetch('/api/multiplayer/matches', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gmIdentity.wireToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
          displayName: gmIdentity.displayName,
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
      return {
        status: response.status,
        body: (await response.json().catch(() => null)) as unknown,
      };
    },
    { campaignId, gmIdentity: gm },
  );
  expect(value.status, JSON.stringify(value.body)).toBe(201);
  if (!isRecord(value.body)) {
    throw new Error('Campaign session creation response was not an object');
  }
  const matchId = readString(value.body, 'matchId');
  const meta = isRecord(value.body.meta) ? value.body.meta : null;
  const roomCode =
    readString(value.body, 'roomCode') ??
    (meta === null ? null : readString(meta, 'roomCode'));
  if (!matchId || !roomCode) {
    throw new Error(
      'Campaign session creation response lacked matchId or roomCode',
    );
  }
  return { matchId, roomCode };
}

async function createDurableHostCampaign(page: Page): Promise<string> {
  // The production co-op create path persists the host campaign before it
  // registers the match. Reuse those real browser stores here because the
  // fixture's already-issued GM token cannot be re-minted through the
  // password form after P1/P2 have been seeded in the shared vault.
  await page.waitForFunction(
    () =>
      window.__ZUSTAND_STORES__?.campaign !== undefined &&
      window.__ZUSTAND_STORES__?.campaignPersistence !== undefined,
    { timeout: 15_000 },
  );
  const result = await page.evaluate(async () => {
    type CampaignStore = {
      readonly getState: () => {
        createCampaign: (
          name: string,
          factionId: string,
          config: { readonly startingFunds: number },
        ) => string;
      };
    };
    type CampaignPersistenceStore = {
      readonly getState: () => {
        saveCampaign: () => Promise<{ readonly status?: string }>;
      };
    };
    const stores = window.__ZUSTAND_STORES__ as {
      readonly campaign: CampaignStore;
      readonly campaignPersistence: CampaignPersistenceStore;
    };
    const campaignId = stores.campaign
      .getState()
      .createCampaign('GM Two Player Membership Smoke', 'mercenary', {
        startingFunds: 1_000_000,
      });
    const persisted = await stores.campaignPersistence
      .getState()
      .saveCampaign();
    return { campaignId, status: persisted.status ?? null };
  });
  expect(result.status).toBe('saved');
  return result.campaignId;
}

async function joinCampaignSession(
  page: Page,
  input: IFixtureIdentity & {
    readonly campaignId: string;
    readonly matchId: string;
    readonly role: 'host' | 'guest';
    readonly roomCode?: string;
  },
): Promise<IAdmissionAttempt> {
  return page.evaluate(async (args): Promise<IAdmissionAttempt> => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const parameters = new URLSearchParams({
      channel: 'campaign',
      matchId: args.matchId,
      playerId: args.playerId,
    });
    const url = `${protocol}//${window.location.host}/api/multiplayer/socket?${parameters.toString()}`;
    const protocols = [
      'mekstation.v1',
      `mekstation.token.${args.wireToken.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`,
    ];
    return new Promise<IAdmissionAttempt>((resolve) => {
      const frames: IWireFrame[] = [];
      let settled = false;
      const finish = (terminal: IAdmissionAttempt['terminal']): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve({ frames, terminal });
      };
      const socket = new WebSocket(url, protocols);
      const timeout = window.setTimeout(() => {
        socket.close();
        finish('timeout');
      }, 15_000);
      socket.addEventListener('open', () => {
        socket.send(
          JSON.stringify({
            kind: 'CampaignJoin',
            matchId: args.matchId,
            ts: new Date().toISOString(),
            playerId: args.playerId,
            role: args.role,
            token: args.wireToken,
            ...(args.roomCode ? { roomCode: args.roomCode } : {}),
          }),
        );
      });
      socket.addEventListener('message', (event) => {
        const parsed = parseWireFrameInPage(event.data);
        if (!parsed) return;
        frames.push(parsed);
        if (parsed.kind === 'CampaignSnapshot') {
          socket.close();
          finish('snapshot');
        }
        if (parsed.kind === 'Error') {
          socket.close();
          finish('refusal');
        }
      });
      socket.addEventListener('close', () => finish('closed'));
      socket.addEventListener('error', () => finish('closed'));
    });

    function parseWireFrameInPage(raw: unknown): IWireFrame | null {
      if (typeof raw !== 'string') return null;
      try {
        const value: unknown = JSON.parse(raw);
        if (typeof value !== 'object' || value === null) return null;
        const record = value as Record<string, unknown>;
        const event =
          typeof record.event === 'object' && record.event !== null
            ? (record.event as Record<string, unknown>)
            : null;
        const read = (source: Record<string, unknown>, key: string) => {
          const field = source[key];
          return typeof field === 'string' ? field : null;
        };
        const kind = read(record, 'kind');
        return kind
          ? {
              kind,
              matchId: read(record, 'matchId'),
              code: read(record, 'code'),
              reason: read(record, 'reason'),
              campaignId: event === null ? null : read(event, 'campaignId'),
              eventType: event === null ? null : read(event, 'type'),
            }
          : null;
      } catch {
        return null;
      }
    }
  }, input);
}

function expectAdmitted(
  result: IAdmissionAttempt,
  matchId: string,
  campaignId: string,
): void {
  expect(result.terminal).toBe('snapshot');
  expect(
    result.frames.some(
      (frame) =>
        frame.kind === 'CampaignSnapshot' &&
        frame.matchId === matchId &&
        frame.campaignId === campaignId &&
        frame.eventType === 'CampaignSnapshotPublished',
    ),
  ).toBe(true);
}

function expectRefused(
  result: IAdmissionAttempt,
  matchId: string,
  reason: string,
): void {
  expect(result.terminal).toBe('refusal');
  expect(
    result.frames.some(
      (frame) =>
        frame.kind === 'Error' &&
        frame.matchId === matchId &&
        frame.code === 'AUTH_REJECTED' &&
        frame.reason === reason,
    ),
  ).toBe(true);
  expect(result.frames.some((frame) => frame.kind === 'CampaignSnapshot')).toBe(
    false,
  );
}

function readDurableParticipants({
  fixture,
  campaignId,
  matchId,
}: {
  readonly fixture: Awaited<
    ReturnType<typeof createGmTwoPlayerCampaignFixture>
  >;
  readonly campaignId: string;
  readonly matchId: string;
}): readonly ICampaignParticipantRow[] {
  const evidence = fixture.openEvidence('app');
  try {
    const before = evidence.fileHash();
    const rows = evidence.select<ICampaignParticipantRow>(
      `SELECT campaign_id, session_id, participant_id, seat, revoked_at
         FROM campaign_session_participant
         WHERE campaign_id = ? AND session_id = ?
         ORDER BY seat, participant_id`,
      [campaignId, matchId],
    );
    expect(evidence.fileHash()).toBe(before);
    return rows;
  } finally {
    evidence.close();
  }
}

function writeEvidenceBundle({
  fixture,
  campaignId,
  matchId,
  admissions,
  participants,
}: {
  readonly fixture: Awaited<
    ReturnType<typeof createGmTwoPlayerCampaignFixture>
  >;
  readonly campaignId: string;
  readonly matchId: string;
  readonly admissions: readonly {
    readonly label: string;
    readonly identity: IFixtureIdentity;
    readonly result: IAdmissionAttempt;
  }[];
  readonly participants: readonly ICampaignParticipantRow[];
}): void {
  const bundle = fixture.openEvidenceBundle();
  for (const admission of admissions) {
    bundle.write(
      'socket-transcript',
      admission.label,
      'admission.json',
      JSON.stringify({
        participantId: admission.identity.playerId,
        terminal: admission.result.terminal,
        frames: admission.result.frames,
      }),
    );
  }
  bundle.write(
    'durable-rows',
    'membership',
    'participants.json',
    JSON.stringify(participants),
  );
  const manifestPath = bundle.finalize(
    {
      campaignId,
      matchId,
      node: process.version,
      runId: fixture.runId,
    },
    { allowIncompleteEvidence: true },
  );
  expect(manifestPath).toContain(fixture.runId);
}

async function seedFourthIdentity(
  request: APIRequestContext,
  runId: string,
): Promise<ISeededFourthIdentity> {
  const password = `GM2P-fourth-${runId.slice(0, 16)}!`;
  const seeded = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
    data: { displayName: `GM2P fourth ${runId}`, password, runId },
  });
  expect(seeded.status(), await seeded.text()).toBe(201);
  const identity = (await seeded.json()) as unknown;
  if (!isRecord(identity))
    throw new Error('Fourth identity response was invalid');
  const id = readString(identity, 'id');
  const displayName = readString(identity, 'displayName');
  if (!id || !displayName)
    throw new Error('Fourth identity response lacked data');

  const tokenResponse = await request.post('/api/multiplayer/auth/token', {
    data: { displayName, password },
  });
  expect(tokenResponse.status(), await tokenResponse.text()).toBe(200);
  const token = (await tokenResponse.json()) as unknown;
  if (!isRecord(token)) throw new Error('Fourth token response was invalid');
  const playerId = readString(token, 'playerId');
  const wireToken = readString(token, 'token');
  if (!playerId || !wireToken)
    throw new Error('Fourth token response lacked data');
  return { id, displayName, playerId, wireToken };
}

async function deleteIdentity(
  request: APIRequestContext,
  runId: string,
  id: string,
): Promise<void> {
  const response = await request.delete('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
    data: { ids: [id], runId },
  });
  expect(response.status(), await response.text()).toBe(200);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const field = value[key];
  return typeof field === 'string' ? field : null;
}
