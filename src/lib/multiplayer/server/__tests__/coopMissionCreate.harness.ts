import type { NextApiRequest, NextApiResponse } from 'next';

import Database from 'better-sqlite3';
import { createMocks } from 'node-mocks-http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { _resetRateLimitBucketsForTests } from '@/lib/api/security';
import handler from '@/pages/api/multiplayer/matches';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { ICampaignHostRegistryEntry } from '../CampaignHostRegistry';
import type { IFixtureContribution } from './coopMissionCreate.fixture';

import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '../CampaignHostRegistry';
import { DurableMatchStore } from '../DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '../getDefaultMatchStore';
import { _resetDefaultPlayerStore } from '../InMemoryPlayerStore';
import {
  _resetMatchHostRegistry,
  getMatchHostRegistry,
} from '../MatchHostRegistry';
import {
  acceptFixtureParticipation,
  fixtureIdentity,
  missionRequest,
  seedCoopCampaign,
  vesselRequest,
} from './coopMissionCreate.fixture';

export const MissionMetaSchema = z.object({
  matchId: z.string(),
  hostPlayerId: z.string(),
  playerIds: z.array(z.string()),
  status: z.enum(['lobby', 'active', 'completed']),
  unitBootstrap: z.array(
    z.object({
      unitId: z.string(),
      unitRef: z.string(),
      side: z.enum(['player', 'opponent']),
      ownerPlayerId: z.string().optional(),
    }),
  ),
  coopMission: z.object({
    campaignId: z.string(),
    sessionId: z.string(),
    missionId: z.string(),
    acceptedHead: z.object({
      branchId: z.string(),
      revision: z.number().int(),
      effectiveGeneration: z.number().int(),
    }),
    requestFingerprint: z.string().min(1),
  }),
});

export const MissionReplySchema = z.object({
  matchId: z.string(),
  missionMatchId: z.string(),
  meta: MissionMetaSchema,
});

export async function post(
  body: unknown,
  identity: ReturnType<typeof fixtureIdentity>,
): Promise<{
  readonly status: number;
  readonly headers: ReturnType<NextApiResponse['getHeaders']>;
  readonly body: unknown;
}> {
  _resetRateLimitBucketsForTests();
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    headers: {
      host: '127.0.0.1:3639',
      authorization: `Bearer ${identity.wireToken}`,
    },
  });
  req.body = body;
  await handler(req, res);
  const json: unknown = res._getJSONData();
  return { status: res.statusCode, headers: res.getHeaders(), body: json };
}

export function countDurableRows(dbPath: string): {
  readonly matches: number;
  readonly events: number;
  readonly receipts: number;
} {
  const db = new Database(dbPath, { readonly: true });
  const count = z.object({ n: z.number().int().nonnegative() });
  try {
    return {
      matches: count.parse(
        db.prepare('SELECT COUNT(*) AS n FROM mp_matches').get(),
      ).n,
      events: count.parse(
        db.prepare('SELECT COUNT(*) AS n FROM mp_match_events').get(),
      ).n,
      receipts: count.parse(
        db.prepare('SELECT COUNT(*) AS n FROM mp_command_receipts').get(),
      ).n,
    };
  } finally {
    db.close();
  }
}

export async function openRouteFixture(): Promise<{
  readonly root: string;
  readonly matchPath: string;
  readonly store: DurableMatchStore;
  readonly host: ReturnType<typeof fixtureIdentity>;
  readonly guest: ReturnType<typeof fixtureIdentity>;
  readonly entry: ICampaignHostRegistryEntry;
  readonly contributors: readonly IFixtureContribution[];
  readonly close: () => Promise<void>;
  readonly request: ReturnType<typeof missionRequest>;
  readonly census: () => ReturnType<typeof countDurableRows>;
  readonly vessel: ReturnType<typeof vesselRequest>;
}> {
  const root = path.join(tmpdir(), `p1a-route-${randomUUID()}`);
  const campaignPath = path.join(root, 'campaign.db');
  const matchPath = path.join(root, 'matches.db');
  await mkdir(root);
  resetSQLiteService();
  _resetDefaultMatchStore();
  _resetCampaignHostRegistry();
  _resetMatchHostRegistry();
  _resetDefaultPlayerStore();
  getSQLiteService({ path: campaignPath }).initialize();
  const store = new DurableMatchStore({ path: matchPath });
  _setDefaultMatchStoreForTests(store);
  const host = fixtureIdentity();
  const guest = fixtureIdentity();
  const originalFetch = globalThis.fetch;
  const catalogFetch = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const pathname = new URL(url, 'http://localhost').pathname;
      assert.ok(pathname.startsWith('/data/'));
      const data: unknown = JSON.parse(
        await readFile(
          path.join(process.cwd(), 'public', decodeURIComponent(pathname)),
          'utf8',
        ),
      );
      return { ...(await originalFetch(input, init)), json: async () => data };
    });
  const close = async () => {
    for (const meta of await store.listMatches()) {
      await getMatchHostRegistry().closeMatch(meta.matchId);
    }
    _resetMatchHostRegistry();
    _resetCampaignHostRegistry();
    _resetDefaultMatchStore();
    _resetDefaultPlayerStore();
    store.close();
    resetSQLiteService();
    catalogFetch.mockRestore();
    await rm(root, { recursive: true });
  };
  try {
    const state = await seedCoopCampaign(`p1a-${randomUUID()}`);
    const vessel = await post(vesselRequest(state), host);
    assert.equal(vessel.status, 201, JSON.stringify(vessel));
    const { matchId } = z.object({ matchId: z.string() }).parse(vessel.body);
    const entry = getCampaignHostRegistry().get(matchId);
    assert.ok(entry);
    const contributors = [
      {
        playerId: host.playerId,
        forceId: 'force-host',
        choice: 'deploy' as const,
      },
      {
        playerId: guest.playerId,
        forceId: 'force-guest',
        choice: 'deploy' as const,
      },
    ];
    acceptFixtureParticipation(entry, contributors);
    return {
      root,
      matchPath,
      store,
      host,
      guest,
      entry,
      contributors,
      close,
      request: missionRequest(entry),
      census: () => countDurableRows(matchPath),
      vessel: vesselRequest(state),
    };
  } catch (error) {
    await close();
    throw error;
  }
}
