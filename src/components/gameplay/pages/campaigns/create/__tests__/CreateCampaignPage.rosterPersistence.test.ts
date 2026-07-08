import type { NextRouter } from 'next/router';

import { act, renderHook } from '@testing-library/react';

import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';
import { PilotStatus, PilotType, type IPilot } from '@/types/pilot';

import type {
  PilotAssignments,
  SelectedPilot,
  SelectedUnit,
} from '../CreateCampaignPage.types';

import { useCampaignRosterDraft } from '../CreateCampaignPage.hooks';
import { submitCampaignCreation } from '../CreateCampaignPage.submit';

function makeRouter(): NextRouter {
  return {
    push: jest.fn().mockResolvedValue(true),
  } as unknown as NextRouter;
}

function resetWorld(): void {
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  usePilotStore.setState({
    pilots: [],
    selectedPilotId: null,
    isLoading: false,
    error: null,
  });
  clientSafeStorage.removeItem('campaign-store');
  clientSafeStorage.removeItem('campaign-roster-store');
}

async function submitWizardRoster({
  pilotAssignments = {},
  selectedPilots,
  selectedUnits,
}: {
  pilotAssignments?: PilotAssignments;
  selectedPilots: SelectedPilot[];
  selectedUnits: SelectedUnit[];
}): Promise<void> {
  await submitCampaignCreation({
    campaignType: CampaignType.MERCENARY,
    description: '',
    name: 'Roster Persistence Co.',
    pilotAssignments,
    router: makeRouter(),
    selectedPilots,
    selectedPreset: CampaignPreset.STANDARD,
    selectedUnits,
    setIsSubmitting: jest.fn(),
    setLocalError: jest.fn(),
    showToast: jest.fn(),
    store: useCampaignStore(),
  });
}

const pilotOne: SelectedPilot = {
  id: 'pilot-one',
  name: 'MechWarrior 1',
};

const lightMech: SelectedUnit = {
  id: 'unit-light',
  name: 'Locust LCT-1V',
  tonnage: 25,
  unitRef: 'locust-lct-1v',
};

const mediumMech: SelectedUnit = {
  id: 'unit-medium',
  name: 'Hunchback HBK-4G',
  tonnage: 50,
  unitRef: 'hunchback-hbk-4g',
};

const originalFetch = global.fetch;

function makeVaultPilot(id: string, name: string): IPilot {
  const now = new Date().toISOString();
  return {
    id,
    name,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    career: {
      missionsCompleted: 0,
      victories: 0,
      defeats: 0,
      draws: 0,
      totalKills: 0,
      killRecords: [],
      missionHistory: [],
      xp: 0,
      totalXpEarned: 0,
      rank: 'MechWarrior',
    },
    createdAt: now,
    updatedAt: now,
  };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  } as Response;
}

function installPilotVaultFetchMock(): jest.MockedFunction<typeof fetch> {
  const createdPilots: IPilot[] = [];
  const fetchMock = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method ?? 'GET').toUpperCase();

      if (url === '/api/pilots' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as {
          options: { identity: { name: string } };
        };
        const pilot = makeVaultPilot(
          `vault-pilot-${createdPilots.length + 1}`,
          body.options.identity.name,
        );
        createdPilots.push(pilot);
        return jsonResponse({ success: true, id: pilot.id, pilot });
      }

      if (url === '/api/pilots' && method === 'GET') {
        return jsonResponse({
          pilots: createdPilots,
          count: createdPilots.length,
        });
      }

      return jsonResponse({ success: true });
    },
  ) as jest.MockedFunction<typeof fetch>;

  global.fetch = fetchMock;
  return fetchMock;
}

describe('CreateCampaignPage submit roster persistence', () => {
  beforeEach(() => {
    resetWorld();
    installPilotVaultFetchMock();
  });

  afterEach(() => {
    resetWorld();
    global.fetch = originalFetch;
  });

  it('adds pilots with distinct default names when add calls are batched', () => {
    const { result } = renderHook(() => useCampaignRosterDraft());

    act(() => {
      result.current.handleAddPilot();
      result.current.handleAddPilot();
      result.current.handleAddPilot();
      result.current.handleAddPilot();
    });

    expect(result.current.selectedPilots.map((pilot) => pilot.name)).toEqual([
      'MechWarrior 1',
      'MechWarrior 2',
      'MechWarrior 3',
      'MechWarrior 4',
    ]);
  });

  it('persists wizard units and pilots into the campaign roster store', async () => {
    const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

    await submitWizardRoster({
      selectedUnits: [lightMech],
      selectedPilots: [pilotOne],
    });

    const roster = useCampaignRosterStore.getState();
    expect(roster.units).toHaveLength(1);
    expect(roster.pilots).toHaveLength(1);
    expect(roster.units[0]).toMatchObject({
      unitId: 'unit-light',
      unitName: 'Locust LCT-1V',
      unitRef: 'locust-lct-1v',
    });
    expect(roster.pilots[0]).toMatchObject({
      pilotId: 'vault-pilot-1',
      pilotName: 'MechWarrior 1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pilots',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"MechWarrior 1"'),
      }),
    );
    expect(
      useCampaignStore().getState().getForcesStore()?.getState().getRootForce()
        ?.unitIds,
    ).toContain('unit-light');
  });

  it('auto-assigns a lone wizard pilot to a lone wizard unit', async () => {
    await submitWizardRoster({
      selectedUnits: [lightMech],
      selectedPilots: [pilotOne],
    });

    const roster = useCampaignRosterStore.getState();
    expect(roster.units[0]?.pilotId).toBe('vault-pilot-1');
    expect(roster.pilots[0]?.assignedUnitId).toBe('unit-light');

    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-roster',
      mission: undefined,
      units: roster.units,
      pilots: roster.pilots,
      selectedRosterUnitIds: ['unit-light'],
      baseCampaignHref: '/gameplay/campaigns/campaign-roster',
    });

    expect(projection.canLaunch).toBe(true);
    expect(projection.warnings.map((reason) => reason.code)).not.toContain(
      'pilot_unassigned',
    );
  });

  it('leaves multi-unit assignment explicit and preserves the readiness warning', async () => {
    await submitWizardRoster({
      selectedUnits: [lightMech, mediumMech],
      selectedPilots: [pilotOne],
    });

    const roster = useCampaignRosterStore.getState();
    expect(roster.units.map((unit) => unit.pilotId)).toEqual([
      undefined,
      undefined,
    ]);
    expect(roster.pilots[0]?.assignedUnitId).toBeUndefined();

    const projection = buildMissionReadinessProjection({
      campaignId: 'campaign-roster',
      mission: undefined,
      units: roster.units,
      pilots: roster.pilots,
      selectedRosterUnitIds: ['unit-light'],
      baseCampaignHref: '/gameplay/campaigns/campaign-roster',
    });

    expect(projection.warnings).toContainEqual(
      expect.objectContaining({
        code: 'pilot_unassigned',
        actionLabel: 'Assign pilot',
        actionHref:
          '/gameplay/campaigns/campaign-roster/personnel?intent=assign-pilot&unit=unit-light',
      }),
    );
  });

  it('registers multiple wizard pilots with vault ids and distinct submit-time names', async () => {
    await submitWizardRoster({
      selectedUnits: [lightMech, mediumMech],
      selectedPilots: [
        { id: 'pilot-one', name: 'MechWarrior 1' },
        { id: 'pilot-two', name: 'MechWarrior 1' },
      ],
      pilotAssignments: {
        'unit-light': 'pilot-one',
        'unit-medium': 'pilot-two',
      },
    });

    const roster = useCampaignRosterStore.getState();
    expect(roster.pilots.map((pilot) => pilot.pilotId)).toEqual([
      'vault-pilot-1',
      'vault-pilot-2',
    ]);
    expect(roster.pilots.map((pilot) => pilot.pilotName)).toEqual([
      'MechWarrior 1',
      'MechWarrior 2',
    ]);
    expect(roster.units.map((unit) => unit.pilotId)).toEqual([
      'vault-pilot-1',
      'vault-pilot-2',
    ]);

    const postBodies = (
      global.fetch as jest.MockedFunction<typeof fetch>
    ).mock.calls
      .filter(([url, init]) => url === '/api/pilots' && init?.method === 'POST')
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(postBodies.map((body) => body.options.identity.name)).toEqual([
      'MechWarrior 1',
      'MechWarrior 2',
    ]);
  });
});
