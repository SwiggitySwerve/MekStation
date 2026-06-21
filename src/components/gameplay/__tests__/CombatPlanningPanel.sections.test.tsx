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

import { WeaponAttackPlanningSection } from '../CombatPlanningPanel.sections';
import { mediumLaser } from './addCombatPhaseUIFlows.smoke.test-helpers';

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
