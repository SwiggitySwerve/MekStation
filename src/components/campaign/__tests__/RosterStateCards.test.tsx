/**
 * RosterStateCards — damage bar against construction maxima.
 *
 * Red-first coverage for roadmap node `R9.roster-damage` slice S1: the
 * card's damage figure must be derived from current armor/structure
 * against the unit's `IUnitMaxState` companion, must render an explicit
 * "unavailable" affordance when no maxima exist (never a stock
 * substitute or a fabricated percentage), and must never be driven by
 * destroyed-component/location counts. Readiness stays a separate
 * projection.
 *
 * @spec openspec/specs/campaign-unit-combat-state/spec.md
 */
import { act, render, screen } from '@testing-library/react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import { CampaignType } from '@/types/campaign/CampaignType';

let mockCampaignStore: ReturnType<
  typeof import('@/stores/campaign/useCampaignStore').createCampaignStore
>;

jest.mock('@/stores/campaign/useCampaignStore', () => {
  const actual = jest.requireActual('@/stores/campaign/useCampaignStore');
  return {
    ...actual,
    useCampaignStore: () => mockCampaignStore,
  };
});

import { createCampaignStore } from '@/stores/campaign/useCampaignStore';

import { RosterUnitCard } from '../RosterStateCards';

const UNIT_ID = 'unit-atlas-1';

function projection(
  overrides: Partial<IRosterUnitProjection> = {},
): IRosterUnitProjection {
  return {
    unitId: UNIT_ID,
    unitName: 'Atlas AS7-D',
    chassisVariant: 'AS7-D',
    readiness: 'Ready',
    ...overrides,
  };
}

function combatState(
  overrides: Partial<IUnitCombatState> = {},
): IUnitCombatState {
  return {
    unitId: UNIT_ID,
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

/** 50 armor points + 18 structure points = 68 construction points. */
function maxState(): IUnitMaxState {
  return {
    unitId: UNIT_ID,
    maxArmorPerLocation: { center_torso: 30, left_torso: 20 },
    maxStructurePerLocation: { center_torso: 10, left_torso: 8 },
    maxAmmoPerBin: {},
  };
}

function seedCampaign(updates: Partial<ICampaign>): void {
  act(() => {
    mockCampaignStore
      .getState()
      .createCampaign('Red Devils', CampaignType.MERCENARY);
  });
  act(() => {
    void mockCampaignStore.getState().updateCampaign(updates);
  });
}

describe('RosterUnitCard damage bar', () => {
  beforeEach(() => {
    mockCampaignStore = createCampaignStore();
  });

  it('derives the damage figure from current armor/structure against construction maxima when nothing is destroyed', () => {
    // 37 armor points lost (50 -> 13) + 4 structure points lost (18 -> 14)
    // = 41 of 68 construction points = 60%.
    seedCampaign({
      unitCombatStates: {
        [UNIT_ID]: combatState({
          currentArmorPerLocation: { center_torso: 5, left_torso: 8 },
          currentStructurePerLocation: { center_torso: 6, left_torso: 8 },
        }),
      },
      unitMaxStates: { [UNIT_ID]: maxState() },
    });

    render(<RosterUnitCard unit={projection()} />);

    expect(screen.getByTestId('roster-unit-damage-percent')).toHaveTextContent(
      '60%',
    );
    expect(screen.queryByTestId('roster-unit-damage-unavailable')).toBeNull();
  });

  it('renders an explicit maxima-unavailable state instead of a percentage when the unit has no construction max-state', () => {
    seedCampaign({
      unitCombatStates: {
        [UNIT_ID]: combatState({
          currentArmorPerLocation: { center_torso: 5, left_torso: 8 },
          currentStructurePerLocation: { center_torso: 6, left_torso: 8 },
        }),
      },
    });

    render(<RosterUnitCard unit={projection()} />);

    expect(
      screen.getByTestId('roster-unit-damage-unavailable'),
    ).toHaveTextContent(/unavailable/i);
    expect(screen.queryByTestId('roster-unit-damage-percent')).toBeNull();
  });

  it('does not let destroyed component/location counts drive the damage figure', () => {
    seedCampaign({
      unitCombatStates: {
        [UNIT_ID]: combatState({
          // Armor and structure are at their construction maxima: zero
          // points lost, so the damage figure must be absent even though
          // two components and one location are destroyed.
          currentArmorPerLocation: { center_torso: 30, left_torso: 20 },
          currentStructurePerLocation: { center_torso: 10, left_torso: 8 },
          destroyedLocations: ['left_arm'],
          destroyedComponents: [
            {
              location: 'center_torso',
              slot: 1,
              componentType: 'weapon',
              name: 'Medium Laser',
              destroyedAt: 'match-1',
            },
            {
              location: 'left_torso',
              slot: 2,
              componentType: 'weapon',
              name: 'SRM 6',
              destroyedAt: 'match-1',
            },
          ],
        }),
      },
      unitMaxStates: { [UNIT_ID]: maxState() },
    });

    render(<RosterUnitCard unit={projection()} />);

    expect(screen.queryByText('Damage')).toBeNull();
    expect(screen.queryByTestId('roster-unit-damage-percent')).toBeNull();
    // The destroyed-component sub-line is a separate display and stays.
    expect(screen.getByText(/Medium Laser/)).toBeInTheDocument();
  });

  it('reacts to a live armor change in the campaign store', () => {
    seedCampaign({
      unitCombatStates: {
        [UNIT_ID]: combatState({
          // 17 of 68 points lost = 25%.
          currentArmorPerLocation: { center_torso: 13, left_torso: 20 },
          currentStructurePerLocation: { center_torso: 10, left_torso: 8 },
        }),
      },
      unitMaxStates: { [UNIT_ID]: maxState() },
    });

    render(<RosterUnitCard unit={projection()} />);
    expect(screen.getByTestId('roster-unit-damage-percent')).toHaveTextContent(
      '25%',
    );

    act(() => {
      void mockCampaignStore.getState().updateCampaign({
        unitCombatStates: {
          // 34 of 68 points lost = 50%.
          [UNIT_ID]: combatState({
            currentArmorPerLocation: { center_torso: 0, left_torso: 16 },
            currentStructurePerLocation: { center_torso: 10, left_torso: 8 },
          }),
        },
      });
    });

    expect(screen.getByTestId('roster-unit-damage-percent')).toHaveTextContent(
      '50%',
    );
  });

  it('leaves the readiness badge and Needs Repair block untouched by maxima presence', () => {
    seedCampaign({
      unitCombatStates: {
        [UNIT_ID]: combatState({
          currentArmorPerLocation: { center_torso: 5, left_torso: 8 },
          currentStructurePerLocation: { center_torso: 6, left_torso: 8 },
        }),
      },
    });

    const { unmount } = render(
      <RosterUnitCard unit={projection({ readiness: 'Damaged' })} />,
    );
    expect(screen.getByText('Damaged')).toBeInTheDocument();
    expect(screen.getByText('Needs Repair')).toBeInTheDocument();
    unmount();

    act(() => {
      void mockCampaignStore
        .getState()
        .updateCampaign({ unitMaxStates: { [UNIT_ID]: maxState() } });
    });

    render(<RosterUnitCard unit={projection({ readiness: 'Damaged' })} />);
    expect(screen.getByText('Damaged')).toBeInTheDocument();
    expect(screen.getByText('Needs Repair')).toBeInTheDocument();
  });
});
