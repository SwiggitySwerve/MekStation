/**
 * Co-op mission launch route probes for the staged multiplayer/co-op work.
 *
 * Pins the current honest state: the launch page renders the picker, but
 * cannot launch until the other player's participation choice is synced
 * from co-op state. Task 5.3 will flip this once CO1 participation
 * broadcast wiring lands.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import type { IForce } from '@/types/campaign/Force';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  _resetCoopRuntimeSessions,
  publishCoopParticipation,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { createCampaign, createMission } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';

const mockRouterPush = jest.fn();
const mockLaunchCoopMission = jest.fn();
const mockMaterializeCampaignMissionEncounter = jest.fn();
const mockUpdateCampaign = jest.fn();
const mockSaveCampaign = jest.fn();
const mockPersistCampaign = jest.fn();
const mockLoadPersistedCampaign = jest.fn();
const mockMarkCampaignDirty = jest.fn();
const mockAddMission = jest.fn();
let mockRosterUnits: IRosterUnitProjection[] = [
  {
    unitId: 'atlas-as7-d',
    unitRef: 'atlas-as7-d',
    unitName: 'Atlas',
    chassisVariant: 'AS7-D',
    readiness: 'Ready' as const,
  },
];

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: { missionId: 'mission-alpha' },
    asPath: '/gameplay/campaigns/campaign-coop-1/missions/mission-alpha/launch',
  }),
}));

// The catalog the launch page fetches. Tests override the refs so a
// custom-source roster row can be present, absent, or foreign.
let mockCanonicalUnitRefs: string[] = ['atlas-as7-d'];
let mockCustomCombatRefs: string[] | undefined;

jest.mock('@/lib/campaign/readiness/canonicalCatalogAdmission', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/readiness/canonicalCatalogAdmission')
  >('@/lib/campaign/readiness/canonicalCatalogAdmission');
  return {
    ...actual,
    fetchCanonicalCatalogSnapshot: jest.fn(async () =>
      actual.readyCanonicalCatalog(mockCanonicalUnitRefs, mockCustomCombatRefs),
    ),
  };
});

// The co-op runtime roster is where the launch page reads each selected
// unit's persisted source identity from, so it has to be controllable.
const mockGetCoopRuntimeSessionByMatch = jest.fn();
jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => ({
  ...jest.requireActual<
    typeof import('@/lib/campaign/coop/coopRuntimeSession')
  >('@/lib/campaign/coop/coopRuntimeSession'),
  getCoopRuntimeSessionByMatch: (matchId: string) =>
    mockGetCoopRuntimeSessionByMatch(matchId),
}));

jest.mock('@/components/campaign/CampaignNavigation', () => ({
  CampaignNavigation: () => <nav data-testid="campaign-navigation" />,
}));

jest.mock('@/lib/campaign/coop/launchCoopMission', () => ({
  launchCoopMission: (...args: unknown[]) => mockLaunchCoopMission(...args),
}));

jest.mock(
  '@/lib/campaign/encounter/materializeCampaignMissionEncounter',
  () => ({
    materializeCampaignMissionEncounter: (...args: unknown[]) =>
      mockMaterializeCampaignMissionEncounter(...args),
  }),
);

jest.mock('@/stores/campaign/useCampaignPersistenceStore', () => {
  const persistenceState = {
    errorMessage: null,
    loadCampaign: (...args: unknown[]) => mockLoadPersistedCampaign(...args),
    markDirty: (...args: unknown[]) => mockMarkCampaignDirty(...args),
    saveCampaign: (...args: unknown[]) => mockPersistCampaign(...args),
    saveState: 'idle' as const,
    // The launch path clears any prior launch conflict before it reads
    // the server head and reports a fresh one on a stale refusal.
    launchConflict: null,
    clearLaunchConflict: () => {},
    reportLaunchConflict: () => {},
  };
  return {
    useCampaignPersistenceStore: Object.assign(
      (selector: (state: typeof persistenceState) => unknown) =>
        selector(persistenceState),
      { getState: () => persistenceState },
    ),
  };
});

const mockRosterState = {
  pilots: [],
  getUnitsWithReadiness: () => mockRosterUnits,
  getDeployableUnits: () => mockRosterUnits,
};
jest.mock('@/stores/campaign/useCampaignRosterStore', () => ({
  useCampaignRosterStore: Object.assign(
    (selector: (state: typeof mockRosterState) => unknown) =>
      selector(mockRosterState),
    { getState: () => mockRosterState },
  ),
}));

const mockGetCampaign = jest.fn();
const mockCampaignStoreApi = {
  getState: () => ({
    campaign: mockGetCampaign(),
    getCampaign: mockGetCampaign,
    updateCampaign: mockUpdateCampaign,
    saveCampaign: mockSaveCampaign,
    getMissionsStore: () => ({
      getState: () => ({
        addMission: mockAddMission,
      }),
    }),
  }),
  subscribe: () => () => {},
};

jest.mock('@/stores/campaign/useCampaignStore', () => ({
  useCampaignStore: () => mockCampaignStoreApi,
}));

import CoopMissionLaunchPage from '@/pages/gameplay/campaigns/[id]/missions/[missionId]/launch';

function makeForce(id: string, unitIds: string[]): IForce {
  return {
    id,
    name: `Force ${id}`,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  };
}

function makeSoloLaunchCampaign(name: string) {
  const mission = createMission({
    id: 'mission-alpha',
    name: 'Selected mission',
  });
  return {
    ...createCampaign(name, 'mercenary'),
    id: 'campaign-coop-1',
    missions: new Map([[mission.id, mission]]),
  };
}

describe('CoopMissionLaunchPage - staged participation sync', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockGetCampaign.mockReset();
    mockMaterializeCampaignMissionEncounter.mockReset().mockResolvedValue({
      encounterId: 'encounter-solo-1',
      reused: false,
      missionScenarioIds: ['encounter-solo-1'],
    });
    mockUpdateCampaign.mockReset();
    mockSaveCampaign.mockReset().mockReturnValue({ committed: true });
    mockPersistCampaign.mockReset().mockResolvedValue({
      status: 'saved',
      retriedConflict: false,
    });
    mockLoadPersistedCampaign.mockReset().mockResolvedValue(true);
    mockMarkCampaignDirty.mockReset();
    mockAddMission.mockReset();
    mockLaunchCoopMission.mockReset().mockReturnValue({
      ok: true,
      gameSessionId: 'game-session-coop-1',
      encounterId: 'encounter-coop-1',
      composition: {
        encounter: {},
        coopSeats: [],
        deployingPlayerIds: ['host', 'guest'],
        commandHqPlayerIds: [],
      },
    });
    mockRosterUnits = [
      {
        unitId: 'atlas-as7-d',
        unitRef: 'atlas-as7-d',
        unitName: 'Atlas',
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      },
    ];
    mockCanonicalUnitRefs = ['atlas-as7-d'];
    mockCustomCombatRefs = undefined;
    mockGetCoopRuntimeSessionByMatch.mockReset().mockReturnValue(undefined);
    _resetCoopRuntimeSessions();
  });

  it('keeps co-op launch gated while the other player choice is not synchronized', async () => {
    const campaign = {
      ...createCampaign('Co-op Launch Probe', 'mercenary'),
      id: 'campaign-coop-1',
      coopSession: createHostCoopSession('ABC234'),
    };
    mockGetCampaign.mockReturnValue(campaign);

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('coop-launch-mission')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Co-op Launch Probe - Selected mission'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('campaign-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('coop-launch-waiting')).toHaveTextContent(
      "Waiting for the other player's pick",
    );
    expect(screen.getByTestId('coop-launch-mission')).toBeDisabled();

    screen.getByTestId('coop-launch-mission').click();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('launches co-op through launchCoopMission once the other player choice is synchronized', async () => {
    const baseCampaign = createCampaign('Co-op Launch Ready', 'mercenary');
    const rootForce = makeForce(baseCampaign.rootForceId, ['u-host-1']);
    const campaign = {
      ...baseCampaign,
      id: 'campaign-coop-1',
      forces: new Map([[rootForce.id, rootForce]]),
      coopSession: createHostCoopSession('ABC234', 'match-launch-1'),
    };
    mockGetCampaign.mockReturnValue(campaign);
    publishCoopParticipation({
      matchId: 'match-launch-1',
      missionId: 'mission-alpha',
      playerId: 'guest',
      role: 'guest',
      choice: 'deploy',
      force: makeForce('force-guest', ['u-guest-1']),
    });

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    const launchButton = await screen.findByTestId('coop-launch-mission');
    await waitFor(() => {
      expect(launchButton).not.toBeDisabled();
    });

    await act(async () => {
      launchButton.click();
    });

    expect(mockLaunchCoopMission).toHaveBeenCalledTimes(1);
    const [baseEncounter, contributions] = mockLaunchCoopMission.mock
      .calls[0] as unknown[];
    expect(baseEncounter).toMatchObject({
      campaignMeta: {
        campaignId: 'campaign-coop-1',
        contractId: 'mission-alpha',
        scenarioId: 'mission-alpha',
      },
    });
    expect(contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'host',
          role: 'host',
          participation: 'deploy',
        }),
        expect.objectContaining({
          playerId: 'guest',
          role: 'guest',
          participation: 'deploy',
        }),
      ]),
    );
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/gameplay/encounters/encounter-coop-1?campaignId=campaign-coop-1&missionId=mission-alpha',
    );
  });

  it('materializes non-co-op mission launch before routing to the encounter', async () => {
    const campaign = makeSoloLaunchCampaign('Solo Launch Probe');
    mockGetCampaign.mockReturnValue(campaign);

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    expect(
      screen.getByText('Solo Launch Probe - Selected mission'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('mission-readiness-customize-atlas-as7-d'),
    ).toHaveAttribute(
      'href',
      expect.stringMatching(
        /\/customizer\/[^/?#]+\/structure\?[\s\S]*mode=campaign-refit[\s\S]*campaignId=campaign-coop-1[\s\S]*unitId=atlas-as7-d/,
      ),
    );

    await act(async () => {
      screen.getByTestId('launch-mission-direct').click();
    });

    expect(mockLaunchCoopMission).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockMaterializeCampaignMissionEncounter).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign,
          missionId: 'mission-alpha',
          rosterUnits: [
            expect.objectContaining({
              unitId: 'atlas-as7-d',
              unitRef: 'atlas-as7-d',
            }),
          ],
        }),
      );
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/encounters/encounter-solo-1?campaignId=campaign-coop-1&missionId=mission-alpha',
      );
    });
    expect(mockSaveCampaign).toHaveBeenCalledTimes(1);
    expect(mockPersistCampaign).toHaveBeenCalledTimes(1);
    expect(mockPersistCampaign.mock.invocationCallOrder[0]).toBeLessThan(
      mockRouterPush.mock.invocationCallOrder[0],
    );
  });

  it('keeps the launch page in place when the campaign checkpoint fails', async () => {
    const campaign = makeSoloLaunchCampaign('Solo Launch Persistence Failure');
    mockGetCampaign.mockReturnValue(campaign);
    mockPersistCampaign.mockResolvedValue({
      status: 'error',
      errorMessage: 'disk unavailable',
      retriedConflict: false,
    });

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    await act(async () => {
      screen.getByTestId('launch-mission-direct').click();
    });

    expect(await screen.findByTestId('mission-launch-error')).toHaveTextContent(
      'disk unavailable',
    );
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not attempt authoritative persistence when the local checkpoint fails', async () => {
    const campaign = makeSoloLaunchCampaign(
      'Solo Launch Local Persistence Failure',
    );
    mockGetCampaign.mockReturnValue(campaign);
    mockSaveCampaign.mockReturnValue({
      committed: false,
      reason: 'local checkpoint unavailable',
    });

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    await act(async () => {
      screen.getByTestId('launch-mission-direct').click();
    });

    expect(await screen.findByTestId('mission-launch-error')).toHaveTextContent(
      'local checkpoint unavailable',
    );
    expect(mockPersistCampaign).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it.each([
    {
      persistenceResult: {
        status: 'conflict',
        conflictServerRecord: {},
        retriedConflict: false,
      },
      expectedMessage: 'Resolve the save conflict before launching.',
      status: 'conflict',
    },
    {
      persistenceResult: { status: 'skipped', retriedConflict: false },
      expectedMessage: 'Campaign checkpoint was skipped.',
      status: 'skipped',
    },
  ])(
    'keeps the launch page in place for a $status authoritative checkpoint',
    async ({ persistenceResult, expectedMessage }) => {
      const campaign = makeSoloLaunchCampaign(
        'Solo Launch Incomplete Persistence',
      );
      mockGetCampaign.mockReturnValue(campaign);
      mockPersistCampaign.mockResolvedValue(persistenceResult);

      await act(async () => {
        render(<CoopMissionLaunchPage />);
      });

      await act(async () => {
        screen.getByTestId('launch-mission-direct').click();
      });

      expect(
        await screen.findByTestId('mission-launch-error'),
      ).toHaveTextContent(expectedMessage);
      expect(mockRouterPush).not.toHaveBeenCalled();
    },
  );

  it('blocks non-co-op mission launch when readiness projection has blockers', async () => {
    mockRosterUnits = [
      {
        unitId: 'unit-destroyed',
        unitName: 'Destroyed Locust',
        chassisVariant: 'LCT-1V',
        readiness: 'Destroyed',
      },
    ];
    const campaign = {
      ...createCampaign('Solo Blocked Probe', 'mercenary'),
      id: 'campaign-coop-1',
    };
    mockGetCampaign.mockReturnValue(campaign);

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    expect(screen.getByTestId('mission-readiness-panel')).toBeInTheDocument();
    expect(screen.getByTestId('mission-readiness-status')).toHaveTextContent(
      'Launch blocked',
    );
    expect(screen.getByTestId('launch-mission-direct')).toBeDisabled();

    await act(async () => {
      screen.getByTestId('launch-mission-direct').click();
    });

    expect(mockMaterializeCampaignMissionEncounter).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Co-op launch revalidates custom-source authority
//
// mission-contracts "Campaign launch requires an authoritative canonical
// source" / Scenario "Co-op launch revalidates authority": a missing,
// foreign or mislabelled custom-source reference SHALL reject before
// composition or encounter launch, and the client SHALL NOT synthesize
// source identity, force membership, construction authority, or a stock
// fallback.
// =============================================================================

interface ICoopRosterUnitFixture {
  readonly unitId: string;
  readonly designation: string;
  readonly unitRef: string;
  readonly unitSource: string;
}

/** A co-op runtime whose host projection carries the given roster rows. */
function coopRuntimeWithRoster(units: readonly ICoopRosterUnitFixture[]) {
  const rosterUnits = Object.fromEntries(
    units.map((unit) => [unit.unitId, unit]),
  );
  return { host: { getState: () => ({ rosterUnits }) } };
}

/**
 * An encounter launcher that records whether composition ever reached
 * the repository. A denied launch must leave every counter at zero.
 */
function spyLauncherService() {
  const created: string[] = [];
  const launched: string[] = [];
  const service = {
    createEncounter: (input: { readonly name: string }) => {
      created.push(input.name);
      return { success: true, id: 'repo-enc-coop-1' };
    },
    updateEncounter: () => ({ success: true, id: 'repo-enc-coop-1' }),
    setPlayerForce: () => ({ success: true, id: 'repo-enc-coop-1' }),
    launchEncounter: async (id: string) => {
      launched.push(id);
      return { success: true, id };
    },
    getEncounter: () => ({ gameSessionId: 'game-session-coop-1' }),
  };
  return { service, created, launched };
}

/**
 * Route the page's launch through the REAL `launchCoopMission` so the
 * shared admission guard actually runs, with the repository replaced by
 * a spy. Loaded lazily so the other suites keep the light mock.
 */
function useRealCoopLaunch(service: unknown): void {
  mockLaunchCoopMission.mockImplementation(async (...args: unknown[]) => {
    const { launchCoopMission } = jest.requireActual<
      typeof import('@/lib/campaign/coop/launchCoopMission')
    >('@/lib/campaign/coop/launchCoopMission');
    return launchCoopMission(
      args[0] as Parameters<typeof launchCoopMission>[0],
      args[1] as Parameters<typeof launchCoopMission>[1],
      service as Parameters<typeof launchCoopMission>[2],
      args[3] as Parameters<typeof launchCoopMission>[3],
    );
  });
}

describe('CoopMissionLaunchPage - custom-source authority revalidation', () => {
  const HOST_UNIT = 'u-host-1';
  const GUEST_UNIT = 'u-guest-1';
  const CUSTOM_REF = 'custom-coop-atlas';

  function customRoster(unitRef: string, unitSource = 'custom') {
    return coopRuntimeWithRoster([
      { unitId: HOST_UNIT, designation: 'Saved Atlas', unitRef, unitSource },
      {
        unitId: GUEST_UNIT,
        designation: 'Atlas',
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
      },
    ]);
  }

  async function renderAndLaunchCoop(): Promise<void> {
    const baseCampaign = createCampaign('Co-op Custom Authority', 'mercenary');
    const rootForce = makeForce(baseCampaign.rootForceId, [HOST_UNIT]);
    mockGetCampaign.mockReturnValue({
      ...baseCampaign,
      id: 'campaign-coop-1',
      forces: new Map([[rootForce.id, rootForce]]),
      coopSession: createHostCoopSession('ABC234', 'match-launch-1'),
    });
    publishCoopParticipation({
      matchId: 'match-launch-1',
      missionId: 'mission-alpha',
      playerId: 'guest',
      role: 'guest',
      choice: 'deploy',
      force: makeForce('force-guest', [GUEST_UNIT]),
    });

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });
    const launchButton = await screen.findByTestId('coop-launch-mission');
    await waitFor(() => {
      expect(launchButton).not.toBeDisabled();
    });
    await act(async () => {
      launchButton.click();
    });
  }

  beforeEach(() => {
    mockRouterPush.mockReset();
    mockGetCampaign.mockReset();
    mockLaunchCoopMission.mockReset();
    mockCanonicalUnitRefs = ['atlas-as7-d'];
    mockCustomCombatRefs = [];
    mockGetCoopRuntimeSessionByMatch.mockReset();
    _resetCoopRuntimeSessions();
  });

  it('rejects a co-op launch whose custom-source reference is missing from the custom combat catalog', async () => {
    const spy = spyLauncherService();
    useRealCoopLaunch(spy.service);
    mockCustomCombatRefs = [];
    mockGetCoopRuntimeSessionByMatch.mockReturnValue(customRoster(CUSTOM_REF));

    await renderAndLaunchCoop();

    expect(await screen.findByTestId('coop-launch-error')).toHaveTextContent(
      'cannot launch yet',
    );
    expect(spy.created).toEqual([]);
    expect(spy.launched).toEqual([]);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // Same membership branch as the row above (roster_source_custom); the
  // discriminator is a POPULATED catalog that simply does not list this
  // ref. Deliberately not called "foreign": in the spec, foreign names a
  // mismatched campaign SNAPSHOT (snapshot_foreign), which is pinned in
  // src/lib/campaign/coop/__tests__/launchCoopMission.test.ts, not here.
  it('rejects a co-op launch whose custom-source reference is not a member of a populated custom combat catalog', async () => {
    const spy = spyLauncherService();
    useRealCoopLaunch(spy.service);
    mockCustomCombatRefs = ['custom-other-owner'];
    mockGetCoopRuntimeSessionByMatch.mockReturnValue(customRoster(CUSTOM_REF));

    await renderAndLaunchCoop();

    expect(await screen.findByTestId('coop-launch-error')).toHaveTextContent(
      'cannot launch yet',
    );
    expect(spy.created).toEqual([]);
    expect(spy.launched).toEqual([]);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('rejects a co-op launch whose custom catalog reference is labelled a canonical source', async () => {
    const spy = spyLauncherService();
    useRealCoopLaunch(spy.service);
    mockCustomCombatRefs = [CUSTOM_REF];
    mockGetCoopRuntimeSessionByMatch.mockReturnValue(
      customRoster(CUSTOM_REF, 'canonical'),
    );

    await renderAndLaunchCoop();

    expect(await screen.findByTestId('coop-launch-error')).toHaveTextContent(
      'custom catalog reference under a canonical source',
    );
    expect(spy.created).toEqual([]);
    expect(spy.launched).toEqual([]);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('admits a co-op launch whose custom-source reference has exact custom catalog membership', async () => {
    const spy = spyLauncherService();
    useRealCoopLaunch(spy.service);
    mockCustomCombatRefs = [CUSTOM_REF];
    mockGetCoopRuntimeSessionByMatch.mockReturnValue(customRoster(CUSTOM_REF));

    await renderAndLaunchCoop();

    expect(screen.queryByTestId('coop-launch-error')).toBeNull();
    expect(spy.launched).toEqual(['repo-enc-coop-1']);
    // The selected saved identity reached the launch guard unchanged —
    // no stock stand-in, no synthesized source.
    const admission = mockLaunchCoopMission.mock.calls[0]?.[3] as {
      readonly selectedUnits: readonly {
        readonly unitId: string;
        readonly unitRef?: string;
        readonly unitSource?: unknown;
      }[];
    };
    expect(admission.selectedUnits).toContainEqual(
      expect.objectContaining({
        unitId: HOST_UNIT,
        unitRef: CUSTOM_REF,
        unitSource: 'custom',
      }),
    );
    expect(mockRouterPush).toHaveBeenCalledWith(
      '/gameplay/encounters/repo-enc-coop-1?campaignId=campaign-coop-1&missionId=mission-alpha',
    );
  });
});
