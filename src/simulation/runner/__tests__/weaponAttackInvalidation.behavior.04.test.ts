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
  it('emits AttackInvalid for represented building-height LOS blockers without combat side effects', () => {
    const targetPosition = { q: 2, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createBuildingHeightBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 1, r: 0 },
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

  it('emits AttackInvalid for represented single-path elevation blockers without combat side effects', () => {
    const targetPosition = { q: 2, r: 0 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createSinglePathElevationBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 1, r: 0 },
      blockingElevation: 2,
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

  it('emits AttackInvalid for represented divided-LOS blockers without combat side effects', () => {
    const targetPosition = { q: 2, r: -4 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createDividedLosBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 0, r: -1 },
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

  it('emits AttackInvalid for represented divided-LOS elevation blockers without combat side effects', () => {
    const targetPosition = { q: 2, r: -4 };
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState(targetPosition);
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createDividedElevationBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ),
    ).toMatchObject({
      hasLOS: false,
      blockedBy: { q: 0, r: -1 },
      blockingElevation: 2,
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

  it('emits AttackInvalid for indirect-capable no-LOS declarations without a spotter', () => {
    const ammoBin = createAmmoBin({
      weaponType: 'lrm-15',
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 6, r: 0 });
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createBlockedGrid();

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createLRM15(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: LRM15_WEAPON_ID,
      reason: 'NoLineOfSight',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('does not elect sprinting or evading spotters for no-LOS indirect declarations', () => {
    const ammoBin = createAmmoBin({
      weaponType: 'lrm-15',
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 6, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'sprinting-spotter': {
            ...createUnit('sprinting-spotter', GameSide.Player, {
              q: 5,
              r: 1,
            }),
            sprintedThisTurn: true,
          },
          'evading-spotter': {
            ...createUnit('evading-spotter', GameSide.Player, {
              q: 5,
              r: -1,
            }),
            isEvading: true,
          },
        },
      },
      ammoBin,
    );
    const grid = createBlockedGrid();

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createLRM15(),
      grid,
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: LRM15_WEAPON_ID,
      reason: 'NoLineOfSight',
    });
    expect(
      String((events[0].payload as IAttackInvalidPayload).details),
    ).toContain(
      'No friendly unit with line of sight to target is available as spotter',
    );

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });
});
