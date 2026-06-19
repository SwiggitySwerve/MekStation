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
  it('emits AttackInvalid for a missing target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const stateWithAmmo = withAttackerAmmo(
      createWeaponAttackState({ q: 3, r: 0 }),
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
      targetId: 'missing-target',
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'missing-target',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a destroyed target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            destroyed: true,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a same-side target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            side: GameSide.Player,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for a retreated target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            hasRetreated: true,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for an ejected target without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithAmmo = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'opponent-1': {
            ...initialState.units['opponent-1'],
            hasEjected: true,
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithAmmo,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'InvalidTarget',
      details: "Target 'opponent-1' has ejected",
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });
});
