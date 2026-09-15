/**
 * The world the privacy rows argue about (R2.authority-live rows R, D).
 *
 * CO3's two-process topology plus the one thing its drive did not need:
 * more than one seat. Four principals are minted here - a GM, two
 * guests who take the two tactical seats, and a stranger who takes none
 * - and three campaign sockets are opened against the SOURCE process so
 * the server, not this file, decides who is admitted and as what.
 *
 * Split from the spec for CO3's own reason: the spec should read as the
 * argument it makes, and getting to the point where that argument can be
 * made is a separate concern. Everything here is PRECONDITION - the
 * flag-free cutover, the seats, the shared file. Every row that could
 * fail for a product reason stays in the spec.
 *
 * The assertions that DO live here are the ones whose failure means the
 * world was never built: a marker that did not say `journal`, a match
 * that opened no invite, a socket the server refused. A row that ran
 * against a half-built world would report a product verdict about a
 * harness fault.
 */

import { expect, type APIRequestContext } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  campaignEnvelope,
  campaignIdentity,
  SEED_BALANCE,
} from './campaignJournalDrive';
import {
  openCampaignSyncSocket,
  type ICampaignSyncClient,
} from './campaignJournalSocket';
import {
  cutoverCampaignToJournalAuthority,
  readHighestSequence,
  readMarker,
  resolveServerDatabase,
  runAuthorityCli,
  sourceServerEnv,
  startSourceServer,
  type ISourceServer,
} from './campaignJournalTwoProcess';

/** The e2e opt-in key, bound to the real constant by the `flags` read. */
export const E2E_ARM_KEY = 'MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY';

/** One self-issued principal. */
export interface IPrincipal {
  readonly wireToken: string;
  readonly playerId: string;
}

export interface IPrivacyTopology {
  readonly databasePath: string;
  /** The env the source runs under; needed again to restart it. */
  readonly env: NodeJS.ProcessEnv;
  readonly source: ISourceServer;
  readonly multiplayerDir: string;
  readonly matchId: string;
  readonly roomCode: string;
  /** The journal head the co-op host registration seeded. */
  readonly seededSequence: number;
  readonly gm: IPrincipal;
  readonly guestA: IPrincipal;
  readonly guestB: IPrincipal;
  /** A valid token holding no seat at all. */
  readonly stranger: IPrincipal;
  readonly gmSocket: ICampaignSyncClient;
  readonly guestASocket: ICampaignSyncClient;
  readonly guestBSocket: ICampaignSyncClient;
  /** Every socket opened, for teardown. */
  readonly sockets: ICampaignSyncClient[];
}

/**
 * Build the world: two processes on one file, a campaign on journal
 * authority with no flag touched, and three bound seats.
 */
export async function bootPrivacyTopology(input: {
  readonly request: APIRequestContext;
  readonly replicaOrigin: string;
  readonly campaignId: string;
}): Promise<IPrivacyTopology> {
  const { request, replicaOrigin, campaignId } = input;

  // The gate is shut, read out of a real Node process that loaded the
  // production modules rather than asserted from a comment.
  const flagsBefore = runAuthorityCli('flags');
  expect(flagsBefore.e2eEnvKey).toBe(E2E_ARM_KEY);
  expect(flagsBefore.cutoverFlag).toBe(false);
  expect(flagsBefore.effective).toBe(false);
  expect(process.env[E2E_ARM_KEY]).toBeUndefined();

  // The campaign is created through the REPLICA process, so the source
  // below sees a campaign it never created.
  const created = await request.put(
    `${replicaOrigin}/api/campaigns/${campaignId}`,
    { data: { envelope: campaignEnvelope(campaignId, 0), baseVersion: 0 } },
  );
  expect(
    created.ok(),
    `create failed: ${created.status()} ${await created.text()}`,
  ).toBe(true);

  // Resolved from the row the server just wrote, never assumed: a wrong
  // path opens an empty file and every later assertion passes for the
  // wrong reason.
  const databasePath = resolveServerDatabase(campaignId);
  // Behavioural proof the gate is shut - the create path writes a marker
  // and a genesis only when it opens, and neither exists.
  expect(readMarker(databasePath, campaignId)).toBeNull();
  expect(readHighestSequence(databasePath, campaignId)).toBe(-1);

  const multiplayerDir = await mkdtemp(
    path.join(tmpdir(), 'mekstation-live-mp-'),
  );
  const env = sourceServerEnv(
    databasePath,
    // Deliberately NOT shared: only the campaign journal is.
    path.join(multiplayerDir, 'multiplayer-matches.db'),
    E2E_ARM_KEY,
  );
  // Falsifiable rather than asserted: the arm is absent from the env
  // object actually handed to `spawn`.
  expect(env[E2E_ARM_KEY]).toBeUndefined();
  const source = await startSourceServer(request, env);
  expect(source.origin).not.toBe(replicaOrigin);

  const gm = await campaignIdentity(
    'identity-live-gm',
    'Live GM',
    'LIVE-GMGM-0000-0001',
  );
  const guestA = await campaignIdentity(
    'identity-live-guest-a',
    'Live Guest A',
    'LIVE-GSTA-0000-0002',
  );
  const guestB = await campaignIdentity(
    'identity-live-guest-b',
    'Live Guest B',
    'LIVE-GSTB-0000-0003',
  );
  const stranger = await campaignIdentity(
    'identity-live-stranger',
    'Live Stranger',
    'LIVE-STRG-0000-0004',
  );

  // The one shipped path that binds a durable seat: co-op HOST match
  // creation, where `commitCoopCampaignAuthority` binds the host as GM
  // through the creation checkpoint before the 201.
  const match = await request.post(`${source.origin}/api/multiplayer/matches`, {
    headers: { Authorization: `Bearer ${gm.wireToken}` },
    data: {
      config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
      displayName: 'Live GM',
      layout: '1v1',
      coopCampaign: {
        campaignId,
        arbitrationMode: 'host-review',
        state: {
          campaignId,
          day: 0,
          balance: SEED_BALANCE,
          rosterUnits: {},
          forceUnits: {},
          pilots: {},
          contracts: {},
          factionStanding: {},
          salvagePool: 0,
        },
      },
    },
  });
  expect(match.status(), await match.text()).toBe(201);
  const createdMatch = (await match.json()) as {
    matchId: string;
    roomCode?: string;
  };
  const { matchId } = createdMatch;
  const roomCode = createdMatch.roomCode;
  // The guests below are admitted by the LIVE invite, so a match that
  // opened without one would refuse them for a reason unrelated to the
  // rows under test.
  expect(roomCode, 'a co-op host match must open an invite').toBeTruthy();
  if (roomCode === undefined) throw new Error('unreachable');

  // Registering the co-op host seeded the stream; the campaign is still
  // NOT on journal authority, because authority is the marker.
  const seededSequence = readHighestSequence(databasePath, campaignId);
  expect(seededSequence).toBe(0);

  // The cutover, with no flag anywhere. `path: 'marker'` states which
  // arm ran: the stream was already there, so this appended nothing.
  const cutover = cutoverCampaignToJournalAuthority(databasePath, campaignId);
  expect(cutover.marker?.state).toBe('journal');
  expect(cutover.path).toBe('marker');
  expect(cutover.cutoverFlag).toBe(false);
  expect(cutover.effective).toBe(false);
  expect(cutover.e2eEnvValue).toBeNull();
  expect(readHighestSequence(databasePath, campaignId)).toBe(seededSequence);

  const sockets: ICampaignSyncClient[] = [];
  const open = async (
    who: IPrincipal,
    role: 'host' | 'guest',
  ): Promise<ICampaignSyncClient> => {
    const client = await openCampaignSyncSocket({
      origin: source.origin,
      matchId,
      playerId: who.playerId,
      wireToken: who.wireToken,
      role,
      ...(role === 'guest' ? { roomCode } : {}),
    });
    sockets.push(client);
    // `snapshot` is the server's admission. A refusal here means the
    // world was not built, so it fails as setup rather than surfacing
    // later as a mysterious empty feed.
    expect(client.terminal, JSON.stringify(client.frames)).toBe('snapshot');
    return client;
  };

  return {
    databasePath,
    env,
    source,
    multiplayerDir,
    matchId,
    roomCode,
    seededSequence,
    gm,
    guestA,
    guestB,
    stranger,
    gmSocket: await open(gm, 'host'),
    guestASocket: await open(guestA, 'guest'),
    guestBSocket: await open(guestB, 'guest'),
    sockets,
  };
}
