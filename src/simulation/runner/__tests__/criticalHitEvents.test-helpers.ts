/**
 * Phase 3 of `add-combat-fidelity-suite` — per-event-type unit tests
 * for `runAttackPhase`'s critical-hit event chain plus direct
 * `resolveDamage` dispatch tests.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Critical Hit Trigger Return Value Captured"
 *       (Scenarios: roll 8 → 1 crit, roll 7 → 0 crits, roll 12 → 3 crits)
 *     - "Critical Hit Events Emitted by Runner"
 *       (Scenarios: gyro destruction event chain, engine-3-hit
 *       triggers UnitDestroyed)
 *
 * Determinism strategy:
 *   - Layer 1 (resolveDamage): a custom `D6Roller` closure returns a
 *     scripted sequence so the 2d6 trigger + slot-selection roll are
 *     fully predictable.
 *   - Layer 2 (runAttackPhase): a fixed `SeededRandom` seed picks the
 *     to-hit + hit-location rolls; the test asserts on the structural
 *     event chain (causal ordering, count parity) rather than which
 *     specific slot is destroyed.
 */

import type { ICriticalHitPayload } from '@/types/gameplay/GameSessionInterfaces';
import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution/types';
import type {
  IResolveDamageResult,
  IUnitDamageState,
} from '@/utils/gameplay/damage';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoExplosionPayload,
  IAmmoSlotState,
  IComponentDestroyedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IGameState,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import {
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';
import { applyEvent } from '@/utils/gameplay/gameState/gameStateReducer';

import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { runAttackPhase } from '../phases/weaponAttack';
import { applyCritAmmoExplosions } from '../phases/weaponAttackAmmoExplosions';
import { emitCritEvents } from '../phases/weaponAttackHelpers';
import { resolveWeaponHit } from '../phases/weaponAttackHitResolution';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { buildDamageState } from '../SimulationRunnerState';

// =============================================================================
// Scripted-roller helpers
// =============================================================================

/**
 * Build a `D6Roller` that returns a scripted sequence of d6 values.
 * After the scripted values are exhausted, the roller falls back to
 * the supplied `tail` value (default: 1) so cluster cascades that
 * out-roll the script don't crash.
 *
 * Example: `scriptedRoller([4, 4, 1])` returns 4, 4, 1, 1, 1, ...
 *   - first two calls: roll1=4, roll2=4 → 2d6 sum = 8 (crit triggers)
 *   - third call: slot-selection d6 = 1 → idx (1-1) % 7 = 0 (engine slot)
 */
export function scriptedRoller(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = i < values.length ? values[i] : 1;
    i++;
    return v;
  };
}

/**
 * Build an `IUnitDamageState` with structure damage primed (armor at
 * zero, structure positive). Lets `resolveDamage` skip the armor
 * absorption path and immediately apply structure damage so the crit
 * trigger fires.
 */
export function buildPrimedDamageState(
  options: { location: 'center_torso' | 'left_arm' | 'right_arm' } = {
    location: 'center_torso',
  },
): IUnitDamageState {
  // Structure has no rear sub-locations in BattleTech, but the
  // `CombatLocation` union includes the rear keys for armor parity —
  // populate them with 0 so the type checker accepts the record.
  const allLocations = {
    head: 9,
    center_torso: 31,
    center_torso_rear: 0,
    left_torso: 21,
    left_torso_rear: 0,
    right_torso: 21,
    right_torso_rear: 0,
    left_arm: 17,
    right_arm: 17,
    left_leg: 21,
    right_leg: 21,
  } as const;
  const baseArmor = {
    head: 9,
    center_torso: 47,
    center_torso_rear: 14,
    left_torso: 32,
    left_torso_rear: 10,
    right_torso: 32,
    right_torso_rear: 10,
    left_arm: 34,
    right_arm: 34,
    left_leg: 41,
    right_leg: 41,
  } as const;

  return {
    armor: { ...baseArmor, [options.location]: 0 },
    rearArmor: { center_torso: 14, left_torso: 10, right_torso: 10 },
    structure: { ...allLocations },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
  };
}

// =============================================================================
// Layer 1 — resolveDamage dispatch tests (spec: "Critical Hit Trigger
// Return Value Captured")
// =============================================================================

// =============================================================================
// Runner-side critical hit fixtures
// =============================================================================

export function createAC20(id = 'ac-20'): IWeapon {
  return {
    id,
    name: 'AC/20',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 20,
    heat: 7,
    minRange: 0,
    ammoPerTon: 5,
    destroyed: false,
  };
}

export function createAmmoBin(
  binId: string,
  remainingRounds: number,
): IAmmoSlotState {
  return {
    binId,
    weaponType: 'ac-20',
    location: 'right_torso',
    remainingRounds,
    maxRounds: 5,
    isExplosive: true,
  };
}

export function createCritProbeWeapon(id = 'engine-probe'): IWeapon {
  return {
    id,
    name: 'Engine Probe',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 0,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

export function createUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  armorOverride: Partial<IUnitGameState['armor']> = {},
  structureOverride: Partial<IUnitGameState['structure']> = {},
  unitOverride: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 47,
      center_torso_rear: 14,
      left_torso: 32,
      left_torso_rear: 10,
      right_torso: 32,
      right_torso_rear: 10,
      left_arm: 34,
      right_arm: 34,
      left_leg: 41,
      right_leg: 41,
      ...armorOverride,
    },
    structure: {
      head: 3,
      center_torso: 31,
      left_torso: 21,
      right_torso: 21,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
      ...structureOverride,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
    ...unitOverride,
  };
}

/**
 * Build a 1v1 scenario with the target's armor pre-stripped at every
 * location so a single AC/20 hit reaches structure (and triggers
 * crits) regardless of where the hit-location roll lands.
 */
export function buildPrimedRunnerScenario(): {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  manifestsByUnit: Map<string, CriticalSlotManifest>;
} {
  const attacker = createUnit('player-1', GameSide.Player, { q: 0, r: 0 });
  // Strip target armor everywhere so structure damage is guaranteed.
  const target = createUnit(
    'opponent-1',
    GameSide.Opponent,
    { q: 1, r: 0 },
    {
      head: 0,
      center_torso: 0,
      center_torso_rear: 0,
      left_torso: 0,
      left_torso_rear: 0,
      right_torso: 0,
      right_torso_rear: 0,
      left_arm: 0,
      right_arm: 0,
      left_leg: 0,
      right_leg: 0,
    },
  );

  const weaponsByUnit = new Map<string, readonly IWeapon[]>([
    ['player-1', [createAC20()]],
    ['opponent-1', []],
  ]);

  const manifestsByUnit = new Map<string, CriticalSlotManifest>();

  const state: IGameState = {
    gameId: 'crit-test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    units: { 'player-1': attacker, 'opponent-1': target },
    turnEvents: [],
  };

  return { state, weaponsByUnit, manifestsByUnit };
}

export function runPhase(options: {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  manifestsByUnit: Map<string, CriticalSlotManifest>;
  seed?: number;
}): IGameEvent[] {
  const random = new SeededRandom(options.seed ?? 12345);
  const botPlayer = new BotPlayer(random);
  const invariantRunner = new InvariantRunner();
  const violations: IViolation[] = [];
  const events: IGameEvent[] = [];

  runAttackPhase({
    state: options.state,
    botPlayer,
    invariantRunner,
    violations,
    events,
    gameId: options.state.gameId,
    random,
    weaponsByUnit: options.weaponsByUnit,
    manifestsByUnit: options.manifestsByUnit,
  });

  return events;
}

export const playtest3AutocannonCriticalEventCases = [
  { componentName: 'AC/5', weaponId: 'ac-5-0' },
  { componentName: 'Rotary AC/5', weaponId: 'rotary-ac-5-0' },
  {
    componentName: 'Hyper Velocity Auto Cannon/10',
    weaponId: 'hyper-velocity-auto-cannon-10-0',
  },
];
