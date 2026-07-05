import type { NextRouter } from 'next/router';

import { buildMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignPreset } from '@/types/campaign/CampaignPreset';
import { CampaignType } from '@/types/campaign/CampaignType';

import type {
  PilotAssignments,
  SelectedPilot,
  SelectedUnit,
} from '../CreateCampaignPage.types';

import { submitCampaignCreation } from '../CreateCampaignPage.submit';

function makeRouter(): NextRouter {
  return {
    push: jest.fn().mockResolvedValue(true),
  } as unknown as NextRouter;
}

function resetWorld(): void {
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
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
  name: 'Light Mech',
  tonnage: 25,
};

const mediumMech: SelectedUnit = {
  id: 'unit-medium',
  name: 'Medium Mech',
  tonnage: 55,
};

describe('CreateCampaignPage submit roster persistence', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('persists wizard units and pilots into the campaign roster store', async () => {
    await submitWizardRoster({
      selectedUnits: [lightMech],
      selectedPilots: [pilotOne],
    });

    const roster = useCampaignRosterStore.getState();
    expect(roster.units).toHaveLength(1);
    expect(roster.pilots).toHaveLength(1);
    expect(roster.units[0]).toMatchObject({
      unitId: 'unit-light',
      unitName: 'Light Mech',
    });
    expect(roster.pilots[0]).toMatchObject({
      pilotId: 'pilot-one',
      pilotName: 'MechWarrior 1',
    });
  });

  it('auto-assigns a lone wizard pilot to a lone wizard unit', async () => {
    await submitWizardRoster({
      selectedUnits: [lightMech],
      selectedPilots: [pilotOne],
    });

    const roster = useCampaignRosterStore.getState();
    expect(roster.units[0]?.pilotId).toBe('pilot-one');
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
});
