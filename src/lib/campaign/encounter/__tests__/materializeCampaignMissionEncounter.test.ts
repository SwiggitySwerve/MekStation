import type { OwnedForceMaterializationResult } from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import type { CampaignArtifactUseConsult } from '@/lib/interventions/GmCampaignArtifactUseGuard';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  CampaignOwnedForceStaleError,
  materializeCampaignMissionEncounter,
} from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import { readyCanonicalCatalog } from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
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

const readyCatalog = readyCanonicalCatalog([...PLAYER_UNIT_REFS]);

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
      const call = { url: requestUrl(input), init };
      calls.push(call);
      if (call.url === '/api/encounters/enc-existing') {
        return jsonResponse({ encounter: { id: 'enc-existing' } });
      }
      if (call.url === '/api/encounters/enc-existing/validate') {
        return jsonResponse({
          validation: { valid: true, errors: [], warnings: [] },
        });
      }
      throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${call.url}`);
    }) as unknown as typeof fetch;

    const result = await materializeCampaignMissionEncounter({
      campaign: makeCampaign(['enc-existing']),
      missionId: 'contract-1',
      rosterUnits: makeRoster(),
      catalog: readyCatalog,
      fetchImpl,
    });

    expect(result).toEqual({
      encounterId: 'enc-existing',
      reused: true,
      missionScenarioIds: ['enc-existing'],
    });
    expect(calls.map((call) => call.url)).toEqual([
      '/api/encounters/enc-existing',
      '/api/encounters/enc-existing/validate',
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

  it('materializes a new encounter when an existing scenario is not launch-ready', async () => {
    const calls: FetchCall[] = [];
    const materializeFetch = makeMaterializationFetch(calls, 'enc-replacement');
    const fetchImpl = jest.fn(async (input, init) => {
      const call = { url: requestUrl(input), init };
      if (call.url === '/api/encounters/enc-existing') {
        calls.push(call);
        return jsonResponse({ encounter: { id: 'enc-existing' } });
      }
      if (call.url === '/api/encounters/enc-existing/validate') {
        calls.push(call);
        return jsonResponse({
          validation: {
            valid: false,
            errors: ['Player force must be selected'],
            warnings: [],
          },
        });
      }
      return materializeFetch(input, init);
    }) as unknown as typeof fetch;

    const result = await materializeCampaignMissionEncounter({
      campaign: makeCampaign(['enc-existing']),
      missionId: 'contract-1',
      rosterUnits: makeRoster(),
      catalog: readyCatalog,
      fetchImpl,
    });

    expect(result).toEqual({
      encounterId: 'enc-replacement',
      reused: false,
      missionScenarioIds: ['enc-replacement', 'enc-existing'],
    });
    expect(calls.slice(0, 2).map((call) => call.url)).toEqual([
      '/api/encounters/enc-existing',
      '/api/encounters/enc-existing/validate',
    ]);
    expect(
      calls.map((call) => `${call.init?.method ?? 'GET'} ${call.url}`),
    ).toEqual(expect.arrayContaining(['POST /api/encounters']));
  });

  it.each([
    ['missing arrays', { valid: false }],
    ['non-string errors', { valid: true, errors: [42], warnings: [] }],
    [
      'inconsistent valid result',
      {
        valid: true,
        errors: ['Player force must be selected'],
        warnings: [],
      },
    ],
  ])('fails closed when validation has %s', async (_label, validation) => {
    const calls: FetchCall[] = [];
    const fetchImpl = jest.fn(async (input, init) => {
      const call = { url: requestUrl(input), init };
      calls.push(call);
      if (call.url === '/api/encounters/enc-existing') {
        return jsonResponse({ encounter: { id: 'enc-existing' } });
      }
      if (call.url === '/api/encounters/enc-existing/validate') {
        return jsonResponse({ validation });
      }
      throw new Error(`Unexpected fetch: ${init?.method ?? 'GET'} ${call.url}`);
    }) as unknown as typeof fetch;

    await expect(
      materializeCampaignMissionEncounter({
        campaign: makeCampaign(['enc-existing']),
        missionId: 'contract-1',
        rosterUnits: makeRoster(),
        catalog: readyCatalog,
        fetchImpl,
      }),
    ).rejects.toThrow('Failed to validate existing encounter');
    expect(calls.map((call) => call.url)).toEqual([
      '/api/encounters/enc-existing',
      '/api/encounters/enc-existing/validate',
    ]);
  });

  it('creates assigned forces and a configured encounter for an organic mission', async () => {
    const calls: FetchCall[] = [];
    const fetchImpl = makeMaterializationFetch(calls);

    const result = await materializeCampaignMissionEncounter({
      campaign: makeCampaign(),
      missionId: 'contract-1',
      rosterUnits: makeRoster(4),
      catalog: readyCatalog,
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
        catalog: readyCatalog,
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
      catalog: readyCatalog,
      fetchImpl: makeMaterializationFetch(firstCalls, 'enc-first'),
    });
    await materializeCampaignMissionEncounter({
      campaign: makeCampaign(),
      missionId: 'contract-1',
      rosterUnits: makeRoster(4),
      catalog: readyCatalog,
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
        catalog: readyCatalog,
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
        catalog: readyCatalog,
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
        catalog: readyCatalog,
        fetchImpl,
      }),
    ).rejects.toThrow(
      'Legacy Placeholder has no canonical record; recreate the campaign or edit the unit in Mech Bay before launch.',
    );

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  describe('authoritative owned forces (umbrella 10.3)', () => {
    const ACTIVE_HEAD = {
      branchId: 'root',
      revision: 7,
      effectiveGeneration: 1,
    } as const;

    /** A refusal shaped exactly as `materializeOwnedPlayerForces` returns it. */
    function staleOwnedForces(
      code: 'STALE_REVISION' | 'STALE_OWNERSHIP',
      reason: string,
    ): OwnedForceMaterializationResult {
      return {
        kind: 'refused',
        code,
        reason,
        activeHead: ACTIVE_HEAD,
        resyncAction: EXPECTED_HEAD_RESYNC_ACTION,
      };
    }

    function ownedSlot(
      slot: 1 | 2,
      forceId: string,
      unitRefs: readonly string[],
    ) {
      return {
        slot,
        forceId,
        ownerParticipantId: `campaign-player-slot:${slot}`,
        units: unitRefs.map((unitRef, index) => ({
          reference: {
            unitId: `${forceId}-unit-${index + 1}`,
            unitRef,
            unitSource: 'canonical' as const,
            designation: `Slot ${slot} Unit ${index + 1}`,
            adoptedAt: '3025-07-04T00:00:00.000Z',
          },
          pilotRef: `pilot-${slot}-${index + 1}`,
        })),
      };
    }

    it('refuses a launch against a stale revision before creating anything', async () => {
      const calls: FetchCall[] = [];
      const fetchImpl = makeMaterializationFetch(calls);

      await expect(
        materializeCampaignMissionEncounter({
          campaign: makeCampaign(),
          missionId: 'contract-1',
          rosterUnits: makeRoster(2),
          catalog: readyCatalog,
          fetchImpl,
          ownedForces: staleOwnedForces(
            'STALE_REVISION',
            'launch head is stale (STALE_REVISION)',
          ),
        }),
      ).rejects.toThrow(/STALE_REVISION/);

      // The gate is the ordering, not the message: a refusal that let the
      // encounter exist first would be a report rather than a gate.
      expect(calls).toHaveLength(0);
    });

    it('names the current head and the recovery action on the refusal', async () => {
      const fetchImpl = makeMaterializationFetch([]);

      const error = await materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeRoster(2),
        catalog: readyCatalog,
        fetchImpl,
        ownedForces: staleOwnedForces(
          'STALE_OWNERSHIP',
          'force force-a is held by pid_other for mission contract-1',
        ),
      }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CampaignOwnedForceStaleError);
      const stale = error as CampaignOwnedForceStaleError;
      expect(stale.code).toBe('STALE_OWNERSHIP');
      expect(stale.activeHead).toEqual(ACTIVE_HEAD);
      expect(stale.resyncAction).toBe(EXPECTED_HEAD_RESYNC_ACTION);
    });

    it('fields both tactical slots on one player side, in slot order', async () => {
      const calls: FetchCall[] = [];
      const fetchImpl = makeMaterializationFetch(calls);

      const result = await materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeRoster(2),
        catalog: readyCatalog,
        fetchImpl,
        ownedForces: {
          kind: 'materialized',
          head: ACTIVE_HEAD,
          slots: [
            ownedSlot(1, 'force-alpha', ['locust-lct-1v', 'hunchback-hbk-4g']),
            ownedSlot(2, 'force-bravo', ['marauder-mad-3r']),
          ],
        },
      });

      expect(result.encounterId).toBe('enc-organic');
      // Slot 1's units precede slot 2's, and slot 2's unit is present at
      // all - materializing the player side from slot 1's ownership alone
      // would drop the second player from their own mission.
      const playerAssignments = assignmentBodies(calls).slice(0, 3);
      expect(playerAssignments).toEqual([
        { unitId: 'locust-lct-1v', pilotId: 'pilot-1-1' },
        { unitId: 'hunchback-hbk-4g', pilotId: 'pilot-1-2' },
        { unitId: 'marauder-mad-3r', pilotId: 'pilot-2-1' },
      ]);
    });

    it('sizes the OpFor against both slots rather than one', async () => {
      const calls: FetchCall[] = [];
      const fetchImpl = makeMaterializationFetch(calls);

      await materializeCampaignMissionEncounter({
        campaign: makeCampaign(),
        missionId: 'contract-1',
        rosterUnits: makeRoster(1),
        catalog: readyCatalog,
        fetchImpl,
        ownedForces: {
          kind: 'materialized',
          head: ACTIVE_HEAD,
          slots: [
            ownedSlot(1, 'force-alpha', ['locust-lct-1v', 'hunchback-hbk-4g']),
            ownedSlot(2, 'force-bravo', ['marauder-mad-3r']),
          ],
        },
      });

      // Three player units means three OpFor units. Sizing off the caller's
      // `rosterUnits` (length 1 here) would field a lopsided battle.
      expect(assignmentBodies(calls)).toHaveLength(6);
    });
  });

  describe('invalidated campaign artifacts (16.4-b)', () => {
    const SCN = 'scn-contract-1-3025-06-15-force-alpha';
    const ENC = 'enc-scn-contract-1-3025-06-15-force-alpha';
    const REFUSAL = {
      kind: 'invalidated-artifact' as const,
      artifactKind: 'scenario' as const,
      artifactId: SCN,
      branchId: 'cand-use-1',
      revision: 3,
    };

    function refuse(
      kind: 'scenario' | 'encounter',
      id: string,
    ): CampaignArtifactUseConsult {
      return (artifact) =>
        artifact.artifactKind === kind && artifact.artifactId === id
          ? {
              kind: 'invalidated-artifact',
              artifactKind: kind,
              artifactId: id,
              branchId: 'cand-use-1',
              revision: 3,
            }
          : null;
    }

    it('launching an invalidated scenario draft appends nothing and answers invalidated-artifact', async () => {
      const calls: FetchCall[] = [];
      const result = await materializeCampaignMissionEncounter({
        campaign: makeCampaign([SCN]),
        missionId: 'contract-1',
        rosterUnits: makeRoster(),
        catalog: readyCatalog,
        fetchImpl: makeMaterializationFetch(calls),
        consultArtifactUse: refuse('scenario', SCN),
      });
      expect(result).toStrictEqual(REFUSAL);
      expect(calls).toHaveLength(0);
    });

    it('materializing an invalidated encounter appends nothing and answers invalidated-artifact', async () => {
      const calls: FetchCall[] = [];
      const result = await materializeCampaignMissionEncounter({
        campaign: makeCampaign([ENC]),
        missionId: 'contract-1',
        rosterUnits: makeRoster(),
        catalog: readyCatalog,
        fetchImpl: makeMaterializationFetch(calls),
        consultArtifactUse: refuse('encounter', ENC),
      });
      expect(result).toStrictEqual({
        kind: 'invalidated-artifact',
        artifactKind: 'encounter',
        artifactId: ENC,
        branchId: 'cand-use-1',
        revision: 3,
      });
      expect(calls).toHaveLength(0);
    });

    it('a valid scenario id still launches', async () => {
      const calls: FetchCall[] = [];
      // The mission's scenario exists but is not launch-ready, so the door
      // materializes a replacement: a consult answering null must leave that
      // path untouched.
      const materializeFetch = makeMaterializationFetch(calls, 'enc-organic');
      const fetchImpl = jest.fn(async (input, init) => {
        const call = { url: requestUrl(input), init };
        if (call.url === `/api/encounters/${SCN}`) {
          calls.push(call);
          return jsonResponse({ encounter: { id: SCN } });
        }
        if (call.url === `/api/encounters/${SCN}/validate`) {
          calls.push(call);
          return jsonResponse({
            validation: {
              valid: false,
              errors: ['Player force must be selected'],
              warnings: [],
            },
          });
        }
        return materializeFetch(input, init);
      }) as unknown as typeof fetch;
      const result = await materializeCampaignMissionEncounter({
        campaign: makeCampaign([SCN]),
        missionId: 'contract-1',
        rosterUnits: makeRoster(),
        catalog: readyCatalog,
        fetchImpl,
        consultArtifactUse: () => null,
      });
      expect(result).toEqual({
        encounterId: 'enc-organic',
        reused: false,
        missionScenarioIds: ['enc-organic', SCN],
      });
      expect(calls.length).toBeGreaterThan(0);
    });

    it('a valid encounter id still materializes', async () => {
      const calls: FetchCall[] = [];
      const fetchImpl = jest.fn(async (input, init) => {
        const call = { url: requestUrl(input), init };
        calls.push(call);
        if (call.url === `/api/encounters/${ENC}`) {
          return jsonResponse({ encounter: { id: ENC } });
        }
        if (call.url === `/api/encounters/${ENC}/validate`) {
          return jsonResponse({
            validation: { valid: true, errors: [], warnings: [] },
          });
        }
        throw new Error(
          `Unexpected fetch: ${init?.method ?? 'GET'} ${call.url}`,
        );
      }) as unknown as typeof fetch;
      const result = await materializeCampaignMissionEncounter({
        campaign: makeCampaign([ENC]),
        missionId: 'contract-1',
        rosterUnits: makeRoster(),
        catalog: readyCatalog,
        fetchImpl,
        consultArtifactUse: () => null,
      });
      expect(result).toEqual({
        encounterId: ENC,
        reused: true,
        missionScenarioIds: [ENC],
      });
      expect(calls.length).toBeGreaterThan(0);
    });
  });
});
