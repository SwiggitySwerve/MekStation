/**
 * Phase 4 of `add-combat-fidelity-suite` — per-event-type unit tests
 * for `runHeatPhase`'s heat lifecycle event chain plus the ammo
 * consumption + explosion seam in `runAttackPhase`.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Heat Lifecycle Events"
 *       (Scenarios: alpha-strike at heat 0 → shutdown event chain;
 *        Heat phase events fire even when heat is zero)
 *     - "Ammo Consumption and Explosion Events"
 *       (Scenarios: AC/20 cookoff from internal critical; with CASE
 *        explosion stays in source location)
 *   openspec/changes/add-combat-fidelity-suite/specs/ammo-explosion-system/spec.md
 *     - "Heat-Triggered Ammo Explosion"
 *       (Scenarios: heat 19 with seeded roller; heat 19 with safe roll)
 *
 * Determinism strategy:
 *   - `SeededRandom` controls the to-hit / hit-location / shutdown /
 *     ammo-explosion rolls used inside the runner phases.
 *   - Tests assert structural event-shape (count, ordering, payload
 *     shape) rather than exact-slot-destroyed predicates so they
 *     stay stable across seed sweeps.
 */

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';
import type { IResolveDamageResult } from '@/utils/gameplay/damage';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoConsumedPayload,
  IAmmoExplosionPayload,
  IDamageAppliedPayload,
  IAmmoSlotState,
  IGameEvent,
  IGameState,
  IHeatEffectAppliedPayload,
  ILocationDestroyedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  ITransferDamagePayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { applyHeatInducedAmmoExplosions } from '../phases/heatAmmoExplosions';
import { runHeatPhase } from '../phases/postCombat';
import { runAttackPhase } from '../phases/weaponAttack';
import { applyCritAmmoExplosions } from '../phases/weaponAttackAmmoExplosions';
import {
  DEFAULT_COMPONENT_DAMAGE,
  EVADE_HEAT_BONUS,
  RUN_HEAT,
  SPRINT_HEAT,
} from '../SimulationRunnerConstants';
import { buildDamageState } from '../SimulationRunnerState';

// =============================================================================
// Fixture helpers
// =============================================================================

export function createAtlasWeapons(): readonly IWeapon[] {
  // Hand-rolled approximation of the Atlas AS7-D weapon set with the
  // canonical heat values. Per-mount ids carry the catalog `-{index}`
  // suffix so `weaponTypeFromMountId` can recover the base type for
  // ammo bin matching.
  return [
    {
      id: 'ac-20-0',
      name: 'AC/20',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 20,
      heat: 7,
      minRange: 0,
      ammoPerTon: 5,
      destroyed: false,
    },
    {
      id: 'lrm-20-1',
      name: 'LRM-20',
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
      damage: 20,
      heat: 6,
      minRange: 6,
      ammoPerTon: 6,
      destroyed: false,
    },
    {
      id: 'srm-6-2',
      name: 'SRM-6',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 12,
      heat: 4,
      minRange: 0,
      ammoPerTon: 15,
      destroyed: false,
    },
    {
      id: 'medium-laser-3',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    },
    {
      id: 'medium-laser-4',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    },
    {
      id: 'medium-laser-5',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    },
    {
      id: 'medium-laser-6',
      name: 'Medium Laser',
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
      damage: 5,
      heat: 3,
      minRange: 0,
      ammoPerTon: -1,
      destroyed: false,
    },
  ];
}

export function createScriptedHeatRandom(
  d6Rolls: readonly number[],
  locationIndex = 2,
): SeededRandom {
  const values = d6Rolls.map((roll) => (roll - 1) / 6 + 0.001);
  return {
    next: () => values.shift() ?? 0,
    nextInt: () => locationIndex,
  } as unknown as SeededRandom;
}

export function createUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
  overrides: Partial<IUnitGameState> = {},
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
    ...overrides,
  };
}

export function makeMinimalState(
  units: Record<string, IUnitGameState>,
): IGameState {
  return {
    gameId: 'heat-test-game',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Heat,
    activationIndex: 0,
    units,
    turnEvents: [],
  };
}

export function buildAmmoCookoffScenario(): {
  state: IGameState;
  weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
  manifestsByUnit: Map<string, CriticalSlotManifest>;
} {
  const ac20: IWeapon = {
    id: 'ac-20-0',
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

  const attacker = createUnit(
    'player-1',
    GameSide.Player,
    { q: 0, r: 0 },
    {
      ammoState: {
        'ac-20-bin-0': {
          binId: 'ac-20-bin-0',
          weaponType: 'ac-20',
          location: 'right_torso',
          remainingRounds: 5,
          maxRounds: 5,
          isExplosive: true,
        },
      },
    },
  );

  // Strip target armor so the AC/20 hit reaches structure and triggers crits.
  const target = createUnit(
    'opponent-1',
    GameSide.Opponent,
    { q: 1, r: 0 },
    {
      armor: {
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
      ammoState: {
        'ac-20-bin-0': {
          binId: 'ac-20-bin-0',
          weaponType: 'ac-20',
          location: 'right_torso',
          remainingRounds: 5,
          maxRounds: 5,
          isExplosive: true,
        },
      },
    },
  );

  const weaponsByUnit = new Map<string, readonly IWeapon[]>([
    ['player-1', [ac20]],
    ['opponent-1', [ac20]],
  ]);

  return {
    state: {
      gameId: 'ammo-cookoff-test',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: { 'player-1': attacker, 'opponent-1': target },
      turnEvents: [],
    },
    weaponsByUnit,
    manifestsByUnit: new Map(),
  };
}

export function runAttack(
  scenario: {
    state: IGameState;
    weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>;
    manifestsByUnit: Map<string, CriticalSlotManifest>;
  },
  seed: number,
): IGameEvent[] {
  const random = new SeededRandom(seed);
  const botPlayer = new BotPlayer(random);
  const invariantRunner = new InvariantRunner();
  const violations: IViolation[] = [];
  const events: IGameEvent[] = [];

  runAttackPhase({
    state: scenario.state,
    botPlayer,
    invariantRunner,
    violations,
    events,
    gameId: scenario.state.gameId,
    random,
    weaponsByUnit: scenario.weaponsByUnit,
    manifestsByUnit: scenario.manifestsByUnit,
  });

  return events;
}
