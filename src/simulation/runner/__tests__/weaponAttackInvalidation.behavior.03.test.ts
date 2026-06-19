/**
 * Behavior-class coverage for invalid ranged attacks.
 *
 * These tests lock the no-side-effects contract: invalid declarations emit
 * `AttackInvalid` and stop before to-hit, heat, ammo, damage, or per-turn fire
 * state changes.
 */

import type {
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
} from '@/types/gameplay/GameSessionAttackEvents';
import type { IAmmoSlotState } from '@/types/gameplay/GameSessionInterfaces';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameEvent,
  type IGameState,
  type IHex,
  type IMovementCapability,
  type IHexGrid,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

import type {
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';
import type { IViolation } from '../../invariants/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { runAttackPhase } from '../phases/weaponAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { toAIUnitState } from '../SimulationRunnerSupport';
import {
  AC20_WEAPON_ID,
  LRM15_WEAPON_ID,
  DeclaresWeaponAttackAI,
  createAC20,
  createLRM15,
  createAmmoBin,
  createUnit,
  createHex,
  createBlockedGrid,
  createGroundedDropShipBlockedGrid,
  createLandToUnderwaterGrid,
  createUnderwaterSeparatedByClearGrid,
  createSameBuildingBlockedGrid,
  createSameBuildingLevelBlockedGrid,
  createBuildingHeightBlockedGrid,
  createSinglePathElevationBlockedGrid,
  createDividedLosBlockedGrid,
  createDividedElevationBlockedGrid,
  createDiagramOnlyHeavyWoodsGrid,
  createWeaponAttackState,
  runInvalidationScenario,
  withAttackerAmmo,
  assertNoCombatSideEffects,
  attackDeclaredPayload,
} from './weaponAttackInvalidation.behavior.test-helpers';

describe('runAttackPhase invalid attacks', () => {
  it('emits AttackInvalid when a represented grounded DropShip blocks direct LOS', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 4, r: 0 });
    const stateWithDropShip: IGameState = {
      ...initialState,
      units: {
        ...initialState.units,
        'dropship-1': {
          ...createUnit('dropship-1', GameSide.Opponent, { q: 2, r: 0 }),
          unitType: 'DropShip',
          isAirborne: false,
        },
      },
    };
    const stateWithAmmo = withAttackerAmmo(stateWithDropShip, ammoBin);
    const grid = createGroundedDropShipBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
        undefined,
        undefined,
        {
          occupants: {
            'dropship-1': {
              id: 'dropship-1',
              unitType: 'DropShip',
              airborne: false,
            },
          },
        },
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 2, r: 0 },
    });

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for source-backed land-to-underwater no-LOS declarations without combat side effects', () => {
    const targetPosition = { q: 3, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createLandToUnderwaterGrid(targetPosition);

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: targetPosition,
      blockingTerrain: TerrainType.Water,
    });

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for underwater sightlines broken by an elevated intervening clear hex without combat side effects', () => {
    const targetPosition = { q: 4, r: 0 };
    const blockerPosition = { q: 2, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createUnderwaterSeparatedByClearGrid(targetPosition);

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: blockerPosition,
      blockingTerrain: TerrainType.Water,
    });

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for represented same-building no-LOS declarations without combat side effects', () => {
    const targetPosition = { q: 4, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createSameBuildingBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 3, r: 0 },
      blockingTerrain: TerrainType.Building,
    });

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for represented same-building endpoint elevation LOS blockers without combat side effects', () => {
    const targetPosition = { q: 3, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createSameBuildingLevelBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 2, r: 0 },
      blockingTerrain: TerrainType.Building,
    });

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });
});
