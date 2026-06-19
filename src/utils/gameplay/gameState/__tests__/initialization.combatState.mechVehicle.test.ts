import { Facing } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { createInitialUnitState } from '../initialization';
import {
  POSITION,
  SAMPLE_VEHICLE_INIT,
  baseGameUnit,
} from './initialization.combatState.fixtures';

describe('createInitialUnitState mech, vehicle, and legacy seeding', () => {
  it('leaves combatState undefined when unitType is omitted', () => {
    const state = createInitialUnitState(
      baseGameUnit(),
      POSITION,
      Facing.North,
    );
    expect(state.combatState).toBeUndefined();
  });

  it('leaves combatState undefined for BATTLEMECH', () => {
    const unit = baseGameUnit({ unitType: UnitType.BATTLEMECH });
    const state = createInitialUnitState(unit, POSITION, Facing.North);
    expect(state.combatState).toBeUndefined();
  });

  it('copies optional BattleMech physical and targeting gate state', () => {
    const armorTypeByLocation = { center_torso: 'Reflective' } as const;
    const unit = baseGameUnit({
      unitType: UnitType.BATTLEMECH,
      isQuad: true,
      armsFlipped: true,
      isPassenger: true,
      isSwarming: true,
      armorTypeByLocation,
      isMakingDFA: true,
      isMakingDisplacementAttack: true,
      isPushing: true,
      displacementAttackTargetId: 'target-2',
      targetedByDisplacementAttackerId: 'attacker-2',
      occupiedBuildingId: 'building-east',
      isAirborne: true,
      isEvading: true,
      evasionBonus: 3,
      sprintedThisTurn: true,
      isLoadingOrUnloadingCargo: true,
      boardId: 'board-alpha',
      weaponLocationById: {
        'medium-laser-0': 'RIGHT_ARM',
        'ac-20-1': 'RIGHT_TORSO',
      },
    });
    const state = createInitialUnitState(unit, POSITION, Facing.North);

    expect(state).toMatchObject({
      isQuad: true,
      armsFlipped: true,
      isPassenger: true,
      isSwarming: true,
      isMakingDFA: true,
      isMakingDisplacementAttack: true,
      isPushing: true,
      displacementAttackTargetId: 'target-2',
      targetedByDisplacementAttackerId: 'attacker-2',
      occupiedBuildingId: 'building-east',
      isAirborne: true,
      isEvading: true,
      evasionBonus: 3,
      sprintedThisTurn: true,
      isLoadingOrUnloadingCargo: true,
      boardId: 'board-alpha',
      weaponLocationById: {
        'medium-laser-0': 'RIGHT_ARM',
        'ac-20-1': 'RIGHT_TORSO',
      },
    });
    expect(state.armorTypeByLocation).toBe(armorTypeByLocation);
  });

  it('requires vehicleInit for VEHICLE combat state seeding', () => {
    const unit = baseGameUnit({ unitType: UnitType.VEHICLE });
    expect(() => createInitialUnitState(unit, POSITION, Facing.North)).toThrow(
      /vehicleInit/,
    );
  });

  it('copies vehicle motion type into combat state for physical targetability', () => {
    const unit = baseGameUnit({
      unitType: UnitType.VEHICLE,
      motionType: GroundMotionType.WIGE,
      vehicleInit: SAMPLE_VEHICLE_INIT,
    });
    const state = createInitialUnitState(unit, POSITION, Facing.North);

    expect(state.motionType).toBe(GroundMotionType.WIGE);
    expect(state.combatState?.kind).toBe('vehicle');
    if (state.combatState?.kind === 'vehicle') {
      expect(state.combatState.state.motionType).toBe(GroundMotionType.WIGE);
      expect(state.combatState.state.motive.originalCruiseMP).toBe(5);
      expect(state.combatState.state.altitude).toBe(1);
    }
  });
});
