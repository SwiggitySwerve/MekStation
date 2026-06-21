/**
 * Damage Pipeline Integration Tests
 *
 * Tests for Phase 3: Wire Damage Pipeline
 * Covers: armor absorption, structure penetration, transfer chain,
 * side torso cascade, head full damage, damageThisPhase tracking
 */

import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  GamePhase,
  GameStatus,
  GameSide,
  GameEventType,
  LockState,
  Facing,
  MovementType,
  RangeBracket,
  FiringArc,
  IGameConfig,
  IGameUnit,
  IGameSession,
  IGameState,
  IUnitGameState,
  IAttackDeclaredPayload,
  IAttackResolvedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IWeaponAttack,
} from '@/types/gameplay';

import {
  resolveDamage,
  applyDamageWithTransfer,
  applyDamageToLocation,
  createDamageState,
  IUnitDamageState,
} from '../damage';
import { createDamageAppliedEvent } from '../gameEvents';
import {
  createGameSession,
  startGame,
  declareAttack,
  lockAttack,
  resolveAttack,
  resolveAllAttacks,
  DiceRoller,
} from '../gameSession';
import { rollInitiative, advancePhase } from '../gameSession';
import { emitCriticalEvents } from '../gameSessionAttackResolutionHelpers';
import { applyEvent, createInitialUnitState } from '../gameState';

// =============================================================================
// Helpers
// =============================================================================

function createTestConfig(): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function createTestUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Test Mech',
    side: GameSide.Player,
    unitRef: 'test',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    // Seed ammo bins so ammo-consuming weapon tests (AC/20, etc.) can
    // fire. Per wire-ammo-consumption, firing with no matching non-empty
    // bin emits AttackInvalid instead of AttackResolved.
    ammoConstruction: [
      {
        binId: 'bin-ac20-1',
        weaponType: 'AC/20',
        location: 'rt',
        maxRounds: 40,
        damagePerRound: 20,
        isExplosive: true,
      },
    ],
    ...overrides,
  };
}

function createTestDamageState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    armor: {
      head: 9,
      center_torso: 20,
      left_torso: 15,
      right_torso: 15,
      left_arm: 10,
      right_arm: 10,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: {
      center_torso: 10,
      left_torso: 7,
      right_torso: 7,
    },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 16,
      left_torso_rear: 12,
      right_torso_rear: 12,
    },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    ...overrides,
  };
}

describe('resolveDamage - Head Destruction', () => {
  it('should destroy unit when head is destroyed', () => {
    const state = createTestDamageState({
      armor: {
        ...createTestDamageState().armor,
        head: 0,
      },
      structure: {
        ...createTestDamageState().structure,
        head: 1,
      },
    });

    const result = resolveDamage(state, 'head', 3);
    expect(result.result.unitDestroyed).toBe(true);
    expect(result.result.destructionCause).toBe('head_destroyed');
  });
});

describe('resolveDamage - Pilot Damage on Head Hit', () => {
  it('should inflict pilot damage when head takes any damage', () => {
    const state = createTestDamageState();
    const result = resolveDamage(state, 'head', 3);

    expect(result.result.pilotDamage).toBeDefined();
    expect(result.result.pilotDamage!.woundsInflicted).toBe(1);
  });

  it('should not inflict pilot damage for non-head locations', () => {
    const state = createTestDamageState();
    const result = resolveDamage(state, 'center_torso', 10);

    expect(result.result.pilotDamage).toBeUndefined();
  });
});
