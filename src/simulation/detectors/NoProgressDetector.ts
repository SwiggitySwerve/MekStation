/**
 * NoProgressDetector - Detects when battle state is unchanged for N turns
 *
 * Identifies battles where the game state (positions, armor, structure, heat)
 * remains unchanged for a configurable number of consecutive turns.
 * Movement-only changes count as progress and reset the counter.
 *
 * @example
 * ```typescript
 * const detector = new NoProgressDetector();
 * const anomalies = detector.detect(gameEvents, battleState, 5);
 * ```
 */

import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

import {
  GameEventType,
  GameSide,
  type IGameEvent,
  type IDamageAppliedPayload,
  type IHeatPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { getPayload } from './utils/getPayload';

// =============================================================================
// Types
// =============================================================================

/**
 * Static information about a unit in the battle.
 * Provided by the caller to give the detector context about each unit.
 */
export interface BattleUnit {
  readonly id: string;
  readonly name: string;
  readonly side: GameSide;
}

/**
 * Static battle context provided to the detector.
 * Contains all participating units with their starting attributes.
 */
export interface BattleState {
  readonly units: readonly BattleUnit[];
}

/**
 * Snapshot of battle state at a specific turn.
 * Captures armor, structure, and heat for all units.
 */
interface BattleStateSnapshot {
  readonly turn: number;
  readonly armor: Map<string, Record<string, number>>;
  readonly structure: Map<string, Record<string, number>>;
  readonly heat: Map<string, number>;
}

// =============================================================================
// Constants
// =============================================================================

/** Default threshold for no-progress detection (turns) */
const DEFAULT_NO_PROGRESS_THRESHOLD = 5;

// =============================================================================
// Internal Tracking State
// =============================================================================

interface DetectorTrackingState {
  /** Last snapshot of battle state */
  lastSnapshot: BattleStateSnapshot | null;
  /** Counter for consecutive turns with no progress */
  noProgressCounter: number;
  /** Unit armor per turn */
  unitArmor: Map<number, Map<string, Record<string, number>>>;
  /** Unit structure per turn */
  unitStructure: Map<number, Map<string, Record<string, number>>>;
  /** Unit heat per turn */
  unitHeat: Map<number, Map<string, number>>;
  /** Whether movement occurred this turn */
  movementThisTurn: boolean;
  /** Destroyed units */
  destroyedUnits: Set<string>;
  /** Anomalies detected */
  anomalies: IAnomaly[];
  /** ID counter for anomaly generation */
  anomalyCounter: number;
  /** Current turn */
  currentTurn: number;
  /** Whether anomaly has been triggered for current no-progress period */
  anomalyTriggered: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets a unit name by ID, falling back to the ID itself.
 */

function _getUnitName(units: readonly BattleUnit[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId);
  return unit ? unit.name : unitId;
}

/**
 * Compares two armor records for equality.
 */
function armorEqual(
  armor1: Record<string, number>,
  armor2: Record<string, number>,
): boolean {
  const keys1 = Object.keys(armor1).sort();
  const keys2 = Object.keys(armor2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i] || armor1[keys1[i]] !== armor2[keys2[i]]) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two structure records for equality.
 */
function structureEqual(
  structure1: Record<string, number>,
  structure2: Record<string, number>,
): boolean {
  const keys1 = Object.keys(structure1).sort();
  const keys2 = Object.keys(structure2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (
      keys1[i] !== keys2[i] ||
      structure1[keys1[i]] !== structure2[keys2[i]]
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Compares two snapshots to check if state changed.
 * Returns true if armor, structure, or heat changed.
 */
function snapshotsEqual(
  snap1: BattleStateSnapshot,
  snap2: BattleStateSnapshot,
  battleState: BattleState,
): boolean {
  for (const unit of battleState.units) {
    const armor1 = snap1.armor.get(unit.id) || {};
    const armor2 = snap2.armor.get(unit.id) || {};

    if (!armorEqual(armor1, armor2)) {
      return false;
    }

    const structure1 = snap1.structure.get(unit.id) || {};
    const structure2 = snap2.structure.get(unit.id) || {};

    if (!structureEqual(structure1, structure2)) {
      return false;
    }

    const heat1 = snap1.heat.get(unit.id) || 0;
    const heat2 = snap2.heat.get(unit.id) || 0;

    if (heat1 !== heat2) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// NoProgressDetector
// =============================================================================

/**
 * Detects no-progress anomalies from a stream of game events.
 *
 * Tracks battle state (positions, armor, structure, heat) across turns.
 * When state remains unchanged for N consecutive turns, creates an anomaly.
 * Movement-only changes count as progress and reset the counter.
 *
 * @example
 * ```typescript
 * const detector = new NoProgressDetector();
 * const anomalies = detector.detect(gameEvents, battleState, 5);
 * const warnings = anomalies.filter(a => a.severity === 'warning');
 * ```
 */
export class NoProgressDetector {
  /**
   * Detects no-progress anomalies from a stream of game events.
   *
   * @param events - Ordered array of game events to process
   * @param battleState - Static battle context (units, sides)
   * @param threshold - No-progress threshold in turns (default: 5)
   * @returns Array of detected anomalies
   */
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
    threshold: number = DEFAULT_NO_PROGRESS_THRESHOLD,
  ): IAnomaly[] {
    const state = this.initializeTrackingState();

    for (const event of events) {
      this.processEvent(event, battleState, state, threshold);
    }

    return state.anomalies;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private initializeTrackingState(): DetectorTrackingState {
    return {
      lastSnapshot: null,
      noProgressCounter: 0,
      unitArmor: new Map(),
      unitStructure: new Map(),
      unitHeat: new Map(),
      movementThisTurn: false,
      destroyedUnits: new Set(),
      anomalies: [],
      anomalyCounter: 0,
      currentTurn: 0,
      anomalyTriggered: false,
    };
  }

  // ===========================================================================
  // Event Processing
  // ===========================================================================

  private processEvent(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    // Update current turn
    state.currentTurn = event.turn;

    switch (event.type) {
      case GameEventType.MovementDeclared:
      case GameEventType.MovementLocked:
        this.processMovement(event, state);
        break;

      case GameEventType.DamageApplied:
        this.processDamage(event, state);
        break;

      case GameEventType.HeatGenerated:
        this.processHeat(event, state);
        break;

      case GameEventType.UnitDestroyed:
        this.processUnitDestroyed(event, state);
        break;

      case GameEventType.TurnEnded:
        this.processTurnEnded(event, battleState, state, threshold);
        break;

      default:
        break;
    }
  }

  private processMovement(
    event: IGameEvent,
    state: DetectorTrackingState,
  ): void {
    state.movementThisTurn = true;
  }

  private processDamage(event: IGameEvent, state: DetectorTrackingState): void {
    const payload = getPayload<IDamageAppliedPayload>(event);
    const { unitId, location, armorRemaining, structureRemaining } = payload;

    // Initialize turn maps if needed
    if (!state.unitArmor.has(event.turn)) {
      state.unitArmor.set(event.turn, new Map());
    }
    if (!state.unitStructure.has(event.turn)) {
      state.unitStructure.set(event.turn, new Map());
    }

    const turnArmor = state.unitArmor.get(event.turn)!;
    const turnStructure = state.unitStructure.get(event.turn)!;

    // Get or initialize armor/structure for this unit
    if (!turnArmor.has(unitId)) {
      turnArmor.set(unitId, {});
    }
    if (!turnStructure.has(unitId)) {
      turnStructure.set(unitId, {});
    }

    // Update armor and structure
    const armor = turnArmor.get(unitId)!;
    const structure = turnStructure.get(unitId)!;

    armor[location] = armorRemaining;
    structure[location] = structureRemaining;
  }

  private processHeat(event: IGameEvent, state: DetectorTrackingState): void {
    const payload = getPayload<IHeatPayload>(event);
    const { unitId, newTotal } = payload;

    // Initialize turn map if needed
    if (!state.unitHeat.has(event.turn)) {
      state.unitHeat.set(event.turn, new Map());
    }

    const turnHeat = state.unitHeat.get(event.turn)!;
    turnHeat.set(unitId, newTotal);
  }

  private processUnitDestroyed(
    event: IGameEvent,
    state: DetectorTrackingState,
  ): void {
    const payload = getPayload<{ readonly unitId: string }>(event);
    state.destroyedUnits.add(payload.unitId);
  }

  private processTurnEnded(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
    threshold: number,
  ): void {
    const currentTurn = event.turn;

    // Initialize all units with empty state if not present
    if (!state.unitArmor.has(currentTurn)) {
      state.unitArmor.set(currentTurn, new Map());
    }
    if (!state.unitStructure.has(currentTurn)) {
      state.unitStructure.set(currentTurn, new Map());
    }
    if (!state.unitHeat.has(currentTurn)) {
      state.unitHeat.set(currentTurn, new Map());
    }

    // Get current state, inheriting from previous turn if not updated

    const currentArmor = new Map(
      state.unitArmor.get(currentTurn) || new Map(),
    ) as Map<string, Record<string, number>>;

    const currentStructure = new Map(
      state.unitStructure.get(currentTurn) || new Map(),
    ) as Map<string, Record<string, number>>;

    const currentHeat = new Map(
      state.unitHeat.get(currentTurn) || new Map(),
    ) as Map<string, number>;

    // If state wasn't updated this turn, inherit from last snapshot
    if (state.lastSnapshot !== null) {
      for (const unit of battleState.units) {
        if (
          !currentArmor.has(unit.id) &&
          state.lastSnapshot.armor.has(unit.id)
        ) {
          currentArmor.set(unit.id, state.lastSnapshot.armor.get(unit.id)!);
        }
        if (
          !currentStructure.has(unit.id) &&
          state.lastSnapshot.structure.has(unit.id)
        ) {
          currentStructure.set(
            unit.id,
            state.lastSnapshot.structure.get(unit.id)!,
          );
        }
        if (!currentHeat.has(unit.id) && state.lastSnapshot.heat.has(unit.id)) {
          currentHeat.set(unit.id, state.lastSnapshot.heat.get(unit.id)!);
        }
      }
    }

    // Create snapshot of current state
    const currentSnapshot: BattleStateSnapshot = {
      turn: currentTurn,
      armor: currentArmor,
      structure: currentStructure,
      heat: currentHeat,
    };

    // Initialize snapshot on first turn
    if (state.lastSnapshot === null) {
      state.lastSnapshot = currentSnapshot;
      // If movement occurred on turn 1, don't count it as progress yet
      // We'll start counting from turn 2
      state.noProgressCounter = state.movementThisTurn ? 0 : 1;
      state.movementThisTurn = false;
      return;
    }

    // Check if state changed or movement occurred
    const stateChanged = !snapshotsEqual(
      state.lastSnapshot,
      currentSnapshot,
      battleState,
    );
    const progressDetected = stateChanged || state.movementThisTurn;

    if (progressDetected) {
      // Progress detected - reset counter
      state.noProgressCounter = 0;
      state.anomalyTriggered = false;
    } else {
      // No change detected - increment counter
      state.noProgressCounter++;

      // Check if we've exceeded threshold
      if (state.noProgressCounter >= threshold && !state.anomalyTriggered) {
        const anomaly = this.createAnomaly(event, state, threshold);
        state.anomalies.push(anomaly);
        state.anomalyTriggered = true;
      }
    }

    // Update last snapshot and reset movement flag
    state.lastSnapshot = currentSnapshot;
    state.movementThisTurn = false;
  }

  // ===========================================================================
  // Anomaly Creation
  // ===========================================================================

  private createAnomaly(
    event: IGameEvent,
    state: DetectorTrackingState,
    threshold: number,
  ): IAnomaly {
    const id = `anom-no-progress-${event.turn}-${state.anomalyCounter++}`;

    return {
      id,
      type: 'no-progress',
      severity: 'warning',
      battleId: event.gameId,
      turn: event.turn,
      unitId: null,
      message: `Battle state unchanged for ${state.noProgressCounter} turns (threshold: ${threshold})`,
      thresholdUsed: threshold,
      actualValue: state.noProgressCounter,
      configKey: 'noProgressThreshold',
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }
}
