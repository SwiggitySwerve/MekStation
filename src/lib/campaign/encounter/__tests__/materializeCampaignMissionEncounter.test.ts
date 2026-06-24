import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import {
  disableDiagnosticCapture,
  enableDiagnosticCapture,
  getCapturedDiagnostics,
} from '@/utils/logger';

type FetchCall = {
  readonly url: string;
  readonly init?: RequestInit;
};

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as { readonly url?: string }).url ?? String(input);
}

function requestBody(call: FetchCall): unknown {
  return JSON.parse(String(call.init?.body ?? '{}')) as unknown;
}

function makeCampaign(
  scenarioIds: readonly string[] = [],
): Pick<ICampaign, 'id' | 'name' | 'missions'> {
  const mission = createContract({
    id: 'contract-1',
    name: 'Border Raid',
    employerId: 'davion',
    targetId: 'liao',
    status: MissionStatus.ACTIVE,
    scenarioIds: [...scenarioIds],
    description: 'Raid across the border.',
  });
  return {
    id: 'campaign-1',
    name: 'Gray Dawn',
    missions: new Map([[mission.id, mission]]),
  };
}

function makeRoster(): readonly IRosterUnitProjection[] {
  return [
    {
      unitId: 'wizard-light-1',
      unitName: 'Light Mech',
      chassisVariant: 'Light Mech',
      readiness: 'Ready',
    },
  ];
}

describe('materializeCampaignMissionEncounter', () => {
  beforeEach(() => {
    enableDiagnosticCapture();
  });

  afterEach(() => {
    disableDiagnosticCapture(true);
  });

  it('reuses an existing mission scenario encounter when it still exists', async () => {
    const calls: FetchCall[] = [];
    const fetchImpl = jest.fn(async (input, init) => {
      calls.push({ url: requestUrl(input), init });
      return jsonResponse({ encounter: { id: 'enc-existing' } });
    }) as unknown as typeof fetch;

    const result = await materializeCampaignMissionEncounter({
      campaign: makeCampaign(['enc-existing']),
      missionId: 'contract-1',
      rosterUnits: makeRoster(),
      fetchImpl,
    });

    expect(result).toEqual({
      encounterId: 'enc-existing',
      reused: true,
      missionScenarioIds: ['enc-existing'],
    });
    expect(calls.map((call) => call.url)).toEqual([
      '/api/encounters/enc-existing',
    ]);
    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: 'campaign-encounter-materializer',
          event: 'campaign_mission_encounter_reused',
          level: 'info',
          entityIds: expect.objectContaining({
            campaignId: 'campaign-1',
            missionId: 'contract-1',
            encounterId: 'enc-existing',
          }),
        }),
      ]),
    );
  });

  it('creates assigned forces and a configured encounter for an organic mission', async () => {
    const calls: FetchCall[] = [];
    let forceCount = 0;
    const fetchImpl = jest.fn(async (input, init) => {
      const call = { url: requestUrl(input), init };
      calls.push(call);
      if (call.url === '/api/forces' && init?.method === 'POST') {
        forceCount += 1;
        return jsonResponse(
          {
            success: true,
            id: `force-${forceCount}`,
            force: {
              id: `force-${forceCount}`,
              assignments: [{ id: `assignment-${forceCount}` }],
            },
          },
          201,
        );
      }
      if (call.url.startsWith('/api/forces/assignments/')) {
        return jsonResponse({ success: true });
      }
      if (call.url === '/api/encounters' && init?.method === 'POST') {
        return jsonResponse(
          {
            success: true,
            id: 'enc-organic',
            encounter: { id: 'enc-organic' },
          },
          201,
        );
      }
      if (call.url === '/api/encounters/enc-organic') {
        return jsonResponse({ success: true });
      }
      if (
        call.url === '/api/encounters/enc-organic/player-force' ||
        call.url === '/api/encounters/enc-organic/opponent-force'
      ) {
        return jsonResponse({ success: true });
      }
      throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${call.url}`);
    }) as unknown as typeof fetch;

    const result = await materializeCampaignMissionEncounter({
      campaign: makeCampaign(),
      missionId: 'contract-1',
      rosterUnits: makeRoster(),
      fetchImpl,
    });

    expect(result).toEqual({
      encounterId: 'enc-organic',
      reused: false,
      missionScenarioIds: ['enc-organic'],
    });
    expect(
      calls.map((call) => `${call.init?.method ?? 'GET'} ${call.url}`),
    ).toEqual([
      'POST /api/forces',
      'PUT /api/forces/assignments/assignment-1',
      'POST /api/forces',
      'PUT /api/forces/assignments/assignment-2',
      'POST /api/encounters',
      'PATCH /api/encounters/enc-organic',
      'PUT /api/encounters/enc-organic/player-force',
      'PUT /api/encounters/enc-organic/opponent-force',
    ]);
    expect(requestBody(calls[1])).toEqual({ unitId: 'atlas-as7-d' });
    expect(requestBody(calls[3])).toEqual({ unitId: 'marauder-mad-3r' });
    expect(requestBody(calls[6])).toEqual({ forceId: 'force-1' });
    expect(requestBody(calls[7])).toEqual({ forceId: 'force-2' });
    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: 'campaign-encounter-materializer',
          event: 'campaign_mission_encounter_materialized',
          level: 'info',
          entityIds: expect.objectContaining({
            campaignId: 'campaign-1',
            missionId: 'contract-1',
            encounterId: 'enc-organic',
            playerForceId: 'force-1',
            opponentForceId: 'force-2',
          }),
          metadata: expect.objectContaining({
            rosterUnitCount: 1,
            missionScenarioIds: ['enc-organic'],
          }),
        }),
      ]),
    );
  });

  it('captures a diagnostic failure when an API call rejects the launch', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ success: false, error: 'Force creation rejected' }, 400),
    ) as unknown as typeof fetch;

    await expect(
      materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeRoster(),
        fetchImpl,
      }),
    ).rejects.toThrow('Force creation rejected');

    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: 'campaign-encounter-materializer',
          event: 'campaign_mission_encounter_failed',
          level: 'error',
          entityIds: expect.objectContaining({
            campaignId: 'campaign-1',
            missionId: 'contract-1',
          }),
          metadata: expect.objectContaining({
            rosterUnitCount: 1,
          }),
          error: expect.objectContaining({
            message: 'Force creation rejected',
          }),
        }),
      ]),
    );
  });
});
