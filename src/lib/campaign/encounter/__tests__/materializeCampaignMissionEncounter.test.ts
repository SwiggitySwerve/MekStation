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

const PLAYER_UNIT_REFS = [
  'locust-lct-1v',
  'hunchback-hbk-4g',
  'marauder-mad-3r',
  'atlas-as7-d',
] as const;

function makeRoster(count = 1): readonly IRosterUnitProjection[] {
  return PLAYER_UNIT_REFS.slice(0, count).map((unitRef, index) => ({
    unitId: `wizard-unit-${index + 1}`,
    unitName: `Wizard Unit ${index + 1}`,
    chassisVariant: `Variant ${index + 1}`,
    pilotId: `pilot-${index + 1}`,
    unitRef,
    readiness: 'Ready',
  }));
}

function makeRosterWithoutUnitRef(): readonly IRosterUnitProjection[] {
  return [
    {
      unitId: 'wizard-legacy-1',
      unitName: 'Legacy Placeholder',
      chassisVariant: 'Placeholder',
      pilotId: 'pilot-legacy',
      readiness: 'Ready',
    },
  ];
}

function makeDestroyedRoster(): readonly IRosterUnitProjection[] {
  return [
    {
      unitId: 'unit-destroyed',
      unitName: 'Destroyed Mech',
      chassisVariant: 'LCT-1V',
      pilotId: 'pilot-destroyed',
      unitRef: 'locust-lct-1v',
      readiness: 'Destroyed',
    },
  ];
}

function makeForceAssignments(forceCount: number): readonly { id: string }[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `assignment-${forceCount}-${index + 1}`,
  }));
}

function makeMaterializationFetch(
  calls: FetchCall[],
  encounterId = 'enc-organic',
): typeof fetch {
  let forceCount = 0;
  return jest.fn(async (input, init) => {
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
            assignments: makeForceAssignments(forceCount),
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
          id: encounterId,
          encounter: { id: encounterId },
        },
        201,
      );
    }
    if (call.url === `/api/encounters/${encounterId}`) {
      return jsonResponse({ success: true });
    }
    if (
      call.url === `/api/encounters/${encounterId}/player-force` ||
      call.url === `/api/encounters/${encounterId}/opponent-force`
    ) {
      return jsonResponse({ success: true });
    }
    throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${call.url}`);
  }) as unknown as typeof fetch;
}

function assignmentBodies(calls: readonly FetchCall[]): readonly unknown[] {
  return calls
    .filter((call) => call.url.startsWith('/api/forces/assignments/'))
    .map(requestBody);
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
        expect.objectContaining({
          service: 'command-screen',
          event: 'command_commit_succeeded',
          metadata: expect.objectContaining({
            domain: 'mission-readiness',
            commandId: 'mission-readiness.launch.campaign-1.contract-1',
            persistenceRef: 'encounter:enc-existing',
            userVisibleStateChanged: true,
          }),
        }),
      ]),
    );
  });

  it('creates assigned forces and a configured encounter for an organic mission', async () => {
    const calls: FetchCall[] = [];
    const fetchImpl = makeMaterializationFetch(calls);

    const result = await materializeCampaignMissionEncounter({
      campaign: makeCampaign(),
      missionId: 'contract-1',
      rosterUnits: makeRoster(4),
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
      'PUT /api/forces/assignments/assignment-1-1',
      'PUT /api/forces/assignments/assignment-1-2',
      'PUT /api/forces/assignments/assignment-1-3',
      'PUT /api/forces/assignments/assignment-1-4',
      'POST /api/forces',
      'PUT /api/forces/assignments/assignment-2-1',
      'PUT /api/forces/assignments/assignment-2-2',
      'PUT /api/forces/assignments/assignment-2-3',
      'PUT /api/forces/assignments/assignment-2-4',
      'POST /api/encounters',
      'PATCH /api/encounters/enc-organic',
      'PUT /api/encounters/enc-organic/player-force',
      'PUT /api/encounters/enc-organic/opponent-force',
    ]);
    expect(assignmentBodies(calls).slice(0, 4)).toEqual([
      { unitId: 'locust-lct-1v', pilotId: 'pilot-1' },
      { unitId: 'hunchback-hbk-4g', pilotId: 'pilot-2' },
      { unitId: 'marauder-mad-3r', pilotId: 'pilot-3' },
      { unitId: 'atlas-as7-d', pilotId: 'pilot-4' },
    ]);
    expect(calls.at(-2)).toBeDefined();
    expect(requestBody(calls.at(-2)!)).toEqual({ forceId: 'force-1' });
    expect(requestBody(calls.at(-1)!)).toEqual({ forceId: 'force-2' });
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
            rosterUnitCount: 4,
            missionScenarioIds: ['enc-organic'],
          }),
        }),
        expect.objectContaining({
          service: 'command-screen',
          event: 'command_commit_succeeded',
          metadata: expect.objectContaining({
            domain: 'mission-readiness',
            commandId: 'mission-readiness.launch.campaign-1.contract-1',
            ledgerRef: 'mission:contract-1:encounter:enc-organic',
            persistenceRef: 'encounter:enc-organic',
            userVisibleStateChanged: true,
          }),
        }),
      ]),
    );
  });

  it.each([1, 2, 3, 4])(
    'creates an opponent force with the same unit count as %i selected player units',
    async (unitCount) => {
      const calls: FetchCall[] = [];
      const fetchImpl = makeMaterializationFetch(calls);

      await materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeRoster(unitCount),
        fetchImpl,
      });

      const bodies = assignmentBodies(calls);
      const opponentBodies = bodies.slice(unitCount);
      expect(opponentBodies).toHaveLength(unitCount);
      expect(
        opponentBodies.every(
          (body) =>
            typeof body === 'object' &&
            body !== null &&
            'unitId' in body &&
            !('pilotId' in body),
        ),
      ).toBe(true);
    },
  );

  it('selects the same deterministic opponent units for the same campaign mission seed', async () => {
    const firstCalls: FetchCall[] = [];
    const secondCalls: FetchCall[] = [];

    await materializeCampaignMissionEncounter({
      campaign: makeCampaign(),
      missionId: 'contract-1',
      rosterUnits: makeRoster(4),
      fetchImpl: makeMaterializationFetch(firstCalls, 'enc-first'),
    });
    await materializeCampaignMissionEncounter({
      campaign: makeCampaign(),
      missionId: 'contract-1',
      rosterUnits: makeRoster(4),
      fetchImpl: makeMaterializationFetch(secondCalls, 'enc-second'),
    });

    expect(assignmentBodies(firstCalls).slice(4)).toEqual(
      assignmentBodies(secondCalls).slice(4),
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
        expect.objectContaining({
          service: 'command-screen',
          event: 'command_commit_rejected',
          level: 'error',
          metadata: expect.objectContaining({
            domain: 'mission-readiness',
            reasonCodes: ['campaign-mission-encounter-failed'],
            userVisibleStateChanged: false,
          }),
        }),
      ]),
    );
  });

  it('rejects empty or blocked launch rosters before stock force assignment', async () => {
    const fetchImpl = jest.fn() as unknown as typeof fetch;

    await expect(
      materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: [],
        fetchImpl,
      }),
    ).rejects.toThrow('refusing stock fallback');
    await expect(
      materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeDestroyedRoster(),
        fetchImpl,
      }),
    ).rejects.toThrow('resolve readiness before materialization');

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getCapturedDiagnostics()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: 'campaign-encounter-materializer',
          event: 'campaign_mission_encounter_failed',
          level: 'error',
          metadata: expect.objectContaining({
            rosterUnitCount: 0,
          }),
        }),
        expect.objectContaining({
          service: 'campaign-encounter-materializer',
          event: 'campaign_mission_encounter_failed',
          level: 'error',
          metadata: expect.objectContaining({
            rosterUnitCount: 1,
          }),
        }),
        expect.objectContaining({
          service: 'command-screen',
          event: 'command_malformed_payload_rejected',
          metadata: expect.objectContaining({
            payloadKind: 'mission-launch-roster',
            reasonCodes: ['empty-roster'],
            userVisibleStateChanged: false,
          }),
        }),
        expect.objectContaining({
          service: 'command-screen',
          event: 'command_invalid_action_rejected',
          metadata: expect.objectContaining({
            reasonCodes: ['destroyed-roster'],
            userVisibleStateChanged: false,
          }),
        }),
      ]),
    );
  });

  it('rejects selected roster units with no canonical unitRef before any API call', async () => {
    const fetchImpl = jest.fn() as unknown as typeof fetch;

    await expect(
      materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeRosterWithoutUnitRef(),
        fetchImpl,
      }),
    ).rejects.toThrow(
      'Roster unit Legacy Placeholder has no canonical unitRef; cannot launch.',
    );

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
