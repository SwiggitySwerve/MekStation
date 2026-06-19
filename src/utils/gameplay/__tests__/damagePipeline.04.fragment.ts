/**
 * Damage Pipeline Integration Tests
 *
 * Tests for Phase 3: Wire Damage Pipeline
 * Covers: armor absorption, structure penetration, transfer chain,
 * side torso cascade, head cap, damageThisPhase tracking
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

describe('Damage Pipeline - Full Integration', () => {
  it('should use resolveDamage() in resolveAttack() and emit proper events', () => {
    const units = [
      createTestUnit({
        id: 'attacker',
        name: 'Attacker',
        side: GameSide.Player,
      }),
      createTestUnit({
        id: 'target',
        name: 'Target',
        side: GameSide.Opponent,
        abilities: ['edge_when_headhit'],
        edgePointsRemaining: 1,
      }),
    ];
    const config = createTestConfig();
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);

    session = rollInitiative(session);
    session = advancePhase(session);
    session = advancePhase(session);

    expect(session.currentState.phase).toBe(GamePhase.WeaponAttack);

    session = declareAttack(
      session,
      'attacker',
      'target',
      [
        {
          weaponId: 'wpn-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ],
      3,
      RangeBracket.Short,
    );
    let rollCount = 0;
    const deterministicRoller: DiceRoller = () => {
      rollCount++;
      if (rollCount === 1) {
        return { dice: [6, 6], total: 12, isSnakeEyes: false, isBoxcars: true };
      }
      return { dice: [4, 3], total: 7, isSnakeEyes: false, isBoxcars: false };
    };

    const attackEvent = session.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    )!;

    session = resolveAttack(session, attackEvent, deterministicRoller);

    const resolvedEvents = session.events.filter(
      (e) => e.type === GameEventType.AttackResolved,
    );
    expect(resolvedEvents.length).toBe(1);

    const damageEvents = session.events.filter(
      (e) => e.type === GameEventType.DamageApplied,
    );
    expect(damageEvents.length).toBeGreaterThan(0);

    const damagePayload = damageEvents[0].payload as IDamageAppliedPayload;
    expect(damagePayload.unitId).toBe('target');
    expect(damagePayload.damage).toBeGreaterThanOrEqual(0);
    expect(typeof damagePayload.locationDestroyed).toBe('boolean');
  });

  it('spends target Edge to replace a head-hit location in resolveAttack()', () => {
    const units = [
      createTestUnit({
        id: 'attacker',
        name: 'Attacker',
        side: GameSide.Player,
      }),
      createTestUnit({
        id: 'target',
        name: 'Target',
        side: GameSide.Opponent,
        abilities: ['edge_when_headhit'],
        edgePointsRemaining: 1,
      }),
    ];
    const config = createTestConfig();
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);

    session = rollInitiative(session);
    session = advancePhase(session);
    session = advancePhase(session);
    session = declareAttack(
      session,
      'attacker',
      'target',
      [
        {
          weaponId: 'wpn-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ],
      3,
      RangeBracket.Short,
    );

    let rollCount = 0;
    const deterministicRoller: DiceRoller = () => {
      rollCount++;
      if (rollCount === 1 || rollCount === 2) {
        return { dice: [6, 6], total: 12, isSnakeEyes: false, isBoxcars: true };
      }
      return { dice: [3, 4], total: 7, isSnakeEyes: false, isBoxcars: false };
    };

    const attackEvent = session.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    )!;

    session = resolveAttack(session, attackEvent, deterministicRoller);

    const resolved = session.events.find(
      (e) => e.type === GameEventType.AttackResolved,
    )?.payload as IAttackResolvedPayload;

    expect(resolved).toMatchObject({
      hit: true,
      location: 'center_torso',
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_headhit',
      edgePointsRemaining: 0,
      edgeSupersededLocation: 'head',
      edgeSupersededRoll: 12,
    });
    expect(session.currentState.units.target.edgePointsRemaining).toBe(0);
    const appliedLocations = session.events
      .filter((e) => e.type === GameEventType.DamageApplied)
      .map((e) => (e.payload as IDamageAppliedPayload).location);
    expect(appliedLocations).not.toContain('head');
    expect(appliedLocations).toContain('center_torso');
  });

  it('spends target Edge to replace a TAC location in resolveAttack without stale TAC critical effects', () => {
    const units = [
      createTestUnit({
        id: 'attacker',
        name: 'Attacker',
        side: GameSide.Player,
      }),
      createTestUnit({
        id: 'target',
        name: 'Target',
        side: GameSide.Opponent,
        abilities: ['edge_when_tac'],
        edgePointsRemaining: 1,
      }),
    ];
    const config = createTestConfig();
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);

    session = rollInitiative(session);
    session = advancePhase(session);
    session = advancePhase(session);

    session = declareAttack(
      session,
      'attacker',
      'target',
      [
        {
          weaponId: 'wpn-1',
          weaponName: 'Medium Laser',
          damage: 5,
          heat: 3,
          category: WeaponCategory.ENERGY,
          minRange: 0,
          shortRange: 3,
          mediumRange: 6,
          longRange: 9,
          isCluster: false,
        },
      ],
      3,
      RangeBracket.Short,
    );

    let rollCount = 0;
    const deterministicRoller: DiceRoller = () => {
      rollCount++;
      if (rollCount === 1) {
        return { dice: [6, 6], total: 12, isSnakeEyes: false, isBoxcars: true };
      }
      if (rollCount === 2) {
        return { dice: [1, 1], total: 2, isSnakeEyes: true, isBoxcars: false };
      }
      return { dice: [4, 4], total: 8, isSnakeEyes: false, isBoxcars: false };
    };

    const attackEvent = session.events.find(
      (e) => e.type === GameEventType.AttackDeclared,
    )!;

    session = resolveAttack(session, attackEvent, deterministicRoller);

    const resolved = session.events.find(
      (e) => e.type === GameEventType.AttackResolved,
    )?.payload as IAttackResolvedPayload;

    expect(resolved).toMatchObject({
      hit: true,
      location: 'left_torso',
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_tac',
      edgePointsRemaining: 0,
      edgeSupersededLocation: 'center_torso',
      edgeSupersededRoll: 2,
    });
    expect(session.currentState.units.target.edgePointsRemaining).toBe(0);
    expect(
      session.events.some((e) => e.type === GameEventType.CriticalHitResolved),
    ).toBe(false);
    expect(
      session.events.some((e) => e.type === GameEventType.ComponentDestroyed),
    ).toBe(false);
  });
});
