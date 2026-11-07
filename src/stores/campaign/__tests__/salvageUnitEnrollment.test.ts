import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ISalvageCandidate } from '@/types/campaign/Salvage';

import { prepareSalvageUnitRecovery } from '@/lib/campaign/salvage/salvageUnitRecovery';
import SalvagePage from '@/pages/gameplay/campaigns/[id]/salvage';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { mapRawIndexEntry } from '@/services/units/unitIndexMapper';
import { DamageLevel } from '@/types/campaign/Salvage';
import {
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { enrollSalvageUnit } from '../salvageUnitEnrollment';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '../useCampaignStore';

let mockCampaign: ICampaign;
jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  useCampaignPageShell: () => ({}),
  useCampaignLoadStatus: () => ({}),
  renderPendingCampaignPage: () => null,
  getLoadedCampaign: () => mockCampaign,
  renderCampaignBaySaveError: () => null,
  CampaignPageFrameFromShell: ({ children }: PropsWithChildren) =>
    createElement('div', null, children),
}));

const unit = {
  id: 'custom-atlas',
  chassis: 'Atlas',
  variant: 'Historical',
  tonnage: 100,
  techBase: 'Inner Sphere',
  era: '3025',
  unitType: 'BattleMech',
};

function candidate(): ISalvageCandidate {
  return {
    source: 'unit',
    unitId: 'enemy-atlas',
    designation: 'Recovered Atlas',
    destroyedFromBattle: 'battle',
    finalStatus: 'damaged',
    damageLevel: DamageLevel.Light,
    originalValue: 100,
    recoveredValue: 75,
    recoveryPercentage: 0.75,
    repairCostEstimate: 25,
    disposition: 'mercenary',
    status: 'pending',
    recovery: prepareSalvageUnitRecovery(
      {
        unitId: 'enemy-atlas',
        unitRef: unit.id,
        unitSource: 'custom',
        sourceVersion: 3,
        side: GameSide.Opponent,
        destroyed: false,
        finalStatus: UnitFinalStatus.Damaged,
        armorRemaining: { CT: 3 },
        internalsRemaining: { CT: 7 },
        destroyedComponents: [],
        destroyedLocations: [],
        heatEnd: 0,
        ammoRemaining: {},
        pilotState: {
          conscious: true,
          wounds: 0,
          killed: false,
          finalStatus: PilotFinalStatus.Active,
        },
      },
      'battle',
      '2026-11-07T00:00:00Z',
    ),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  resetCampaignStore();
  useCampaignRosterStore.getState().reset();
  useCampaignPersistenceStore.getState().reset();
});
afterEach(() => {
  useCampaignPersistenceStore.getState().reset();
  jest.restoreAllMocks();
});

function seed(item = candidate()) {
  const store = getCampaignStore();
  const id = store.getState().createCampaign('Enrollment', 'mercenary');
  const base = store.getState().campaign!;
  store.getState().switchCampaign({
    ...base,
    salvageAllocations: {
      battle: {
        pool: {
          battleId: 'battle',
          contractId: null,
          candidates: [item],
          totalEstimatedValue: 75,
          hostileTerritory: false,
        },
        mercenaryAward: {
          side: 'mercenary',
          candidates: [item],
          totalValue: 75,
          estimatedRepairCost: 25,
        },
        employerAward: {
          side: 'employer',
          candidates: [],
          totalValue: 0,
          estimatedRepairCost: 0,
        },
        splitMethod: 'contract',
        processed: true,
      },
    },
  });
  useCampaignRosterStore.getState().initRoster(id);
  mockCampaign = store.getState().campaign!;
  return mockCampaign;
}

it('uses the historical custom version and never reads the current library version', async () => {
  const item = candidate();
  const campaign = seed(item);
  const historical = jest
    .spyOn(customUnitApiService, 'getVersion')
    .mockResolvedValue({
      version: 3,
      data: unit,
      savedAt: '2026-11-07T00:00:00Z',
      notes: null,
      revertSource: null,
    });
  const current = jest.spyOn(customUnitApiService, 'getById');
  const commit = jest
    .spyOn(getCampaignStore().getState(), 'commitRosterEnrollment')
    .mockResolvedValue({ committed: true });
  expect(await enrollSalvageUnit(campaign, item, {})).toEqual({
    applied: true,
  });
  expect(historical).toHaveBeenCalledWith(unit.id, 3);
  expect(current).not.toHaveBeenCalled();
  expect(commit).toHaveBeenCalledWith(
    campaign,
    expect.objectContaining({
      unitRef: unit.id,
      sourceVersion: 3,
      chassisVariant: 'Historical',
    }),
    expect.any(Object),
  );
});

it('refuses a missing historical pin without consulting the custom library', async () => {
  const original = candidate();
  const item = {
    ...original,
    recovery: { ...original.recovery!, sourceVersion: undefined },
  };
  const campaign = seed(item);
  const lookup = jest.spyOn(customUnitApiService, 'getVersion');
  expect(await enrollSalvageUnit(campaign, item, {})).toMatchObject({
    applied: false,
    reason: expect.any(String),
  });
  expect(lookup).not.toHaveBeenCalled();
});

it.each(['atlas-as7-d', 'battlemechs:atlas-as7-d'])(
  'uses normalized canonical metadata for %s instead of assuming the full payload has a variant',
  async (unitRef) => {
    const item = {
      ...candidate(),
      recovery: {
        ...candidate().recovery!,
        unitRef,
        unitSource: undefined,
        sourceVersion: undefined,
      },
    };
    const campaign = seed(item);
    const service = getCanonicalUnitService();
    jest.spyOn(service, 'getById').mockResolvedValue({
      ...unit,
      id: 'atlas-as7-d',
      variant: '',
      model: 'AS7-D',
    });
    jest.spyOn(service, 'getIndex').mockResolvedValue([
      mapRawIndexEntry({
        id: 'atlas-as7-d',
        chassis: 'Atlas',
        model: 'AS7-D',
        tonnage: 100,
        techBase: 'INNER_SPHERE',
        path: 'fixture.json',
      }),
    ]);
    const commit = jest
      .spyOn(getCampaignStore().getState(), 'commitRosterEnrollment')
      .mockResolvedValue({ committed: true });
    expect(await enrollSalvageUnit(campaign, item, {})).toEqual({
      applied: true,
    });
    expect(commit).toHaveBeenCalledWith(
      campaign,
      expect.objectContaining({
        unitRef,
        chassisVariant: 'AS7-D',
        unitSource: 'canonical',
      }),
      expect.any(Object),
    );
  },
);

it('refuses mismatched canonical lookup results without changing the roster', async () => {
  const item = {
    ...candidate(),
    recovery: { ...candidate().recovery!, unitSource: 'canonical' as const },
  };
  const campaign = seed(item);
  jest.spyOn(getCanonicalUnitService(), 'getIndex').mockResolvedValue([]);
  jest.spyOn(getCanonicalUnitService(), 'getById').mockResolvedValue(null);
  expect(await enrollSalvageUnit(campaign, item, {})).toMatchObject({
    applied: false,
    reason: expect.any(String),
  });
  expect(useCampaignRosterStore.getState().units).toEqual([]);
});

it('the roster boundary refuses a different campaign and duplicate identities', () => {
  seed();
  const projection = {
    unitId: 'unit',
    unitRef: 'ref',
    unitName: 'Unit',
    chassisVariant: 'Variant',
    readiness: 'Ready' as const,
  };
  const roster = useCampaignRosterStore.getState();
  expect(
    roster.replaceUnitsForCampaign('different-campaign', [projection]),
  ).toBe(false);
  expect(
    roster.replaceUnitsForCampaign(roster.campaignId!, [
      projection,
      projection,
    ]),
  ).toBe(false);
  expect(useCampaignRosterStore.getState().units).toEqual([]);
});

it('shows a legacy-candidate refusal in the actual salvage page', async () => {
  seed({ ...candidate(), recovery: undefined });
  render(createElement(SalvagePage));
  fireEvent.click(screen.getByTestId('salvage-accept-enemy-atlas'));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'no recorded design reference or recovered damage',
  );
  expect(useCampaignRosterStore.getState().units).toEqual([]);
});

it('disables decisions while historical recovery is pending and shows lookup failure', async () => {
  seed();
  let finish: (value: null) => void = () => {
    throw new Error('lookup did not start');
  };
  jest.spyOn(customUnitApiService, 'getVersion').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(createElement(SalvagePage));
  fireEvent.click(screen.getByTestId('salvage-accept-enemy-atlas'));
  expect(screen.getByTestId('salvage-accept-enemy-atlas')).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Saving salvage decision',
  );
  finish(null);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be resolved',
  );
});

it('refuses an operation if the campaign changes while its design lookup is pending', async () => {
  const item = candidate();
  const campaign = seed(item);
  let finish: (
    value: Awaited<ReturnType<typeof customUnitApiService.getVersion>>,
  ) => void = () => {
    throw new Error('lookup did not start');
  };
  jest.spyOn(customUnitApiService, 'getVersion').mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = enrollSalvageUnit(campaign, item, {});
  getCampaignStore().getState().createCampaign('Another campaign', 'mercenary');
  finish({
    version: 3,
    data: unit,
    savedAt: '2026-11-07T00:00:00Z',
    notes: null,
    revertSource: null,
  });
  expect(await pending).toMatchObject({
    applied: false,
    reason: expect.any(String),
  });
  expect(useCampaignRosterStore.getState().units).toEqual([]);
});
