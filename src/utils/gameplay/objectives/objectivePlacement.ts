/**
 * Scenario Objective Placement
 *
 * Maps a scenario's objective type + victory condition onto a concrete
 * placement config, and places objective hexes deterministically from
 * the scenario seed.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { IHexCoordinate } from '@/types/gameplay';
import type {
  IObjectiveMarker,
  IObjectivePlacementConfig,
  ObjectiveMarkerType,
  VictoryCondition,
} from '@/types/scenario/ScenarioInterfaces';

import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  DeploymentZone,
  ScenarioObjectiveType,
} from '@/types/scenario/ScenarioInterfaces';
import { coordToKey } from '@/utils/gameplay/hexMath';

/**
 * Default consecutive hold turns for a generated Capture scenario.
 * Per design.md Open Question: control at the end of a turn counts as
 * captured. Revisit if Capture matches end too quickly.
 */
export const DEFAULT_CAPTURE_HOLD_TURNS = 1;

/**
 * Default required-unit count for a generated Breakthrough scenario
 * when no victory condition specifies one.
 */
export const DEFAULT_BREAKTHROUGH_REQUIRED_UNITS = 1;

/**
 * Maps a scenario `ScenarioObjectiveType` to the hex-objective family
 * the engine supports. `destroy` / `escort` / `recon` / `custom` have
 * no hex markers and return `null`.
 */
export function objectiveMarkerTypeFor(
  type: ScenarioObjectiveType,
): ObjectiveMarkerType | null {
  switch (type) {
    case ScenarioObjectiveType.Capture:
      return 'capture';
    case ScenarioObjectiveType.Defend:
      return 'defend';
    case ScenarioObjectiveType.Breakthrough:
      return 'breakthrough';
    default:
      return null;
  }
}

/**
 * Derives the objective placement config for a scenario from its
 * objective type and (optionally) its victory conditions (task 1.3).
 * Returns `null` for a markerless (`destroy` / `escort` / `recon`)
 * scenario.
 *
 * Hex count:
 *   - Capture — `objectiveCount` from an `ICaptureVictoryCondition`,
 *     clamped to 1..3.
 *   - Defend  — 1 hex (single defended position).
 *   - Breakthrough — 1 exit hex.
 *
 * Hold turns / required units are pulled from the matching victory
 * condition when present, else the defaults above.
 */
export function deriveObjectivePlacementConfig(
  objectiveType: ScenarioObjectiveType,
  victoryConditions: readonly VictoryCondition[] = [],
): IObjectivePlacementConfig | null {
  const markerType = objectiveMarkerTypeFor(objectiveType);
  if (markerType === null) return null;

  if (markerType === 'capture') {
    const capture = victoryConditions.find(
      (v) => v.id === 'capture_objective' || v.id === 'capture_and_hold',
    ) as { objectiveCount?: number; holdTurns?: number } | undefined;
    const hexCount = clamp(capture?.objectiveCount ?? 1, 1, 3);
    const holdTurnsRequired =
      capture?.holdTurns && capture.holdTurns > 0
        ? capture.holdTurns
        : DEFAULT_CAPTURE_HOLD_TURNS;
    return {
      objectiveType: 'capture',
      hexCount,
      holdTurnsRequired,
      requiredUnits: 0,
    };
  }

  if (markerType === 'defend') {
    return {
      objectiveType: 'defend',
      hexCount: 1,
      holdTurnsRequired: 1,
      requiredUnits: 0,
    };
  }

  // breakthrough
  const movement = victoryConditions.find((v) => v.id === 'breakthrough') as
    | { requiredUnits?: number }
    | undefined;
  const requiredUnits =
    movement?.requiredUnits && movement.requiredUnits > 0
      ? movement.requiredUnits
      : DEFAULT_BREAKTHROUGH_REQUIRED_UNITS;
  return {
    objectiveType: 'breakthrough',
    hexCount: 1,
    holdTurnsRequired: 1,
    requiredUnits,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Generates every in-bounds axial coordinate for a hex map of the
 * given radius, ordered deterministically (q ascending, then r).
 */
function allHexCoordinates(radius: number): IHexCoordinate[] {
  const coords: IHexCoordinate[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) coords.push({ q, r });
    }
  }
  return coords;
}

/**
 * Picks `count` distinct entries from `pool` using a seeded
 * Fisher-Yates partial shuffle so the same seed yields identical
 * picks. Returns at most `pool.length` entries.
 */
function pickSeeded<T>(
  pool: readonly T[],
  count: number,
  random: SeededRandom,
): T[] {
  const arr = [...pool];
  const n = Math.min(count, arr.length);
  for (let i = 0; i < n; i++) {
    const j = i + random.nextInt(arr.length - i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

/**
 * Deployment-zone occupancy rows used by `ScenarioGenerator`: the
 * player deploys at `-(radius - 1)` (south) and the opponent at
 * `radius - 1` (north). Interior placement excludes both rows plus the
 * outer edge so Capture objectives sit between the two armies.
 */
export interface IObjectiveZoneConfig {
  readonly radius: number;
  /** Player deployment row r-coordinate. */
  readonly playerRow: number;
  /** Opponent deployment row r-coordinate. */
  readonly opponentRow: number;
}

/**
 * Places objective hexes for a scenario, deterministically from the
 * given seed. The returned map is keyed by canonical `"q,r"` strings.
 *
 *   - Capture — 1..3 interior hexes, excluding both deployment rows
 *     and the outer ring.
 *   - Defend — hex(es) inside the defender (opponent) deployment zone.
 *   - Breakthrough — exit hexes on the map edge opposite the attacker
 *     (player deploys south → exits are on the north edge).
 *
 * @spec scenario-objectives — Objective Placement During Scenario Generation
 */
export function placeObjectives(
  config: IObjectivePlacementConfig,
  zone: IObjectiveZoneConfig,
  seed: number,
): Record<string, IObjectiveMarker> {
  const random = new SeededRandom(seed >>> 0);
  const all = allHexCoordinates(zone.radius);
  const radius = zone.radius;

  let pool: IHexCoordinate[];
  if (config.objectiveType === 'capture') {
    // Interior hexes: not on either deployment row, not on the outer
    // ring. Falls back to anything off the deployment rows if the map
    // is too small for a true interior.
    pool = all.filter(
      (c) =>
        c.r !== zone.playerRow &&
        c.r !== zone.opponentRow &&
        Math.abs(c.q) + Math.abs(c.r) + Math.abs(-c.q - c.r) < radius * 2,
    );
    if (pool.length === 0) {
      pool = all.filter(
        (c) => c.r !== zone.playerRow && c.r !== zone.opponentRow,
      );
    }
  } else if (config.objectiveType === 'defend') {
    // Defender (opponent) deployment zone.
    pool = all.filter((c) => c.r === zone.opponentRow);
  } else {
    // Breakthrough: exit edge opposite the attacker. The player
    // deploys on the south row (most-negative r); the exit edge is the
    // north row (most-positive r).
    pool = all.filter((c) => c.r === radius);
  }

  if (pool.length === 0) return {};

  const picks = pickSeeded(pool, config.hexCount, random);
  const markers: Record<string, IObjectiveMarker> = {};

  picks.forEach((coord, index) => {
    const hexKey = coordToKey(coord);
    const holdTurnsRequired =
      config.objectiveType === 'breakthrough'
        ? config.requiredUnits
        : config.holdTurnsRequired;
    markers[hexKey] = {
      id: `objective-${index + 1}`,
      hexKey,
      objectiveType: config.objectiveType,
      owningSide: 'neutral',
      controlSide: 'neutral',
      controlRule: 'sole-occupancy',
      holdTurnsRequired,
      holdProgress: 0,
    };
  });

  return markers;
}

/**
 * `DeploymentZone` is re-exported so callers that only need placement
 * do not have to import from two modules.
 */
export { DeploymentZone };
