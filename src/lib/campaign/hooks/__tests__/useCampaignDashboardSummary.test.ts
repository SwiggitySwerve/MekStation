import { act, renderHook } from '@testing-library/react';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IForce } from '@/types/campaign/Force';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  extractForceSnapshot,
  useCampaignDashboardSummary,
} from '@/lib/campaign/hooks/useCampaignDashboardSummary';
import {
  selectActiveContract,
  selectDailyCostProjection,
} from '@/stores/campaign/campaignCommandSelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import {
  CampaignPersonnelRole,
  ForceRole,
  FormationLevel,
} from '@/types/campaign/enums';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';

function makeUnit(
  overrides: Partial<IRosterUnitProjection> = {},
): IRosterUnitProjection {
  return {
    unitId: 'unit-light',
    unitName: 'Light Mech',
    chassisVariant: 'Light Mech',
    readiness: 'Ready',
    ...overrides,
  };
}

function makePilot(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-one',
    pilotName: 'MechWarrior 1',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01T00:00:00.000Z'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

describe('dashboard force snapshot roster counts', () => {
  it('reports force-tree-assigned units instead of the raw roster count', () => {
    const campaign = createCampaign('Roster Persistence Co.', 'mercenary');
    const rootForce: IForce = {
      id: campaign.rootForceId,
      name: 'Roster Persistence Co.',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-assigned'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.REGIMENT,
      createdAt: '3025-01-01T00:00:00.000Z',
      updatedAt: '3025-01-01T00:00:00.000Z',
    };
    const forces = new Map([[rootForce.id, rootForce]]);
    const snapshot = extractForceSnapshot(
      { ...campaign, forces },
      [
        makeUnit({ unitId: 'unit-assigned' }),
        makeUnit({ unitId: 'unit-unassigned-1' }),
        makeUnit({ unitId: 'unit-unassigned-2' }),
        makeUnit({ unitId: 'unit-unassigned-3' }),
      ],
      [makePilot()],
    );

    expect(snapshot.mechCount).toBe(1);
    expect(snapshot.pilotCount).toBe(1);
  });
});

describe('campaign dashboard active-contract summary', () => {
  afterEach(() => {
    resetCampaignStore();
    act(() => {
      useCampaignRosterStore.setState({
        campaignId: null,
        units: [],
        pilots: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
      });
    });
  });

  it('matches the Missions-tab contract selector and excludes a terminal contract', () => {
    const campaign = createCampaign('Dashboard Contract Co.', 'mercenary');
    const activeContract = createContract({
      id: 'active-dashboard-contract',
      name: 'Active Dashboard Contract',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
      endDate: '9999-12-31',
    });
    const store = useCampaignStore();
    act(() => {
      store.setState({
        campaign: {
          ...campaign,
          missions: new Map([[activeContract.id, activeContract]]),
        },
      });
    });

    const { result, unmount } = renderHook(() => useCampaignDashboardSummary());

    expect(selectActiveContract(store.getState().campaign)?.id).toBe(
      activeContract.id,
    );
    expect(result.current?.activeContract.contract?.id).toBe(activeContract.id);
    expect(
      result.current?.operations.items.some(
        (item) => item.id === 'choose-contract',
      ),
    ).toBe(false);

    const terminalContract = {
      ...activeContract,
      status: MissionStatus.SUCCESS,
    };
    act(() => {
      store.setState({
        campaign: {
          ...campaign,
          missions: new Map([[terminalContract.id, terminalContract]]),
          activeContract: {
            id: activeContract.id,
            name: activeContract.name,
            employerFactionId: activeContract.employerId,
            deadlineDay: 10,
            objectivesCompleted: 1,
            objectivesTotal: 5,
          },
        } as typeof campaign & {
          readonly activeContract: {
            readonly id: string;
            readonly name: string;
            readonly employerFactionId: string;
            readonly deadlineDay: number;
            readonly objectivesCompleted: number;
            readonly objectivesTotal: number;
          };
        },
      });
    });

    expect(selectActiveContract(store.getState().campaign)).toBeNull();
    expect(result.current?.activeContract.contract).toBeNull();
    unmount();
  });

  it('uses the option-aware daily-cost projection with only billable pilots', () => {
    const campaign = createCampaign('Dashboard Finance Co.', 'mercenary');
    const rosterPilots = Array.from({ length: 4 }, (_, index) =>
      makePilot({ pilotId: `pilot-${index}`, pilotName: `Pilot ${index}` }),
    );
    const rosterUnits = Array.from({ length: 4 }, (_, index) =>
      makeUnit({ unitId: `unit-${index}`, unitName: `Unit ${index}` }),
    );
    const store = useCampaignStore();
    act(() => {
      store.setState({ campaign });
      useCampaignRosterStore.setState({
        campaignId: campaign.id,
        units: rosterUnits,
        pilots: rosterPilots,
        missions: [],
        activeMissionId: null,
        missionCount: 0,
      });
    });

    const { result, unmount } = renderHook(() => useCampaignDashboardSummary());
    const expected = selectDailyCostProjection(campaign, rosterPilots.length);

    expect(result.current?.finances.dailyTotalAmount).toBe(expected.total);
    expect(result.current?.finances.dailySalariesAmount).toBe(
      expected.salaries,
    );
    expect(result.current?.finances.dailyMaintenanceAmount).toBe(
      expected.maintenance,
    );

    act(() => {
      useCampaignRosterStore.setState({
        pilots: [
          ...rosterPilots.slice(0, 3),
          makePilot({
            pilotId: 'pilot-kia',
            pilotName: 'Pilot KIA',
            status: CampaignPilotStatus.KIA,
          }),
        ],
      });
    });
    const expectedWithKia = selectDailyCostProjection(campaign, 3);

    expect(result.current?.finances.dailyTotalAmount).toBe(
      expectedWithKia.total,
    );
    unmount();
  });
});
