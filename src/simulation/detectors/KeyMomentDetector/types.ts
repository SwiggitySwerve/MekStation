/**
 * Shared types, constants, and utility functions for KeyMomentDetector
 */

import type {
  IKeyMoment,
  KeyMomentType,
} from '@/types/simulation-viewer/IKeyMoment';

import {
  GameSide,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { countOperationalUnits, getUnitName } from '../shared/battleState';

export { countOperationalUnits, getUnitName };

// =============================================================================
// Battle Context Types
// =============================================================================

/**
 * Static information about a unit in the battle.
 * Provided by the caller to give the detector context about each unit.
 */
export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
  readonly bv: number;
  readonly weaponIds: readonly string[];
  readonly initialArmor: Readonly<Record<string, number>>;
  readonly initialStructure: Readonly<Record<string, number>>;
}

/**
 * Static battle context provided to the detector.
 * Contains all participating units with their starting attributes.
 */
export interface BattleState {
  readonly units: readonly BattleUnit[];
}

export type MomentFactory = (
  type: string,
  event: IGameEvent,
  description: string,
  relatedUnitIds: string[],
  state: DetectorTrackingState,
  metadata?: Record<string, unknown>,
) => IKeyMoment;

export type KeyMomentHandler = (
  event: IGameEvent,
  battleState: BattleState,
  state: DetectorTrackingState,
  createMoment: MomentFactory,
) => IKeyMoment[];

// =============================================================================
// Event Payload Types
// =============================================================================
// Audit 2026-06-09 G (W5.1b): the detector-local payload duplicates
// (ICriticalHitPayload / IAmmoExplosionPayload / IHeatEffectAppliedPayload /
// IAttackResolvedExtended) that lived here "until added to
// GameSessionInterfaces" diverged from the canonical shapes the emitters
// actually produce (`attackerFacing` vs `attackerArc`, `heat` vs
// `heatLevel`). The canonical types now exist in
// `@/types/gameplay/GameSessionInterfaces` and are consumed directly via
// the typed `getPayload(event, GameEventType.X)` lookup — no local copies.

// =============================================================================
// Internal Tracking State
// =============================================================================

export interface DetectorTrackingState {
  // Tier 1 tracking
  firstBloodDetected: boolean;
  destroyedUnits: Set<string>;
  killsPerUnit: Map<string, string[]>;
  previousBvAdvantage: number;
  minPlayerBvRatio: number;
  minOpponentBvRatio: number;
  comebackDetectedPlayer: boolean;
  comebackDetectedOpponent: boolean;
  wipeDetected: boolean;
  lastStandDetected: Set<string>;
  aceKillDetected: Set<string>;

  // Tier 2 tracking
  attacksPerTurnPerTarget: Map<number, Map<string, Set<string>>>;
  weaponsFiredPerTurnPerUnit: Map<number, Map<string, Set<string>>>;
  focusFireDetected: Map<number, Set<string>>;
  alphaStrikeDetected: Map<number, Set<string>>;

  // Tier 3 tracking
  armorPerUnit: Map<string, Record<string, number>>;
  structurePerUnit: Map<string, Record<string, number>>;
  destroyedWeaponsPerUnit: Map<string, Set<string>>;
  mobilityKillDetected: Set<string>;
  weaponsKillDetected: Set<string>;

  // ID generation
  momentCounter: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Mapping from key moment type to its tier */
export const TIER_MAP: Readonly<Record<KeyMomentType, 1 | 2 | 3>> = {
  'first-blood': 1,
  'bv-swing-major': 1,
  comeback: 1,
  wipe: 1,
  'last-stand': 1,
  'ace-kill': 1,
  'head-shot': 2,
  'ammo-explosion': 2,
  'pilot-kill': 2,
  'critical-engine': 2,
  'critical-gyro': 2,
  'alpha-strike': 2,
  'focus-fire': 2,
  'heat-crisis': 3,
  'mobility-kill': 3,
  'weapons-kill': 3,
  'rear-arc-hit': 3,
  overkill: 3,
};

/** Minimum BV advantage shift to trigger bv-swing-major (30 percentage points) */
export const BV_SWING_THRESHOLD = 0.3;

/** Minimum number of attackers on same target per turn for focus-fire */
export const FOCUS_FIRE_THRESHOLD = 3;

/** Minimum kills for ace-kill */
export const ACE_KILL_THRESHOLD = 3;

/** Minimum enemy count for last-stand */
export const LAST_STAND_ENEMY_THRESHOLD = 3;

/** BV ratio threshold for comeback disadvantage (team has < 50% of enemy BV) */
export const COMEBACK_DISADVANTAGE_RATIO = 0.5;

/** Overkill damage multiplier (damage must exceed this * remaining structure) */
export const OVERKILL_MULTIPLIER = 2;

/** Leg actuator component names that indicate mobility impairment */
export const LEG_ACTUATOR_COMPONENTS = new Set([
  'hip',
  'upper_leg_actuator',
  'lower_leg_actuator',
  'foot_actuator',
]);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculates normalized BV advantage for the player side.
 * Returns value from -1.0 (total defeat) to +1.0 (total victory).
 * Returns 0.0 when both sides have zero BV.
 */
export function calculateBvAdvantage(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
): number {
  let playerBv = 0;
  let opponentBv = 0;

  for (const unit of units) {
    if (destroyedUnits.has(unit.id)) continue;
    if (unit.side === GameSide.Player) {
      playerBv += unit.bv;
    } else {
      opponentBv += unit.bv;
    }
  }

  const totalBv = playerBv + opponentBv;
  if (totalBv === 0) return 0;
  return (playerBv - opponentBv) / totalBv;
}

/**
 * Calculates raw BV ratio (teamBV / opposingBV).
 * Returns Infinity if opposing BV is 0, or 0 if team BV is 0.
 */
export function calculateBvRatio(
  units: readonly BattleUnit[],
  destroyedUnits: Set<string>,
  side: GameSide,
): number {
  let teamBv = 0;
  let opposingBv = 0;

  for (const unit of units) {
    if (destroyedUnits.has(unit.id)) continue;
    if (unit.side === side) {
      teamBv += unit.bv;
    } else {
      opposingBv += unit.bv;
    }
  }

  if (opposingBv === 0) return teamBv > 0 ? Infinity : 0;
  return teamBv / opposingBv;
}
