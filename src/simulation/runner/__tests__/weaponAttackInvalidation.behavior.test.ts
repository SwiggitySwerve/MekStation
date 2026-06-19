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
  it('emits declared range brackets and matching range modifiers for valid weapon attacks', () => {
    const cases: readonly {
      readonly distance: number;
      readonly range: NonNullable<IAttackDeclaredPayload['range']>;
      readonly modifierName: string;
      readonly modifierValue: number;
      readonly toHitNumber: number;
    }[] = [
      {
        distance: 3,
        range: 'short',
        modifierName: 'Range (short)',
        modifierValue: 0,
        toHitNumber: 4,
      },
      {
        distance: 6,
        range: 'medium',
        modifierName: 'Range (medium)',
        modifierValue: 2,
        toHitNumber: 6,
      },
      {
        distance: 9,
        range: 'long',
        modifierName: 'Range (long)',
        modifierValue: 4,
        toHitNumber: 8,
      },
    ];

    for (const testCase of cases) {
      const { events } = runInvalidationScenario({
        state: createWeaponAttackState({ q: testCase.distance, r: 0 }),
        weapon: createAC20(),
      });

      expect(
        events.some((event) => event.type === GameEventType.AttackInvalid),
      ).toBe(false);

      const payload = attackDeclaredPayload(events);
      expect(payload).toMatchObject({
        attackerId: 'player-1',
        targetId: 'opponent-1',
        weapons: [AC20_WEAPON_ID],
        range: testCase.range,
        toHitNumber: testCase.toHitNumber,
      });
      expect(payload.modifiers).toContainEqual(
        expect.objectContaining({
          name: testCase.modifierName,
          value: testCase.modifierValue,
        }),
      );
    }
  });

  it('threads TacOps LOS1 optional rules into represented diagram terrain modifiers', () => {
    const grid = createDiagramOnlyHeavyWoodsGrid();
    const state = createWeaponAttackState({ q: 3, r: 0 });

    const withoutTacOps = attackDeclaredPayload(
      runInvalidationScenario({
        state,
        weapon: createAC20(),
        grid,
        optionalRules: [],
      }).events,
    );
    const withTacOps = attackDeclaredPayload(
      runInvalidationScenario({
        state,
        weapon: createAC20(),
        grid,
        optionalRules: ['ADVANCED_COMBAT_TAC_OPS_LOS1'],
      }).events,
    );

    expect(withoutTacOps.toHitNumber).toBe(4);
    expect(withoutTacOps.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Intervening terrain' }),
      ]),
    );
    expect(withTacOps.toHitNumber).toBe(6);
    expect(withTacOps.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Intervening Terrain',
          value: 2,
        }),
      ]),
    );
  });

  it('keeps minimum-range attacks valid while surfacing the to-hit penalty', () => {
    const initialState = createWeaponAttackState({ q: 1, r: 0 });
    const { events, result } = runInvalidationScenario({
      state: initialState,
      weapon: createLRM15(),
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [LRM15_WEAPON_ID],
      range: 'short',
      toHitNumber: 10,
    });
    expect(payload.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Minimum Range',
        value: 6,
      }),
    );
    expect(result.units['player-1'].heat).toBeGreaterThanOrEqual(
      initialState.units['player-1'].heat,
    );
  });

  it('emits AttackInvalid for out-of-range declarations without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 12, r: 0 });
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
      reason: 'OutOfRange',
    });

    assertNoCombatSideEffects(result, initialState);
  });

  it('keeps extreme-range attacks valid when the weapon carries an extreme range', () => {
    const { events } = runInvalidationScenario({
      state: createWeaponAttackState({ q: 12, r: 0 }),
      weapon: { ...createAC20(), extremeRange: 18 },
    });

    expect(
      events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);

    const payload = attackDeclaredPayload(events);
    expect(payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weapons: [AC20_WEAPON_ID],
      range: 'extreme',
      toHitNumber: 10,
    });
    expect(payload.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Range (extreme)',
        value: 6,
      }),
    );
  });

  it('emits AttackInvalid for evading attackers without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const evadingState: IGameState = {
      ...initialState,
      units: {
        ...initialState.units,
        'player-1': {
          ...initialState.units['player-1'],
          isEvading: true,
        },
      },
    };

    const { events, result } = runInvalidationScenario({
      state: evadingState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'AttackerEvading',
      details: "Attacker 'player-1' is evading and cannot fire ranged weapons",
    });

    assertNoCombatSideEffects(result, evadingState);
  });

  it('emits AttackInvalid for sprinting attackers without combat side effects', () => {
    const initialState = createWeaponAttackState({ q: 3, r: 0 });
    const sprintingState: IGameState = {
      ...initialState,
      units: {
        ...initialState.units,
        'player-1': {
          ...initialState.units['player-1'],
          sprintedThisTurn: true,
        },
      },
    };

    const { events, result } = runInvalidationScenario({
      state: sprintingState,
      weapon: createAC20(),
    });

    expect(events.map((event) => event.type)).toEqual([
      GameEventType.AttackInvalid,
    ]);
    expect(events[0].payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      weaponId: AC20_WEAPON_ID,
      reason: 'AttackerSprinted',
      details: "Attacker 'player-1' sprinted and cannot fire ranged weapons",
    });

    assertNoCombatSideEffects(result, sprintingState);
  });
});
