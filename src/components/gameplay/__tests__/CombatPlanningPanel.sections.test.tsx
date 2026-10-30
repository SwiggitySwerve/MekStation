import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import type { ISelectedUnitProjection } from '@/stores/useGameplayStore.selectors';

import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  RangeBracket,
} from '@/types/gameplay';
import * as ammoOwner from '@/utils/gameplay/ammoTracking/weapons';
import * as previewOwner from '@/utils/gameplay/toHit/preview';

import {
  MovementPlanningSection,
  PhysicalAttackPlanningSection,
  WeaponAttackPlanningSection,
} from '../CombatPlanningPanel.sections';
import { mediumLaser } from './addCombatPhaseUIFlows.smoke.test-helpers';
import {
  baseAttacker,
  baseTarget,
  lrm10,
} from './addWhatIfToHitPreview.smoke.test-helpers';

// Count calls while running the real owners; SWC exports cannot be spied on in place.
jest.mock('@/utils/gameplay/toHit/preview', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/toHit/preview')
  >('@/utils/gameplay/toHit/preview');
  return {
    ...actual,
    previewAttackOutcome: jest.fn(actual.previewAttackOutcome),
  };
});
jest.mock('@/utils/gameplay/ammoTracking/weapons', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/ammoTracking/weapons')
  >('@/utils/gameplay/ammoTracking/weapons');
  return { ...actual, ammoFromWeapons: jest.fn(actual.ammoFromWeapons) };
});

const selected: ISelectedUnitProjection = {
  id: 'attacker',
  unit: {
    id: 'attacker',
    name: 'Attacker',
    side: GameSide.Player,
    unitRef: 'attacker-ref',
    pilotRef: 'attacker-pilot',
    gunnery: 4,
    piloting: 5,
  },
  state: {
    id: 'attacker',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  },
};

describe('WeaponAttackPlanningSection combat projection range display', () => {
  it('projects live bins into both previews when the legacy ammo map is empty', () => {
    const props = {
      className: '',
      attackPlan: {
        targetUnitId: 'target',
        selectedWeapons: [lrm10.id],
        weaponModeError: null,
      },
      weapons: [lrm10],
      selectedWeaponModes: {},
      rangeToTarget: 7,
      attackerState: baseAttacker,
      targetState: baseTarget,
      forecastWeapons: [
        {
          weaponId: lrm10.id,
          weaponName: lrm10.name,
          minRange: lrm10.minRange,
          shortRange: lrm10.shortRange,
          mediumRange: lrm10.mediumRange,
          longRange: lrm10.longRange,
        },
      ],
      forecastOpen: true,
      events: [],
      previewEnabled: true,
      onTogglePreview: jest.fn(),
      onToggleWeapon: jest.fn(),
      onModeChange: jest.fn(),
      onOpenForecast: jest.fn(),
      onConfirmFire: jest.fn(),
      onCloseForecast: jest.fn(),
    };
    const withRounds = (remainingRounds: number): ISelectedUnitProjection => ({
      ...selected,
      state: {
        ...selected.state,
        ammoState: {
          bin: {
            binId: 'bin',
            weaponType: 'lrm-10',
            location: 'right_torso',
            remainingRounds,
            maxRounds: 12,
            isExplosive: true,
          },
        },
      },
    });
    const ready = withRounds(2);
    const depleted = withRounds(0);
    const before = JSON.stringify({ ready, depleted });
    const { rerender } = render(
      <WeaponAttackPlanningSection {...props} selected={ready} />,
    );
    for (const prefix of ['weapon', 'forecast']) {
      expect(
        Number(
          screen.getByTestId(`${prefix}-preview-expdmg-${lrm10.id}`)
            .textContent,
        ),
      ).toBeGreaterThan(0);
    }
    rerender(<WeaponAttackPlanningSection {...props} selected={depleted} />);
    for (const prefix of ['weapon', 'forecast']) {
      expect(
        Number(
          screen.getByTestId(`${prefix}-preview-expdmg-${lrm10.id}`)
            .textContent,
        ),
      ).toBe(0);
    }
    expect(screen.getByTestId('preview-forecast-button')).toBeDisabled();
    expect(JSON.stringify({ ready, depleted })).toBe(before);
    expect(props.onConfirmFire).not.toHaveBeenCalled();
    expect(props.onToggleWeapon).not.toHaveBeenCalled();
  });

  it('threads projection range and bracket into the weapon selector surface', () => {
    render(
      <WeaponAttackPlanningSection
        className=""
        selected={selected}
        attackPlan={{
          targetUnitId: 'target',
          selectedWeapons: ['med-laser-1'],
          weaponModeError: null,
        }}
        weapons={[mediumLaser]}
        selectedWeaponModes={{}}
        rangeToTarget={8}
        combatProjectionRangeBracket={RangeBracket.Long}
        attackerState={null}
        targetState={null}
        forecastWeapons={[]}
        forecastOpen={false}
        events={[]}
        previewEnabled={false}
        onTogglePreview={jest.fn()}
        onToggleWeapon={jest.fn()}
        onModeChange={jest.fn()}
        onOpenForecast={jest.fn()}
        onConfirmFire={jest.fn()}
        onCloseForecast={jest.fn()}
      />,
    );

    expect(screen.getByTestId('combat-planning-panel-attack')).toHaveAttribute(
      'data-combat-projection-range',
      '8',
    );
    expect(screen.getByTestId('combat-planning-panel-attack')).toHaveAttribute(
      'data-combat-projection-range-bracket',
      RangeBracket.Long,
    );
    expect(screen.getByTestId('range-badge-l')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('range-badge-s')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('renders inert range metadata when the combat projection lookup is empty', () => {
    render(
      <WeaponAttackPlanningSection
        className=""
        selected={selected}
        attackPlan={{
          targetUnitId: null,
          selectedWeapons: [],
          weaponModeError: null,
        }}
        weapons={[mediumLaser]}
        selectedWeaponModes={{}}
        rangeToTarget={0}
        attackerState={null}
        targetState={null}
        forecastWeapons={[]}
        forecastOpen={false}
        events={[]}
        previewEnabled={false}
        onTogglePreview={jest.fn()}
        onToggleWeapon={jest.fn()}
        onModeChange={jest.fn()}
        onOpenForecast={jest.fn()}
        onConfirmFire={jest.fn()}
        onCloseForecast={jest.fn()}
      />,
    );

    expect(screen.getByTestId('combat-planning-panel-attack')).toHaveAttribute(
      'data-combat-projection-range',
      '0',
    );
    expect(
      screen.getByTestId('combat-planning-panel-attack'),
    ).not.toHaveAttribute('data-combat-projection-range-bracket');
    expect(screen.getByTestId('range-badge-s')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByTestId('range-badge-m')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByTestId('preview-forecast-button')).toBeDisabled();
  });
});

describe('MovementPlanningSection command surface', () => {
  it('uses a readout instead of duplicating the movement mode buttons', () => {
    render(
      <MovementPlanningSection
        className=""
        movementType={MovementType.Run}
        walkMP={4}
        runMP={6}
        jumpMP={0}
        plannedMovement={null}
        planReady={false}
        mpCost={0}
        onTypeChange={jest.fn()}
        onFacingSelect={jest.fn()}
        onCommit={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('movement-type-switcher')).toBeNull();
    expect(screen.getByTestId('movement-mode-readout')).toHaveTextContent(
      'Mode: Run',
    );
    expect(screen.getByTestId('movement-mode-readout')).toHaveTextContent(
      'Walk 4 MP / Run 6 MP / Jump 0 MP',
    );
  });
});

function selectedWithRounds(rounds: number): ISelectedUnitProjection {
  return {
    ...selected,
    state: {
      ...selected.state,
      ammoState: {
        bin: {
          binId: 'bin',
          weaponType: 'lrm-10',
          location: 'right_torso',
          remainingRounds: rounds,
          maxRounds: 12,
          isExplosive: true,
        },
      },
    },
  };
}

describe('planning-section ammunition memoization', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['live', 'legacy'])(
    'reuses unchanged %s ammo previews and refreshes ammo-only updates',
    (source) => {
      const spy = jest.mocked(previewOwner.previewAttackOutcome);
      const withRounds = (rounds: number) =>
        source === 'live'
          ? selectedWithRounds(rounds)
          : {
              ...selected,
              state: { ...selected.state, ammo: { [lrm10.id]: rounds } },
            };
      const ready = withRounds(2);
      const props: React.ComponentProps<typeof WeaponAttackPlanningSection> = {
        className: '',
        selected: ready,
        attackPlan: {
          targetUnitId: 'target',
          selectedWeapons: [lrm10.id],
          weaponModeError: null,
        },
        weapons: [lrm10],
        selectedWeaponModes: {},
        rangeToTarget: 7,
        attackerState: baseAttacker,
        targetState: baseTarget,
        forecastWeapons: [],
        forecastOpen: false,
        events: [],
        previewEnabled: true,
        onTogglePreview: jest.fn(),
        onToggleWeapon: jest.fn(),
        onModeChange: jest.fn(),
        onOpenForecast: jest.fn(),
        onConfirmFire: jest.fn(),
        onCloseForecast: jest.fn(),
      };
      const { rerender } = render(<WeaponAttackPlanningSection {...props} />);
      expect(spy).toHaveBeenCalledTimes(1);
      rerender(
        <WeaponAttackPlanningSection {...props} className="unrelated" />,
      );
      expect(spy).toHaveBeenCalledTimes(1);
      // A new selected wrapper and an unrelated state field do not change ammo inputs.
      rerender(
        <WeaponAttackPlanningSection
          {...props}
          selected={{
            ...ready,
            state: { ...ready.state, pilotWounds: 1 },
          }}
        />,
      );
      expect(spy).toHaveBeenCalledTimes(1);
      rerender(
        <WeaponAttackPlanningSection {...props} selected={withRounds(0)} />,
      );
      expect(spy).toHaveBeenCalledTimes(2);
      expect(
        screen.getByTestId('weapon-preview-expdmg-' + lrm10.id),
      ).toHaveTextContent('0.0');
      rerender(
        <WeaponAttackPlanningSection {...props} selected={withRounds(3)} />,
      );
      expect(spy).toHaveBeenCalledTimes(3);
      expect(
        Number(
          screen.getByTestId('weapon-preview-expdmg-' + lrm10.id).textContent,
        ),
      ).toBeGreaterThan(0);
    },
  );

  it('keeps the live Physical Attack weapon list locked and shows current ammo badges', () => {
    const projection = jest.mocked(ammoOwner.ammoFromWeapons);
    const onIntentChange = jest.fn();
    const props: React.ComponentProps<typeof PhysicalAttackPlanningSection> = {
      className: '',
      selected: selectedWithRounds(2),
      attackPlan: {
        targetUnitId: 'target',
        selectedWeapons: [],
        weaponModeError: null,
      },
      selectedWeaponModes: {},
      weapons: [lrm10],
      onIntentChange,
    };
    const { rerender } = render(<PhysicalAttackPlanningSection {...props} />);
    expect(screen.getByTestId('weapon-list-locked')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText('Ammo: 2')).toBeInTheDocument();
    expect(projection).toHaveBeenCalledTimes(1);
    rerender(
      <PhysicalAttackPlanningSection {...props} className="unrelated" />,
    );
    expect(projection).toHaveBeenCalledTimes(1);
    rerender(
      <PhysicalAttackPlanningSection
        {...props}
        selected={selectedWithRounds(0)}
      />,
    );
    expect(screen.getByText('No ammo')).toBeInTheDocument();
    expect(projection).toHaveBeenCalledTimes(2);
    expect(onIntentChange).not.toHaveBeenCalled();
  });
});
