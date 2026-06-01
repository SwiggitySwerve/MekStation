/**
 * Scenario Objective Engine
 *
 * Control detection and victory evaluation for hex-based scenario
 * objectives. The engine is a set of pure functions consumed by the
 * game-over check and the per-turn control-detection pass.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { IGameState, IUnitGameState } from '@/types/gameplay';
import type {
  IObjectiveMarker,
  IObjectiveOutcome,
  ObjectiveSide,
} from '@/types/scenario/ScenarioInterfaces';

import { GameSide } from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';
import { coordToKey } from '@/utils/gameplay/hexMath';

/**
 * Maps a `GameSide` enum value onto the `ObjectiveSide` string used by
 * objective markers.
 */
export function gameSideToObjectiveSide(side: GameSide): ObjectiveSide {
  return side === GameSide.Player ? 'player' : 'opponent';
}

/**
 * Maps an `ObjectiveSide` back onto a `GameSide`. Returns `null` for
 * the `neutral` controller (no winning side).
 */
export function objectiveSideToGameSide(side: ObjectiveSide): GameSide | null {
  if (side === 'player') return GameSide.Player;
  if (side === 'opponent') return GameSide.Opponent;
  return null;
}

/**
 * True when a unit still occupies a hex for control purposes — it must
 * be alive and not yet withdrawn from the battlefield. A destroyed or
 * retreated unit no longer projects control onto its hex.
 */
function unitOccupiesHexes(unit: IUnitGameState): boolean {
  return !unit.destroyed && !unit.hasRetreated && !unit.hasEjected;
}

/**
 * Counts, per side, how many participating units sit on a given hex.
 */
function occupantsByHex(
  state: IGameState,
  hexKey: string,
): { player: number; opponent: number } {
  let player = 0;
  let opponent = 0;
  for (const unit of Object.values(state.units)) {
    if (!unitOccupiesHexes(unit)) continue;
    if (coordToKey(unit.position) !== hexKey) continue;
    if (unit.side === GameSide.Player) player += 1;
    else if (unit.side === GameSide.Opponent) opponent += 1;
  }
  return { player, opponent };
}

/**
 * Resolves the controller of a single objective hex under the
 * sole-occupancy rule (design.md D3):
 *
 *   - One side alone on the hex → that side takes control.
 *   - Both sides on the hex → contested → `controlSide` is unchanged
 *     (sticky to the last controller).
 *   - Hex vacated → `controlSide` is unchanged (sticky).
 *
 * Returns the NEW marker (control may be unchanged). `holdProgress` is
 * NOT advanced here — see `advanceObjectiveControl`.
 *
 * @spec scenario-objectives — Objective Control Detection
 */
export function detectObjectiveControl(
  marker: IObjectiveMarker,
  state: IGameState,
): IObjectiveMarker {
  const { player, opponent } = occupantsByHex(state, marker.hexKey);

  // Contested or vacated → control is sticky to the last controller.
  if (player > 0 && opponent > 0) return marker;
  if (player === 0 && opponent === 0) return marker;

  const newControl: ObjectiveSide = player > 0 ? 'player' : 'opponent';
  if (newControl === marker.controlSide) return marker;

  return { ...marker, controlSide: newControl };
}

/**
 * Result of advancing one objective marker through a control-detection
 * pass — the updated marker plus what changed, so callers can emit the
 * matching lifecycle events without recomputing the diff.
 */
export interface IObjectiveControlChange {
  /** Marker after control + hold-progress advancement. */
  readonly marker: IObjectiveMarker;
  /** `controlSide` changed to a non-neutral side this turn. */
  readonly captured: boolean;
  /** A previously-controlled marker became contested/vacated/flipped. */
  readonly lost: boolean;
  /** `holdProgress` value changed this turn. */
  readonly progressChanged: boolean;
  /** Side that lost control, when `lost` is true. */
  readonly previousControlSide: ObjectiveSide;
}

/**
 * Runs the once-per-turn control-detection pass for a single marker:
 * resolves the new controller, then advances `holdProgress` (increment
 * while held by the same side, reset to 0 on any loss of control or
 * contest).
 *
 * @spec scenario-objectives — Objective Control Detection
 */
export function advanceObjectiveControl(
  marker: IObjectiveMarker,
  state: IGameState,
): IObjectiveControlChange {
  const previousControlSide = marker.controlSide;
  const { player, opponent } = occupantsByHex(state, marker.hexKey);
  const contested = player > 0 && opponent > 0;

  const afterControl = detectObjectiveControl(marker, state);
  const controlChanged = afterControl.controlSide !== previousControlSide;

  // Hold progress: a marker accrues hold ONLY while a single side has
  // uncontested sole occupancy of it AND the controller did not change
  // this turn. A contest, a vacate-after-flip, or any control change
  // resets progress to 0.
  let nextProgress: number;
  if (contested) {
    nextProgress = 0;
  } else if (controlChanged) {
    // Control just flipped — the new holder starts a fresh count, but
    // only counts if it currently occupies the hex this turn.
    nextProgress = player > 0 || opponent > 0 ? 1 : 0;
  } else if (afterControl.controlSide === 'neutral') {
    nextProgress = 0;
  } else {
    // Control unchanged. Increment only while the controller still has
    // a unit physically on the hex; a vacated hex keeps the controller
    // but stops accruing hold.
    const stillHeld =
      (afterControl.controlSide === 'player' && player > 0) ||
      (afterControl.controlSide === 'opponent' && opponent > 0);
    nextProgress = stillHeld ? marker.holdProgress + 1 : 0;
  }

  const nextMarker: IObjectiveMarker = {
    ...afterControl,
    holdProgress: nextProgress,
  };

  const captured = controlChanged && afterControl.controlSide !== 'neutral';
  const lost =
    previousControlSide !== 'neutral' &&
    (contested || afterControl.controlSide !== previousControlSide);

  return {
    marker: nextMarker,
    captured,
    lost,
    progressChanged: nextProgress !== marker.holdProgress,
    previousControlSide,
  };
}

/**
 * The two scenario sides expressed as objective-side strings, with the
 * attacker / defender role mapping. For generated scenarios the player
 * is always the attacker (Capture / Breakthrough) and the defender for
 * `defend` — matching `ScenarioGenerator` placement and the proposal's
 * single-objective model.
 */
export const ATTACKER_SIDE: ObjectiveSide = 'player';
export const DEFENDER_SIDE: ObjectiveSide = 'opponent';

/**
 * Counts participating (alive, non-withdrawn) units on a side.
 */
function countParticipating(state: IGameState, side: GameSide): number {
  return Object.values(state.units).filter(
    (u) => u.side === side && unitOccupiesHexes(u),
  ).length;
}

/**
 * Resolves a markerless (Destroy) scenario: a side wins when every
 * enemy unit is destroyed or withdrawn. Mutual elimination is a draw
 * and returns `null` (the destruction fallback handles draw labelling).
 */
function evaluateDestroy(state: IGameState): IObjectiveOutcome | null {
  const playerAlive = countParticipating(state, GameSide.Player) > 0;
  const opponentAlive = countParticipating(state, GameSide.Opponent) > 0;

  if (playerAlive && opponentAlive) return null;
  if (!playerAlive && !opponentAlive) return null;

  return {
    decided: true,
    winningSide: playerAlive ? GameSide.Player : GameSide.Opponent,
    reason: 'objective',
    objectiveType: ScenarioObjectiveType.Destroy,
  };
}

/**
 * Resolves a Capture scenario: the attacking side wins when it holds
 * EVERY objective hex for `holdTurnsRequired` consecutive turns.
 * The defending side wins by destruction (handled by the caller's
 * destruction fallback) — Capture only decides an attacker win here.
 */
function evaluateCapture(
  markers: readonly IObjectiveMarker[],
): IObjectiveOutcome | null {
  if (markers.length === 0) return null;

  const attackerHoldsAll = markers.every(
    (m) =>
      m.controlSide === ATTACKER_SIDE && m.holdProgress >= m.holdTurnsRequired,
  );
  if (!attackerHoldsAll) return null;

  const winning = objectiveSideToGameSide(ATTACKER_SIDE);
  if (winning === null) return null;

  return {
    decided: true,
    winningSide: winning,
    reason: 'objective',
    objectiveType: ScenarioObjectiveType.Capture,
  };
}

/**
 * Resolves a Defend scenario: the attacking side wins IMMEDIATELY upon
 * controlling all objective hexes; otherwise the defending side wins
 * once the turn limit is reached while still in control.
 */
function evaluateDefend(
  state: IGameState,
  markers: readonly IObjectiveMarker[],
  turnLimit: number,
): IObjectiveOutcome | null {
  if (markers.length === 0) return null;

  const attackerHoldsAll = markers.every(
    (m) => m.controlSide === ATTACKER_SIDE,
  );
  if (attackerHoldsAll) {
    const winning = objectiveSideToGameSide(ATTACKER_SIDE);
    if (winning === null) return null;
    return {
      decided: true,
      winningSide: winning,
      reason: 'objective',
      objectiveType: ScenarioObjectiveType.Defend,
    };
  }

  // Defender wins at the turn limit if it still holds the objective(s).
  // `state.turn` is the 1-based current turn; the scenario reaches its
  // limit once `turn >= turnLimit`.
  if (turnLimit > 0 && state.turn >= turnLimit) {
    const defenderHoldsAny = markers.some(
      (m) => m.controlSide === DEFENDER_SIDE,
    );
    if (defenderHoldsAny) {
      const winning = objectiveSideToGameSide(DEFENDER_SIDE);
      if (winning === null) return null;
      return {
        decided: true,
        winningSide: winning,
        reason: 'objective',
        objectiveType: ScenarioObjectiveType.Defend,
      };
    }
  }

  return null;
}

/**
 * Resolves a Breakthrough scenario: the attacking side wins when
 * `requiredUnits` of its units have reached an exit hex (a hex carrying
 * a `breakthrough` objective marker). `holdTurnsRequired` carries the
 * required-units count for breakthrough markers (set by placement).
 */
function evaluateBreakthrough(
  state: IGameState,
  markers: readonly IObjectiveMarker[],
): IObjectiveOutcome | null {
  if (markers.length === 0) return null;

  const exitHexKeys = new Set(markers.map((m) => m.hexKey));
  // Every breakthrough marker carries the same required-units count;
  // a single objective hex is the common case.
  const requiredUnits = Math.max(1, ...markers.map((m) => m.holdTurnsRequired));

  const attackerGameSide = objectiveSideToGameSide(ATTACKER_SIDE);
  if (attackerGameSide === null) return null;

  let reached = 0;
  for (const unit of Object.values(state.units)) {
    if (unit.side !== attackerGameSide) continue;
    if (!unitOccupiesHexes(unit)) continue;
    if (exitHexKeys.has(coordToKey(unit.position))) reached += 1;
  }

  if (reached < requiredUnits) return null;

  return {
    decided: true,
    winningSide: attackerGameSide,
    reason: 'objective',
    objectiveType: ScenarioObjectiveType.Breakthrough,
  };
}

/**
 * Evaluates the scenario objective outcome for a game state. Returns an
 * `IObjectiveOutcome` when the scenario is decided, or `null` while it
 * is still undecided. The game-over check consults this BEFORE the
 * destruction / turn-limit fallback (design.md D4) so an objective win
 * takes precedence over a turn-limit draw.
 *
 * An empty / absent objective map is treated as a `destroy` scenario
 * (spec: "Markerless session resolves as destruction").
 *
 * @spec scenario-objectives — Objective-Based Victory Evaluation
 */
export function evaluateObjectiveOutcome(
  state: IGameState,
  turnLimit = 0,
): IObjectiveOutcome | null {
  const markers = Object.values(state.objectives ?? {});

  if (markers.length === 0) {
    return evaluateDestroy(state);
  }

  // Single-objective model: every marker shares one objective type.
  const objectiveType = markers[0].objectiveType;
  const sameType = markers.filter((m) => m.objectiveType === objectiveType);

  switch (objectiveType) {
    case 'capture':
      return evaluateCapture(sameType);
    case 'defend':
      return evaluateDefend(state, sameType, turnLimit);
    case 'breakthrough':
      return evaluateBreakthrough(state, sameType);
    default:
      return evaluateDestroy(state);
  }
}
