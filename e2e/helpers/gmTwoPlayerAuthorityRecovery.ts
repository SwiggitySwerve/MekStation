/**
 * Drive for E2E-01 / E2E-02 authority recovery.
 *
 * WHY the death trigger is a match-channel AdvancePhase: the armed
 * process-exit-after-commit lever fires only in
 * ServerMatchHostPublication after appendCommandBatch. A campaign
 * AdvanceDay writes the in-memory campaign store and never reaches it.
 * The campaign matchId is the session scope (finding #72).
 *
 * WHY waitForRelaunch reads the first post-boot 200: server.js awaits
 * bootstrapMultiplayerServer before listen, so that status is already
 * downstream of host recovery.
 */

import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { createGmTwoPlayerCampaignFixture } from '../fixtures/gmTwoPlayerCampaign';
import { armScopedFault } from './gmTwoPlayerMatchFlow';

export const RECOVERY_CAMPAIGN_NAME = 'GM two-player recovery';

type Fixture = Awaited<ReturnType<typeof createGmTwoPlayerCampaignFixture>>;
type Role = Fixture['clients'][number]['role'];

export interface IRecoveryIdentity {
  readonly playerId: string;
  readonly wireToken: string;
  readonly displayName: string;
}

export interface IRecoverySession {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly matchId: string;
  readonly roomCode: string;
}

export interface IRecoveryClient {
  readonly page: Page;
  readonly identity: IRecoveryIdentity;
}

export interface IRecoveryDrive {
  readonly fixture: Fixture;
  readonly session: IRecoverySession;
  readonly gm: IRecoveryClient;
  readonly playerOne: IRecoveryClient;
  readonly playerTwo: IRecoveryClient;
}

export async function openRecoverableCampaign(input: {
  readonly browser: import('@playwright/test').Browser;
  readonly request: APIRequestContext;
  readonly baseURL: string;
}): Promise<IRecoveryDrive> {
  const fixture = await createGmTwoPlayerCampaignFixture(input);
  try {
    const gm = await clientOf(fixture, 'future-gm');
    const playerOne = await clientOf(fixture, 'future-player-1');
    const playerTwo = await clientOf(fixture, 'future-player-2');
    const campaignId = await createSavedCampaign(gm.page);
    const created = await postCampaignMatch(gm.page, gm.identity, campaignId);
    const session: IRecoverySession = {
      campaignId,
      campaignName: RECOVERY_CAMPAIGN_NAME,
      matchId: created.matchId,
      roomCode: created.roomCode,
    };
    await joinUntilSnapshot(gm, session, 'host');
    await joinUntilSnapshot(playerOne, session, 'guest');
    await joinUntilSnapshot(playerTwo, session, 'guest');
    return { fixture, session, gm, playerOne, playerTwo };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

/** Click Ready when the DOM has that door; otherwise leave checkpoint claims. */
export async function markPlayersReadyIfVisible(
  drive: IRecoveryDrive,
): Promise<void> {
  for (const client of [drive.playerOne, drive.playerTwo]) {
    const ready = client.page.getByRole('button', { name: 'Ready' });
    if ((await ready.count()) === 0) continue;
    if (!(await ready.first().isVisible())) continue;
    await ready.first().click();
  }
}

/**
 * Open the match channel, fill the empty 1v1 seat with AI, launch, so
 * the next AdvancePhase is a real appendCommandBatch on this matchId.
 */
export async function prepareHostDeathTrigger(
  drive: IRecoveryDrive,
): Promise<void> {
  await sendMatchIntents(drive.gm, drive.session, [
    { kind: 'SetReady', slotId: 'alpha-1', ready: true },
    { kind: 'SetAiSlot', slotId: 'bravo-1' },
    { kind: 'LaunchMatch' },
  ]);
}

export async function fireHostDeath(
  drive: IRecoveryDrive,
  request: APIRequestContext,
): Promise<void> {
  await armScopedFault(
    request,
    'process-exit-after-commit',
    drive.session.matchId,
  );
  await sendMatchIntents(drive.gm, drive.session, [
    { kind: 'AdvancePhase' },
  ]).catch(() => undefined);
  await waitForRelaunch(request);
}

export async function waitForRelaunch(
  request: APIRequestContext,
): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          return (await request.get('/api/campaigns')).status();
        } catch {
          return 0;
        }
      },
      { timeout: 90_000 },
    )
    .toBe(200);
}

export async function reloadAll(drive: IRecoveryDrive): Promise<void> {
  for (const client of [drive.gm, drive.playerOne, drive.playerTwo]) {
    await client.page.reload({ waitUntil: 'domcontentloaded' });
  }
}

async function clientOf(
  fixture: Fixture,
  role: Role,
): Promise<IRecoveryClient> {
  const found = fixture.clients.find((candidate) => candidate.role === role);
  if (!found) throw new Error(`Fixture client missing role=${role}`);
  return {
    page: found.page,
    identity: await readIdentity(found.page, fixture.session.id),
  };
}

async function readIdentity(
  page: Page,
  sessionId: string,
): Promise<IRecoveryIdentity> {
  const value = await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mekstation.coopCampaign.token.${id}`);
    return raw === null ? null : JSON.parse(raw);
  }, sessionId);
  if (!isRecord(value)) throw new Error('Fixture wire identity missing');
  const playerId = stringField(value, 'playerId');
  const wireToken = stringField(value, 'wireToken');
  const displayName = stringField(value, 'displayName');
  if (!playerId || !wireToken || !displayName) {
    throw new Error('Fixture wire identity invalid');
  }
  return { playerId, wireToken, displayName };
}

async function createSavedCampaign(page: Page): Promise<string> {
  await page.waitForFunction(
    () =>
      window.__ZUSTAND_STORES__?.campaign !== undefined &&
      window.__ZUSTAND_STORES__?.campaignPersistence !== undefined,
    { timeout: 15_000 },
  );
  const result = await page.evaluate(async (name) => {
    const stores = window.__ZUSTAND_STORES__;
    if (!stores?.campaign || !stores.campaignPersistence) {
      throw new Error('Campaign stores unavailable');
    }
    const campaignId = stores.campaign
      .getState()
      .createCampaign(name, 'mercenary', { startingFunds: 1_000_000 });
    const saved = await stores.campaignPersistence.getState().saveCampaign();
    return { campaignId, status: saved.status };
  }, RECOVERY_CAMPAIGN_NAME);
  expect(result.status).toBe('saved');
  return result.campaignId;
}

async function postCampaignMatch(
  page: Page,
  gm: IRecoveryIdentity,
  campaignId: string,
): Promise<{ readonly matchId: string; readonly roomCode: string }> {
  const result = await page.evaluate(
    async ({ identity, id }) => {
      const response = await fetch('/api/multiplayer/matches', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.wireToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
          displayName: identity.displayName,
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
    { identity: gm, id: campaignId },
  );
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  if (!isRecord(result.body)) throw new Error('Match create body invalid');
  const matchId = stringField(result.body, 'matchId');
  const meta = isRecord(result.body.meta) ? result.body.meta : null;
  const roomCode =
    stringField(result.body, 'roomCode') ??
    (meta ? stringField(meta, 'roomCode') : null);
  if (!matchId || !roomCode) throw new Error('Match identifiers missing');
  return { matchId, roomCode };
}

async function joinUntilSnapshot(
  client: IRecoveryClient,
  session: IRecoverySession,
  role: 'host' | 'guest',
): Promise<void> {
  const admitted = await client.page.evaluate(
    async ({ identity, campaign, campaignRole }) =>
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
          `${protocol}//${location.host}/api/multiplayer/socket?${params}`,
          ['mekstation.v1', `mekstation.token.${token}`],
        );
        const timeout = window.setTimeout(() => {
          socket.close();
          resolve(false);
        }, 15_000);
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
          if (typeof message.data !== 'string') return;
          try {
            const frame = JSON.parse(message.data) as { kind?: string };
            if (frame.kind === 'CampaignSnapshot') {
              window.clearTimeout(timeout);
              socket.close();
              resolve(true);
            }
            if (frame.kind === 'Error') {
              window.clearTimeout(timeout);
              socket.close();
              resolve(false);
            }
          } catch {
            // Non-JSON frames are ignored.
          }
        });
      }),
    { identity: client.identity, campaign: session, campaignRole: role },
  );
  expect(admitted, `CampaignJoin refused for ${role}`).toBe(true);
}

async function sendMatchIntents(
  client: IRecoveryClient,
  session: IRecoverySession,
  intents: readonly Record<string, unknown>[],
): Promise<void> {
  await client.page.evaluate(
    async ({ identity, campaign, frames }) => {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = identity.wireToken
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const params = new URLSearchParams({
        matchId: campaign.matchId,
        playerId: identity.playerId,
      });
      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(
          `${protocol}//${location.host}/api/multiplayer/socket?${params}`,
          ['mekstation.v1', `mekstation.token.${token}`],
        );
        const timeout = window.setTimeout(() => {
          socket.close();
          reject(new Error('match-channel intent timed out'));
        }, 20_000);
        socket.addEventListener('open', () => {
          socket.send(
            JSON.stringify({
              kind: 'SessionJoin',
              matchId: campaign.matchId,
              ts: new Date().toISOString(),
              playerId: identity.playerId,
              token: identity.wireToken,
            }),
          );
          for (const intent of frames) {
            socket.send(
              JSON.stringify({
                kind: 'Intent',
                matchId: campaign.matchId,
                ts: new Date().toISOString(),
                playerId: identity.playerId,
                intentId: `${String(intent.kind)}-${Date.now()}`,
                intent,
              }),
            );
          }
          window.setTimeout(() => {
            window.clearTimeout(timeout);
            socket.close();
            resolve();
          }, 2_000);
        });
        socket.addEventListener('error', () => {
          window.clearTimeout(timeout);
          resolve();
        });
      });
    },
    { identity: client.identity, campaign: session, frames: intents },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const field = value[key];
  return typeof field === 'string' ? field : null;
}
