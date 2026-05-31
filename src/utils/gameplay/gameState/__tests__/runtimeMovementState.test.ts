import {
  tacticalMapInfantryMountStateCapability,
  tacticalMapInfantryMountStateDestination,
  tacticalMapInfantryMountStateGrid,
  tacticalMapInfantryMountStateUnit,
} from '@/testing/tactical-map.infantry-mount-state-scenario';
import {
  Facing,
  GameEventType,
  GameSide,
  LockState,
  MovementType,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';
import { createRuntimeMovementStateChangedEvent } from '@/utils/gameplay/gameEvents';
import { validateCommittedMovement } from '@/utils/gameplay/movement/commitValidation';
import { deriveMovementRangeHexForDestination } from '@/utils/gameplay/movement/reachable';

import { applyEvent, createInitialGameState } from '..';

function stateWithUnit(unit: IUnitGameState): IGameState {
  return {
    ...createInitialGameState('game-1'),
    units: { [unit.id]: unit },
  };
}

describe('runtime movement state events', () => {
  it('replays infantry dismount state into projection and commit validation', () => {
    const mountedUnit = {
      ...tacticalMapInfantryMountStateUnit(true),
      unitHeight: 1,
    };
    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      mountedUnit.id,
      {
        source: 'infantry_mount_action',
        infantryMounted: false,
      },
    );

    const nextState = applyEvent(stateWithUnit(mountedUnit), event);
    const dismounted = nextState.units[mountedUnit.id];
    const capability = tacticalMapInfantryMountStateCapability();
    const grid = tacticalMapInfantryMountStateGrid();
    const destination = tacticalMapInfantryMountStateDestination;
    const projection = deriveMovementRangeHexForDestination(
      dismounted,
      MovementType.Walk,
      grid,
      capability,
      destination,
    );

    expect(event.type).toBe(GameEventType.RuntimeMovementStateChanged);
    expect(dismounted).toMatchObject({
      infantryMounted: false,
      unitHeight: 1,
    });
    expect(projection).toMatchObject({
      reachable: true,
      movementType: 'walk',
      movementMode: 'naval',
      mpCost: 1,
    });

    const committed = validateCommittedMovement({
      grid,
      unit: dismounted,
      to: destination,
      facing: Facing.Northeast,
      movementType: MovementType.Walk,
      capability,
      path: projection?.path,
    });

    expect(committed.valid).toBe(true);
    if (!committed.valid) {
      throw new Error(committed.details);
    }
    expect(committed.mpCost).toBe(projection?.mpCost);
    expect(committed.path).toEqual(projection?.path);
  });

  it('can clear stale runtime height when replaying conversion state', () => {
    const unit: IUnitGameState = {
      id: 'lam-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      facing: Facing.North,
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
      conversionMode: 'mek',
      unitHeight: 1,
    };

    const event = createRuntimeMovementStateChangedEvent(
      'game-1',
      1,
      1,
      unit.id,
      {
        source: 'conversion_action',
        conversionMode: 'fighter',
        unitHeight: null,
      },
    );

    const nextState = applyEvent(stateWithUnit(unit), event);
    const converted = nextState.units[unit.id];

    expect(converted.conversionMode).toBe('fighter');
    expect(converted).not.toHaveProperty('unitHeight');
  });
});
