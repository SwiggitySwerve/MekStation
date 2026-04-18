/**
 * Pre-Battle Skirmish Session Builder
 *
 * Pure helper that converts an `ISkirmishLaunchConfig` produced by the
 * skirmish setup UI (UnitPicker + PilotPicker + MapConfigEditor +
 * DeploymentZonePreview) into a fully-formed `IGameSession`. The helper
 * validates the config first and throws a precise error string when a
 * required piece is missing, so the UI can display the message verbatim.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/specs/game-session-management/spec.md
 */

import {
  GameSide,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { createGameSession } from '@/utils/gameplay/gameSession';

// =============================================================================
// Public Types
// =============================================================================

/** Side identifier mirroring the pickers' Player / Opponent split. */
export type SkirmishSide = 'player' | 'opponent';

/** Discrete map radius options accepted by the helper (per spec § 4.1). */
export const SUPPORTED_MAP_RADII = [5, 8, 12, 17] as const;
export type SupportedMapRadius = (typeof SUPPORTED_MAP_RADII)[number];

/**
 * One unit-and-pilot pairing per slot. The picker returns this shape
 * regardless of whether the underlying source is the canonical catalog
 * or a custom-vault entry — both expose `id`, `designation`, `tonnage`
 * and `bv`. `pilot` may be null while the user is still configuring;
 * the validator rejects the launch in that case.
 */
export interface ISkirmishUnitSelection {
  /** Unit id from `CanonicalUnitService` / vault */
  readonly unitId: string;
  /** Designation (chassis + variant) for error messages */
  readonly designation: string;
  /** Unit tonnage (display only) */
  readonly tonnage: number;
  /** Battle Value (display only, used by BV-imbalance warning) */
  readonly bv: number;
  /** Assigned pilot — null until user picks one */
  readonly pilot: ISkirmishPilotSelection | null;
}

/** Pilot snapshot — only the bits the engine needs at session start. */
export interface ISkirmishPilotSelection {
  readonly pilotId: string;
  readonly callsign: string;
  readonly gunnery: number;
  readonly piloting: number;
}

/** Per-side roster collected by the UI. */
export interface ISkirmishSideConfig {
  readonly units: readonly ISkirmishUnitSelection[];
}

/**
 * Full skirmish launch config — what the pre-battle page hands to
 * `buildFromSkirmishConfig`. Mirrors the spec's `ISkirmishLaunchConfig`
 * shape with explicit field names so a misconfigured payload throws a
 * helpful error rather than silently coercing.
 */
export interface ISkirmishLaunchConfig {
  readonly encounterId: string;
  readonly mapRadius: number;
  readonly terrainPreset: string;
  readonly player: ISkirmishSideConfig;
  readonly opponent: ISkirmishSideConfig;
  /** Turn limit (engine default 30 if omitted). */
  readonly turnLimit?: number;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a config and throw a precise error string the UI can show.
 * Errors are intentionally human-readable so the toast / inline message
 * surface can pass them straight through.
 */
function validateSkirmishConfig(config: ISkirmishLaunchConfig): void {
  // Map radius must be one of the canonical sizes
  if (!(SUPPORTED_MAP_RADII as readonly number[]).includes(config.mapRadius)) {
    throw new Error(
      `Map radius ${config.mapRadius} not in supported set {${SUPPORTED_MAP_RADII.join(
        ', ',
      )}}`,
    );
  }

  // Each side must have at least one unit
  if (config.player.units.length === 0) {
    throw new Error('Player force is empty — pick at least one unit');
  }
  if (config.opponent.units.length === 0) {
    throw new Error('Opponent force is empty — pick at least one unit');
  }

  // Every unit must have a pilot assigned (spec § 3.4)
  for (const unit of [...config.player.units, ...config.opponent.units]) {
    if (!unit.pilot) {
      throw new Error(`Pilot required for unit ${unit.designation}`);
    }
  }
}

/**
 * Lightweight check the UI uses to decide whether the "Launch Skirmish"
 * button should be enabled. Returns either the first validation error
 * message or `null` when the config is good to launch.
 *
 * Reuses `validateSkirmishConfig` so the UI and the launch path stay in
 * lock-step — there is exactly one source of truth for "is this config
 * launchable?".
 */
export function getSkirmishConfigError(
  config: ISkirmishLaunchConfig,
): string | null {
  try {
    validateSkirmishConfig(config);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid skirmish config';
  }
}

// =============================================================================
// Game Unit Construction
// =============================================================================

/**
 * Convert one picker selection into the engine's `IGameUnit` shape.
 *
 * Pilot must already be present — `validateSkirmishConfig` guarantees
 * this. Defaults the pilot skills to (4, 5) only as a defensive
 * fallback; the validator should have rejected before we get here.
 */
function toGameUnit(
  selection: ISkirmishUnitSelection,
  side: GameSide,
  index: number,
): IGameUnit {
  const pilot = selection.pilot;
  return {
    id: `${side}-${index}-${selection.unitId}`,
    name: selection.designation,
    side,
    unitRef: selection.unitId,
    pilotRef: pilot?.pilotId ?? 'unknown-pilot',
    gunnery: pilot?.gunnery ?? 4,
    piloting: pilot?.piloting ?? 5,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a starting `IGameSession` from a skirmish launch config.
 *
 * Workflow:
 *   1. Validate the config (throws on missing pilot / bad radius).
 *   2. Build `IGameUnit[]` for both sides.
 *   3. Hand to `createGameSession`, which produces a session in
 *      `GameStatus.Setup`. Caller transitions it to `Active` via
 *      `startGame` once the engine takes over.
 *
 * @throws Error with a user-readable message when validation fails.
 */
export function buildFromSkirmishConfig(
  config: ISkirmishLaunchConfig,
): IGameSession {
  validateSkirmishConfig(config);

  const playerUnits = config.player.units.map((selection, index) =>
    toGameUnit(selection, GameSide.Player, index),
  );
  const opponentUnits = config.opponent.units.map((selection, index) =>
    toGameUnit(selection, GameSide.Opponent, index),
  );

  const gameConfig: IGameConfig = {
    mapRadius: config.mapRadius,
    turnLimit: config.turnLimit ?? 30,
    victoryConditions: ['destroy_all'],
    optionalRules: [],
  };

  return createGameSession(gameConfig, [...playerUnits, ...opponentUnits]);
}

// =============================================================================
// Force Balance Helpers
// =============================================================================

/**
 * Compute the per-side BV totals — the UI uses this to display the
 * "Total BV imbalance" warning when one side has > 20% more BV.
 */
export function computeBvTotals(config: ISkirmishLaunchConfig): {
  player: number;
  opponent: number;
  imbalanceRatio: number;
} {
  const player = config.player.units.reduce((sum, u) => sum + u.bv, 0);
  const opponent = config.opponent.units.reduce((sum, u) => sum + u.bv, 0);
  const denom = Math.max(player, opponent);
  const imbalanceRatio = denom === 0 ? 0 : Math.abs(player - opponent) / denom;
  return { player, opponent, imbalanceRatio };
}
