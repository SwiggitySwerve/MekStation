/** Real authenticated routes, journal checkpoint and cold SQLite reads for K15. */
import type { NextApiRequest, NextApiResponse } from 'next';

import Database from 'better-sqlite3';
import { createMocks } from 'node-mocks-http';
import path from 'node:path';

import type { ICampaignEncounterLauncherService } from '@/lib/campaign/encounter/launchCampaignEncounter';
import type { IMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { _resetRateLimitBucketsForTests } from '@/lib/api/security';
import {
  campaignLaunchHeadPorts,
  resolveCampaignLaunchHead,
} from '@/lib/campaign/authority/campaignLaunchHead';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { getCoopRuntimeSessionByMatch } from '@/lib/campaign/coop/coopRuntimeSession';
import { resolveMissingUnitMaxStates } from '@/lib/campaign/maxState/unitMaxStateResolver';
import { readyCanonicalCatalog } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import {
  openRouteFixture,
  post,
} from '@/lib/multiplayer/server/__tests__/coopMissionCreate.harness';
import { launchMissionFromPage } from '@/pages-modules/gameplay/campaigns/missionLaunchPage.launch';
import campaignHandler from '@/pages/api/campaigns/[id]';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { EncounterRepository } from '@/services/encounter/EncounterRepository';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

let mockEncounterService: ICampaignEncounterLauncherService;
jest.mock('@/services/encounter/EncounterService', () => ({
  ...jest.requireActual<typeof import('@/services/encounter/EncounterService')>(
    '@/services/encounter/EncounterService',
  ),
  getEncounterService: () => mockEncounterService,
}));
jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => ({
  ...jest.requireActual<
    typeof import('@/lib/campaign/coop/coopRuntimeSession')
  >('@/lib/campaign/coop/coopRuntimeSession'),
  getCoopRuntimeSessionByMatch: jest.fn(),
}));
jest.mock('@/lib/campaign/readiness/canonicalCatalogAdmission', () => ({
  ...jest.requireActual<
    typeof import('@/lib/campaign/readiness/canonicalCatalogAdmission')
  >('@/lib/campaign/readiness/canonicalCatalogAdmission'),
  fetchCanonicalCatalogSnapshot: async () =>
    readyCanonicalCatalog(['atlas-as7-d', 'marauder-mad-3r']),
}));

function json(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('K15 durable mission launch checkpoint', () => {
  it.each([
    'double click',
    'lost remote response',
    'checkpoint conflict',
  ] as const)(
    'records exactly one encounter after %s and a cold read',
    async (fault) => {
      const fixture = await openRouteFixture();
      const catalogFetch = globalThis.fetch;
      resetCampaignStore();
      useCampaignPersistenceStore.getState().reset();
      const repository = new EncounterRepository();
      const launched = jest.fn(async (id: string) =>
        repository.linkGameSession(id, `session:${id}`),
      );
      mockEncounterService = {
        createEncounter: repository.createEncounter,
        updateEncounter: repository.updateEncounter,
        setPlayerForce: (id) => ({ success: true, id }),
        launchEncounter: launched,
        getEncounter: repository.getEncounterById,
      };
      const id = fixture.entry.campaignId;
      const missionId = 'mission-1';
      const store = useCampaignStore();
      const initial = readCampaign(id);
      if (initial.kind !== 'ok') throw new Error('fixture has no campaign');
      const session = createHostCoopSession('ABC234', fixture.entry.matchId);
      storeCoopCampaignToken({
        matchId: fixture.entry.matchId,
        ...fixture.host,
        displayName: 'Host',
      });
      const runtime = {
        campaignId: id,
        matchId: fixture.entry.matchId,
        host: fixture.entry.host,
      };
      jest
        .mocked(getCoopRuntimeSessionByMatch)
        .mockReturnValue(
          runtime as ReturnType<typeof getCoopRuntimeSessionByMatch>,
        );

      async function campaignRequest(method: 'GET' | 'PUT', body?: unknown) {
        _resetRateLimitBucketsForTests();
        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method,
          query: { id },
          headers: { authorization: `Bearer ${fixture.host.wireToken}` },
        });
        req.body = body;
        await campaignHandler(req, res);
        return json(res.statusCode, res._getJSONData());
      }
      let lost = false;
      let conflicted = false;
      const remoteBodies: string[] = [];
      const checkpointBodies: unknown[] = [];
      globalThis.fetch = jest.fn(async (input, init) => {
        const url = String(input);
        if (url === '/api/multiplayer/matches') {
          remoteBodies.push(String(init?.body));
          const response = await post(
            JSON.parse(String(init?.body)),
            fixture.host,
          );
          if (fault === 'lost remote response' && !lost) {
            expect(response.status).toBe(201);
            lost = true;
            throw new Error('response lost after commit');
          }
          return json(response.status, response.body);
        }
        if (url.endsWith('/head'))
          return json(
            200,
            resolveCampaignLaunchHead(campaignLaunchHeadPorts(), id),
          );
        if (url.endsWith('/launch-authority'))
          return json(200, {
            kind: 'materialized',
            head: fixture.request.coopCampaign.expectedHead,
            slots: [],
          });
        if (url.startsWith('/api/encounters/')) {
          const encounter = repository.getEncounterById(
            decodeURIComponent(url.slice('/api/encounters/'.length)),
          );
          return json(encounter ? 200 : 404, { encounter });
        }
        if (url === `/api/campaigns/${id}`) {
          if (init?.method === 'PUT') {
            checkpointBodies.push(JSON.parse(String(init.body)));
            if (fault === 'checkpoint conflict' && !conflicted) {
              conflicted = true;
              const current = readCampaign(id);
              if (current.kind !== 'ok') throw new Error('missing source');
              const competing = await campaignRequest('PUT', {
                envelope: {
                  ...current.record,
                  version: current.record.version + 1,
                  body: { ...current.record.body, name: 'Concurrent update' },
                },
                baseVersion: current.record.version,
              });
              expect(competing.ok).toBe(true);
            }
            return campaignRequest('PUT', JSON.parse(String(init.body)));
          }
          return campaignRequest('GET');
        }
        return catalogFetch(input, init);
      });
      try {
        // The entry panel checkpoints the host session after campaign creation.
        const unitMaxStates = await resolveMissingUnitMaxStates(
          initial.record.body.rosterProjection?.units ?? [],
          {},
        );
        const seeded = await campaignRequest('PUT', {
          envelope: {
            ...initial.record,
            version: initial.record.version + 1,
            body: {
              ...initial.record.body,
              coopSession: session,
              unitMaxStates,
            },
          },
          baseVersion: initial.record.version,
        });
        expect(seeded.ok).toBe(true);
        expect(
          await useCampaignPersistenceStore.getState().loadCampaign(id),
        ).toBe(true);
        const loaded = store.getState().campaign;
        if (!loaded) throw new Error('client campaign not loaded');
        store.setState({ campaign: { ...loaded, coopSession: session } });
        const campaign = store.getState().campaign;
        if (!campaign) throw new Error('missing host campaign');
        const force = campaign.forces.get('force-host');
        const otherForce = campaign.forces.get('force-guest');
        if (!force || !otherForce) throw new Error('missing fixture forces');
        const input = {
          campaign,
          campaignKey: id,
          missionKey: missionId,
          matchId: fixture.entry.matchId,
          localForce: force,
          localPlayerId: fixture.host.playerId,
          localChoice: 'deploy' as const,
          otherRecord: {
            matchId: fixture.entry.matchId,
            missionId,
            playerId: fixture.guest.playerId,
            role: 'guest' as const,
            choice: 'deploy' as const,
            force: otherForce,
          },
          readinessProjection: {
            canLaunch: true,
          } as IMissionReadinessProjection,
          router: { push: jest.fn(async () => true) },
          store,
          setLaunchError: jest.fn(),
          setIsLaunching: jest.fn(),
        };
        await Promise.all([
          launchMissionFromPage(input),
          launchMissionFromPage(input),
        ]);
        if (fault !== 'double click') {
          expect(input.router.push).not.toHaveBeenCalled();
          if (fault === 'checkpoint conflict')
            expect(input.setLaunchError).toHaveBeenLastCalledWith(
              expect.stringContaining('Resync and retry'),
            );
          await launchMissionFromPage(input);
        }
        expect(input.router.push).toHaveBeenCalledTimes(1);
        expect(launched).toHaveBeenCalledTimes(1);
        expect(remoteBodies).toHaveLength(
          fault === 'lost remote response' ? 2 : 1,
        );
        if (remoteBodies.length === 2)
          expect(remoteBodies[1]).toBe(remoteBodies[0]);
        const encounters = repository.getAllEncounters();
        expect(encounters).toHaveLength(1);
        const cold = new Database(path.join(fixture.root, 'campaign.db'), {
          readonly: true,
        });
        try {
          const row = cold
            .prepare('SELECT payload FROM campaigns WHERE id = ?')
            .get(id) as { payload: string };
          const record = JSON.parse(row.payload) as SerializedCampaign;
          const mission = record.body.missions.find(
            ([key]) => key === missionId,
          )?.[1];
          expect(
            mission?.scenarioIds.filter(
              (candidate) => candidate === encounters[0].id,
            ),
          ).toEqual([encounters[0].id]);
          if (fault === 'checkpoint conflict')
            expect(record.body.name).toBe('Concurrent update');
        } finally {
          cold.close();
        }
        const hostCampaign = store.getState().campaign;
        if (!hostCampaign) throw new Error('missing saved campaign');
        // A new owner has no transient attempt: the durable link must suffice.
        await launchMissionFromPage({
          ...input,
          campaign: hostCampaign,
          store: { ...store },
        });
        expect(repository.getAllEncounters()).toHaveLength(1);
        expect(launched).toHaveBeenCalledTimes(1);
        expect(remoteBodies).toHaveLength(
          fault === 'lost remote response' ? 2 : 1,
        );
        const guestWrites = checkpointBodies.length;
        const guest = {
          ...hostCampaign,
          coopSession: createGuestCoopSession(fixture.entry.matchId, 'ABC234'),
        };
        store.setState({ campaign: guest });
        const guestRouter = { push: jest.fn(async () => true) };
        await launchMissionFromPage({
          ...input,
          campaign: guest,
          router: guestRouter,
        });
        expect(guestRouter.push).toHaveBeenCalledWith(
          expect.stringContaining(encounters[0].id),
        );
        expect(checkpointBodies).toHaveLength(guestWrites);
        expect(launched).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.fetch = catalogFetch;
        resetCampaignStore();
        useCampaignRosterStore.getState().reset();
        useCampaignPersistenceStore.getState().reset();
        await fixture.close();
      }
    },
    30_000,
  );
});
