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
import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';

const mockRouterPush = jest.fn();
const mockLaunchCoopMission = jest.fn();
const mockMaterializeCampaignMissionEncounter = jest.fn();
const mockUpdateCampaign = jest.fn();
const mockSaveCampaign = jest.fn();
const mockAddMission = jest.fn();
let mockRosterUnits: IRosterUnitProjection[] = [
  {
    unitId: 'atlas-as7-d',
    unitName: 'Atlas',
    chassisVariant: 'AS7-D',
    readiness: 'Ready' as const,
  },
];

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: { id: 'campaign-coop-1', missionId: 'mission-alpha' },
    pathname: '/gameplay/campaigns/[id]/missions/[missionId]/launch',
  }),
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
    mockSaveCampaign.mockReset();
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
        unitName: 'Atlas',
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      },
    ];
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
    const campaign = {
      ...createCampaign('Solo Launch Probe', 'mercenary'),
      id: 'campaign-coop-1',
    };
    mockGetCampaign.mockReturnValue(campaign);

    await act(async () => {
      render(<CoopMissionLaunchPage />);
    });

    expect(
      screen.getByTestId('mission-readiness-customize-atlas-as7-d'),
    ).toHaveAttribute(
      'href',
      expect.stringContaining(
        '/customizer?mode=campaign-refit&campaignId=campaign-coop-1&unitId=atlas-as7-d',
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
            }),
          ],
        }),
      );
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/gameplay/encounters/encounter-solo-1?campaignId=campaign-coop-1&missionId=mission-alpha',
      );
    });
  });

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
