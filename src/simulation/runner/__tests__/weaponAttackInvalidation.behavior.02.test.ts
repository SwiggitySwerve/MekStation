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
  it('emits AttackInvalid for out-of-ammo declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 0,
    });
    const stateWithAmmo = withAttackerAmmo(
      createWeaponAttackState({ q: 3, r: 0 }),
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
      reason: 'OutOfAmmo',
    });

    assertNoCombatSideEffects(result, stateWithAmmo, ammoBin);
  });

  it('emits AttackInvalid for jammed declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithJammedWeapon = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'player-1': {
            ...initialState.units['player-1'],
            jammedWeapons: [AC20_WEAPON_ID],
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithJammedWeapon,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'WeaponJammed',
    });

    assertNoCombatSideEffects(result, stateWithJammedWeapon, ammoBin);
    expect(result.units['player-1'].jammedWeapons).toEqual([AC20_WEAPON_ID]);
  });

  it('marks critical-destroyed weapon mounts unavailable to bot fire planning', () => {
    const attackerUnit = createUnit('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const attacker = toAIUnitState(
      {
        ...attackerUnit,
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          weaponsDestroyed: [AC20_WEAPON_ID],
        },
      },
      [createAC20()],
    );
    const target = toAIUnitState(
      createUnit('opponent-1', GameSide.Opponent, { q: 3, r: 0 }),
    );

    expect(attacker.weapons).toEqual([
      expect.objectContaining({ id: AC20_WEAPON_ID, destroyed: true }),
    ]);
    expect(
      new BotPlayer(new SeededRandom(123)).playAttackPhase(attacker, [target]),
    ).toBeNull();
  });

  it('emits AttackInvalid for critical-destroyed weapon declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const stateWithDestroyedWeapon = withAttackerAmmo(
      {
        ...initialState,
        units: {
          ...initialState.units,
          'player-1': {
            ...initialState.units['player-1'],
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              weaponsDestroyed: [AC20_WEAPON_ID],
            },
          },
        },
      },
      ammoBin,
    );

    const { events, result } = runInvalidationScenario({
      state: stateWithDestroyedWeapon,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'WeaponDestroyed',
    });

    assertNoCombatSideEffects(result, stateWithDestroyedWeapon, ammoBin);
  });

  it('emits AttackInvalid for same-hex declarations without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 0, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'SameHex',
    });

    assertNoCombatSideEffects(result, initialState);
  });

  it('emits AttackInvalid for hydrated weapon ids missing from the unit weapon map', () => {
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createAC20(),
      declaredWeaponId: 'missing-hydrated-weapon',
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: 'missing-hydrated-weapon',
      reason: 'UnknownWeapon',
    });

    assertNoCombatSideEffects(result, initialState);
  });

  it('emits AttackInvalid for direct-fire no-LOS declarations without combat side effects', () => {
    const ammoBin = createAmmoBin({
      weaponType: AC20_WEAPON_ID,
      remainingRounds: 4,
    });
    const initialState = createWeaponAttackState({ q: 6, r: 0 });
    const stateWithAmmo = withAttackerAmmo(initialState, ammoBin);
    const grid = createBlockedGrid();

    expect(
      calculateLOS(
        stateWithAmmo.units['player-1'].position,
        stateWithAmmo.units['opponent-1'].position,
        grid,
      ).hasLOS,
    ).toBe(false);

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
