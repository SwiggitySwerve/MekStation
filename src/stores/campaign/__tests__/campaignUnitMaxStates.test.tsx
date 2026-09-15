/**
 * Construction-maxima population for campaign roster units.
 *
 * Red-first coverage for roadmap node `R9.roster-damage` slice S2:
 * `campaign.unitMaxStates[unitId]` is populated through the established
 * canonical/custom source authority — `CanonicalUnitService` for canonical
 * refs, the custom-unit source for `custom-*` refs — at the point a unit
 * joins the roster and, for existing campaigns, on campaign load when the
 * entry is missing. A missing or deleted design leaves the entry absent;
 * nothing is ever substituted.
 *
 * @spec openspec/specs/campaign-unit-combat-state/spec.md
 */
import { render, screen } from '@testing-library/react';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { CampaignType } from '@/types/campaign/CampaignType';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';

jest.mock('@/services/units/CanonicalUnitService', () => {
  const unitStore: Record<string, unknown> = {};
  return {
    getCanonicalUnitService: () => ({
      getById: jest.fn(async (id: string) => unitStore[id] ?? null),
      getIndex: jest.fn(async () => []),
    }),
    __setUnit: (id: string, data: unknown) => {
      unitStore[id] = data;
    },
    __clearUnits: () => {
      for (const key of Object.keys(unitStore)) delete unitStore[key];
    },
  };
});

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { getById: jest.fn() },
}));

let mockCampaignStore: ReturnType<
  typeof import('../useCampaignStore').createCampaignStore
>;

jest.mock('../useCampaignStore', () => {
  const actual = jest.requireActual('../useCampaignStore');
  return { ...actual, useCampaignStore: () => mockCampaignStore };
});

const canonicalMock = jest.requireMock(
  '@/services/units/CanonicalUnitService',
) as {
  __setUnit: (id: string, data: unknown) => void;
  __clearUnits: () => void;
};

/** The accessor signature `registerCampaignStoreAccessor` expects. */
type MockAccessor = Parameters<typeof registerCampaignStoreAccessor>[0];

import { RosterUnitCard } from '@/components/campaign/RosterStateCards';

import { registerCampaignStoreAccessor } from '../campaignStoreAccessor';
import { ensureCampaignUnitMaxStates } from '../campaignUnitMaxStates';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { createCampaignStore } from '../useCampaignStore';

const CANONICAL_REF = 'test-medium-tmd-1a';
const CUSTOM_REF = 'custom-workbench-atlas';

/**
 * 50-ton canonical fixture: 9 + 20 front + 6 rear + 12 = 47 armor points,
 * and the standard 50-ton structure row (head 3, CT 16, side torso 12,
 * arm 8, leg 12).
 */
function canonicalUnit(): IFullUnit {
  return {
    id: CANONICAL_REF,
    chassis: 'Testmech',
    variant: 'TMD-1A',
    tonnage: 50,
    techBase: 'INNER_SPHERE',
    era: 'SUCCESSION_WARS',
    unitType: 'BATTLEMECH',
    engine: { type: 'FUSION', rating: 250 },
    armor: {
      type: 'STANDARD',
      allocation: {
        HEAD: 9,
        CENTER_TORSO: { front: 20, rear: 6 },
        LEFT_ARM: 12,
      },
    },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 5, jump: 0 },
    equipment: [{ id: 'medium-laser', location: 'CENTER_TORSO' }],
  } as unknown as IFullUnit;
}

/** Saved custom design: the real Atlas with a distinctive left-arm value. */
const savedCustom = {
  ...atlas,
  id: CUSTOM_REF,
  variant: 'Workbench',
  armor: {
    ...atlas.armor,
    allocation: { ...atlas.armor.allocation, LEFT_ARM: 30 },
  },
};

function projection(
  overrides: Partial<IRosterUnitProjection> = {},
): IRosterUnitProjection {
  return {
    unitId: 'unit-1',
    unitName: 'Testmech TMD-1A',
    chassisVariant: 'TMD-1A',
    readiness: 'Ready',
    unitRef: CANONICAL_REF,
    unitSource: 'canonical',
    ...overrides,
  };
}

function combatState(
  unitId: string,
  overrides: Partial<IUnitCombatState> = {},
): IUnitCombatState {
  return {
    unitId,
    currentArmorPerLocation: {},
    currentStructurePerLocation: {},
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
    ammoRemaining: {},
    combatReady: true,
    lastCombatOutcomeId: null,
    lastUpdated: null,
    ...overrides,
  };
}

describe('campaign unit max-state population', () => {
  let store: ReturnType<typeof createCampaignStore>;

  beforeEach(() => {
    canonicalMock.__clearUnits();
    canonicalMock.__setUnit(CANONICAL_REF, canonicalUnit());
    jest.mocked(customUnitApiService.getById).mockReset();
    store = createCampaignStore();
    mockCampaignStore = store;
    registerCampaignStoreAccessor(
      () => store as unknown as ReturnType<MockAccessor>,
    );
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function seedCampaign(): ICampaign {
    store.getState().createCampaign('Red Devils', CampaignType.MERCENARY);
    const campaign = store.getState().campaign;
    if (!campaign) throw new Error('campaign not created');
    return campaign;
  }

  it('resolves canonical roster maxima through the canonical unit service', async () => {
    seedCampaign();
    useCampaignRosterStore.getState().addUnit(projection());

    await ensureCampaignUnitMaxStates();

    const maxState = store.getState().campaign?.unitMaxStates?.['unit-1'];
    expect(maxState).toBeDefined();
    expect(maxState?.maxArmorPerLocation).toEqual({
      head: 9,
      center_torso: 20,
      center_torso_rear: 6,
      left_arm: 12,
    });
    expect(maxState?.maxStructurePerLocation).toEqual({
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
    });
  });

  it('resolves custom roster maxima through the custom unit source', async () => {
    jest
      .mocked(customUnitApiService.getById)
      .mockResolvedValue(savedCustom as never);
    seedCampaign();
    useCampaignRosterStore.getState().addUnit(
      projection({
        unitId: 'unit-custom',
        unitRef: CUSTOM_REF,
        unitSource: 'custom',
      }),
    );

    await ensureCampaignUnitMaxStates();

    const maxState = store.getState().campaign?.unitMaxStates?.['unit-custom'];
    expect(customUnitApiService.getById).toHaveBeenCalledWith(CUSTOM_REF);
    expect(maxState?.maxArmorPerLocation.left_arm).toBe(30);
    expect(maxState?.maxStructurePerLocation.center_torso).toBe(31);
  });

  it('leaves the entry absent when the custom design is deleted', async () => {
    jest.mocked(customUnitApiService.getById).mockResolvedValue(null as never);
    seedCampaign();
    useCampaignRosterStore.getState().addUnit(projection());
    useCampaignRosterStore.getState().addUnit(
      projection({
        unitId: 'unit-deleted',
        unitRef: CUSTOM_REF,
        unitSource: 'custom',
      }),
    );

    await ensureCampaignUnitMaxStates();

    const maxStates = store.getState().campaign?.unitMaxStates ?? {};
    expect(maxStates['unit-deleted']).toBeUndefined();
    // One unresolvable design does not poison the rest of the batch.
    expect(maxStates['unit-1']).toBeDefined();
  });

  it('backfills a missing entry when an existing campaign is loaded', async () => {
    const persisted = buildPopulatedCampaign();
    const envelope = buildSerializedCampaign(persisted, 'device-y', 3, {
      campaignId: persisted.id,
      units: [projection()],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => envelope,
    } as Response);

    const ok = await useCampaignPersistenceStore
      .getState()
      .loadCampaign(persisted.id);

    expect(ok).toBe(true);
    expect(store.getState().campaign?.unitMaxStates?.['unit-1']).toBeDefined();
  });

  it('renders a real damage percentage on the roster card once maxima are populated', async () => {
    seedCampaign();
    useCampaignRosterStore.getState().addUnit(projection());
    await ensureCampaignUnitMaxStates();

    const maxState = store.getState().campaign?.unitMaxStates?.['unit-1'];
    if (!maxState) throw new Error('maxima were not populated');
    const zeroed = (points: Readonly<Record<string, number>>) =>
      Object.fromEntries(Object.keys(points).map((key) => [key, 0]));

    await store.getState().updateCampaign({
      unitCombatStates: {
        'unit-1': combatState('unit-1', {
          currentArmorPerLocation: zeroed(maxState.maxArmorPerLocation),
          currentStructurePerLocation: zeroed(maxState.maxStructurePerLocation),
        }),
      },
    });

    render(<RosterUnitCard unit={projection()} />);

    expect(screen.getByTestId('roster-unit-damage-percent')).toHaveTextContent(
      '100%',
    );
    expect(screen.queryByTestId('roster-unit-damage-unavailable')).toBeNull();
  });
});
